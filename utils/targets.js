/**
 * utils/targets.js
 *
 * Single source of truth for converting between a bat's knocking target
 * expressed in knocks vs. minutes, and for splitting a total time target
 * across the Light / Medium / Full prep phases.
 *
 * Design rules (do not violate these without revisiting the product reasoning):
 *
 * 1. TIME IS GROUND TRUTH. Knock counts are an estimate for display only —
 *    detection can miss or double-count knocks (decay-based debounce isn't
 *    perfect). Actual progress is always tracked against duration_seconds
 *    logged, never against raw knock_count.
 *
 * 2. The "pace" (knocks per minute) used to convert between units is LEARNED
 *    from the user's own session history, not a fixed constant — but it is
 *    NEVER shown to the user as a labeled stat ("Your avg pace: X/min").
 *    It only ever appears baked into a target estimate, e.g.
 *    "~4h 10m at your typical pace". Surfacing it as a standalone number
 *    would re-introduce the KPM-chasing problem this app deliberately avoids.
 *
 * 3. The rate is applied ONCE — at the moment a bat's target is set or
 *    edited — and the resulting target_minutes / target_knocks are then
 *    locked to that bat for the rest of its prep journey. We never silently
 *    recalculate a bat's targets mid-journey just because the learned rate
 *    drifted; that would undercut the "user-controlled, not algorithmic"
 *    principle the rest of the prep journey follows.
 */

import { getSessions } from '../storage/database';

// ─── Constants ───────────────────────────────────────────────────────────

// Starting assumption for pace (knocks/min) — based on user assumption, not
// a measured/validated figure. Used only until enough real session history
// exists, at which point getLearnedRateKPM() switches to the player's own
// actual average automatically.
export const DEFAULT_RATE_KPM = 40;

// Minimum total logged knocking time (minutes) before we trust the user's
// own learned average over the default fallback. Below this, one unusually
// fast or slow session could badly skew the estimate.
export const MIN_MINUTES_FOR_LEARNED_RATE = 30;

// How a bat's total time target splits across the three knocking phases.
// (Oiling has no time allocation — it's a fixed 24h soak, handled separately
// in PrepJourneyCard.js.)
export const PHASE_SPLIT = {
  light: 0.20,
  medium: 0.30,
  full: 0.50,
};

// ─── Learned rate ────────────────────────────────────────────────────────

/**
 * Computes the user's own average knocking pace (knocks per minute) from
 * ALL of their logged sessions, across every bat — pace is a player trait,
 * not a bat-specific one. Falls back to DEFAULT_RATE_KPM until enough
 * history exists to trust the learned figure.
 *
 * This is intentionally NOT cached/stored — it's cheap to recompute from
 * existing session data, and recomputing live means there's never a stale
 * copy to keep in sync (consistent with the single-source-of-truth goal).
 */
export async function getLearnedRateKPM() {
  const sessions = await getSessions();

  const totalKnocks = sessions.reduce((sum, s) => sum + (s.knock_count || 0), 0);
  const totalSeconds = sessions.reduce((sum, s) => sum + (s.duration_seconds || 0), 0);
  const totalMinutes = totalSeconds / 60;

  if (totalMinutes < MIN_MINUTES_FOR_LEARNED_RATE || totalKnocks === 0) {
    return DEFAULT_RATE_KPM;
  }

  const learned = totalKnocks / totalMinutes;

  // Sanity guard against pathological data (e.g. a corrupted session with
  // near-zero duration) producing an unusable rate.
  if (!isFinite(learned) || learned <= 0) {
    return DEFAULT_RATE_KPM;
  }

  return learned;
}

// ─── Conversion helpers ──────────────────────────────────────────────────

export function knocksToMinutes(knocks, rateKPM) {
  if (!knocks || !rateKPM) return 0;
  return Math.round(knocks / rateKPM);
}

export function minutesToKnocks(minutes, rateKPM) {
  if (!minutes || !rateKPM) return 0;
  return Math.round(minutes * rateKPM);
}

/**
 * Given a value in either unit, returns both, computed against the
 * (already-resolved) rate passed in. Use this at the moment a target is
 * set/edited — call getLearnedRateKPM() once, then pass the result here so
 * target_minutes and target_knocks are always derived from the same rate.
 */
export function resolveTarget({ knocks, minutes, rateKPM }) {
  if (minutes != null) {
    return {
      target_minutes: Math.round(minutes),
      target_knocks: minutesToKnocks(minutes, rateKPM),
      target_rate_used: rateKPM,
    };
  }
  if (knocks != null) {
    return {
      target_minutes: knocksToMinutes(knocks, rateKPM),
      target_knocks: Math.round(knocks),
      target_rate_used: rateKPM,
    };
  }
  return { target_minutes: null, target_knocks: null, target_rate_used: rateKPM };
}

/** Friendly "Xh Ym" formatting for a minutes value, e.g. for target previews. */
export function formatMinutesAsHours(minutes) {
  const m = Math.round(minutes || 0);
  const hrs = Math.floor(m / 60);
  const mins = m % 60;
  if (hrs === 0) return `${mins}m`;
  if (mins === 0) return `${hrs}h`;
  return `${hrs}h ${mins}m`;
}

// ─── Phase targets ───────────────────────────────────────────────────────

/**
 * Splits a bat's total target_minutes across the three knocking phases
 * using PHASE_SPLIT. Replaces the old hardcoded 60/90/120 fixed minutes —
 * every bat now gets phase targets proportional to its own total target.
 */
export function getPhaseTargetMinutes(totalTargetMinutes) {
  // Fall back to the previous fixed total (60+90+120=270) for bats created
  // before this change, so an unset target never collapses phases to 0min.
  const total = totalTargetMinutes || 270;
  return {
    light: Math.round(total * PHASE_SPLIT.light),
    medium: Math.round(total * PHASE_SPLIT.medium),
    full: Math.round(total * PHASE_SPLIT.full),
  };
}
