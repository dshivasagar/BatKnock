/**
 * seasonData.js — Cricket season calendar by country
 *
 * Used for the free "Season Guide" feature (Phase 2).
 * Each country maps to a start/end month for outdoor cricket season.
 * "Year-round" countries have startMonth === endMonth === null.
 *
 * Continents grouped for the picker UI.
 */

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const SEASON_DATA = {
  Asia: [
    { country: 'India', start: 'October', end: 'May' },
    { country: 'Pakistan', start: 'October', end: 'May' },
    { country: 'Sri Lanka', start: 'January', end: 'September' },
    { country: 'Bangladesh', start: 'November', end: 'February' },
    { country: 'Afghanistan', start: 'April', end: 'October' },
    { country: 'Nepal', start: 'October', end: 'April' },
    { country: 'United Arab Emirates', start: 'October', end: 'April' },
    { country: 'Oman', start: 'October', end: 'April' },
    { country: 'Hong Kong', start: 'September', end: 'May' },
    { country: 'Singapore', start: null, end: null },
    { country: 'Malaysia', start: null, end: null },
    { country: 'Kuwait', start: 'October', end: 'April' },
    { country: 'Qatar', start: 'October', end: 'April' },
    { country: 'Bahrain', start: 'October', end: 'April' },
    { country: 'Saudi Arabia', start: 'October', end: 'April' },
    { country: 'Thailand', start: 'November', end: 'April' },
    { country: 'China', start: 'April', end: 'October' },
    { country: 'Maldives', start: 'January', end: 'April' },
    { country: 'Bhutan', start: 'March', end: 'October' },
    { country: 'Myanmar', start: 'November', end: 'April' },
    { country: 'Iran', start: 'April', end: 'October' },
    { country: 'Cambodia', start: 'November', end: 'April' },
    { country: 'Indonesia', start: 'April', end: 'October' },
    { country: 'Japan', start: 'April', end: 'October' },
    { country: 'South Korea', start: 'April', end: 'October' },
    { country: 'Mongolia', start: 'May', end: 'September' },
    { country: 'Philippines', start: 'December', end: 'May' },
    { country: 'Tajikistan', start: 'April', end: 'October' },
    { country: 'Uzbekistan', start: 'April', end: 'October' },
  ],
  Europe: [
    { country: 'England & Wales', start: 'April', end: 'September' },
    { country: 'Scotland', start: 'April', end: 'September' },
    { country: 'Ireland', start: 'April', end: 'September' },
    { country: 'Netherlands', start: 'April', end: 'September' },
    { country: 'Jersey', start: 'April', end: 'September' },
    { country: 'Guernsey', start: 'April', end: 'September' },
    { country: 'Isle of Man', start: 'April', end: 'September' },
    { country: 'Germany', start: 'April', end: 'September' },
    { country: 'France', start: 'April', end: 'September' },
    { country: 'Italy', start: 'April', end: 'September' },
    { country: 'Denmark', start: 'April', end: 'September' },
    { country: 'Belgium', start: 'April', end: 'September' },
    { country: 'Spain', start: 'March', end: 'October' },
    { country: 'Portugal', start: 'March', end: 'October' },
    { country: 'Gibraltar', start: 'April', end: 'September' },
    { country: 'Austria', start: 'April', end: 'September' },
    { country: 'Norway', start: 'May', end: 'September' },
    { country: 'Sweden', start: 'May', end: 'September' },
    { country: 'Finland', start: 'May', end: 'August' },
    { country: 'Switzerland', start: 'April', end: 'September' },
    { country: 'Czech Republic', start: 'April', end: 'September' },
    { country: 'Luxembourg', start: 'April', end: 'September' },
    { country: 'Malta', start: null, end: null },
    { country: 'Cyprus', start: 'March', end: 'November' },
    { country: 'Greece', start: 'April', end: 'October' },
    { country: 'Bulgaria', start: 'April', end: 'September' },
    { country: 'Romania', start: 'April', end: 'September' },
    { country: 'Hungary', start: 'April', end: 'September' },
    { country: 'Croatia', start: 'April', end: 'September' },
    { country: 'Slovenia', start: 'April', end: 'September' },
    { country: 'Serbia', start: 'April', end: 'September' },
    { country: 'Estonia', start: 'May', end: 'September' },
    { country: 'Israel', start: 'October', end: 'May' },
    { country: 'Turkey', start: 'April', end: 'October' },
  ],
  Africa: [
    { country: 'South Africa', start: 'October', end: 'April' },
    { country: 'Zimbabwe', start: 'September', end: 'April' },
    { country: 'Namibia', start: 'October', end: 'April' },
    { country: 'Kenya', start: null, end: null },
    { country: 'Uganda', start: null, end: null },
    { country: 'Tanzania', start: 'June', end: 'March' },
    { country: 'Nigeria', start: 'October', end: 'April' },
    { country: 'Ghana', start: 'October', end: 'April' },
    { country: 'Sierra Leone', start: 'October', end: 'April' },
    { country: 'Gambia', start: 'November', end: 'May' },
    { country: 'Botswana', start: 'September', end: 'April' },
    { country: 'Malawi', start: 'September', end: 'April' },
    { country: 'Zambia', start: 'September', end: 'April' },
    { country: 'Mozambique', start: 'April', end: 'November' },
    { country: 'Rwanda', start: null, end: null },
    { country: 'Lesotho', start: 'October', end: 'April' },
    { country: 'Eswatini', start: 'October', end: 'April' },
    { country: 'Seychelles', start: null, end: null },
    { country: 'St Helena', start: 'October', end: 'April' },
    { country: 'Cameroon', start: 'November', end: 'March' },
    { country: 'Mali', start: 'November', end: 'May' },
    { country: 'Ivory Coast', start: 'November', end: 'May' },
  ],
  Americas: [
    { country: 'West Indies', start: 'January', end: 'May' },
    { country: 'United States', start: 'April', end: 'October' },
    { country: 'Canada', start: 'May', end: 'September' },
    { country: 'Bermuda', start: 'April', end: 'September' },
    { country: 'Cayman Islands', start: 'January', end: 'June' },
    { country: 'Bahamas', start: 'January', end: 'June' },
    { country: 'Belize', start: 'January', end: 'May' },
    { country: 'Turks & Caicos', start: 'January', end: 'June' },
    { country: 'Argentina', start: 'October', end: 'April' },
    { country: 'Brazil', start: null, end: null },
    { country: 'Chile', start: 'October', end: 'April' },
    { country: 'Peru', start: 'October', end: 'April' },
    { country: 'Falkland Islands', start: 'November', end: 'March' },
    { country: 'Mexico', start: 'November', end: 'May' },
    { country: 'Costa Rica', start: 'December', end: 'April' },
    { country: 'Panama', start: 'December', end: 'April' },
    { country: 'Suriname', start: 'February', end: 'August' },
  ],
  Oceania: [
    { country: 'Australia', start: 'October', end: 'March' },
    { country: 'New Zealand', start: 'October', end: 'March' },
    { country: 'Papua New Guinea', start: 'May', end: 'November' },
    { country: 'Fiji', start: 'October', end: 'April' },
    { country: 'Vanuatu', start: null, end: null },
    { country: 'Samoa', start: null, end: null },
    { country: 'Cook Islands', start: 'October', end: 'April' },
  ],
};

export const CONTINENT_ICONS = {
  Asia: '🌏',
  Europe: '🇪🇺',
  Africa: '🌍',
  Americas: '🌎',
  Oceania: '🇳🇿',
};

// ── Helper: is a given month within the season range? ────────────────────
// Handles wrap-around seasons (e.g. October → May crosses year boundary)
export function isInSeason(start, end, monthIndex) {
  if (start === null || end === null) return true; // year-round
  const startIdx = MONTHS.indexOf(start);
  const endIdx = MONTHS.indexOf(end);
  if (startIdx <= endIdx) {
    return monthIndex >= startIdx && monthIndex <= endIdx;
  }
  // Wraps around year-end (e.g. Oct -> May)
  return monthIndex >= startIdx || monthIndex <= endIdx;
}

// ── Helper: find a country's data by name ─────────────────────────────────
export function findCountry(name) {
  for (const continent of Object.values(SEASON_DATA)) {
    const found = continent.find(c => c.country === name);
    if (found) return found;
  }
  return null;
}
