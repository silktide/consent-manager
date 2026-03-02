import { CONSENT_MODES, COUNTRY_MODE_MAP } from './constants.js';

/**
 * Resolve the consent mode to use.
 * Priority: manual consentMode config > cached geo > Geoapify API > defaultMode fallback
 *
 * @param {Object} config - Consent manager config
 * @param {Object} storage - Storage helpers { get, set, remove }
 * @returns {Promise<string>} Resolved consent mode string
 */
export async function resolveConsentMode(config, storage) {
  // 1. Manual override via config
  if (config.consentMode && CONSENT_MODES[config.consentMode]) {
    if (config.debug) {
      console.log('STCM: Using manual consent mode:', config.consentMode);
    }
    return config.consentMode;
  }

  // 2. No geolocation API key -> use default mode
  const geoConfig = config.geolocation || {};
  if (!geoConfig.apiKey) {
    const defaultMode =
      geoConfig.defaultMode && CONSENT_MODES[geoConfig.defaultMode]
        ? geoConfig.defaultMode
        : 'EU-OPTIN';
    if (config.debug) {
      console.log('STCM: No API key, using default mode:', defaultMode);
    }
    return defaultMode;
  }

  // 3. Check localStorage cache for geo result
  const cachedCountry = getCachedGeoCountry(config, storage);
  if (cachedCountry) {
    if (config.debug) {
      console.log('STCM: Using cached country:', cachedCountry);
    }
    return countryToMode(cachedCountry, config);
  }

  // 4. Call Geoapify API
  try {
    const response = await fetch(
      `https://api.geoapify.com/v1/ipinfo?apiKey=${encodeURIComponent(geoConfig.apiKey)}`,
    );
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    const countryCode = data?.country?.iso_code;

    if (countryCode) {
      cacheGeoCountry(countryCode, config, storage);
      if (config.debug) {
        console.log('STCM: Geoapify country:', countryCode);
      }
      return countryToMode(countryCode, config);
    }
    throw new Error('No country code in response');
  } catch (error) {
    console.warn('STCM: Geolocation failed, using default mode.', error);
    const defaultMode =
      geoConfig.defaultMode && CONSENT_MODES[geoConfig.defaultMode]
        ? geoConfig.defaultMode
        : 'EU-OPTIN';
    return defaultMode;
  }
}

/**
 * Map a country code to a consent mode
 * @param {string} countryCode - ISO 3166-1 alpha-2 country code
 * @param {Object} config - Consent manager config
 * @returns {string} Consent mode string
 */
export function countryToMode(countryCode, config) {
  if (COUNTRY_MODE_MAP[countryCode]) {
    return COUNTRY_MODE_MAP[countryCode];
  }
  const geoConfig = config.geolocation || {};
  return geoConfig.defaultMode && CONSENT_MODES[geoConfig.defaultMode]
    ? geoConfig.defaultMode
    : 'SOFT-OPTIN';
}

/**
 * Build localStorage key for geo cache
 * @param {Object} config
 * @returns {string}
 */
export function buildGeoCacheKey(config) {
  const ns = config.namespace ? `${config.namespace}.` : '';
  return `stcm.${ns}geo`;
}

/**
 * Build localStorage key for resolved mode tracking
 * @param {Object} config
 * @returns {string}
 */
export function buildResolvedModeKey(config) {
  const ns = config.namespace ? `${config.namespace}.` : '';
  return `stcm.${ns}resolvedMode`;
}

/**
 * Get cached geo country from localStorage
 * @param {Object} config
 * @param {Object} storage - { get, set, remove }
 * @returns {string|null} Country code or null if expired/missing
 */
export function getCachedGeoCountry(config, storage) {
  const key = buildGeoCacheKey(config);
  const raw = storage.get(key);
  if (!raw) return null;

  try {
    const cached = JSON.parse(raw);
    const ttl = config.geolocation?.cacheTTL || 86400000; // 24h default
    if (Date.now() - cached.timestamp < ttl) {
      return cached.country;
    }
    // Expired
    storage.remove(key);
    return null;
  } catch {
    return null;
  }
}

/**
 * Cache geo country in localStorage
 * @param {string} countryCode - ISO country code
 * @param {Object} config
 * @param {Object} storage - { get, set, remove }
 */
export function cacheGeoCountry(countryCode, config, storage) {
  const key = buildGeoCacheKey(config);
  storage.set(
    key,
    JSON.stringify({
      country: countryCode,
      timestamp: Date.now(),
    }),
  );
}

/**
 * Check if the mode is an opt-out mode (tracking by default)
 * @param {string} mode
 * @returns {boolean}
 */
export function isOptOutMode(mode) {
  return mode === 'US-OPTOUT' || mode === 'CA-OPTOUT-BANNER';
}

/**
 * Apply Global Privacy Control signal for US-OPTOUT mode.
 * If GPC is detected, opt out of all non-required consents.
 * @param {Object} config
 * @param {Function} setConsentChoice
 * @param {Function} setHasConsented
 */
export function applyGpcSignal(config, setConsentChoice, setHasConsented) {
  if (navigator.globalPrivacyControl === true) {
    if (config.debug) {
      console.log('STCM: GPC signal detected. Opting out of non-essential tracking.');
    }
    config.consentTypes.forEach((type) => {
      setConsentChoice(type.id, !!type.required);
    });
    setHasConsented();
  }
}

/**
 * Grant all consents by default for opt-out modes.
 * Does NOT mark hasConsented so the banner (if any) still shows.
 * @param {Object} config
 * @param {Function} getConsentChoice
 * @param {Function} setConsentChoice
 */
export function grantAllConsentsByDefault(config, getConsentChoice, setConsentChoice) {
  config.consentTypes.forEach((type) => {
    if (getConsentChoice(type.id) === null) {
      setConsentChoice(type.id, true);
    }
  });
}

/**
 * Bind click handlers to [data-stcm-privacy-link] elements on the page.
 * @param {Function} openModal - Function to open preferences modal
 */
export function bindPrivacyLinks(openModal) {
  const links = document.querySelectorAll('[data-stcm-privacy-link]');
  links.forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      openModal();
    });
  });
}
