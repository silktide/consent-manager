/**
 * Valid consent mode strings
 * @constant {Object}
 */
export const CONSENT_MODES = {
  'EU-OPTIN': 'EU-OPTIN',
  'SOFT-OPTIN': 'SOFT-OPTIN',
  'US-OPTOUT': 'US-OPTOUT',
  'CA-OPTOUT-BANNER': 'CA-OPTOUT-BANNER',
};

/**
 * Country code to consent mode mapping
 * @constant {Object}
 */
export const COUNTRY_MODE_MAP = {
  // EU member states -> EU-OPTIN
  AT: 'EU-OPTIN',
  BE: 'EU-OPTIN',
  BG: 'EU-OPTIN',
  HR: 'EU-OPTIN',
  CY: 'EU-OPTIN',
  CZ: 'EU-OPTIN',
  DK: 'EU-OPTIN',
  EE: 'EU-OPTIN',
  FI: 'EU-OPTIN',
  FR: 'EU-OPTIN',
  DE: 'EU-OPTIN',
  GR: 'EU-OPTIN',
  HU: 'EU-OPTIN',
  IE: 'EU-OPTIN',
  IT: 'EU-OPTIN',
  LV: 'EU-OPTIN',
  LT: 'EU-OPTIN',
  LU: 'EU-OPTIN',
  MT: 'EU-OPTIN',
  NL: 'EU-OPTIN',
  PL: 'EU-OPTIN',
  PT: 'EU-OPTIN',
  RO: 'EU-OPTIN',
  SK: 'EU-OPTIN',
  SI: 'EU-OPTIN',
  ES: 'EU-OPTIN',
  SE: 'EU-OPTIN',
  // EEA (non-EU)
  IS: 'EU-OPTIN',
  LI: 'EU-OPTIN',
  NO: 'EU-OPTIN',
  // UK
  GB: 'EU-OPTIN',
  // United States -> US-OPTOUT
  US: 'US-OPTOUT',
  // Canada -> CA-OPTOUT-BANNER
  CA: 'CA-OPTOUT-BANNER',
  // Brazil -> SOFT-OPTIN
  BR: 'SOFT-OPTIN',
  // Default bucket countries -> SOFT-OPTIN
  AU: 'SOFT-OPTIN',
  NZ: 'SOFT-OPTIN',
  SG: 'SOFT-OPTIN',
  KR: 'SOFT-OPTIN',
  IN: 'SOFT-OPTIN',
  AE: 'SOFT-OPTIN',
  SA: 'SOFT-OPTIN',
  ZA: 'SOFT-OPTIN',
  MX: 'SOFT-OPTIN',
  AR: 'SOFT-OPTIN',
  CL: 'SOFT-OPTIN',
  CO: 'SOFT-OPTIN',
  JP: 'SOFT-OPTIN',
};
