/**
 * HeatmapScreen.js — BatKnock v1.8.0
 *
 * DEFINITIVE FIX for zone-boundary coordinate mismatch:
 *
 * Root cause of all previous failures:
 *   The edit container was EDIT_PHOTO_HEIGHT (< PHOTO_HEIGHT). With
 *   resizeMode="cover", React Native crops the top and bottom of the photo
 *   to fill the shorter container. The default corner handles at y=0.04
 *   and y=0.93 ended up OUTSIDE the visible crop window — invisible and
 *   unreachable. Any coordinate saved was wrong relative to view mode.
 *
 * Fix: edit mode uses the SAME PHOTO_HEIGHT as view mode. No crop, no
 * coordinate mismatch. The photo is taller than the screen so a ScrollView
 * is needed — the scroll conflict is resolved using setNativeProps(), which
 * disables the ScrollView SYNCHRONOUSLY on the native thread the instant a
 * handle is touched, with zero React re-render delay.
 */
import React, { useState, useCallback, useRef } from 'react';
import { View, ScrollView, TouchableOpacity, Dimensions, Image, PanResponder } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Polygon, Line, Defs, ClipPath, Rect, LinearGradient, Stop } from 'react-native-svg';
import { useTheme } from '../ThemeContext';
import NavBar from '../components/NavBar';
import { getBatPoints, saveBat, getBatById } from '../storage/database';
import AppText from '../components/AppText';

const ZONE_LABELS = {
  'sweet-spot': 'Sweet Spot',
  'edge':       'Edge',
  'toe':        'Toe',
  'top-edge':   'Top Edge',
};

const DEFAULT_POINTS = {
  topLeft:  { x: 0.30, y: 0.04 },
  topRight: { x: 0.70, y: 0.04 },
  botRight: { x: 0.72, y: 0.93 },
  botLeft:  { x: 0.28, y: 0.93 },
  topEdgeDivider: 0.18,
  toeDivider:     0.78,
};

const BLADE_ASPECT_RATIO = 2.6;

function heatColour(pct) {
  if (pct >= 100) return '#e53935';
  if (pct >= 80)  return '#fb8c00';
  if (pct >= 50)  return '#fdd835';
  if (pct > 0)    return '#7cb342';
  return '#1e88e5';
}

export default function HeatmapScreen({ navigation, route }) {
  const { theme, fs } = useTheme();
  const initialBat = route.params?.bat;
  const [bat, setBat]               = useState(initialBat);
  const [points, setPoints]         = useState([]);
  const [editing, setEditing]       = useState(false);
  const [editPoints, setEditPoints] = useState(null);

  // Ref to the edit-mode ScrollView so we can disable scroll synchronously
  // via setNativeProps (native thread — no React re-render delay).
  const editScrollRef = useRef(null);

  const screenWidth  = Dimensions.get('window').width;
  const photoWidth   = screenWidth;
  // PHOTO_HEIGHT is the same in BOTH edit mode and view mode.
  // This guarantees that normalized (0-1) coordinates saved in edit map to
  // exactly the same visual positions in view. No crop, no offset math.
  const PHOTO_HEIGHT = Math.round(photoWidth * BLADE_ASPECT_RATIO);

  useFocusEffect(useCallback(() => { loadData(); }, []));

  const loadData = async () => {
    if (initialBat?.id) {
      const updated = await getBatById(initialBat.id);
      if (updated) setBat(updated);
      const pts = await getBatPoints(initialBat.id);
      setPoints(pts || []);
    }
  };

  // Clamp all stored coordinates to 0-1 to fix any data corrupted by older
  // buggy edit sessions.
  const sanitise = (pts) => {
    if (!pts) return { ...DEFAULT_POINTS };
    const clampXY = (p, def) => ({
      x: Math.max(0, Math.min(1, p?.x ?? def.x)),
      y: Math.max(0, Math.min(1, p?.y ?? def.y)),
    });
    return {
      topLeft:        clampXY(pts.topLeft,  DEFAULT_POINTS.topLeft),
      topRight:       clampXY(pts.topRight, DEFAULT_POINTS.topRight),
      botRight:       clampXY(pts.botRight, DEFAULT_POINTS.botRight),
      botLeft:        clampXY(pts.botLeft,  DEFAULT_POINTS.botLeft),
      topEdgeDivider: Math.max(0, Math.min(1, pts.topEdgeDivider ?? DEFAULT_POINTS.topEdgeDivider)),
      toeDivider:     Math.max(0, Math.min(1, pts.toeDivider     ?? DEFAULT_POINTS.toeDivider)),
    };
  };

  const zonePoints = sanitise({ ...DEFAULT_POINTS, ...(bat?.heatmap_points || {}) });

  // ── Zone stats ───────────────────────────────────────────────────────────
  const getCount    = (z) => points.find(p => p.zone === z)?.hit_count || 0;
  const totalTarget = bat?.target_knocks || 5000;
  const zoneTarget  = (z) => {
    if (z === 'sweet-spot') return totalTarget * 0.70;
    if (z === 'toe')        return totalTarget * 0.10;
    return totalTarget * 0.20;
  };
  const zonePct      = (z) => Math.min((getCount(z) / zoneTarget(z)) * 100, 100);
  const overallCount = ['sweet-spot', 'edge', 'toe', 'top-edge'].reduce((s, z) => s + getCount(z), 0);
  const overallPct   = Math.min((overallCount / totalTarget) * 100, 100);
  const readinessLabel =
    overallPct >= 100 ? '✅ Bat Ready'         :
    overallPct >= 80  ? '🟠 Almost Ready'      :
    overallPct >= 50  ? '🟡 Good Progress'     :
                        '🔵 Needs More Knocking';
  const readinessColour = heatColour(overallPct);

  // ── Shared coordinate helper ─────────────────────────────────────────────
  // Single toPx used by BOTH edit and view mode — always uses PHOTO_HEIGHT.
  const toPx = (pt) => {
    if (!pt || typeof pt.x !== 'number' || typeof pt.y !== 'number') return { x: 0, y: 0 };
    return { x: pt.x * photoWidth, y: pt.y * PHOTO_HEIGHT };
  };

  const zonePolygon = (yTop, yBot) => {
    const { topLeft: tl, topRight: tr, botLeft: bl, botRight: br } = zonePoints;
    const lerp = (a, b, t) => a + (b - a) * t;
    const lx  = lerp(tl.x, bl.x, yTop), lx2 = lerp(tl.x, bl.x, yBot);
    const rx  = lerp(tr.x, br.x, yTop), rx2 = lerp(tr.x, br.x, yBot);
    const ty  = lerp(tl.y, bl.y, yTop), by  = lerp(tl.y, bl.y, yBot);
    const p1 = toPx({ x: lx,  y: ty }), p2 = toPx({ x: rx,  y: ty });
    const p3 = toPx({ x: rx2, y: by }), p4 = toPx({ x: lx2, y: by });
    return `${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y} ${p4.x},${p4.y}`;
  };

  const fullClipPolygon = () =>
    [zonePoints.topLeft, zonePoints.topRight, zonePoints.botRight, zonePoints.botLeft]
      .map(pt => { const p = toPx(pt); return `${p.x},${p.y}`; }).join(' ');

  // ── Edit mode actions ────────────────────────────────────────────────────
  const startEditing  = () => {
    setEditPoints(sanitise({ ...DEFAULT_POINTS, ...(bat?.heatmap_points || {}) }));
    setEditing(true);
  };
  const cancelEditing = () => { setEditing(false); setEditPoints(null); };
  const resetPoints   = () => setEditPoints({ ...DEFAULT_POINTS });
  const saveEditing   = async () => {
    if (!bat?.id) return;
    const safe    = sanitise(editPoints);
    const updated = { ...bat, heatmap_points: safe };
    await saveBat(updated);
    setBat(updated);
    setEditing(false);
    setEditPoints(null);
  };

  // ── PanResponders ────────────────────────────────────────────────────────
  // Scroll freeze: setNativeProps on the ScrollView ref is SYNCHRONOUS on
  // the native thread — the scroll is disabled the exact moment the finger
  // touches a handle, with no React re-render delay. This is what makes
  // handles work cleanly inside a scrollable photo view.
  const freezeScroll = () => editScrollRef.current?.setNativeProps({ scrollEnabled: false });
  const thawScroll   = () => editScrollRef.current?.setNativeProps({ scrollEnabled: true });

  const makeCornerResponder = (key) => {
    let start = { x: 0, y: 0 };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder:  () => true,
      onPanResponderGrant: () => {
        freezeScroll();
        setEditPoints(prev => {
          if (prev?.[key]) start = { x: prev[key].x, y: prev[key].y };
          return prev;
        });
      },
      onPanResponderMove: (evt, gesture) => {
        setEditPoints(prev => {
          if (!prev) return prev;
          const newX = Math.max(0, Math.min(1, start.x + gesture.dx / photoWidth));
          const newY = Math.max(0, Math.min(1, start.y + gesture.dy / PHOTO_HEIGHT));
          return { ...prev, [key]: { x: newX, y: newY } };
        });
      },
      onPanResponderRelease:   thawScroll,
      onPanResponderTerminate: thawScroll,
    }).panHandlers;
  };

  const makeDividerResponder = (key) => {
    let start = 0;
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder:  () => true,
      onPanResponderGrant: () => {
        freezeScroll();
        setEditPoints(prev => { if (prev) start = prev[key]; return prev; });
      },
      onPanResponderMove: (evt, gesture) => {
        setEditPoints(prev => {
          if (!prev) return prev;
          const newY = Math.max(0, Math.min(1, start + gesture.dy / PHOTO_HEIGHT));
          return { ...prev, [key]: newY };
        });
      },
      onPanResponderRelease:   thawScroll,
      onPanResponderTerminate: thawScroll,
    }).panHandlers;
  };

  const cornerRefs = {
    topLeft:  useRef(makeCornerResponder('topLeft')).current,
    topRight: useRef(makeCornerResponder('topRight')).current,
    botLeft:  useRef(makeCornerResponder('botLeft')).current,
    botRight: useRef(makeCornerResponder('botRight')).current,
  };
  const dividerRefs = {
    topEdgeDivider: useRef(makeDividerResponder('topEdgeDivider')).current,
    toeDivider:     useRef(makeDividerResponder('toeDivider')).current,
  };

  // ── EDIT MODE ─────────────────────────────────────────────────────────────
  if (editing && editPoints) {
    const ep   = sanitise(editPoints);
    // Edit mode uses the exact same toPx as view mode (PHOTO_HEIGHT).
    const c    = toPx;
    const lerp = (a, b, t) => a + (b - a) * t;
    const divY  = (t) => lerp(ep.topLeft.y, ep.botLeft.y, t) * PHOTO_HEIGHT;
    const divXL = (t) => lerp(ep.topLeft.x, ep.botLeft.x, t) * photoWidth;
    const divXR = (t) => lerp(ep.topRight.x, ep.botRight.x, t) * photoWidth;

    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
        <NavBar navigation={navigation} title="Edit Zone Boundaries"
          subtitle="Drag corners & dividers · scroll to reach top/bottom"
          right={
            <TouchableOpacity onPress={cancelEditing}
              style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
                       backgroundColor: theme.bgInput, borderWidth: 1, borderColor: theme.border }}>
              <AppText style={{ color: theme.textMuted, fontSize: fs(13), fontWeight: '700' }}>Cancel</AppText>
            </TouchableOpacity>
          } />

        {/* Instructions + Reset */}
        <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8,
                       flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <AppText style={{ color: theme.text, fontSize: fs(12), fontWeight: '700' }}>
              Step 1 — Scroll to each corner handle and drag it to the blade edge
            </AppText>
            <AppText style={{ color: theme.textSub, fontSize: fs(11), marginTop: 1 }}>
              Step 2 — Drag the blue/red dividers to set the zone heights
            </AppText>
          </View>
          <TouchableOpacity onPress={resetPoints}
            style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, marginLeft: 10,
                     backgroundColor: '#3b82f6', borderWidth: 1, borderColor: '#3b82f6' }}>
            <AppText style={{ color: '#fff', fontSize: fs(12), fontWeight: '700' }}>Reset</AppText>
          </TouchableOpacity>
        </View>

        {/* Scrollable full-height photo — scroll is frozen synchronously via
            setNativeProps the moment any handle is touched, then re-enabled
            on release. The photo must be full PHOTO_HEIGHT so top/bottom
            handles (at y≈0.04 and y≈0.93) are visible and reachable. */}
        <ScrollView
          ref={editScrollRef}
          bounces={false}
          showsVerticalScrollIndicator={true}
          style={{ flex: 1 }}>

          <View style={{ width: photoWidth, height: PHOTO_HEIGHT, backgroundColor: '#000' }}>
            {bat?.photo_uri && (
              <Image source={{ uri: bat.photo_uri }}
                style={{ width: photoWidth, height: PHOTO_HEIGHT, position: 'absolute' }}
                resizeMode="cover" />
            )}

            <Svg width={photoWidth} height={PHOTO_HEIGHT} style={{ position: 'absolute' }}>
              <Polygon
                points={[ep.topLeft, ep.topRight, ep.botRight, ep.botLeft]
                  .map(p => `${c(p).x},${c(p).y}`).join(' ')}
                fill="rgba(59,130,246,0.18)" stroke="#fff" strokeWidth={2} />
              <Line x1={divXL(ep.topEdgeDivider)} y1={divY(ep.topEdgeDivider)}
                    x2={divXR(ep.topEdgeDivider)} y2={divY(ep.topEdgeDivider)}
                    stroke="#42a5f5" strokeWidth={3} />
              <Line x1={divXL(ep.toeDivider)} y1={divY(ep.toeDivider)}
                    x2={divXR(ep.toeDivider)} y2={divY(ep.toeDivider)}
                    stroke="#ef5350" strokeWidth={3} />
            </Svg>

            {/* Corner handles — 56pt for easy grab */}
            {['topLeft', 'topRight', 'botLeft', 'botRight'].map(key => {
              const p = c(ep[key]);
              return (
                <View key={key} {...cornerRefs[key]}
                  style={{ position: 'absolute', left: p.x - 28, top: p.y - 28,
                           width: 56, height: 56, borderRadius: 28,
                           backgroundColor: '#fff', borderWidth: 3, borderColor: theme.accent,
                           shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 5, elevation: 8 }} />
              );
            })}

            {/* Divider pills */}
            <View {...dividerRefs.topEdgeDivider}
              style={{ position: 'absolute',
                       left: (divXL(ep.topEdgeDivider) + divXR(ep.topEdgeDivider)) / 2 - 56,
                       top:  divY(ep.topEdgeDivider) - 22,
                       backgroundColor: '#42a5f5', borderRadius: 16,
                       paddingHorizontal: 16, paddingVertical: 10,
                       shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 4, elevation: 6 }}>
              <AppText style={{ color: '#fff', fontSize: fs(13), fontWeight: '700' }}>⠿ Top Edge</AppText>
            </View>
            <View {...dividerRefs.toeDivider}
              style={{ position: 'absolute',
                       left: (divXL(ep.toeDivider) + divXR(ep.toeDivider)) / 2 - 36,
                       top:  divY(ep.toeDivider) - 22,
                       backgroundColor: '#ef5350', borderRadius: 16,
                       paddingHorizontal: 16, paddingVertical: 10,
                       shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 4, elevation: 6 }}>
              <AppText style={{ color: '#fff', fontSize: fs(13), fontWeight: '700' }}>⠿ Toe</AppText>
            </View>
          </View>

          {/* Legend + Save inside scroll */}
          <View style={{ padding: 16 }}>
            <AppText style={{ color: theme.textMuted, fontSize: fs(11), lineHeight: 18, marginBottom: 16 }}>
              ○  White handles = blade corners (scroll to top/bottom to reach them){'\n'}
              ─  Blue line = top-edge / sweet-spot boundary{'\n'}
              ─  Red line = sweet-spot / toe boundary{'\n'}
              Scroll is automatically frozen while dragging a handle.
            </AppText>
            <TouchableOpacity onPress={saveEditing}
              style={{ backgroundColor: theme.accent, borderRadius: 14, padding: 18, alignItems: 'center' }}>
              <AppText style={{ color: '#fff', fontSize: fs(16), fontWeight: '800' }}>
                ✓ Save Zone Boundaries
              </AppText>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── VIEW MODE ─────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <NavBar navigation={navigation} title="Heatmap"
        subtitle={`${bat?.name || bat?.brand || 'Bat'}`}
        right={
          bat?.photo_uri ? (
            <TouchableOpacity onPress={startEditing}
              style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
                       backgroundColor: theme.bgInput, borderWidth: 1, borderColor: theme.border }}>
              <AppText style={{ color: theme.accent, fontSize: fs(12), fontWeight: '700' }}>✏️ Edit Zones</AppText>
            </TouchableOpacity>
          ) : undefined
        } />

      <ScrollView bounces={false}>
        {bat?.photo_uri ? (
          <View style={{ width: photoWidth, height: PHOTO_HEIGHT, backgroundColor: '#000' }}>
            <Image source={{ uri: bat.photo_uri }}
              style={{ width: photoWidth, height: PHOTO_HEIGHT, position: 'absolute' }}
              resizeMode="cover" />

            <Svg width={photoWidth} height={PHOTO_HEIGHT} style={{ position: 'absolute' }}>
              <Defs>
                <ClipPath id="bladeClip">
                  <Polygon points={fullClipPolygon()} />
                </ClipPath>
              </Defs>
              <Polygon points={zonePolygon(0, zonePoints.topEdgeDivider)}
                       fill={heatColour(zonePct('top-edge'))} opacity={0.55}
                       clipPath="url(#bladeClip)" />
              <Polygon points={zonePolygon(zonePoints.topEdgeDivider, zonePoints.toeDivider)}
                       fill={heatColour(zonePct('sweet-spot'))} opacity={0.55}
                       clipPath="url(#bladeClip)" />
              <Polygon points={zonePolygon(zonePoints.toeDivider, 1)}
                       fill={heatColour(zonePct('toe'))} opacity={0.55}
                       clipPath="url(#bladeClip)" />
              <Polygon points={fullClipPolygon()} fill="none" stroke="#fff" strokeOpacity={0.4} strokeWidth={1.5} />
            </Svg>

            <View style={{ position: 'absolute',
                           top: toPx({x:0, y: zonePoints.topEdgeDivider / 2 + zonePoints.topLeft.y / 2}).y - 10,
                           left: 14, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 8,
                           paddingHorizontal: 10, paddingVertical: 4 }}>
              <AppText style={{ color: '#fff', fontSize: fs(11), fontWeight: '700' }}>TOP EDGE</AppText>
            </View>
            <View style={{ position: 'absolute',
                           top: toPx({x:0, y: (zonePoints.topEdgeDivider + zonePoints.toeDivider) / 2}).y - 10,
                           left: 14, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 8,
                           paddingHorizontal: 10, paddingVertical: 4 }}>
              <AppText style={{ color: '#fff', fontSize: fs(11), fontWeight: '700' }}>
                SWEET SPOT · {zonePct('sweet-spot').toFixed(0)}%
              </AppText>
            </View>
            <View style={{ position: 'absolute',
                           top: toPx({x:0, y: (zonePoints.toeDivider + 1) / 2}).y - 10,
                           left: 14, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 8,
                           paddingHorizontal: 10, paddingVertical: 4 }}>
              <AppText style={{ color: '#fff', fontSize: fs(11), fontWeight: '700' }}>TOE</AppText>
            </View>
          </View>
        ) : (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <AppText style={{ fontSize: 52, marginBottom: 12 }}>🏏</AppText>
            <AppText style={{ color: theme.text, fontSize: fs(15), fontWeight: '700', textAlign: 'center' }}>
              Add a bat photo to see the heatmap
            </AppText>
            <AppText style={{ color: theme.textSub, fontSize: fs(13), textAlign: 'center', marginTop: 6 }}>
              Go back to the bat profile and tap "Add Bat Photo"
            </AppText>
          </View>
        )}

        <View style={{ padding: 16 }}>
          <View style={{ backgroundColor: theme.bgCard, borderRadius: 14, padding: 14,
                         marginBottom: 16, borderWidth: 1, borderColor: theme.border }}>
            <AppText style={{ color: theme.textMuted, fontSize: fs(10), fontWeight: '700',
                              letterSpacing: 0.5, marginBottom: 8 }}>HEAT SCALE</AppText>
            <Svg width={screenWidth - 60} height={14}>
              <Defs>
                <LinearGradient id="heatGrad" x1="0" y1="0" x2="1" y2="0">
                  <Stop offset="0"    stopColor="#1e88e5" />
                  <Stop offset="0.33" stopColor="#7cb342" />
                  <Stop offset="0.6"  stopColor="#fdd835" />
                  <Stop offset="0.8"  stopColor="#fb8c00" />
                  <Stop offset="1"    stopColor="#e53935" />
                </LinearGradient>
              </Defs>
              <Rect x={0} y={0} width={screenWidth - 60} height={14} rx={7} fill="url(#heatGrad)" />
            </Svg>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
              <AppText style={{ color: theme.textSub, fontSize: fs(10) }}>0% (not knocked)</AppText>
              <AppText style={{ color: theme.textSub, fontSize: fs(10) }}>100% (done)</AppText>
            </View>
          </View>

          <View style={{ backgroundColor: theme.bgCard, borderRadius: 16,
                         padding: 18, marginBottom: 20, borderWidth: 2, borderColor: readinessColour }}>
            <AppText style={{ color: readinessColour, fontSize: fs(18), fontWeight: '800' }}>
              {readinessLabel}
            </AppText>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
              <AppText style={{ color: theme.textMuted, fontSize: fs(13) }}>Overall progress</AppText>
              <AppText style={{ color: theme.text, fontSize: fs(13), fontWeight: '700' }}>
                {overallCount} knocks · {overallPct.toFixed(0)}%
              </AppText>
            </View>
            <View style={{ height: 8, backgroundColor: theme.border, borderRadius: 4, marginTop: 8 }}>
              <View style={{ height: 8, width: `${overallPct}%`, backgroundColor: readinessColour, borderRadius: 4 }} />
            </View>
          </View>

          <AppText style={{ color: theme.textMuted, fontSize: fs(11), fontWeight: '700',
                           letterSpacing: 0.5, marginBottom: 10 }}>ZONE BREAKDOWN</AppText>
          {['top-edge', 'sweet-spot', 'edge', 'toe'].map(zone => {
            const count  = getCount(zone);
            const pct    = zonePct(zone);
            const colour = heatColour(pct);
            return (
              <View key={zone} style={{ backgroundColor: theme.bgCard, borderRadius: 14,
                                        padding: 14, marginBottom: 8,
                                        flexDirection: 'row', alignItems: 'center',
                                        borderWidth: 1, borderColor: theme.border }}>
                <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: colour, marginRight: 12 }} />
                <View style={{ flex: 1 }}>
                  <AppText style={{ color: theme.text, fontSize: fs(14), fontWeight: '700' }}>
                    {ZONE_LABELS[zone]}
                  </AppText>
                  <AppText style={{ color: theme.textSub, fontSize: fs(12), marginTop: 2 }}>
                    {count} knocks · target {Math.round(zoneTarget(zone)).toLocaleString()}
                  </AppText>
                </View>
                <AppText style={{ color: colour, fontSize: fs(18), fontWeight: '800' }}>
                  {pct.toFixed(0)}%
                </AppText>
              </View>
            );
          })}
        </View>
        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
