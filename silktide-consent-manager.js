'use strict';

/**
 * Silktide Consent Manager v2.0
 * https://silktide.com/consent-manager/
 * This class is typically not instantiated directly. Use the global
 * window.silktideConsentManager API below.
 * 
 * @class
 * @param {Object} config - Configuration object for the consent manager
 */
class SilktideConsentManager {
  constructor(config) {
    this._validateConfig(config);
    this.config = config;

    // Set default eventName if not provided
    this.config.eventName = this.config.eventName || 'stcm_consent_update';
    
    // Set default debug mode (false = no console logs in production)
    // Ensure debug is a boolean, default to false
    this.config.debug = this.config.debug === true;

    this.wrapper = null;
    this.prompt = null;
    this.preferences = null;
    this.icon = null;
    this.backdrop = null;
    this.localStorageAvailable = this._checkLocalStorageAvailable();
    this._needsReload = false;

    this.createWrapper();

    if (this.shouldShowBackdrop()) {
      this.createBackdrop();
    }

    this.createCookieIcon();
    this.createModal();

    if (this.shouldShowPrompt()) {
      this.createBanner();
      this.showBackdrop();
    } else {
      this.showCookieIcon();
    }

    this.setupEventListeners();

    // Always run consent callbacks on load (handles required consents even on first visit)
    this.runConsentCallbacksOnLoad();
  }

  /**
   * Validate configuration object
   * @private
   * @param {Object} config - Configuration to validate
   * @throws {Error} If config is invalid
   */
  _validateConfig(config) {
    if (!config) {
      throw new Error('Silktide Consent Manager: config is required');
    }
    if (!config.consentTypes || !Array.isArray(config.consentTypes)) {
      throw new Error('Silktide Consent Manager: config.consentTypes must be an array');
    }
    if (config.consentTypes.length === 0) {
      throw new Error('Silktide Consent Manager: config.consentTypes cannot be empty');
    }
  }

  /**
   * Check if localStorage is available and accessible
   * @private
   * @returns {boolean} True if localStorage can be used
   */
  _checkLocalStorageAvailable() {
    try {
      const testKey = '__stcm_test__';
      localStorage.setItem(testKey, '1');
      localStorage.removeItem(testKey);
      return true;
    } catch (e) {
      console.warn('Silktide Consent Manager: localStorage is not available. Consent choices will not persist.', e);
      return false;
    }
  }

  /**
   * Safely get item from localStorage with error handling
   * @private
   * @param {string} key - localStorage key
   * @returns {string|null} Value from localStorage or null
   */
  _getLocalStorageItem(key) {
    if (!this.localStorageAvailable) {
      return null;
    }
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.warn('Silktide Consent Manager: Error reading from localStorage', e);
      return null;
    }
  }

  /**
   * Safely set item in localStorage with error handling
   * @private
   * @param {string} key - localStorage key
   * @param {string} value - Value to store
   * @returns {boolean} True if successful
   */
  _setLocalStorageItem(key, value) {
    if (!this.localStorageAvailable) {
      return false;
    }
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (e) {
      console.warn('Silktide Consent Manager: Error writing to localStorage', e);
      return false;
    }
  }

  /**
   * Safely remove item from localStorage with error handling
   * @private
   * @param {string} key - localStorage key
   * @returns {boolean} True if successful
   */
  _removeLocalStorageItem(key) {
    if (!this.localStorageAvailable) {
      return false;
    }
    try {
      localStorage.removeItem(key);
      return true;
    } catch (e) {
      console.warn('Silktide Consent Manager: Error removing from localStorage', e);
      return false;
    }
  }

  /**
   * Clean up and remove all consent manager elements from the DOM
   */
  destroy() {
    // Remove all consent manager elements from the DOM
    if (this.wrapper && this.wrapper.parentNode) {
      this.wrapper.parentNode.removeChild(this.wrapper);
    }

    // Restore scrolling
    this.allowBodyScroll();

    // Clear all references
    this.wrapper = null;
    this.prompt = null;
    this.preferences = null;
    this.icon = null;
    this.backdrop = null;
  }

  /**
   * Clear all consent choices from localStorage
   * Clears both old and new key patterns for this namespace
   */
  clearAllConsents() {
    if (!this.localStorageAvailable) {
      return;
    }

    const keysToRemove = [];

    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        // Match both old and new key patterns
        if (key && (
          key.startsWith('silktideCookieBanner_') ||
          key.startsWith('silktideCookieChoice_') ||
          key.startsWith('stcm.')
        )) {
          keysToRemove.push(key);
        }
      }

      keysToRemove.forEach(key => this._removeLocalStorageItem(key));
    } catch (e) {
      // Ignore errors
    }
  }

  // ----------------------------------------------------------------
  // localStorage Helper Methods (with lazy migration)
  // ----------------------------------------------------------------

  // Old key builders (for migration only)
  _buildOldConsentKey(typeId) {
    const suffix = this.config.namespace ? `_${this.config.namespace}` : '';
    return `silktideCookieChoice_${typeId}${suffix}`;
  }

  _buildOldHasConsentedKey() {
    const suffix = this.config.namespace ? `_${this.config.namespace}` : '';
    return `silktideCookieBanner_InitialChoice${suffix}`;
  }

  // New key builders
  _buildConsentKey(typeId) {
    const ns = this.config.namespace ? `${this.config.namespace}.` : '';
    return `stcm.${ns}consent.${typeId}`;
  }

  _buildHasConsentedKey() {
    const ns = this.config.namespace ? `${this.config.namespace}.` : '';
    return `stcm.${ns}hasConsented`;
  }

  /**
   * Get the consent choice for a specific consent type
   * @param {string} typeId - The consent type ID
   * @returns {boolean|null} True if accepted, false if rejected, null if no choice made
   */
  getConsentChoice(typeId) {
    const newKey = this._buildConsentKey(typeId);
    let value = this._getLocalStorageItem(newKey);

    // Migration: Check old key if new key doesn't exist
    if (value === null) {
      const oldKey = this._buildOldConsentKey(typeId);
      value = this._getLocalStorageItem(oldKey);

      if (value !== null) {
        // Migrate: write to new key, delete old key
        this._setLocalStorageItem(newKey, value);
        this._removeLocalStorageItem(oldKey);
      }
    }

    // Return null if no value exists, otherwise return boolean
    return value === null ? null : value === 'true';
  }

  /**
   * Set the consent choice for a specific consent type
   * @param {string} typeId - The consent type ID
   * @param {boolean} accepted - Whether the consent is accepted
   */
  setConsentChoice(typeId, accepted) {
    const newKey = this._buildConsentKey(typeId);
    this._setLocalStorageItem(newKey, accepted.toString());

    // Cleanup: remove old key if it exists
    const oldKey = this._buildOldConsentKey(typeId);
    if (this._getLocalStorageItem(oldKey) !== null) {
      this._removeLocalStorageItem(oldKey);
    }
  }

  /**
   * Check if user has made an initial consent choice
   * @returns {boolean} True if user has consented
   */
  getHasConsented() {
    const newKey = this._buildHasConsentedKey();
    let value = this._getLocalStorageItem(newKey);

    // Migration: Check old key if new key doesn't exist
    if (value === null) {
      const oldKey = this._buildOldHasConsentedKey();
      value = this._getLocalStorageItem(oldKey);

      if (value !== null) {
        this._setLocalStorageItem(newKey, value);
        this._removeLocalStorageItem(oldKey);
      }
    }

    return value !== null;
  }

  setHasConsented() {
    const newKey = this._buildHasConsentedKey();
    this._setLocalStorageItem(newKey, '1');

    // Cleanup old key
    const oldKey = this._buildOldHasConsentedKey();
    if (this._getLocalStorageItem(oldKey) !== null) {
      this._removeLocalStorageItem(oldKey);
    }
  }

  // ----------------------------------------------------------------
  // Script Injection
  // ----------------------------------------------------------------

  /**
   * Inject a script element with specified attributes
   * @private
   * @param {Object} scriptConfig - Script configuration
   * @param {string} consentId - Consent type ID (for tracking)
   */
  _injectScript(scriptConfig, consentId) {
    const { url, load, type, crossorigin, integrity } = scriptConfig;

    if (!url) {
      console.warn('Silktide Consent Manager: Script URL is required', scriptConfig);
      return;
    }

    // Check if script already exists
    const existingScript = document.querySelector(`script[src="${url}"]`);
    if (existingScript) {
      return; // Already injected
    }

    const script = document.createElement('script');
    script.src = url;
    script.dataset.consentId = consentId; // Track which consent type added this

    if (load === 'async') script.async = true;
    if (load === 'defer') script.defer = true;
    if (type) script.type = type;
    if (crossorigin) script.crossOrigin = crossorigin;
    if (integrity) script.integrity = integrity;

    document.head.appendChild(script);
  }

  /**
   * Inject all scripts for a consent type
   * @private
   * @param {Object} consentType - Consent type configuration
   */
  _injectConsentScripts(consentType) {
    if (!consentType.scripts || !Array.isArray(consentType.scripts)) {
      return;
    }

    consentType.scripts.forEach(scriptConfig => {
      this._injectScript(scriptConfig, consentType.id);
    });
  }

  /**
   * Check if consent was revoked (changed from accepted to rejected)
   * @private
   * @param {string} consentId - Consent type ID
   * @param {boolean} newState - New consent state
   * @returns {boolean} True if consent was revoked
   */
  _wasConsentRevoked(consentId, newState) {
    const previousState = this.getConsentChoice(consentId);
    // Consent was revoked if: previously true, now false
    return previousState === true && newState === false;
  }

  // ----------------------------------------------------------------
  // Wrapper
  // ----------------------------------------------------------------
  createWrapper() {
    this.wrapper = document.createElement('div');
    this.wrapper.id = 'stcm-wrapper';
    document.body.insertBefore(this.wrapper, document.body.firstChild);
  }

  // ----------------------------------------------------------------
  // Wrapper Child Generator
  // ----------------------------------------------------------------
  createWrapperChild(htmlContent, id) {
    // Create child element
    const child = document.createElement('div');
    child.id = id;
    child.innerHTML = htmlContent;

    // Ensure wrapper exists
    if (!this.wrapper || !document.body.contains(this.wrapper)) {
      this.createWrapper();
    }

    // Append child to wrapper
    this.wrapper.appendChild(child);
    return child;
  }

  // ----------------------------------------------------------------
  // Backdrop
  // ----------------------------------------------------------------
  createBackdrop() {
    this.backdrop = this.createWrapperChild(null, 'stcm-backdrop');

    // Add click handler to nudge banner/modal when backdrop is clicked
    this.backdrop.addEventListener('click', () => {
      this.nudgePrompt();
    });
  }

  showBackdrop() {
    if (this.backdrop) {
      this.backdrop.style.display = 'block';
    }
    // Trigger optional onBackdropOpen callback
    if (typeof this.config.onBackdropOpen === 'function') {
      this.config.onBackdropOpen();
    }
  }

  hideBackdrop() {
    if (this.backdrop) {
      this.backdrop.style.display = 'none';
    }

    // Trigger optional onBackdropClose callback
    if (typeof this.config.onBackdropClose === 'function') {
      this.config.onBackdropClose();
    }
  }

  /**
   * Check if backdrop should be shown
   * @private
   * @returns {boolean} True if backdrop should be shown
   */
  shouldShowBackdrop() {
    return this.config?.backdrop?.show || false;
  }

  /**
   * Nudge the consent prompt to draw attention when backdrop is clicked
   * 
   * Note: This deliberately only nudges the prompt, not the modal.
   * The prompt is the initial banner that requires immediate action.
   * Nudging the modal would be disruptive to users reviewing preferences.
   * 
   * @private
   */
  nudgePrompt() {
    if (!this.prompt) {
      return;
    }

    // Remove class if it exists
    this.prompt.classList.remove('stcm-nudge');

    // Force reflow to restart animation
    void this.prompt.offsetWidth;

    // Add class to trigger animation
    this.prompt.classList.add('stcm-nudge');

    // Remove class when animation completes (CSS defines duration)
    this.prompt.addEventListener('animationend', () => {
      if (this.prompt) {
        this.prompt.classList.remove('stcm-nudge');
      }
    }, { once: true });
  }

  // update the checkboxes in the preferences with the values from localStorage
  updateCheckboxState(saveToStorage = false) {
    const preferencesSection = this.preferences.querySelector('#stcm-form');
    const checkboxes = preferencesSection.querySelectorAll('input[type="checkbox"]');

    checkboxes.forEach((checkbox) => {
      const [, consentId] = checkbox.id.split('consent-');
      const consentType = this.config.consentTypes.find(type => type.id === consentId);

      if (!consentType) return;

      if (saveToStorage) {
        // Save the current state to localStorage and run callbacks
        const currentState = checkbox.checked;

        if (consentType.required) {
          this.setConsentChoice(consentId, true);
        } else {
          // Check if the value actually changed
          const previousValue = this.getConsentChoice(consentId);

          // Check if consent was revoked (and had scripts)
          const wasRevoked = this._wasConsentRevoked(consentId, currentState);
          const hadScripts = consentType.scripts?.length > 0;

          this.setConsentChoice(consentId, currentState);

          // Only trigger integration and callbacks if value changed
          // Note: previousValue can be:
          //   - null: User never made a choice (using default)
          //   - true: User previously accepted
          //   - false: User previously rejected
          // We fire callbacks even when changing from null to false/true
          // because it represents an explicit choice being made
          if (currentState !== previousValue) {
            // Trigger automatic consent integration
            this.triggerConsentIntegration(consentType, currentState);

            // Run appropriate callback
            if (currentState && typeof consentType.onAccept === 'function') {
              consentType.onAccept();
            } else if (!currentState && typeof consentType.onReject === 'function') {
              consentType.onReject();
            }
          }

          // Track if any consent was revoked for page reload
          if (wasRevoked && hadScripts) {
            this._needsReload = true;
          }
        }
      } else {
        // When reading values (opening preferences)
        if (consentType.required) {
          checkbox.checked = true;
          checkbox.disabled = true;
        } else {
          const storedValue = this.getConsentChoice(consentId);

          if (storedValue !== null) {
            checkbox.checked = storedValue;
          } else {
            checkbox.checked = !!consentType.defaultValue;
          }
        }
      }
    });
  }

  /**
   * Trigger GTM consent updates based on consentType.gtag property
   */
  triggerConsentIntegration(consentType, accepted) {
    // Check if gtag parameter(s) are specified
    if (!consentType.gtag) {
      return;
    }

    // Normalize to array for consistent handling
    const gtagParams = Array.isArray(consentType.gtag) ? consentType.gtag : [consentType.gtag];

    // If GTM exists, call gtag
    if (typeof gtag === 'function') {
      const consentState = accepted ? 'granted' : 'denied';
      const consentUpdate = {};

      gtagParams.forEach(param => {
        consentUpdate[param] = consentState;
      });

      gtag('consent', 'update', consentUpdate);
    } else if (gtagParams.includes('analytics_storage')) {
      // Otherwise, if Silktide Analytics exists, fire consent event
      if (typeof window.silktide === 'function') {
        window.silktide(accepted ? 'consent' : 'unconsent');
      }
    }

    // Push generic consent update event to dataLayer for GTM tag triggers
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ 'event': this.config.eventName });
  }

  /**
   * Batch update all consents at once
   * Compares current states against localStorage and only triggers updates if changes detected
   * @param {Object} consentStates - Object mapping consent type IDs to boolean values
   * @returns {boolean} - True if any changes were made
   */
  batchUpdateConsents(consentStates) {
    const changes = [];
    const gtagConsentUpdate = {};
    let hasChanges = false;
    let needsReload = false;

    // First pass: identify changes and build gtag consent object
    this.config.consentTypes.forEach((type) => {
      const newState = consentStates[type.id];
      const previousState = this.getConsentChoice(type.id);
      
      // Check if this consent actually changed
      if (newState !== previousState) {
        hasChanges = true;
        
        changes.push({
          type: type,
          newState: newState,
          previousState: previousState
        });

        // Check if consent was revoked and had scripts
        const wasRevoked = previousState === true && newState === false;
        const hadScripts = type.scripts?.length > 0;
        if (wasRevoked && hadScripts) {
          needsReload = true;
        }

        // Build gtag consent parameters
        if (type.gtag) {
          const gtagParams = Array.isArray(type.gtag) ? type.gtag : [type.gtag];
          const consentState = newState ? 'granted' : 'denied';
          gtagParams.forEach(param => {
            gtagConsentUpdate[param] = consentState;
          });
        }
      }
    });

    // If no changes, return early
    if (!hasChanges) {
      return false;
    }

    // Second pass: save to localStorage
    changes.forEach(({ type, newState }) => {
      this.setConsentChoice(type.id, newState);
    });

    // Call gtag once with all consent updates
    if (Object.keys(gtagConsentUpdate).length > 0 && typeof gtag === 'function') {
      gtag('consent', 'update', gtagConsentUpdate);
      if (this.config.debug) {
        console.log('✓ gtag consent updated (from user action):', gtagConsentUpdate);
      }
    } else if (gtagConsentUpdate.analytics_storage) {
      // Silktide Analytics fallback
      if (typeof window.silktide === 'function') {
        const analyticsGranted = gtagConsentUpdate.analytics_storage === 'granted';
        window.silktide(analyticsGranted ? 'consent' : 'unconsent');
      }
    }

    // Fire single GTM event
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ 'event': this.config.eventName });
    if (this.config.debug) {
      console.log('▶ GTM Event Sent: ' + this.config.eventName + ' (from user action)');
    }

    // Third pass: run callbacks and inject scripts
    changes.forEach(({ type, newState }) => {
      if (newState) {
        this._injectConsentScripts(type);
        if (typeof type.onAccept === 'function') {
          type.onAccept();
        }
      } else {
        if (typeof type.onReject === 'function') {
          type.onReject();
        }
      }
    });

    // Reload page if consent was revoked and scripts were injected
    if (needsReload) {
      setTimeout(() => {
        window.location.reload();
      }, 100);
    }

    return true;
  }

  // ----------------------------------------------------------------
  // Consent Handling
  // ----------------------------------------------------------------
  handleConsentChoice(accepted) {
    // We set that an initial choice was made regardless of what it was so we don't show the prompt again
    this.setHasConsented();

    this.removeBanner();
    this.hideBackdrop();
    this.toggleModal(false);
    this.showCookieIcon();

    // Build consent states object for all consent types
    const consentStates = {};
    this.config.consentTypes.forEach((type) => {
      if (type.required) {
        consentStates[type.id] = true;
      } else {
        consentStates[type.id] = accepted;
      }
    });

    // Use batch update to set all consents at once
    this.batchUpdateConsents(consentStates);

    // Trigger optional onAcceptAll/onRejectAll callbacks
    if (accepted && typeof this.config.onAcceptAll === 'function') {
      this.config.onAcceptAll();
    } else if (!accepted && typeof this.config.onRejectAll === 'function') {
      this.config.onRejectAll();
    }

    // finally update the checkboxes in the modal with the values from localStorage
    this.updateCheckboxState();
  }

  /**
   * Get all accepted consents as an object
   * @returns {Object} Object mapping consent type IDs to their accepted state
   */
  getAcceptedConsents() {
    return (this.config.consentTypes || []).reduce((acc, consentType) => {
      acc[consentType.id] = this.getConsentChoice(consentType.id);
      return acc;
    }, {});
  }

  /**
   * Get all rejected consents as an object
   * @returns {Object} Object mapping consent type IDs to their rejected state
   */
  getRejectedConsents() {
    return (this.config.consentTypes || []).reduce((acc, consentType) => {
      const choice = this.getConsentChoice(consentType.id);
      // Only return true if explicitly rejected (false), not if no choice made (null)
      acc[consentType.id] = choice === false;
      return acc;
    }, {});
  }

  /**
   * Run all consent callbacks on page load
   * Builds a single gtag consent object with both accepted and rejected consents
   * Fires one GTM event only if this is the first consent load
   */
  runConsentCallbacksOnLoad() {
    if (!this.config.consentTypes) return;

    // Build a single gtag consent object with both accepted and rejected consents
    const gtagConsentUpdate = {};
    let hasGtagUpdates = false;
    let isFirstConsentLoad = false;

    const acceptedConsents = this.getAcceptedConsents();
    const rejectedConsents = this.getRejectedConsents();

    // Process all consent types and build one comprehensive gtag object
    this.config.consentTypes.forEach((type) => {
      // Handle required consents (always inject scripts and run onAccept)
      if (type.required) {
        // Set to localStorage immediately if not already set (prevents duplicate firing)
        const currentValue = this.getConsentChoice(type.id);
        if (currentValue === null) {
          this.setConsentChoice(type.id, true);
          isFirstConsentLoad = true; // Required consent was just set for first time
        }
        
        this._injectConsentScripts(type);
        
        // Add required consents to gtag update (always granted)
        if (type.gtag) {
          hasGtagUpdates = true;
          const gtagParams = Array.isArray(type.gtag) ? type.gtag : [type.gtag];
          gtagParams.forEach(param => {
            gtagConsentUpdate[param] = 'granted';
          });
        }
        
        if (typeof type.onAccept === 'function') {
          type.onAccept();
        }
        return;
      }

      // Check if accepted
      if (acceptedConsents[type.id]) {
        this._injectConsentScripts(type);
        
        if (type.gtag) {
          hasGtagUpdates = true;
          const gtagParams = Array.isArray(type.gtag) ? type.gtag : [type.gtag];
          gtagParams.forEach(param => {
            gtagConsentUpdate[param] = 'granted';
          });
        }

        if (typeof type.onAccept === 'function') {
          type.onAccept();
        }
      }
      // Check if rejected
      else if (rejectedConsents[type.id]) {
        if (type.gtag) {
          hasGtagUpdates = true;
          const gtagParams = Array.isArray(type.gtag) ? type.gtag : [type.gtag];
          gtagParams.forEach(param => {
            gtagConsentUpdate[param] = 'denied';
          });
        }

        if (typeof type.onReject === 'function') {
          type.onReject();
        }
      }
    });

    // Call gtag ONCE with all consent states (both granted and denied)
    if (hasGtagUpdates && typeof gtag === 'function') {
      gtag('consent', 'update', gtagConsentUpdate);
      if (this.config.debug) {
        console.log('✓ gtag consent updated (on page load):', gtagConsentUpdate);
      }
    } else if (gtagConsentUpdate.analytics_storage && typeof window.silktide === 'function') {
      // Silktide Analytics fallback
      const analyticsGranted = gtagConsentUpdate.analytics_storage === 'granted';
      window.silktide(analyticsGranted ? 'consent' : 'unconsent');
    }

    // Fire GTM event if we have any granted consents (so GTM tags can trigger)
    // Check if any consent is granted (not just denied)
    const hasGrantedConsents = Object.values(gtagConsentUpdate).some(value => value === 'granted');
    if (hasGtagUpdates && hasGrantedConsents) {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({ 'event': this.config.eventName });
      if (this.config.debug) {
        const eventContext = isFirstConsentLoad ? 'from first page load' : 'from return visit';
        console.log('▶ GTM Event Sent: ' + this.config.eventName + ' (' + eventContext + ')');
      }
    }
  }

  /**
   * Run through all of the consent callbacks based on the current localStorage values
   */
  runStoredConsentCallbacks() {
    this.config.consentTypes.forEach((type) => {
      const accepted = this.getConsentChoice(type.id);

      if (accepted) {
        this._injectConsentScripts(type);
      }

      // Trigger automatic consent integration
      this.triggerConsentIntegration(type, accepted);

      // Set localStorage and run accept/reject callbacks
      if (accepted) {
        if (typeof type.onAccept === 'function') {
          type.onAccept();
        }
      } else {
        if (typeof type.onReject === 'function') {
          type.onReject();
        }
      }
    });
  }

  // ----------------------------------------------------------------
  // Banner
  // ----------------------------------------------------------------
  
  /**
   * Get banner HTML content
   * @private
   * @returns {string} HTML string for banner
   */
  getBannerContent() {
    const bannerDescription =
      this.config.text?.prompt?.description ||
      "<p>We use cookies on our site to enhance your user experience, provide personalized content, and analyze our traffic.</p>";

    // Accept button
    const acceptAllButtonText = this.config.text?.prompt?.acceptAllButtonText || 'Accept all';
    const acceptAllButtonLabel = this.config.text?.prompt?.acceptAllButtonAccessibleLabel;
    const acceptAllButton = `<button class="stcm-accept-all stcm-button stcm-button-primary"${
      acceptAllButtonLabel && acceptAllButtonLabel !== acceptAllButtonText
        ? ` aria-label="${acceptAllButtonLabel}"`
        : ''
    }>${acceptAllButtonText}</button>`;

    // Reject button
    const rejectNonEssentialButtonText = this.config.text?.prompt?.rejectNonEssentialButtonText || 'Reject non-essential';
    const rejectNonEssentialButtonLabel = this.config.text?.prompt?.rejectNonEssentialButtonAccessibleLabel;
    const rejectNonEssentialButton = `<button class="stcm-reject-all stcm-button stcm-button-primary"${
      rejectNonEssentialButtonLabel && rejectNonEssentialButtonLabel !== rejectNonEssentialButtonText
        ? ` aria-label="${rejectNonEssentialButtonLabel}"`
        : ''
    }>${rejectNonEssentialButtonText}</button>`;

    // Preferences button
    const preferencesButtonText = this.config.text?.prompt?.preferencesButtonText || 'Preferences';
    const preferencesButtonLabel = this.config.text?.prompt?.preferencesButtonAccessibleLabel;
    const preferencesButton = `<button class="stcm-preferences-button"${
      preferencesButtonLabel && preferencesButtonLabel !== preferencesButtonText
        ? ` aria-label="${preferencesButtonLabel}"`
        : ''
    }><span>${preferencesButtonText}</span></button>`;


    // Silktide logo link
    const silktideLogo = `
      <a class="stcm-logo" href="https://silktide.com/consent-manager" rel="noreferrer" aria-label="Visit the Silktide Consent Manager page">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="25" viewBox="0 0 24 25" fill="inherit">
          <path fill-rule="evenodd" clip-rule="evenodd" d="M14.1096 16.7745C13.8895 17.2055 13.3537 17.3805 12.9129 17.1653L8.28443 14.9055L2.73192 17.7651L11.1025 21.9814C11.909 22.3876 12.8725 22.3591 13.6524 21.9058L20.4345 17.9645C21.2845 17.4704 21.7797 16.5522 21.7164 15.5872L21.7088 15.4704C21.6487 14.5561 21.0962 13.7419 20.2579 13.3326L15.6793 11.0972L10.2283 13.9045L13.71 15.6043C14.1507 15.8195 14.3297 16.3434 14.1096 16.7745ZM8.2627 12.9448L13.7136 10.1375L10.2889 8.46543C9.84803 8.25021 9.66911 7.72629 9.88916 7.29524C10.1093 6.86417 10.6451 6.68921 11.0859 6.90442L15.6575 9.13647L21.2171 6.27325L12.8808 2.03496C12.0675 1.62147 11.0928 1.65154 10.3078 2.11432L3.54908 6.09869C2.70732 6.59492 2.21846 7.50845 2.28139 8.46761L2.29003 8.59923C2.35002 9.51362 2.9026 10.3278 3.7409 10.7371L8.2627 12.9448ZM6.31884 13.9458L2.94386 12.2981C1.53727 11.6113 0.610092 10.2451 0.509431 8.71094L0.500795 8.57933C0.3952 6.96993 1.21547 5.4371 2.62787 4.60447L9.38662 0.620092C10.7038 -0.156419 12.3392 -0.206861 13.7039 0.486938L23.3799 5.40639C23.4551 5.44459 23.5224 5.4918 23.5811 5.54596C23.7105 5.62499 23.8209 5.73754 23.897 5.87906C24.1266 6.30534 23.9594 6.83293 23.5234 7.05744L17.6231 10.0961L21.0549 11.7716C22.4615 12.4583 23.3887 13.8245 23.4893 15.3587L23.497 15.4755C23.6033 17.0947 22.7724 18.6354 21.346 19.4644L14.5639 23.4057C13.2554 24.1661 11.6386 24.214 10.2854 23.5324L0.621855 18.6649C0.477299 18.592 0.361696 18.4859 0.279794 18.361C0.210188 18.2968 0.150054 18.2204 0.10296 18.133C-0.126635 17.7067 0.0406445 17.1792 0.47659 16.9546L6.31884 13.9458Z" fill="inherit"/>
        </svg>
      </a>
    `;

    const bannerContent = `
      ${bannerDescription}
      <div class="stcm-actions">
        ${acceptAllButton}
        ${rejectNonEssentialButton}
        <div class="stcm-actions-row">
          ${preferencesButton}
          ${silktideLogo}
        </div>
      </div>
    `;

    return bannerContent;
  }

  /**
   * Check if user has made an initial consent choice
   * @returns {boolean} True if user has consented
   */
  hasConsented() {
    return this.getHasConsented();
  }

  createBanner() {
    // Create prompt element
    this.prompt = this.createWrapperChild(this.getBannerContent(), 'stcm-banner');

    // Add positioning class from config
    if (this.prompt && this.config.prompt?.position) {
      // Map old position names to new stcm- prefixed names
      const positionMap = {
        'center': 'stcm-pos-center',
        'bottomLeft': 'stcm-pos-bottom-left',
        'bottomCenter': 'stcm-pos-bottom-center',
        'bottomRight': 'stcm-pos-bottom-right'
      };
      const mappedPosition = positionMap[this.config.prompt.position] || this.config.prompt.position;
      this.prompt.classList.add(mappedPosition);
    }

    // Lock in final state after slide-in animation completes
    // This allows nudge animation to work without conflicts
    this.prompt.addEventListener('animationend', () => {
      if (this.prompt) {
        this.prompt.classList.add('stcm-loaded');
      }
    }, { once: true });

    // Trigger optional onPromptOpen callback
    if (this.prompt && typeof this.config.onPromptOpen === 'function') {
      this.config.onPromptOpen();
    }
  }

  removeBanner() {
    if (this.prompt && this.prompt.parentNode) {
      this.prompt.parentNode.removeChild(this.prompt);
      this.prompt = null;

      // Trigger optional onPromptClose callback
      if (typeof this.config.onPromptClose === 'function') {
        this.config.onPromptClose();
      }
    }
  }

  /**
   * Check if consent prompt should be shown
   * Returns true if user hasn't made a consent choice yet
   * @private
   * @returns {boolean} True if prompt should be displayed
   */
  shouldShowPrompt() {
    if (this.config.autoShow === false) {
      return false;
    }
    return !this.getHasConsented();
  }

  // ----------------------------------------------------------------
  // Modal
  // ----------------------------------------------------------------
  
  /**
   * Get modal HTML content
   * @private
   * @returns {string} HTML string for modal
   */
  getModalContent() {
    const preferencesTitle =
      this.config.text?.preferences?.title || 'Customize your cookie preferences';

    const preferencesDescription =
      this.config.text?.preferences?.description ||
      "<p>We respect your right to privacy. You can choose not to allow some types of cookies. Your cookie preferences will apply across our website.</p>";

    // Preferences button
    const preferencesButtonLabel = this.config.text?.prompt?.preferencesButtonAccessibleLabel;

    const closeModalButton = `<button class="stcm-modal-close"${preferencesButtonLabel ? ` aria-label="${preferencesButtonLabel}"` : ''}>
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M19.4081 3.41559C20.189 2.6347 20.189 1.36655 19.4081 0.585663C18.6272 -0.195221 17.3591 -0.195221 16.5782 0.585663L10 7.17008L3.41559 0.59191C2.6347 -0.188974 1.36655 -0.188974 0.585663 0.59191C-0.195221 1.37279 -0.195221 2.64095 0.585663 3.42183L7.17008 10L0.59191 16.5844C-0.188974 17.3653 -0.188974 18.6335 0.59191 19.4143C1.37279 20.1952 2.64095 20.1952 3.42183 19.4143L10 12.8299L16.5844 19.4081C17.3653 20.189 18.6335 20.189 19.4143 19.4081C20.1952 18.6272 20.1952 17.3591 19.4143 16.5782L12.8299 10L19.4081 3.41559Z"/>
      </svg>
    </button>`;


    const consentTypes = this.config.consentTypes || [];
    const acceptedConsentMap = this.getAcceptedConsents();

    // Save button
    const saveButtonText = this.config.text?.preferences?.saveButtonText || 'Save and close';
    const saveButtonLabel = this.config.text?.preferences?.saveButtonAccessibleLabel;
    const saveButton = `<button class="stcm-modal-save stcm-button stcm-button-primary"${
      saveButtonLabel && saveButtonLabel !== saveButtonText
        ? ` aria-label="${saveButtonLabel}"`
        : ''
    }>${saveButtonText}</button>`;

    // Reject button
    const rejectNonEssentialButtonText = this.config.text?.prompt?.rejectNonEssentialButtonText || 'Reject non-essential';
    const rejectNonEssentialButtonLabel = this.config.text?.prompt?.rejectNonEssentialButtonAccessibleLabel;
    const rejectNonEssentialButton = `<button class="stcm-modal-reject-all stcm-button stcm-button-primary"${
      rejectNonEssentialButtonLabel && rejectNonEssentialButtonLabel !== rejectNonEssentialButtonText
        ? ` aria-label="${rejectNonEssentialButtonLabel}"`
        : ''
    }>${rejectNonEssentialButtonText}</button>`;

    // Credit link
    const creditLinkText = this.config.text?.preferences?.creditLinkText || 'Get this consent manager for free';
    const creditLinkAccessibleLabel = this.config.text?.preferences?.creditLinkAccessibleLabel;
    const creditLink = `<a class="stcm-credit-link" href="https://silktide.com/consent-manager" rel="noreferrer"${
      creditLinkAccessibleLabel && creditLinkAccessibleLabel !== creditLinkText
        ? ` aria-label="${creditLinkAccessibleLabel}"`
        : ''
    }>${creditLinkText}</a>`;



    const modalContent = `
      <header>
        <h1>${preferencesTitle}</h1>
        ${closeModalButton}
      </header>
      ${preferencesDescription}
      <section id="stcm-form">
        ${consentTypes
          .map((type) => {
            const accepted = acceptedConsentMap[type.id];
            let isChecked = false;

            // if it's accepted then show as checked
            if (accepted) {
              isChecked = true;
            }

            // if nothing has been accepted / rejected yet, then show as checked if the default value is true
            if (!accepted && !this.hasConsented()) {
              isChecked = type.defaultValue;
            }

            return `
            <fieldset>
              <legend>${type.label}</legend>
              <div class="stcm-consent-row">
                <div class="stcm-consent-description">${type.description}</div>
                <label class="stcm-toggle" for="consent-${type.id}">
                  <input type="checkbox" id="consent-${type.id}" ${
              type.required ? 'checked disabled' : isChecked ? 'checked' : ''
            } />
                  <span class="stcm-toggle-track" aria-hidden="true"></span>
                  <span class="stcm-toggle-thumb" aria-hidden="true"></span>
                  <span class="stcm-toggle-off" aria-hidden="true">Off</span>
                  <span class="stcm-toggle-on" aria-hidden="true">On</span>
                </label>
              </div>
            </fieldset>
          `;
          })
          .join('')}
      </section>
      <footer>
        ${saveButton}
        ${rejectNonEssentialButton}
        ${creditLink}
      </footer>
    `;

    return modalContent;
  }

  createModal() {
    // Create preferences element
    this.preferences = this.createWrapperChild(this.getModalContent(), 'stcm-modal');
  }

  toggleModal(show) {
    if (!this.preferences) return;

    this.preferences.style.display = show ? 'flex' : 'none';

    if (show) {
      this.showBackdrop();
      this.hideCookieIcon();
      this.removeBanner();
      this.preventBodyScroll();

      // Focus the close button
      const modalCloseButton = this.preferences.querySelector('.stcm-modal-close');
      modalCloseButton.focus();

      // Trigger optional onPreferencesOpen callback
      if (typeof this.config.onPreferencesOpen === 'function') {
        this.config.onPreferencesOpen();
      }

      this.updateCheckboxState(false); // read from storage when opening
    } else {
      // Close the modal without saving anything - saving is handled by the "Save and Close" and "Reject All" buttons only
      this.hideBackdrop();
      this.showCookieIcon();
      this.allowBodyScroll();

      // Trigger optional onPreferencesClose callback
      if (typeof this.config.onPreferencesClose === 'function') {
        this.config.onPreferencesClose();
      }
    }
  }

  // ----------------------------------------------------------------
  // Consent Icon
  // ----------------------------------------------------------------
  
  /**
   * Get cookie icon SVG content
   * @private
   * @returns {string} SVG string for icon
   */
  getCookieIconContent() {
    return `
      <svg width="38" height="38" viewBox="0 0 38 38" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M19.1172 1.15625C19.0547 0.734374 18.7344 0.390624 18.3125 0.328124C16.5859 0.0859365 14.8281 0.398437 13.2813 1.21875L7.5 4.30469C5.96094 5.125 4.71875 6.41406 3.95313 7.98437L1.08594 13.8906C0.320314 15.4609 0.0703136 17.2422 0.375001 18.9609L1.50781 25.4297C1.8125 27.1562 2.64844 28.7344 3.90625 29.9531L8.61719 34.5156C9.875 35.7344 11.4766 36.5156 13.2031 36.7578L19.6875 37.6719C21.4141 37.9141 23.1719 37.6016 24.7188 36.7812L30.5 33.6953C32.0391 32.875 33.2813 31.5859 34.0469 30.0078L36.9141 24.1094C37.6797 22.5391 37.9297 20.7578 37.625 19.0391C37.5547 18.625 37.2109 18.3125 36.7969 18.25C32.7734 17.6094 29.5469 14.5703 28.6328 10.6406C28.4922 10.0469 28.0078 9.59375 27.4063 9.5C23.1406 8.82031 19.7734 5.4375 19.1094 1.15625H19.1172ZM15.25 10.25C15.913 10.25 16.5489 10.5134 17.0178 10.9822C17.4866 11.4511 17.75 12.087 17.75 12.75C17.75 13.413 17.4866 14.0489 17.0178 14.5178C16.5489 14.9866 15.913 15.25 15.25 15.25C14.587 15.25 13.9511 14.9866 13.4822 14.5178C13.0134 14.0489 12.75 13.413 12.75 12.75C12.75 12.087 13.0134 11.4511 13.4822 10.9822C13.9511 10.5134 14.587 10.25 15.25 10.25ZM10.25 25.25C10.25 24.587 10.5134 23.9511 10.9822 23.4822C11.4511 23.0134 12.087 22.75 12.75 22.75C13.413 22.75 14.0489 23.0134 14.5178 23.4822C14.9866 23.9511 15.25 24.587 15.25 25.25C15.25 25.913 14.9866 26.5489 14.5178 27.0178C14.0489 27.4866 13.413 27.75 12.75 27.75C12.087 27.75 11.4511 27.4866 10.9822 27.0178C10.5134 26.5489 10.25 25.913 10.25 25.25ZM27.75 20.25C28.413 20.25 29.0489 20.5134 29.5178 20.9822C29.9866 21.4511 30.25 22.087 30.25 22.75C30.25 23.413 29.9866 24.0489 29.5178 24.5178C29.0489 24.9866 28.413 25.25 27.75 25.25C27.087 25.25 26.4511 24.9866 25.9822 24.5178C25.5134 24.0489 25.25 23.413 25.25 22.75C25.25 22.087 25.5134 21.4511 25.9822 20.9822C26.4511 20.5134 27.087 20.25 27.75 20.25Z" />
      </svg>
    `;
  }

  createCookieIcon() {
    this.icon = document.createElement('button');
    this.icon.id = 'stcm-icon';
    this.icon.title = 'Manage your consent preferences for this site';
    this.icon.innerHTML = this.getCookieIconContent();

    if (this.config.text?.prompt?.preferencesButtonAccessibleLabel) {
      this.icon.ariaLabel = this.config.text?.prompt?.preferencesButtonAccessibleLabel;
    }

    // Ensure wrapper exists
    if (!this.wrapper || !document.body.contains(this.wrapper)) {
      this.createWrapper();
    }

    // Append child to wrapper
    this.wrapper.appendChild(this.icon);

    // Add positioning class from config
    if (this.icon && this.config.icon?.position) {
      // Map old position names to new stcm- prefixed names
      const positionMap = {
        'bottomRight': 'stcm-pos-bottom-right',
        'bottomLeft': 'stcm-pos-bottom-left'
      };
      const mappedPosition = positionMap[this.config.icon.position] || this.config.icon.position;
      this.icon.classList.add(mappedPosition);
    }

    // Add color scheme class from config
    if (this.icon && this.config.icon?.colorScheme) {
      this.icon.classList.add(this.config.icon.colorScheme);
    }
  }

  showCookieIcon() {
    if (this.icon) {
      this.icon.style.display = 'flex';
    }
  }

  hideCookieIcon() {
    if (this.icon) {
      this.icon.style.display = 'none';
    }
  }

  /**
   * This runs if the user closes the preferences without making a choice for the first time
   * We apply the default values and the necessary values as default
   */
  handleDefaultConsent() {
    this.config.consentTypes.forEach((type) => {
      let accepted = true;
      // Set localStorage and run accept/reject callbacks
      if (type.required || type.defaultValue) {
        this.setConsentChoice(type.id, true);
      } else {
        accepted = false;
        this.setConsentChoice(type.id, false);
      }

      if (accepted) {
        if (typeof type.onAccept === 'function') {
          type.onAccept();
        }
      } else {
        if (typeof type.onReject === 'function') {
          type.onReject();
        }
      }
      // set the flag to say that the consent choice has been made
      this.setHasConsented();
      this.updateCheckboxState();
    });
  }

  // ----------------------------------------------------------------
  // Focusable Elements
  // ----------------------------------------------------------------
  
  /**
   * Get all focusable elements within a container
   * @private
   * @param {HTMLElement} element - Container element
   * @returns {NodeList} List of focusable elements
   */
  getFocusableElements(element) {
    return element.querySelectorAll(
      'button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
  }

  // ----------------------------------------------------------------
  // Event Listeners
  // ----------------------------------------------------------------
  setupEventListeners() {
    // Check Prompt exists before trying to add event listeners
    if (this.prompt) {
      // Get the buttons
      const acceptButton = this.prompt.querySelector('.stcm-accept-all');
      const rejectButton = this.prompt.querySelector('.stcm-reject-all');
      const preferencesButton = this.prompt.querySelector('.stcm-preferences-button');

      // Add event listeners to the buttons
      acceptButton?.addEventListener('click', () => this.handleConsentChoice(true));
      rejectButton?.addEventListener('click', () => this.handleConsentChoice(false));
      preferencesButton?.addEventListener('click', () => {
        this.showBackdrop();
        this.toggleModal(true);
      });

      // Focus Trap
      const focusableElements = this.getFocusableElements(this.prompt);
      const firstFocusableEl = focusableElements[0];
      const lastFocusableEl = focusableElements[focusableElements.length - 1];

      // Add keydown event listener to handle tab navigation
      this.prompt.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') {
          if (e.shiftKey) {
            if (document.activeElement === firstFocusableEl) {
              lastFocusableEl.focus();
              e.preventDefault();
            }
          } else {
            if (document.activeElement === lastFocusableEl) {
              firstFocusableEl.focus();
              e.preventDefault();
            }
          }
        }
      });

      // Set initial focus
      if (this.config.mode !== 'wizard') {
        acceptButton?.focus();
      }
    }

    // Check Preferences exists before trying to add event listeners
    if (this.preferences) {
      const closeButton = this.preferences.querySelector('.stcm-modal-close');
      const saveButton = this.preferences.querySelector('.stcm-modal-save');
      const rejectAllButton = this.preferences.querySelector('.stcm-modal-reject-all');

      // Close button - only closes modal, doesn't save or fire events
      closeButton?.addEventListener('click', () => {
        this.toggleModal(false);
        this.hideBackdrop();
        
        // If user hasn't made initial choice, show prompt again next time
        // Otherwise, just close without doing anything
      });

      // Save button - reads checkbox states and batch updates
      saveButton?.addEventListener('click', () => {
        // We set that an initial choice was made
        this.setHasConsented();

        // Read current checkbox states from the modal
        const preferencesSection = this.preferences.querySelector('#stcm-form');
        const checkboxes = preferencesSection.querySelectorAll('input[type="checkbox"]');
        const consentStates = {};

        checkboxes.forEach(checkbox => {
          const [, consentId] = checkbox.id.split('consent-');
          consentStates[consentId] = checkbox.checked;
        });

        // Use batch update to set all consents at once (only fires if changes detected)
        this.batchUpdateConsents(consentStates);

        // Close modal and show icon
        this.toggleModal(false);
        this.hideBackdrop();
        this.removeBanner();
        this.showCookieIcon();
      });

      // Reject All button - sets required to true, all others to false, then batch updates
      rejectAllButton?.addEventListener('click', () => {
        // We set that an initial choice was made
        this.setHasConsented();

        // First, update the checkbox UI to reflect rejection
        const preferencesSection = this.preferences.querySelector('#stcm-form');
        const checkboxes = preferencesSection.querySelectorAll('input[type="checkbox"]');
        
        checkboxes.forEach(checkbox => {
          const [, consentId] = checkbox.id.split('consent-');
          const consentType = this.config.consentTypes.find(type => type.id === consentId);
          
          if (consentType && !consentType.required) {
            checkbox.checked = false;
          }
        });

        // Build consent states: required = true, optional = false
        const consentStates = {};
        this.config.consentTypes.forEach((type) => {
          consentStates[type.id] = type.required ? true : false;
        });

        // Use batch update to set all consents at once
        this.batchUpdateConsents(consentStates);

        // Close modal and show icon
        this.toggleModal(false);
        this.hideBackdrop();
        this.removeBanner();
        this.showCookieIcon();
      });

      // Preferences Focus Trap
      const focusableElements = this.getFocusableElements(this.preferences);
      const firstFocusableEl = focusableElements[0];
      const lastFocusableEl = focusableElements[focusableElements.length - 1];

      this.preferences.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') {
          if (e.shiftKey) {
            if (document.activeElement === firstFocusableEl) {
              lastFocusableEl.focus();
              e.preventDefault();
            }
          } else {
            if (document.activeElement === lastFocusableEl) {
              firstFocusableEl.focus();
              e.preventDefault();
            }
          }
        }
        if (e.key === 'Escape') {
          this.toggleModal(false);
        }
      });

      closeButton?.focus();

      // Note: Checkboxes no longer trigger immediate consent updates
      // Users can toggle them freely, and consent is only updated when clicking "Save and Close"
    }

    // Check Icon exists before trying to add event listeners
    if (this.icon) {
      this.icon.addEventListener('click', () => {
        // If preferences is not found, create it
        if (!this.preferences) {
          this.createModal();
          this.toggleModal(true);
          this.hideCookieIcon();
        }
        // If preferences is hidden, show it
        else if (this.preferences.style.display === 'none' || this.preferences.style.display === '') {
          this.toggleModal(true);
          this.hideCookieIcon();
        }
        // If preferences is visible, hide it
        else {
          this.toggleModal(false);
        }
      });
    }
  }

  preventBodyScroll() {
    document.body.style.overflow = 'hidden';
    // Prevent iOS Safari scrolling
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
  }

  allowBodyScroll() {
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.width = '';
  }
}

/**
 * ============================================================================
 * Public API (IIFE Wrapper)
 * ============================================================================
 */
(function () {
  window.silktideConsentManager = {};

  let consentManager;

  /**
   * Initialize the consent manager with the given configuration
   * Destroys any existing instance and creates a new one.
   * 
   * @param {Object} config - Configuration object
   */
  function init(config = {}) {
    // Function to create instance
    const create = () => {
      // Destroy existing instance if present
      if (consentManager) {
        consentManager.destroy();
        consentManager = null;
      }

      // Create new instance (class constructor validates config)
      consentManager = new SilktideConsentManager(config);
    };

    // Initialize immediately if DOM ready, otherwise wait
    if (document.body) {
      create();
    } else {
      document.addEventListener('DOMContentLoaded', create, {once: true});
    }
  }

  /**
   * Update the configuration by deep merging with existing config
   * Requires an existing instance to be initialized first.
   * 
   * @param {Object} newConfig - Partial configuration object to merge with existing config
   */
  function update(newConfig = {}) {
    if (!consentManager) {
      console.error('Silktide Consent Manager: Cannot update - no instance initialized. Call init() first.');
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

    // Deep merge new config into existing and re-initialize
    const mergedConfig = deepMerge(consentManager.config, newConfig);
    init(mergedConfig);
  }
  
  /**
   * Reset all consent choices and show the prompt again
   * Clears all localStorage entries and reinitializes as if fresh page load
   */
  function resetConsent() {
    if (!consentManager) {
      console.error('Silktide Consent Manager: Cannot reset - no instance initialized.');
      return;
    }

    // Clear all consent-related localStorage
    consentManager.clearAllConsents();

    // Re-initialize with current config from instance
    init(consentManager.config);
  }

  /**
   * Get the current consent manager instance (for advanced usage)
   * @returns {SilktideConsentManager|null} Current instance or null if not initialized
   */
  function getInstance() {
    return consentManager;
  }

  window.silktideConsentManager.init = init;
  window.silktideConsentManager.update = update;
  window.silktideConsentManager.getInstance = getInstance;
  window.silktideConsentManager.resetConsent = resetConsent;
})();
