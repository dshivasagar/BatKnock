/**
 * utils/generateBatReport.js
 *
 * Generates a Bat Preparation Report as HTML for PDF export.
 * Designed for cricket bat marketplace listings (eBay, Facebook etc.)
 * showing actual preparation stats and a before/after heatmap illustration.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';

const JOURNEY_KEY = 'knockmate_journey';

// ── Heat colour scale (matches app) ──────────────────────────────────────

const heatColor = (pct) => {
  if (pct >= 100) return '#e53935';
  if (pct >= 80)  return '#fb8c00';
  if (pct >= 50)  return '#fdd835';
  if (pct > 0)    return '#7cb342';
  return '#1e88e5';
};

// ── Gather report data ────────────────────────────────────────────────────

export async function getBatReportData(bat, sessions, batPoints) {
  const batSessions  = sessions.filter(s => s.bat_id === bat.id);
  const totalKnocks  = batSessions.reduce((s, x) => s + (x.knock_count      || 0), 0);
  const totalSeconds = batSessions.reduce((s, x) => s + (x.duration_seconds || 0), 0);
  const sessionCount = batSessions.length;

  const sorted       = [...batSessions].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  const firstSession = sorted[0]?.created_at || null;
  const lastSession  = sorted[sorted.length - 1]?.created_at || null;

  // Zone coverage
  const totalTarget = bat.target_knocks || 5000;
  const getCount = (z) => batPoints?.find(p => p.zone === z)?.hit_count || 0;
  const zones = {
    topEdge:   { label: 'Top Edge',   count: getCount('top-edge'),  target: totalTarget * 0.10 },
    sweetSpot: { label: 'Sweet Spot', count: getCount('sweet-spot'), target: totalTarget * 0.70 },
    edge:      { label: 'Edge',       count: getCount('edge'),       target: totalTarget * 0.15 },
    toe:       { label: 'Toe',        count: getCount('toe'),        target: totalTarget * 0.10 },
  };

  const overallCount = Object.values(zones).reduce((s, z) => s + z.count, 0);
  const readinessPct = Math.min(Math.round((overallCount / totalTarget) * 100), 100);

  // Zone percentages for heatmap
  const zonePct = (z) => Math.min(Math.round((z.count / z.target) * 100), 100);

  // Encode bat photo to base64 for PDF embedding
  let photoBase64 = null;
  if (bat.photo_uri) {
    try {
      photoBase64 = await FileSystem.readAsStringAsync(bat.photo_uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
    } catch (e) {
      console.warn('Could not read bat photo for report:', e);
    }
  }

  return {
    bat, totalKnocks, totalSeconds, sessionCount,
    firstSession, lastSession, zones, zonePct, readinessPct, photoBase64,
  };
}

// ── HTML Report Generator ─────────────────────────────────────────────────

export function generateReportHTML(data) {
  const { bat, totalKnocks, totalSeconds, sessionCount,
          firstSession, lastSession, zones, zonePct, readinessPct, photoBase64 } = data;

  const fmt = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-GB',
      { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const fmtTime = (secs) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    if (h === 0) return `${m} min`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  };

  const readinessLabel =
    readinessPct >= 100 ? 'Fully Prepared'  :
    readinessPct >= 80  ? 'Almost Ready'     :
    readinessPct >= 50  ? 'Good Progress'    :
                          'In Preparation';

  const readinessColor =
    readinessPct >= 100 ? '#16a34a' :
    readinessPct >= 80  ? '#ea580c' :
    readinessPct >= 50  ? '#ca8a04' : '#2563eb';

  const prepPeriod = firstSession && lastSession
    ? (() => {
        const days = Math.round(
          (new Date(lastSession) - new Date(firstSession)) / 86400000
        );
        return days <= 1 ? '1 day' : `${days} days`;
      })()
    : '—';

  // Zone percentages (for after heatmap)
  const tePct = zonePct(zones.topEdge);
  const ssPct = zonePct(zones.sweetSpot);
  const edPct = zonePct(zones.edge);
  const toPct = zonePct(zones.toe);

  // ── Bat silhouette heatmap (CSS-based) ───────────────────────────────
  // Heights proportional to zone allocation (Top Edge 10%, Sweet 70%, Toe 20%)
  const batMap = (te, ss, ed, to, label, sublabel) => `
    <div style="flex:1;text-align:center;">
      <div style="font-size:13px;font-weight:800;color:#111;margin-bottom:6px;">
        ${label}
      </div>
      <div style="display:inline-block;width:100px;border:2px solid #222;
        border-radius:6px;overflow:hidden;vertical-align:top;">
        <!-- Top Edge -->
        <div style="background:${heatColor(te)};height:26px;display:flex;
          align-items:center;justify-content:center;border-bottom:1px solid rgba(0,0,0,0.15);">
          <span style="font-size:8px;font-weight:700;color:rgba(0,0,0,0.7);">
            TOP EDGE ${te}%
          </span>
        </div>
        <!-- Edge band (left side - not separate block, shown in sweet spot) -->
        <!-- Sweet Spot -->
        <div style="background:${heatColor(ss)};height:100px;display:flex;
          align-items:center;justify-content:center;border-bottom:1px solid rgba(0,0,0,0.15);">
          <span style="font-size:9px;font-weight:700;color:rgba(0,0,0,0.7);text-align:center;">
            SWEET SPOT<br>${ss}%
          </span>
        </div>
        <!-- Toe -->
        <div style="background:${heatColor(to)};height:34px;display:flex;
          align-items:center;justify-content:center;">
          <span style="font-size:8px;font-weight:700;color:rgba(0,0,0,0.7);">
            TOE ${to}%
          </span>
        </div>
      </div>
      <div style="font-size:10px;color:#333;margin-top:6px;">${sublabel}</div>
    </div>
  `;

  // Colour legend
  const legendItem = (color, label) =>
    `<span style="display:inline-flex;align-items:center;gap:4px;margin:0 8px;">
      <span style="display:inline-block;width:12px;height:12px;border-radius:2px;
        background:${color};"></span>
      <span style="font-size:10px;color:#333;">${label}</span>
    </span>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Bat Preparation Report — ${bat.name || bat.brand}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;
         background:#fff; color:#111; font-size:14px; }
  .page { max-width:580px; margin:0 auto; }
  .divider { border:none; border-top:1px solid #e0e0e0; margin:0; }
</style>
</head>
<body>
<div class="page">

  <!-- Header -->
  <div style="background:#0d1117;color:#fff;padding:26px 30px;text-align:center;">
    <div style="font-size:26px;font-weight:900;letter-spacing:-0.5px;">🏏 Knockmate</div>
    <div style="font-size:11px;color:#60a5fa;margin-top:4px;letter-spacing:2px;
      text-transform:uppercase;">Cricket Bat Preparation App</div>
  </div>

  <!-- Title -->
  <div style="text-align:center;padding:20px 30px;border-bottom:2px solid #e0e0e0;">
    <div style="font-size:20px;font-weight:800;color:#111;">
      Bat Preparation Report
    </div>
    <div style="font-size:12px;color:#333;margin-top:4px;">
      ${bat.brand || ''} · Report Date: ${fmt(new Date().toISOString())}
    </div>
  </div>

  <!-- Readiness Badge -->
  <div style="text-align:center;padding:26px 30px;border-bottom:1px solid #e0e0e0;
    background:#fafafa;">
    <div style="font-size:70px;font-weight:900;line-height:1;color:${readinessColor};">
      ${readinessPct}%
    </div>
    <div style="font-size:13px;font-weight:700;color:${readinessColor};
      margin-top:6px;text-transform:uppercase;letter-spacing:1px;">
      ${readinessLabel}
    </div>
    <div style="font-size:11px;color:#333;margin-top:4px;">Overall Preparation Readiness</div>
  </div>

  <!-- Bat Specifications -->
  <div style="padding:20px 30px;border-bottom:1px solid #e0e0e0;">
    <div style="font-size:11px;font-weight:700;color:#111;letter-spacing:1.5px;
      text-transform:uppercase;margin-bottom:14px;">Bat Specifications</div>
    <table style="width:100%;border-collapse:collapse;">
      <tr>
        <td style="padding:7px 0;width:50%;vertical-align:top;">
          <div style="font-size:11px;color:#333;text-transform:uppercase;
            letter-spacing:0.5px;">Brand / Model</div>
          <div style="font-size:15px;font-weight:700;color:#111;margin-top:2px;">
            ${bat.brand || '—'}
          </div>
        </td>
        <td style="padding:7px 0;width:50%;vertical-align:top;">
          <div style="font-size:11px;color:#333;text-transform:uppercase;
            letter-spacing:0.5px;">Willow Type</div>
          <div style="font-size:15px;font-weight:700;color:#111;margin-top:2px;">
            ${bat.willow_type || '—'}
          </div>
        </td>
      </tr>
      <tr>
        <td style="padding:7px 0;vertical-align:top;">
          <div style="font-size:11px;color:#333;text-transform:uppercase;
            letter-spacing:0.5px;">Bat Size</div>
          <div style="font-size:15px;font-weight:700;color:#111;margin-top:2px;">
            ${bat.bat_size || '—'}
          </div>
        </td>
        <td style="padding:7px 0;vertical-align:top;">
          <div style="font-size:11px;color:#333;text-transform:uppercase;
            letter-spacing:0.5px;">Weight</div>
          <div style="font-size:15px;font-weight:700;color:#111;margin-top:2px;">
            ${bat.weight ? bat.weight + 'g' : '—'}
          </div>
        </td>
      </tr>
      <tr>
        <td style="padding:7px 0;vertical-align:top;">
          <div style="font-size:11px;color:#333;text-transform:uppercase;
            letter-spacing:0.5px;">Grain Count</div>
          <div style="font-size:15px;font-weight:700;color:#111;margin-top:2px;">
            ${bat.grains || '—'}
          </div>
        </td>
        <td style="padding:7px 0;vertical-align:top;">
          <div style="font-size:11px;color:#333;text-transform:uppercase;
            letter-spacing:0.5px;">Date Added</div>
          <div style="font-size:15px;font-weight:700;color:#111;margin-top:2px;">
            ${fmt(bat.created_at)}
          </div>
        </td>
      </tr>
    </table>
  </div>

  <!-- Preparation Stats -->
  <div style="padding:20px 30px;border-bottom:1px solid #e0e0e0;">
    <div style="font-size:11px;font-weight:700;color:#111;letter-spacing:1.5px;
      text-transform:uppercase;margin-bottom:14px;">Preparation Statistics</div>
    <table style="width:100%;border-collapse:collapse;">
      <tr>
        <td style="text-align:center;padding:10px 0;
          border-right:1px solid #e0e0e0;">
          <div style="font-size:28px;font-weight:900;color:#111;">
            ${totalKnocks.toLocaleString()}
          </div>
          <div style="font-size:11px;color:#333;text-transform:uppercase;
            letter-spacing:0.5px;margin-top:2px;">Total Knocks</div>
        </td>
        <td style="text-align:center;padding:10px 0;
          border-right:1px solid #e0e0e0;">
          <div style="font-size:28px;font-weight:900;color:#111;">
            ${fmtTime(totalSeconds)}
          </div>
          <div style="font-size:11px;color:#333;text-transform:uppercase;
            letter-spacing:0.5px;margin-top:2px;">Total Time</div>
        </td>
        <td style="text-align:center;padding:10px 0;">
          <div style="font-size:28px;font-weight:900;color:#111;">
            ${sessionCount}
          </div>
          <div style="font-size:11px;color:#333;text-transform:uppercase;
            letter-spacing:0.5px;margin-top:2px;">Sessions</div>
        </td>
      </tr>
    </table>
    <div style="display:flex;justify-content:space-between;margin-top:14px;
      padding-top:12px;border-top:1px solid #f0f0f0;">
      <div>
        <div style="font-size:11px;color:#333;text-transform:uppercase;
          letter-spacing:0.5px;">First Session</div>
        <div style="font-size:13px;font-weight:600;color:#111;margin-top:2px;">
          ${fmt(firstSession)}
        </div>
      </div>
      <div style="text-align:center;">
        <div style="font-size:11px;color:#333;text-transform:uppercase;
          letter-spacing:0.5px;">Duration</div>
        <div style="font-size:13px;font-weight:600;color:#111;margin-top:2px;">
          ${prepPeriod}
        </div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:11px;color:#333;text-transform:uppercase;
          letter-spacing:0.5px;">Last Session</div>
        <div style="font-size:13px;font-weight:600;color:#111;margin-top:2px;">
          ${fmt(lastSession)}
        </div>
      </div>
    </div>
  </div>

  <!-- Bat Photo -->
  ${photoBase64 ? `
  <div style="padding:0;border-bottom:1px solid #e0e0e0;">
    <img src="data:image/jpeg;base64,${photoBase64}"
      style="width:100%;max-height:260px;object-fit:cover;display:block;" />
  </div>` : ''}

  <!-- Before / After Heatmap -->
  <div style="padding:20px 30px;border-bottom:1px solid #e0e0e0;">
    <div style="font-size:11px;font-weight:700;color:#111;letter-spacing:1.5px;
      text-transform:uppercase;margin-bottom:16px;">Knocking Coverage — Before &amp; After</div>

    <div style="display:flex;gap:20px;justify-content:center;align-items:flex-start;">
      ${batMap(0, 0, 0, 0, 'BEFORE', 'No knocking')}
      <div style="display:flex;align-items:center;padding-top:60px;">
        <span style="font-size:24px;color:#555;">→</span>
      </div>
      ${batMap(tePct, ssPct, edPct, toPct, 'AFTER', readinessPct + '% complete')}
    </div>

    <!-- Heat scale legend -->
    <div style="margin-top:16px;text-align:center;padding-top:12px;
      border-top:1px solid #f0f0f0;">
      <div style="font-size:10px;color:#333;margin-bottom:6px;font-weight:600;">
        HEAT SCALE
      </div>
      <div>
        ${legendItem('#1e88e5', '0% — Not knocked')}
        ${legendItem('#7cb342', '1–49%')}
        ${legendItem('#fdd835', '50–79%')}
        ${legendItem('#fb8c00', '80–99%')}
        ${legendItem('#e53935', '100% — Done')}
      </div>
    </div>

    <!-- Disclaimer -->
    <div style="margin-top:14px;padding:12px;background:#f9f9f9;
      border-radius:6px;border-left:3px solid #999;">
      <div style="font-size:11px;color:#333;line-height:1.6;">
        <strong>Note:</strong> The heatmap above is for illustration purposes only and
        may vary based on willow quality, knocking technique, and environmental conditions.
        Actual bat condition should be assessed by handling the bat in person.
      </div>
    </div>
  </div>

  <!-- Footer -->
  <div style="background:#f5f5f5;padding:20px 30px;text-align:center;
    border-top:2px solid #e0e0e0;">
    <div style="font-size:14px;font-weight:800;color:#111;">
      🏏 Knockmate — Cricket Bat Preparation
    </div>
    <div style="font-size:11px;color:#333;margin-top:6px;line-height:1.6;">
      This report summarises the preparation data recorded by the Knockmate app.<br>
      Download Knockmate to track your bat preparation programme.
    </div>
    <div style="font-size:10px;color:#555;margin-top:10px;">
      Report generated ${new Date().toLocaleDateString('en-GB',
        { day: 'numeric', month: 'long', year: 'numeric' })}
    </div>
  </div>

</div>
</body>
</html>`;
}
