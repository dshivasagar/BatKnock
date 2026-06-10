import AsyncStorage from '@react-native-async-storage/async-storage';

// Keys
const KEYS = {
  BATS: 'batknock_bats',
  SESSIONS: 'batknock_sessions',
  BAT_POINTS: 'batknock_bat_points',
  ACOUSTIC: 'batknock_acoustic',
};

// ─── BAT CRUD ───────────────────────────────────────────────
export async function saveBat(bat) {
  const bats = await getBats();
  const existing = bats.findIndex(b => b.id === bat.id);
  if (existing >= 0) {
    bats[existing] = bat;
  } else {
    bats.push(bat);
  }
  await AsyncStorage.setItem(KEYS.BATS, JSON.stringify(bats));
  return bat;
}

export async function getBats() {
  const data = await AsyncStorage.getItem(KEYS.BATS);
  return data ? JSON.parse(data) : [];
}

export async function getBatById(id) {
  const bats = await getBats();
  return bats.find(b => b.id === id) || null;
}

export async function deleteBat(id) {
  const bats = await getBats();
  const filtered = bats.filter(b => b.id !== id);
  await AsyncStorage.setItem(KEYS.BATS, JSON.stringify(filtered));
  // Also delete related data
  await deleteSessionsByBat(id);
  await deleteBatPoints(id);
}

// ─── SESSION CRUD ────────────────────────────────────────────
export async function saveSession(session) {
  const sessions = await getSessions();
  const existing = sessions.findIndex(s => s.id === session.id);
  if (existing >= 0) {
    sessions[existing] = session;
  } else {
    sessions.push(session);
  }
  await AsyncStorage.setItem(KEYS.SESSIONS, JSON.stringify(sessions));
  return session;
}

export async function getSessions() {
  const data = await AsyncStorage.getItem(KEYS.SESSIONS);
  return data ? JSON.parse(data) : [];
}

export async function getSessionsByBat(batId) {
  const sessions = await getSessions();
  return sessions.filter(s => s.bat_id === batId);
}

export async function deleteSessionsByBat(batId) {
  const sessions = await getSessions();
  const filtered = sessions.filter(s => s.bat_id !== batId);
  await AsyncStorage.setItem(KEYS.SESSIONS, JSON.stringify(filtered));
}

// ─── BAT POINTS (HIT MAP) ────────────────────────────────────
export async function saveBatPoints(batId, points) {
  const all = await getAllBatPoints();
  all[batId] = points;
  await AsyncStorage.setItem(KEYS.BAT_POINTS, JSON.stringify(all));
}

export async function getBatPoints(batId) {
  const all = await getAllBatPoints();
  return all[batId] || [];
}

export async function getAllBatPoints() {
  const data = await AsyncStorage.getItem(KEYS.BAT_POINTS);
  return data ? JSON.parse(data) : {};
}

export async function deleteBatPoints(batId) {
  const all = await getAllBatPoints();
  delete all[batId];
  await AsyncStorage.setItem(KEYS.BAT_POINTS, JSON.stringify(all));
}

// ─── ACOUSTIC BASELINE ───────────────────────────────────────
export async function saveAcousticBaseline(batId, baseline) {
  const all = await AsyncStorage.getItem(KEYS.ACOUSTIC);
  const data = all ? JSON.parse(all) : {};
  data[batId] = { ...baseline, created_at: new Date().toISOString() };
  await AsyncStorage.setItem(KEYS.ACOUSTIC, JSON.stringify(data));
}

export async function getAcousticBaseline(batId) {
  const all = await AsyncStorage.getItem(KEYS.ACOUSTIC);
  const data = all ? JSON.parse(all) : {};
  return data[batId] || null;
}

// ─── ACTIVE SESSION (autosave) ───────────────────────────────
export async function saveActiveSession(sessionData) {
  await AsyncStorage.setItem('batknock_active_session', JSON.stringify(sessionData));
}

export async function getActiveSession() {
  const data = await AsyncStorage.getItem('batknock_active_session');
  return data ? JSON.parse(data) : null;
}

export async function clearActiveSession() {
  await AsyncStorage.removeItem('batknock_active_session');
}

// ─── STATS ───────────────────────────────────────────────────
export async function getOverallStats() {
  const sessions = await getSessions();
  const bats = await getBats();
  const totalKnocks = sessions.reduce((sum, s) => sum + (s.knock_count || 0), 0);
  const totalTime = sessions.reduce((sum, s) => sum + (s.duration_seconds || 0), 0);
  return {
    totalBats: bats.length,
    totalSessions: sessions.length,
    totalKnocks,
    totalTimeMinutes: Math.round(totalTime / 60),
  };
}

// ─── HELPERS ─────────────────────────────────────────────────
export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}
