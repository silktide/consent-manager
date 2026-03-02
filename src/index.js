import './styles.css';
import { SilktideConsentManager } from './consent-manager.js';

let consentManager;

/**
 * Initialize the consent manager with the given configuration.
 * Destroys any existing instance and creates a new one.
 *
 * @param {Object} config - Configuration object
 * @returns {Promise} Resolves when the consent manager is fully initialized
 */
function init(config = {}) {
  const create = () => {
    if (consentManager) {
      consentManager.destroy();
      consentManager = null;
    }

    consentManager = new SilktideConsentManager(config);
    return consentManager._initPromise;
  };

  if (document.body) {
    return create();
  } else {
    return new Promise((resolve) => {
      document.addEventListener('DOMContentLoaded', () => resolve(create()), { once: true });
    });
  }
}

/**
 * Update the configuration by deep merging with existing config.
 * Requires an existing instance to be initialized first.
 *
 * @param {Object} newConfig - Partial configuration object to merge
 */
function update(newConfig = {}) {
  if (!consentManager) {
    console.error(
      'Silktide Consent Manager: Cannot update - no instance initialized. Call init() first.',
    );
    return;
  }

  function deepMerge(target, source) {
    const output = { ...target };
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        output[key] = deepMerge(target[key] || {}, source[key]);
      } else {
        output[key] = source[key];
      }
    }
    return output;
  }

  const mergedConfig = deepMerge(consentManager.config, newConfig);
  init(mergedConfig);
}

/**
 * Reset all consent choices and show the prompt again.
 */
function resetConsent() {
  if (!consentManager) {
    console.error('Silktide Consent Manager: Cannot reset - no instance initialized.');
    return;
  }
  consentManager.clearAllConsents();
  init(consentManager.config);
}

/**
 * Get the current consent manager instance (for advanced usage).
 * @returns {SilktideConsentManager|null}
 */
function getInstance() {
  return consentManager;
}

/**
 * Get the resolved consent mode.
 * @returns {string|null} Consent mode string or null if not yet resolved
 */
function getConsentMode() {
  return consentManager?._resolvedMode || null;
}

// Attach public API to window for script-tag usage (UMD)
window.silktideConsentManager = {
  init,
  update,
  getInstance,
  resetConsent,
  getConsentMode,
};

// Named exports for ES module consumers
export { init, update, getInstance, resetConsent, getConsentMode, SilktideConsentManager };
