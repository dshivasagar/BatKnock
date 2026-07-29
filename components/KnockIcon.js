/**
 * components/KnockIcon.js
 *
 * Custom cricket-specific icon set for Knockmate.
 * All icons drawn from scratch — not a generic icon library.
 * Uses react-native-svg (already installed: react-native-svg 15.12.1).
 *
 * Usage:
 *   <KnockIcon id="bats" size={44} />
 *   <KnockIcon id="heatmap" size={28} />
 */
import React from 'react';
import Svg, {
  Rect, Path, Circle, Line, G, Polyline, Defs, ClipPath,
} from 'react-native-svg';

// ── Corrected cricket bat path ────────────────────────────────────────────
// Straight sides on the blade (NOT an oval) — this is what distinguishes
// a cricket bat from a racket at icon size.
const BAT = 'M18 4 L22 4 L22 13 Q30 14 30 18 L30 29 Q30 34 20 34 Q10 34 10 29 L10 18 Q10 14 18 13 Z';

// Heatmap zones — three paths that together form the bat (no clipPath needed)
const BAT_ZONE_TOP = 'M18 4 L22 4 L22 13 Q30 14 30 18 L10 18 Q10 14 18 13 Z';
const BAT_ZONE_MID = 'M10 18 L30 18 L30 26 L10 26 Z';
const BAT_ZONE_TOE = 'M10 26 L30 26 L30 29 Q30 34 20 34 Q10 34 10 29 Z';

// ── Icon definitions ──────────────────────────────────────────────────────
const ICONS = {

  // ── Cricket bat icons ──────────────────────────────────────────────────

  bats: {
    bg: '#3b82f6',
    render: (c) => (
      <G>
        <Path d={BAT} fill="white" />
        <Line x1="13" y1="20" x2="27" y2="20" stroke={c} strokeWidth="0.8" opacity="0.5" />
        <Line x1="12" y1="23" x2="28" y2="23" stroke={c} strokeWidth="0.8" opacity="0.5" />
        <Line x1="13" y1="26" x2="27" y2="26" stroke={c} strokeWidth="0.8" opacity="0.5" />
      </G>
    ),
  },

  heatmap: {
    bg: '#f97316',
    render: (c) => (
      <G>
        <Path d={BAT_ZONE_TOP} fill="#60a5fa" />
        <Path d={BAT_ZONE_MID} fill="white" />
        <Path d={BAT_ZONE_TOE} fill="#34d399" />
        <Line x1="10" y1="18" x2="30" y2="18" stroke={c} strokeWidth="1.2" />
        <Line x1="10" y1="26" x2="30" y2="26" stroke={c} strokeWidth="1.2" />
        <Path d={BAT} fill="none" stroke="white" strokeWidth="0.8" opacity="0.35" />
      </G>
    ),
  },

  session: {
    bg: '#f59e0b',
    render: (c) => (
      <G>
        <G rotation="-38" originX="18" originY="22">
          <Path
            d="M16 5 L20 5 L20 13 Q27 14 27 18 L27 27 Q27 31 18 31 Q9 31 9 27 L9 18 Q9 14 16 13 Z"
            fill="white"
          />
        </G>
        <Circle cx="29" cy="13" r="5" fill="white" />
        <Circle cx="29" cy="13" r="2.5" fill={c} />
        <Line x1="25" y1="18" x2="23" y2="21"
          stroke="white" strokeWidth="1.2" strokeLinecap="round" opacity="0.7" />
      </G>
    ),
  },

  search: {
    bg: '#0ea5e9',
    render: (c) => (
      <G>
        <Path
          d="M16 4 L20 4 L20 12 Q26 13 26 17 L26 25 Q26 29 18 29 Q10 29 10 25 L10 17 Q10 13 16 12 Z"
          fill="white" opacity="0.85"
        />
        <Circle cx="18" cy="21" r="5.5" fill="none" stroke="white" strokeWidth="2" />
        <Line x1="22" y1="25" x2="27" y2="30"
          stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      </G>
    ),
  },

  choosebat: {
    bg: '#6366f1',
    render: (c) => (
      <G>
        <Path
          d="M16 4 L20 4 L20 12 Q27 13 27 17 L27 27 Q27 32 18 32 Q9 32 9 27 L9 17 Q9 13 16 12 Z"
          fill="white" opacity="0.7"
        />
        <Circle cx="28" cy="12" r="7" fill="white" />
        <Polyline
          points="24,12 27,15 32,9"
          fill="none" stroke={c} strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round"
        />
      </G>
    ),
  },

  machine: {
    bg: '#64748b',
    render: (c) => (
      <G>
        <Path
          d="M15 4 L19 4 L19 12 Q25 13 25 17 L25 25 Q25 29 17 29 Q9 29 9 25 L9 17 Q9 13 15 12 Z"
          fill="white" opacity="0.75"
        />
        <Circle cx="29" cy="20" r="7" fill="white" />
        <Circle cx="29" cy="20" r="3" fill={c} />
        <Rect x="27.5" y="12" width="3" height="3" rx="1" fill="white" />
        <Rect x="27.5" y="25" width="3" height="3" rx="1" fill="white" />
        <Rect x="21" y="18.5" width="3" height="3" rx="1" fill="white" />
        <Rect x="35" y="18.5" width="3" height="3" rx="1" fill="white" />
      </G>
    ),
  },

  oiling: {
    bg: '#ec4899',
    render: (c) => (
      <G>
        <Path
          d="M16 5 L20 5 L20 13 Q26 14 26 18 L26 26 Q26 30 18 30 Q10 30 10 26 L10 18 Q10 14 16 13 Z"
          fill="white" opacity="0.75"
        />
        <Path d="M27 12 Q27 9 29 7 Q31 9 31 12 Q31 15 29 15 Q27 15 27 12 Z" fill="white" />
        <Path d="M30 17 Q30 14 32 12 Q34 14 34 17 Q34 20 32 20 Q30 20 30 17 Z"
          fill="white" opacity="0.75" />
        <Path d="M27 21 Q27 18 29 16 Q31 18 31 21 Q31 24 29 24 Q27 24 27 21 Z"
          fill="white" opacity="0.5" />
      </G>
    ),
  },

  light: {
    bg: '#60a5fa',
    render: (c) => (
      <G>
        <Path d={BAT} fill="white" opacity="0.6" />
        <Path d={BAT_ZONE_TOE} fill="white" />
        <G rotation="-20" originX="20" originY="20">
          <Line x1="20" y1="8" x2="20" y2="14"
            stroke="white" strokeWidth="2" strokeLinecap="round" />
        </G>
      </G>
    ),
  },

  medium: {
    bg: '#a78bfa',
    render: (c) => (
      <G>
        <Path d={BAT} fill="white" opacity="0.75" />
        <Circle cx="20" cy="22" r="5" fill={c} />
        <Circle cx="20" cy="22" r="2.5" fill="white" />
      </G>
    ),
  },

  full: {
    bg: '#34d399',
    render: (c) => (
      <G>
        <Path d={BAT} fill="white" />
        <Circle cx="20" cy="22" r="7" fill={c} />
        <Polyline points="16,22 19,25 25,18"
          fill="none" stroke="white" strokeWidth="2.5"
          strokeLinecap="round" strokeLinejoin="round" />
      </G>
    ),
  },

  // ── Non-bat icons ──────────────────────────────────────────────────────

  trends: {
    bg: '#10b981',
    render: (c) => (
      <G>
        <Rect x="8" y="25" width="7" height="10" rx="2" fill="white" opacity="0.55" />
        <Rect x="17" y="18" width="7" height="17" rx="2" fill="white" opacity="0.75" />
        <Rect x="26" y="9" width="7" height="26" rx="2" fill="white" />
        <Polyline points="11,22 20,15 29,6"
          fill="none" stroke="white" strokeWidth="1.5"
          strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
      </G>
    ),
  },

  profile: {
    bg: '#8b5cf6',
    render: (c) => (
      <G>
        <Circle cx="20" cy="14" r="7" fill="white" />
        <Path d="M6 36 Q6 26 20 26 Q34 26 34 36"
          fill="white" opacity="0.85"
          strokeLinecap="round"
        />
      </G>
    ),
  },

  season: {
    bg: '#06b6d4',
    render: (c) => (
      <G>
        <Rect x="8" y="10" width="24" height="22" rx="3" fill="white" opacity="0.9" />
        <Rect x="8" y="10" width="24" height="7" rx="3" fill="white" />
        <Rect x="8" y="13" width="24" height="4" fill="white" />
        <Line x1="13" y1="8" x2="13" y2="13" stroke="white" strokeWidth="2" strokeLinecap="round" />
        <Line x1="27" y1="8" x2="27" y2="13" stroke="white" strokeWidth="2" strokeLinecap="round" />
        <Rect x="11" y="20" width="5" height="4" rx="1" fill={c} />
        <Rect x="18" y="20" width="5" height="4" rx="1" fill={c} opacity="0.55" />
        <Rect x="25" y="20" width="4" height="4" rx="1" fill={c} opacity="0.55" />
        <Rect x="11" y="26" width="5" height="4" rx="1" fill={c} opacity="0.35" />
        <Rect x="18" y="26" width="5" height="4" rx="1" fill={c} opacity="0.35" />
      </G>
    ),
  },

  howtoknock: {
    bg: '#f59e0b',
    render: (c) => (
      <G>
        <Rect x="9" y="6" width="22" height="28" rx="3" fill="white" opacity="0.9" />
        <Line x1="13" y1="13" x2="27" y2="13" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
        <Line x1="13" y1="18" x2="24" y2="18" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
        <Line x1="13" y1="23" x2="26" y2="23" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
        <Line x1="13" y1="28" x2="21" y2="28" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
      </G>
    ),
  },

  home: {
    bg: '#3b82f6',
    render: (c) => (
      <G>
        <Path d="M20 8 L32 18 L32 33 L8 33 L8 18 Z"
          fill="none" stroke="white" strokeWidth="2" strokeLinejoin="round" />
        <Rect x="15" y="22" width="10" height="11" rx="1" fill="white" />
        <Path d="M20 8 L32 18" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" />
      </G>
    ),
  },

  report: {
    bg: '#3b82f6',
    render: (c) => (
      <G>
        <Rect x="9" y="6" width="18" height="24" rx="3" fill="white" opacity="0.9" />
        <Line x1="12" y1="12" x2="24" y2="12" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
        <Line x1="12" y1="17" x2="22" y2="17" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
        <Line x1="12" y1="22" x2="24" y2="22" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
        <Circle cx="28" cy="28" r="7" fill={c} />
        <Polyline points="24,28 27,31 32,24"
          fill="none" stroke="white" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round" />
      </G>
    ),
  },

  batcare: {
    bg: '#0891b2',
    render: (c) => (
      <G>
        <Path
          d="M20 8 Q28 10 28 18 L28 24 Q28 32 20 34 Q12 32 12 24 L12 18 Q12 10 20 8 Z"
          fill="none" stroke="white" strokeWidth="2"
        />
        <Path d={BAT} fill="white" opacity="0.9" />
      </G>
    ),
  },

  mic: {
    bg: '#475569',
    render: (c) => (
      <G>
        <Rect x="15" y="6" width="10" height="16" rx="5" fill="white" />
        <Path d="M10 22 Q10 31 20 31 Q30 31 30 22"
          fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" />
        <Line x1="20" y1="31" x2="20" y2="35" stroke="white" strokeWidth="2" strokeLinecap="round" />
      </G>
    ),
  },
};

// ── Component ─────────────────────────────────────────────────────────────

export default function KnockIcon({ id, size = 44, style }) {
  const config = ICONS[id];
  if (!config) return null;
  const r = Math.round(size * 0.275);  // corner radius scales with size
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40" style={style}>
      <Rect width="40" height="40" rx={r * 40 / size} fill={config.bg} />
      {config.render(config.bg)}
    </Svg>
  );
}

// Expose ID list for convenience
export const KNOCK_ICON_IDS = Object.keys(ICONS);
