import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  Vibration,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Audio } from "expo-av";
import { useTheme } from "../ThemeContext";
import {
  saveSession,
  saveBat,
  getBatById,
  getBatPoints,
  saveBatPoints,
  saveActiveSession,
  clearActiveSession,
  generateId,
  getSessionsByBat,
} from "../storage/database";
import { getPhaseTargetMinutes } from "../utils/targets";

// ─── KNOCK DETECTION — dBFS ADAPTIVE BASELINE ────────────────
//
// Restored to the original approach that was working:
// - Works directly in dBFS (expo-av metering values, no conversion needed)
// - Adaptive baseline tracks room noise via fast EMA (alpha=0.25)
// - A knock = sudden jump ≥ JUMP_DB above the adaptive baseline
//           AND db ≥ floor (set by voice calibration or default)
// - DEBOUNCE_MS prevents resonance double-counting
//
// Key fix vs original: FLOOR_DB lowered from -22 to -40, and calibration
// cap lowered from -16 to -32. The old floor rejected quiet knocks
// (arm's length recordings peak at -30 to -40 dBFS).

const POLL_MS        = 15;
const DEBOUNCE_MS    = 400;    // raised from 250 — covers bat resonance tail (up to 345ms measured)
const JUMP_DB        = 12;     // dB jump above adaptive baseline required
const FLOOR_DB       = -40;    // absolute minimum dBFS (was -22 — too strict)
const BASELINE_ALPHA = 0.25;   // fast baseline: tracks room noise in ~60ms
const RESET_FLOOR_DB = -60;    // initial baseline value

// Phase definitions — targetMinutes is computed per-bat from the bat's own
// target_minutes (set in Create/Edit Bat), split 20/30/50 across Light/
// Medium/Full.
function getPhaseConfig(bat) {
  const t = getPhaseTargetMinutes(bat?.target_minutes);
  return {
    light:  { label: 'Light Knocking',  num: 2, targetMinutes: t.light,  color: '#60a5fa' },
    medium: { label: 'Medium Knocking', num: 3, targetMinutes: t.medium, color: '#a78bfa' },
    full:   { label: 'Full Knocking',   num: 4, targetMinutes: t.full,   color: '#34d399' },
  };
}

export default function KnockingSessionScreen({ navigation, route }) {
  const { theme, fs } = useTheme();
  const bat = route.params?.bat;
  const passedZone = route.params?.zone || null;
  // phaseType: 'light' | 'medium' | 'full' | undefined (free session)
  const phaseType = route.params?.phaseType;
  const phaseConfig = phaseType ? getPhaseConfig(bat)[phaseType] : null;

  const ZONES = [
    { id: 'sweet-spot', label: 'Sweet Spot', icon: '🎯' },
    { id: 'edge',       label: 'Edge',       icon: '⚡' },
    { id: 'toe',        label: 'Toe',        icon: '🦶' },
    { id: 'top-edge',   label: 'Top Edge',   icon: '🔝' },
  ];
  // If a zone wasn't passed in (e.g. from the Prep Journey), the user
  // picks one before starting — defaults to Sweet Spot.
  const [selectedZone, setSelectedZone] = useState(passedZone || 'sweet-spot');
  const needsZonePicker = !passedZone; // BatProfileScreen no longer pre-selects a zone for phase sessions

  const [knockCount, setKnockCount] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [kpm, setKpm] = useState(0);
  const [micStatus, setMicStatus] = useState("idle");
  const [hasPermission, setHasPermission] = useState(false);

  const [calibStep, setCalibStep] = useState("idle");
  const [calibThreshold, setCalibThreshold] = useState(FLOOR_DB);
  const [calibMessage, setCalibMessage] = useState("");
  const [voicePeak, setVoicePeak] = useState(0);

  const recordingRef = useRef(null);
  const timerRef = useRef(null);
  const pollingRef = useRef(null);
  const knockCountRef = useRef(0);
  const lastKnockRef = useRef(0);
  const sessionStartRef = useRef(null);
  const sessionIdRef = useRef(generateId());
  const batPointsRef = useRef([]);

  const baselineRef = useRef(RESET_FLOOR_DB);
  const floorRef    = useRef(FLOOR_DB);

  // ── Cumulative phase time tracking (for auto-complete) ────────────────
  const [priorPhaseMinutes, setPriorPhaseMinutes] = useState(0);
  const [phaseCompleted, setPhaseCompleted] = useState(false);

  const loudFramesRef = useRef(0);
  const inKnockRef = useRef(false);
  const calibSamplesRef = useRef([]);
  const calibPhaseRef = useRef("idle");

  useEffect(() => {
    requestMicPermission();
    loadBatPoints();
    if (phaseType) loadPriorPhaseTime();
    return () => { cleanupAll(); };
  }, []);

  const loadBatPoints = async () => {
    if (bat?.id) {
      const pts = await getBatPoints(bat.id);
      batPointsRef.current = pts || [];
    }
  };

  // Sum up minutes already logged for this phase (sessions tagged with this phaseType)
  const loadPriorPhaseTime = async () => {
    if (!bat?.id) return;
    try {
      const sessions = await getSessionsByBat(bat.id);
      const phaseSessions = (sessions || []).filter(s => s.phase_type === phaseType);
      const totalSecs = phaseSessions.reduce((sum, s) => sum + (s.duration_seconds || 0), 0);
      setPriorPhaseMinutes(Math.round(totalSecs / 60));
    } catch (e) { /* ignore */ }
  };

  const cleanupAll = async () => {
    clearInterval(pollingRef.current);
    clearInterval(timerRef.current);
    if (recordingRef.current) {
      try { await recordingRef.current.stopAndUnloadAsync(); } catch (e) {}
      recordingRef.current = null;
    }
  };

  const requestMicPermission = async () => {
    const { status } = await Audio.requestPermissionsAsync();
    setHasPermission(status === "granted");
  };

  // ─── CALIBRATION ──────────────────────────────────────────────────────
  const startCalibration = async () => {
    if (!hasPermission) return;
    setCalibStep("voice");
    setCalibMessage("Talk normally for 3 seconds...");
    calibSamplesRef.current = [];
    calibPhaseRef.current = "voice";

    await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
    const { recording } = await Audio.Recording.createAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY,
      (status) => {
        if (status.metering !== undefined && status.metering !== null && calibPhaseRef.current === "voice") {
          calibSamplesRef.current.push(status.metering);
        }
      },
      50,
    );

    setTimeout(async () => {
      calibPhaseRef.current = "done";
      try { await recording.stopAndUnloadAsync(); } catch (e) {}

      const samples = calibSamplesRef.current.filter((v) => isFinite(v));
      if (samples.length > 0) {
        const sorted = [...samples].sort((a, b) => a - b);
        const voiceMaxDb = sorted[Math.floor(sorted.length * 0.95)];
        // Floor = voice peak + 4dB margin, capped at -32dBFS.
        // Original cap was -16dBFS which blocked quiet knocks — now -32.
        const newFloor = Math.max(FLOOR_DB, Math.min(voiceMaxDb + 4, -32));
        floorRef.current = newFloor;
        const linear = Math.max(0, Math.min(1, (newFloor + 60) / 60));
        setCalibThreshold(newFloor);
        setVoicePeak(Math.max(0, Math.min(1, (voiceMaxDb + 60) / 60)));
        setCalibStep("done");
        setCalibMessage(
          voiceMaxDb < -40 ? "Very quiet room — excellent sensitivity!" :
          voiceMaxDb < -30 ? "Normal environment — good detection" :
          voiceMaxDb < -22 ? "Moderately noisy — knock firmly for best results" :
          "Noisy environment — move somewhere quieter if knocks are missed"
        );
      } else {
        setCalibStep("idle");
        setCalibMessage("");
      }
    }, 3000);
  };

  // ─── HEATMAP UPDATE ───────────────────────────────────────────────────
  const recordKnock = async () => {
    if (!bat?.id) return;
    const points = [...batPointsRef.current];
    const idx = points.findIndex((p) => p.zone === selectedZone);
    if (idx >= 0) {
      points[idx] = { ...points[idx], hit_count: points[idx].hit_count + 1 };
    } else {
      points.push({ id: generateId(), zone: selectedZone, hit_count: 1 });
    }
    batPointsRef.current = points;
    await saveBatPoints(bat.id, points);
  };

  // ─── KNOCK DETECTION ─────────────────────────────────────────────────
  // Original dBFS adaptive baseline approach — restored after amplitude
  // experiments caused detection to fail on device.
  // knock = jump ≥ JUMP_DB above adaptive baseline AND db ≥ floor
  const processLevel = useCallback((db) => {
    if (db === undefined || db === null || !isFinite(db)) return;
    const now      = Date.now();
    const baseline = baselineRef.current;
    const floor    = floorRef.current;
    const jump     = db - baseline;
    const isKnock  = jump >= JUMP_DB && db >= floor;

    if (isKnock) {
      if (now - lastKnockRef.current > DEBOUNCE_MS) {
        lastKnockRef.current = now;
        knockCountRef.current += 1;
        setKnockCount(knockCountRef.current);
        Vibration.vibrate(15);
        recordKnock();
        // Push baseline up to near the knock level so the resonance tail
        // no longer looks like a jump. Without this, baseline stays at -60
        // while resonance sits at -30, giving jump=30 that re-triggers
        // as soon as the debounce expires.
        baselineRef.current = db - 3;
      }
      // Don't update baseline during knock/resonance
    } else {
      baselineRef.current = BASELINE_ALPHA * db + (1 - BASELINE_ALPHA) * baseline;
    }
  }, []);

  // ─── RECORDING ────────────────────────────────────────────────────────
  const startRecording = async () => {
    baselineRef.current = RESET_FLOOR_DB;
    inKnockRef.current  = false;
    loudFramesRef.current = 0;
    await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
    const { recording } = await Audio.Recording.createAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY, null, POLL_MS,
    );
    recordingRef.current = recording;
    pollingRef.current = setInterval(async () => {
      if (!recordingRef.current) return;
      try {
        const status = await recordingRef.current.getStatusAsync();
        if (status.isRecording && status.metering !== undefined && status.metering !== null) {
          processLevel(status.metering);
        }
      } catch (e) {}
    }, POLL_MS);
  };

  const stopRecording = async () => {
    clearInterval(pollingRef.current);
    pollingRef.current = null;
    if (recordingRef.current) {
      try { await recordingRef.current.stopAndUnloadAsync(); } catch (e) {}
      recordingRef.current = null;
    }
    inKnockRef.current = false;
    loudFramesRef.current = 0;
  };

  // ─── SESSION CONTROL ──────────────────────────────────────────────────
  useEffect(() => {
    if (isRunning && !isPaused) {
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isRunning, isPaused]);

  useEffect(() => {
    if (isRunning && elapsed > 0 && elapsed % 10 === 0) {
      const mins = elapsed / 60;
      if (mins > 0) setKpm(Math.round(knockCountRef.current / mins));
    }
  }, [elapsed]);

  // Check for phase auto-complete every tick
  useEffect(() => {
    if (phaseConfig && isRunning) {
      const currentMins = priorPhaseMinutes + elapsed / 60;
      if (currentMins >= phaseConfig.targetMinutes && !phaseCompleted) {
        setPhaseCompleted(true);
      }
    }
  }, [elapsed, isRunning]);

  useEffect(() => {
    if (isRunning && elapsed > 0 && elapsed % 30 === 0) {
      saveActiveSession({
        id: sessionIdRef.current, bat_id: bat?.id, bat_name: bat?.name,
        knock_count: knockCountRef.current, duration_seconds: elapsed,
        kpm, created_at: sessionStartRef.current,
      });
    }
  }, [elapsed]);

  const startSession = async () => {
    if (!hasPermission) { await requestMicPermission(); return; }
    sessionStartRef.current = new Date().toISOString();
    setIsRunning(true);
    setIsPaused(false);
    try { await startRecording(); setMicStatus("active"); }
    catch (e) { setMicStatus("error"); }
  };

  const pauseSession = async () => {
    setIsPaused(true);
    await stopRecording();
    setMicStatus("idle");
  };

  const resumeSession = async () => {
    setIsPaused(false);
    try { await startRecording(); setMicStatus("active"); }
    catch (e) { setMicStatus("error"); }
  };

  const stopSession = async () => {
    setIsRunning(false);
    setIsPaused(false);
    await stopRecording();
    setMicStatus("idle");
    clearInterval(timerRef.current);
  };

  const finishSession = async () => {
    await stopSession();
    if (knockCountRef.current === 0) {
      Alert.alert("No knocks recorded", "Finish anyway?", [
        { text: "Keep Going", style: "cancel", onPress: () => startSession() },
        { text: "Finish", onPress: () => navigation.goBack() },
      ]);
      return;
    }
    const session = {
      id: sessionIdRef.current, bat_id: bat?.id, bat_name: bat?.name,
      knock_count: knockCountRef.current, duration_seconds: elapsed, kpm,
      selected_zone: selectedZone,
      phase_type: phaseType || null,
      created_at: sessionStartRef.current || new Date().toISOString(),
    };
    await saveSession(session);
    if (bat?.id) {
      const updated = await getBatById(bat.id);
      if (updated) {
        updated.total_knocks = (updated.total_knocks || 0) + knockCountRef.current;
        await saveBat(updated);
      }
    }
    await clearActiveSession();

    if (phaseConfig && phaseCompleted) {
      Alert.alert(
        `${phaseConfig.label} Complete! 🎉`,
        `${knockCountRef.current} knocks in ${formatTime(elapsed)}. You've reached the recommended ${phaseConfig.targetMinutes} minute target — this phase will be marked complete.`,
        [{ text: "Done", onPress: () => navigation.navigate('BatProfile', { bat, phaseAutoComplete: phaseType }) }],
      );
    } else {
      Alert.alert(
        "Session Complete!",
        `${knockCountRef.current} knocks in ${formatTime(elapsed)}`,
        [{ text: "Done", onPress: () => navigation.goBack() }],
      );
    }
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const adjustKnocks = (delta) => {
    knockCountRef.current = Math.max(0, knockCountRef.current + delta);
    setKnockCount(knockCountRef.current);
  };

  const thresholdPct = Math.round(calibThreshold * 100);
  const voicePct = Math.round(voicePeak * 100);

  const phaseProgressMins = phaseConfig ? priorPhaseMinutes + Math.floor(elapsed / 60) : 0;
  const phaseProgressPct = phaseConfig ? Math.min(100, Math.round((phaseProgressMins / phaseConfig.targetMinutes) * 100)) : 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20 }}>
        <TouchableOpacity
          onPress={() => {
            if (isRunning) {
              Alert.alert("End Session?", "Progress will be lost.", [
                { text: "Cancel", style: "cancel" },
                { text: "End", style: "destructive", onPress: () => { stopSession(); navigation.goBack(); } },
              ]);
            } else { navigation.goBack(); }
          }}
        >
          <Text style={{ color: theme.textSub, fontSize: fs(16) }}>Back</Text>
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ color: theme.text, fontSize: fs(16), fontWeight: "700" }}>
            {bat?.name || bat?.brand || "Session"}
          </Text>
          {phaseConfig && (
            <Text style={{ color: phaseConfig.color, fontSize: fs(11), fontWeight: '700', marginTop: 2 }}>
              {phaseConfig.label} · {selectedZone.replace('-', ' ')}
            </Text>
          )}
        </View>
        <View style={{ width: 10, height: 10, borderRadius: 5,
                       backgroundColor: micStatus === "active" ? theme.accent : theme.border }} />
      </View>

      {/* Phase progress banner (only in phase mode) */}
      {phaseConfig && (
        <View style={{ marginHorizontal: 20, marginBottom: 8, backgroundColor: theme.bgCard,
                       borderRadius: 12, padding: 14, borderWidth: 1, borderColor: theme.border }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
            <Text style={{ color: theme.text, fontSize: fs(13), fontWeight: '700' }}>
              {phaseConfig.label} Progress
            </Text>
            <Text style={{ color: phaseConfig.color, fontSize: fs(13), fontWeight: '700' }}>
              {phaseProgressMins} / {phaseConfig.targetMinutes} min
            </Text>
          </View>
          <View style={{ height: 6, backgroundColor: theme.border, borderRadius: 3 }}>
            <View style={{ height: 6, width: `${phaseProgressPct}%`, backgroundColor: phaseConfig.color, borderRadius: 3 }} />
          </View>
          {phaseCompleted && (
            <Text style={{ color: phaseConfig.color, fontSize: fs(12), fontWeight: '700', marginTop: 8 }}>
              ✓ Target reached! Finish this session to complete the phase.
            </Text>
          )}
        </View>
      )}

      {/* Zone Picker — shown when no zone was pre-selected (Prep Journey flow) */}
      {!isRunning && needsZonePicker && (
        <View style={{ marginHorizontal: 20, marginBottom: 8, backgroundColor: theme.bgCard,
                       borderRadius: 12, padding: 14, borderWidth: 1, borderColor: theme.border }}>
          <Text style={{ color: theme.textMuted, fontSize: fs(11), fontWeight: '700',
                         letterSpacing: 0.5, marginBottom: 10 }}>
            TARGET ZONE
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {ZONES.map(zone => (
              <TouchableOpacity key={zone.id} onPress={() => setSelectedZone(zone.id)}
                style={{ flex: 1, borderRadius: 10, padding: 10, alignItems: 'center',
                         backgroundColor: selectedZone === zone.id ? theme.accentDim : theme.bgInput,
                         borderWidth: 1.5, borderColor: selectedZone === zone.id ? theme.accent : theme.border }}>
                <Text style={{ fontSize: 16 }}>{zone.icon}</Text>
                <Text style={{ color: selectedZone === zone.id ? theme.accent : theme.textSub,
                               fontSize: fs(10), fontWeight: '700', marginTop: 4 }}>
                  {zone.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Calibration Card */}
      {!isRunning && (
        <View style={{ marginHorizontal: 20, marginBottom: 8, backgroundColor: theme.bgCard,
                       borderRadius: 16, padding: 18, borderWidth: 1, borderColor: theme.border }}>
          {calibStep === "idle" && (
            <>
              <Text style={{ color: theme.text, fontSize: fs(15), fontWeight: "700", marginBottom: 6 }}>
                Calibrate to filter your voice
              </Text>
              <Text style={{ color: theme.textSub, fontSize: fs(13), lineHeight: 19, marginBottom: 14 }}>
                Tap and talk normally for 3 seconds. The app will set the threshold above your voice level so only bat knocks are counted.
              </Text>
              <TouchableOpacity
                style={{ backgroundColor: theme.accent, borderRadius: 12, padding: 12, alignItems: "center", marginBottom: 10 }}
                onPress={startCalibration}
              >
                <Text style={{ color: '#fff', fontWeight: "800", fontSize: fs(14) }}>Start Calibration</Text>
              </TouchableOpacity>
              <Text style={{ color: theme.textMuted, fontSize: fs(12), textAlign: "center" }}>
                Current threshold: {(calibThreshold * 1000).toFixed(1)}
              </Text>
            </>
          )}

          {calibStep === "voice" && (
            <>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: theme.red }} />
                <Text style={{ color: theme.red, fontSize: fs(13), fontWeight: "700" }}>Recording...</Text>
              </View>
              <Text style={{ color: theme.text, fontSize: fs(15), fontWeight: "700", marginBottom: 6 }}>Talk normally now</Text>
              <Text style={{ color: theme.textSub, fontSize: fs(13), lineHeight: 19 }}>
                Speak at your normal volume for 3 seconds. Include any background sounds that might occur during knocking.
              </Text>
            </>
          )}

          {calibStep === "done" && (
            <>
              <View style={{ marginBottom: 10 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
                  <Text style={{ color: theme.textSub, fontSize: fs(13) }}>Your voice peak</Text>
                  <Text style={{ color: theme.text, fontSize: fs(13), fontWeight: "700" }}>{voicePct}%</Text>
                </View>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
                  <Text style={{ color: theme.textSub, fontSize: fs(13) }}>Knock threshold set at</Text>
                  <Text style={{ color: theme.accent, fontSize: fs(13), fontWeight: "700" }}>{thresholdPct}%</Text>
                </View>
                <View style={{ height: 8, backgroundColor: theme.border, borderRadius: 4, marginVertical: 8, overflow: "hidden" }}>
                  <View style={{ height: "100%", width: `${voicePct}%`, backgroundColor: theme.red, borderRadius: 4 }} />
                </View>
                <Text style={{ color: theme.textMuted, fontSize: fs(11) }}>Voice Threshold</Text>
              </View>
              <Text style={{ color: theme.accent, fontSize: fs(13), marginBottom: 10 }}>{calibMessage}</Text>
              <TouchableOpacity onPress={() => setCalibStep("idle")}>
                <Text style={{ color: theme.textSub, fontSize: fs(13), textDecorationLine: "underline", textAlign: "center" }}>
                  Recalibrate
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}

      {/* Timer */}
      <View style={{ alignItems: "center", paddingTop: 6 }}>
        <Text style={{ color: theme.text, fontSize: fs(46), fontWeight: "200", letterSpacing: 4 }}>
          {formatTime(elapsed)}
        </Text>
        <Text style={{ color: theme.textSub, fontSize: fs(14), marginTop: 2 }}>{kpm} KPM</Text>
      </View>

      {/* Knock Counter */}
      <View style={{ alignItems: "center", paddingVertical: 16 }}>
        <View style={{
          width: 160, height: 160, borderRadius: 80, backgroundColor: theme.bgCard,
          alignItems: "center", justifyContent: "center", borderWidth: 3,
          borderColor: micStatus === "active" ? theme.accent : theme.border,
        }}>
          <Text style={{ color: theme.accent, fontSize: fs(58), fontWeight: "800" }}>{knockCount}</Text>
          <Text style={{ color: theme.textMuted, fontSize: fs(10), letterSpacing: 3 }}>KNOCKS</Text>
        </View>
        {bat?.target_knocks > 0 && (
          <View style={{ alignItems: "center", marginTop: 12, width: "70%" }}>
            <View style={{ width: "100%", height: 4, backgroundColor: theme.border, borderRadius: 2, marginBottom: 5 }}>
              <View style={{
                height: 4, borderRadius: 2, backgroundColor: theme.accent,
                width: `${Math.min((((bat.total_knocks || 0) + knockCount) / bat.target_knocks) * 100, 100)}%`,
              }} />
            </View>
            <Text style={{ color: theme.textSub, fontSize: fs(12) }}>
              {(bat.total_knocks || 0) + knockCount} / {bat.target_knocks}
            </Text>
          </View>
        )}
      </View>

      {/* Manual Adjust */}
      {isRunning && (
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 20, marginBottom: 10 }}>
          <TouchableOpacity
            style={{ backgroundColor: theme.bgCard, borderRadius: 20, paddingHorizontal: 22, paddingVertical: 10, borderWidth: 1, borderColor: theme.border }}
            onPress={() => adjustKnocks(-1)}
          >
            <Text style={{ color: theme.text, fontSize: fs(16), fontWeight: "700" }}>- 1</Text>
          </TouchableOpacity>
          <Text style={{ color: theme.textSub, fontSize: fs(13) }}>Correction</Text>
          <TouchableOpacity
            style={{ backgroundColor: theme.bgCard, borderRadius: 20, paddingHorizontal: 22, paddingVertical: 10, borderWidth: 1, borderColor: theme.border }}
            onPress={() => adjustKnocks(1)}
          >
            <Text style={{ color: theme.text, fontSize: fs(16), fontWeight: "700" }}>+ 1</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Mic Status */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 14 }}>
        <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: micStatus === "active" ? theme.accent : theme.border }} />
        <Text style={{ color: theme.textSub, fontSize: fs(12) }}>
          {!hasPermission ? "No microphone permission" :
           micStatus === "active" ? "Listening — voice rejection active" :
           micStatus === "error" ? "Mic error — restart app" : "Microphone idle"}
        </Text>
      </View>

      {/* Controls */}
      <View style={{ paddingHorizontal: 20 }}>
        {!isRunning ? (
          <TouchableOpacity
            style={{ backgroundColor: theme.accent, borderRadius: 16, padding: 18, alignItems: "center", opacity: !hasPermission ? 0.5 : 1 }}
            onPress={startSession}
            disabled={!hasPermission}
          >
            <Text style={{ color: '#fff', fontSize: fs(18), fontWeight: "800" }}>Start Session</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ flexDirection: "row", gap: 12 }}>
            <TouchableOpacity
              style={{ flex: 1, backgroundColor: theme.bgCard, borderRadius: 16, padding: 18, alignItems: "center", borderWidth: 1, borderColor: theme.border }}
              onPress={isPaused ? resumeSession : pauseSession}
            >
              <Text style={{ color: theme.text, fontSize: fs(16), fontWeight: "700" }}>{isPaused ? "Resume" : "Pause"}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ flex: 1, backgroundColor: theme.accent, borderRadius: 16, padding: 18, alignItems: "center" }}
              onPress={finishSession}
            >
              <Text style={{ color: '#fff', fontSize: fs(16), fontWeight: "800" }}>Finish</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
