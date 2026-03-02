import {
  resolveConsentMode,
  buildResolvedModeKey,
  isOptOutMode,
  applyGpcSignal,
  grantAllConsentsByDefault,
  bindPrivacyLinks,
} from './geolocation.js';

import {
  getEuOptinBannerContent,
  getSoftOptinBannerContent,
  getCaOptoutBannerContent,
  getModalContent,
  getCookieIconContent,
} from './banners.js';

/**
 * Silktide Consent Manager v2.1.0
 * https://silktide.com/consent-manager/
 *
 * This class is typically not instantiated directly. Use the global
 * window.silktideConsentManager API (see index.js).
 *
 * @class
 * @param {Object} config - Configuration object for the consent manager
 */
export class SilktideConsentManager {
  constructor(config) {
    this._validateConfig(config);
    this.config = config;

    this.config.eventName = this.config.eventName || 'stcm_consent_update';
    this.config.debug = this.config.debug === true;

    this.wrapper = null;
    this.prompt = null;
    this.preferences = null;
    this.icon = null;
    this.backdrop = null;
    this.localStorageAvailable = this._checkLocalStorageAvailable();
    this._needsReload = false;
    this._resolvedMode = null;
    this._initialized = false;

    // Storage helpers passed to geolocation module
    this._storage = {
      get: (key) => this._getLocalStorageItem(key),
      set: (key, value) => this._setLocalStorageItem(key, value),
      remove: (key) => this._removeLocalStorageItem(key),
    };

    // Phase 1: Create wrapper synchronously
    this.createWrapper();

    // Phase 2: Resolve consent mode (may be async if geolocation API needed), then build UI
    this._initPromise = resolveConsentMode(this.config, this._storage).then((mode) => {
      this._resolvedMode = mode;
      this._buildUI();
    });
  }

  // ----------------------------------------------------------------
  // Consent Mode Helpers
  // ----------------------------------------------------------------

  _isOptOutMode() {
    return isOptOutMode(this._resolvedMode);
  }

  // ----------------------------------------------------------------
  // UI Builder (mode dispatch)
  // ----------------------------------------------------------------

  _buildUI() {
    this._initialized = true;

    // Mode change detection: if mode changed since last visit, reset consents
    const modeKey = buildResolvedModeKey(this.config);
    const previousMode = this._getLocalStorageItem(modeKey);
    if (previousMode && previousMode !== this._resolvedMode) {
      if (this.config.debug) {
        console.log(
          'STCM: Consent mode changed from',
          previousMode,
          'to',
          this._resolvedMode,
          '- resetting consent.',
        );
      }
      this.clearAllConsents();
    }
    this._setLocalStorageItem(modeKey, this._resolvedMode);

    switch (this._resolvedMode) {
      case 'EU-OPTIN':
        this._buildEuOptinUI();
        break;
      case 'SOFT-OPTIN':
        this._buildSoftOptinUI();
        break;
      case 'US-OPTOUT':
        this._buildUsOptoutUI();
        break;
      case 'CA-OPTOUT-BANNER':
        this._buildCaOptoutBannerUI();
        break;
      default:
        this._buildEuOptinUI();
    }

    this.setupEventListeners();
    this.runConsentCallbacksOnLoad();
  }

  _buildEuOptinUI() {
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
  }

  _buildSoftOptinUI() {
    this.createCookieIcon();
    this.createModal();
    if (this.shouldShowPrompt()) {
      this.createSoftOptinBanner();
      if (this.shouldShowBackdrop()) {
        this.createBackdrop();
        this.showBackdrop();
      }
    } else {
      this.showCookieIcon();
    }
  }

  _buildUsOptoutUI() {
    applyGpcSignal(
      this.config,
      (id, val) => this.setConsentChoice(id, val),
      () => this.setHasConsented(),
    );
    if (!this.getHasConsented()) {
      grantAllConsentsByDefault(
        this.config,
        (id) => this.getConsentChoice(id),
        (id, val) => this.setConsentChoice(id, val),
      );
    }
    this.createCookieIcon();
    this.showCookieIcon();
    this.createModal();
    bindPrivacyLinks(() => this.toggleModal(true));
  }

  _buildCaOptoutBannerUI() {
    if (!this.getHasConsented()) {
      grantAllConsentsByDefault(
        this.config,
        (id) => this.getConsentChoice(id),
        (id, val) => this.setConsentChoice(id, val),
      );
    }
    this.createCookieIcon();
    this.createModal();
    if (this.shouldShowPrompt()) {
      this.createCaOptoutBanner();
    } else {
      this.showCookieIcon();
    }
  }

  // ----------------------------------------------------------------
  // Config Validation
  // ----------------------------------------------------------------

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

  // ----------------------------------------------------------------
  // localStorage
  // ----------------------------------------------------------------

  _checkLocalStorageAvailable() {
    try {
      const testKey = '__stcm_test__';
      localStorage.setItem(testKey, '1');
      localStorage.removeItem(testKey);
      return true;
    } catch (e) {
      console.warn(
        'Silktide Consent Manager: localStorage is not available. Consent choices will not persist.',
        e,
      );
      return false;
    }
  }

  _getLocalStorageItem(key) {
    if (!this.localStorageAvailable) return null;
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.warn('Silktide Consent Manager: Error reading from localStorage', e);
      return null;
    }
  }

  _setLocalStorageItem(key, value) {
    if (!this.localStorageAvailable) return false;
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (e) {
      console.warn('Silktide Consent Manager: Error writing to localStorage', e);
      return false;
    }
  }

  _removeLocalStorageItem(key) {
    if (!this.localStorageAvailable) return false;
    try {
      localStorage.removeItem(key);
      return true;
    } catch (e) {
      console.warn('Silktide Consent Manager: Error removing from localStorage', e);
      return false;
    }
  }

  // ----------------------------------------------------------------
  // Destroy / Clear
  // ----------------------------------------------------------------

  destroy() {
    if (this.wrapper && this.wrapper.parentNode) {
      this.wrapper.parentNode.removeChild(this.wrapper);
    }
    this.allowBodyScroll();
    this.wrapper = null;
    this.prompt = null;
    this.preferences = null;
    this.icon = null;
    this.backdrop = null;
  }

  clearAllConsents() {
    if (!this.localStorageAvailable) return;
    const keysToRemove = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (
          key &&
          (key.startsWith('silktideCookieBanner_') ||
            key.startsWith('silktideCookieChoice_') ||
            key.startsWith('stcm.'))
        ) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((key) => this._removeLocalStorageItem(key));
    } catch {
      // Ignore errors
    }
  }

  // ----------------------------------------------------------------
  // localStorage Helper Methods (with lazy migration)
  // ----------------------------------------------------------------

  _buildOldConsentKey(typeId) {
    const suffix = this.config.namespace ? `_${this.config.namespace}` : '';
    return `silktideCookieChoice_${typeId}${suffix}`;
  }

  _buildOldHasConsentedKey() {
    const suffix = this.config.namespace ? `_${this.config.namespace}` : '';
    return `silktideCookieBanner_InitialChoice${suffix}`;
  }

  _buildConsentKey(typeId) {
    const ns = this.config.namespace ? `${this.config.namespace}.` : '';
    return `stcm.${ns}consent.${typeId}`;
  }

  _buildHasConsentedKey() {
    const ns = this.config.namespace ? `${this.config.namespace}.` : '';
    return `stcm.${ns}hasConsented`;
  }

  getConsentChoice(typeId) {
    const newKey = this._buildConsentKey(typeId);
    let value = this._getLocalStorageItem(newKey);

    if (value === null) {
      const oldKey = this._buildOldConsentKey(typeId);
      value = this._getLocalStorageItem(oldKey);
      if (value !== null) {
        this._setLocalStorageItem(newKey, value);
        this._removeLocalStorageItem(oldKey);
      }
    }

    return value === null ? null : value === 'true';
  }

  setConsentChoice(typeId, accepted) {
    const newKey = this._buildConsentKey(typeId);
    this._setLocalStorageItem(newKey, accepted.toString());

    const oldKey = this._buildOldConsentKey(typeId);
    if (this._getLocalStorageItem(oldKey) !== null) {
      this._removeLocalStorageItem(oldKey);
    }
  }

  getHasConsented() {
    const newKey = this._buildHasConsentedKey();
    let value = this._getLocalStorageItem(newKey);

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

    const oldKey = this._buildOldHasConsentedKey();
    if (this._getLocalStorageItem(oldKey) !== null) {
      this._removeLocalStorageItem(oldKey);
    }
  }

  hasConsented() {
    return this.getHasConsented();
  }

  // ----------------------------------------------------------------
  // Script Injection
  // ----------------------------------------------------------------

  _injectScript(scriptConfig, consentId) {
    const { url, load, type, crossorigin, integrity } = scriptConfig;

    if (!url) {
      console.warn('Silktide Consent Manager: Script URL is required', scriptConfig);
      return;
    }

    const existingScript = document.querySelector(`script[src="${url}"]`);
    if (existingScript) return;

    const script = document.createElement('script');
    script.src = url;
    script.dataset.consentId = consentId;

    if (load === 'async') script.async = true;
    if (load === 'defer') script.defer = true;
    if (type) script.type = type;
    if (crossorigin) script.crossOrigin = crossorigin;
    if (integrity) script.integrity = integrity;

    document.head.appendChild(script);
  }

  _injectConsentScripts(consentType) {
    if (!consentType.scripts || !Array.isArray(consentType.scripts)) return;
    consentType.scripts.forEach((scriptConfig) => {
      this._injectScript(scriptConfig, consentType.id);
    });
  }

  _wasConsentRevoked(consentId, newState) {
    const previousState = this.getConsentChoice(consentId);
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

  createWrapperChild(htmlContent, id) {
    const child = document.createElement('div');
    child.id = id;
    child.innerHTML = htmlContent;

    if (!this.wrapper || !document.body.contains(this.wrapper)) {
      this.createWrapper();
    }

    this.wrapper.appendChild(child);
    return child;
  }

  // ----------------------------------------------------------------
  // Backdrop
  // ----------------------------------------------------------------

  createBackdrop() {
    this.backdrop = this.createWrapperChild(null, 'stcm-backdrop');
    this.backdrop.addEventListener('click', () => {
      this.nudgePrompt();
    });
  }

  showBackdrop() {
    if (this.backdrop) {
      this.backdrop.style.display = 'block';
    }
    if (typeof this.config.onBackdropOpen === 'function') {
      this.config.onBackdropOpen();
    }
  }

  hideBackdrop() {
    if (this.backdrop) {
      this.backdrop.style.display = 'none';
    }
    if (typeof this.config.onBackdropClose === 'function') {
      this.config.onBackdropClose();
    }
  }

  shouldShowBackdrop() {
    return this.config?.backdrop?.show || false;
  }

  nudgePrompt() {
    if (!this.prompt) return;
    this.prompt.classList.remove('stcm-nudge');
    void this.prompt.offsetWidth;
    this.prompt.classList.add('stcm-nudge');
    this.prompt.addEventListener(
      'animationend',
      () => {
        if (this.prompt) {
          this.prompt.classList.remove('stcm-nudge');
        }
      },
      { once: true },
    );
  }

  // ----------------------------------------------------------------
  // Checkbox State
  // ----------------------------------------------------------------

  updateCheckboxState(saveToStorage = false) {
    const preferencesSection = this.preferences.querySelector('#stcm-form');
    const checkboxes = preferencesSection.querySelectorAll('input[type="checkbox"]');

    checkboxes.forEach((checkbox) => {
      const [, consentId] = checkbox.id.split('consent-');
      const consentType = this.config.consentTypes.find((type) => type.id === consentId);

      if (!consentType) return;

      if (saveToStorage) {
        const currentState = checkbox.checked;

        if (consentType.required) {
          this.setConsentChoice(consentId, true);
        } else {
          const previousValue = this.getConsentChoice(consentId);
          const wasRevoked = this._wasConsentRevoked(consentId, currentState);
          const hadScripts = consentType.scripts?.length > 0;

          this.setConsentChoice(consentId, currentState);

          if (currentState !== previousValue) {
            this.triggerConsentIntegration(consentType, currentState);

            if (currentState && typeof consentType.onAccept === 'function') {
              consentType.onAccept();
            } else if (!currentState && typeof consentType.onReject === 'function') {
              consentType.onReject();
            }
          }

          if (wasRevoked && hadScripts) {
            this._needsReload = true;
          }
        }
      } else {
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

  // ----------------------------------------------------------------
  // Consent Integration (gtag / dataLayer)
  // ----------------------------------------------------------------

  triggerConsentIntegration(consentType, accepted) {
    if (!consentType.gtag) return;

    const gtagParams = Array.isArray(consentType.gtag) ? consentType.gtag : [consentType.gtag];

    if (typeof gtag === 'function') {
      const consentState = accepted ? 'granted' : 'denied';
      const consentUpdate = {};
      gtagParams.forEach((param) => {
        consentUpdate[param] = consentState;
      });
      gtag('consent', 'update', consentUpdate);
    } else if (gtagParams.includes('analytics_storage')) {
      if (typeof window.silktide === 'function') {
        window.silktide(accepted ? 'consent' : 'unconsent');
      }
    }

    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: this.config.eventName });
  }

  // ----------------------------------------------------------------
  // Batch Consent Update
  // ----------------------------------------------------------------

  batchUpdateConsents(consentStates) {
    const changes = [];
    const gtagConsentUpdate = {};
    let hasChanges = false;
    let needsReload = false;

    this.config.consentTypes.forEach((type) => {
      const newState = consentStates[type.id];
      const previousState = this.getConsentChoice(type.id);

      if (newState !== previousState) {
        hasChanges = true;

        changes.push({
          type: type,
          newState: newState,
          previousState: previousState,
        });

        const wasRevoked = previousState === true && newState === false;
        const hadScripts = type.scripts?.length > 0;
        if (wasRevoked && hadScripts) {
          needsReload = true;
        }

        if (type.gtag) {
          const gtagParams = Array.isArray(type.gtag) ? type.gtag : [type.gtag];
          const consentState = newState ? 'granted' : 'denied';
          gtagParams.forEach((param) => {
            gtagConsentUpdate[param] = consentState;
          });
        }
      }
    });

    if (!hasChanges) return false;

    changes.forEach(({ type, newState }) => {
      this.setConsentChoice(type.id, newState);
    });

    if (Object.keys(gtagConsentUpdate).length > 0 && typeof gtag === 'function') {
      gtag('consent', 'update', gtagConsentUpdate);
      if (this.config.debug) {
        console.log('gtag consent updated (from user action):', gtagConsentUpdate);
      }
    } else if (gtagConsentUpdate.analytics_storage) {
      if (typeof window.silktide === 'function') {
        const analyticsGranted = gtagConsentUpdate.analytics_storage === 'granted';
        window.silktide(analyticsGranted ? 'consent' : 'unconsent');
      }
    }

    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: this.config.eventName });
    if (this.config.debug) {
      console.log('GTM Event Sent: ' + this.config.eventName + ' (from user action)');
    }

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
    this.setHasConsented();

    this.removeBanner();
    this.hideBackdrop();
    this.toggleModal(false);
    this.showCookieIcon();

    const consentStates = {};
    this.config.consentTypes.forEach((type) => {
      consentStates[type.id] = type.required ? true : accepted;
    });

    this.batchUpdateConsents(consentStates);

    if (accepted && typeof this.config.onAcceptAll === 'function') {
      this.config.onAcceptAll();
    } else if (!accepted && typeof this.config.onRejectAll === 'function') {
      this.config.onRejectAll();
    }

    this.updateCheckboxState();
  }

  getAcceptedConsents() {
    return (this.config.consentTypes || []).reduce((acc, consentType) => {
      acc[consentType.id] = this.getConsentChoice(consentType.id);
      return acc;
    }, {});
  }

  getRejectedConsents() {
    return (this.config.consentTypes || []).reduce((acc, consentType) => {
      const choice = this.getConsentChoice(consentType.id);
      acc[consentType.id] = choice === false;
      return acc;
    }, {});
  }

  // ----------------------------------------------------------------
  // On-Load Consent Callbacks
  // ----------------------------------------------------------------

  runConsentCallbacksOnLoad() {
    if (!this.config.consentTypes) return;

    const gtagConsentUpdate = {};
    let hasGtagUpdates = false;
    let isFirstConsentLoad = false;

    const acceptedConsents = this.getAcceptedConsents();
    const rejectedConsents = this.getRejectedConsents();

    this.config.consentTypes.forEach((type) => {
      if (type.required) {
        const currentValue = this.getConsentChoice(type.id);
        if (currentValue === null) {
          this.setConsentChoice(type.id, true);
          isFirstConsentLoad = true;
        }

        this._injectConsentScripts(type);

        if (type.gtag) {
          hasGtagUpdates = true;
          const gtagParams = Array.isArray(type.gtag) ? type.gtag : [type.gtag];
          gtagParams.forEach((param) => {
            gtagConsentUpdate[param] = 'granted';
          });
        }

        if (typeof type.onAccept === 'function') {
          type.onAccept();
        }
        return;
      }

      const isAccepted = acceptedConsents[type.id];
      const isRejected = rejectedConsents[type.id];
      const hasNoChoice = !isAccepted && !isRejected;

      const effectivelyAccepted = isAccepted || (hasNoChoice && this._isOptOutMode());

      if (effectivelyAccepted) {
        this._injectConsentScripts(type);

        if (type.gtag) {
          hasGtagUpdates = true;
          const gtagParams = Array.isArray(type.gtag) ? type.gtag : [type.gtag];
          gtagParams.forEach((param) => {
            gtagConsentUpdate[param] = 'granted';
          });
        }

        if (typeof type.onAccept === 'function') {
          type.onAccept();
        }
      } else if (isRejected) {
        if (type.gtag) {
          hasGtagUpdates = true;
          const gtagParams = Array.isArray(type.gtag) ? type.gtag : [type.gtag];
          gtagParams.forEach((param) => {
            gtagConsentUpdate[param] = 'denied';
          });
        }

        if (typeof type.onReject === 'function') {
          type.onReject();
        }
      }
    });

    if (hasGtagUpdates && typeof gtag === 'function') {
      gtag('consent', 'update', gtagConsentUpdate);
      if (this.config.debug) {
        console.log('gtag consent updated (on page load):', gtagConsentUpdate);
      }
    } else if (gtagConsentUpdate.analytics_storage && typeof window.silktide === 'function') {
      const analyticsGranted = gtagConsentUpdate.analytics_storage === 'granted';
      window.silktide(analyticsGranted ? 'consent' : 'unconsent');
    }

    const hasGrantedConsents = Object.values(gtagConsentUpdate).some(
      (value) => value === 'granted',
    );
    if (hasGtagUpdates && hasGrantedConsents) {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({ event: this.config.eventName });
      if (this.config.debug) {
        const eventContext = isFirstConsentLoad ? 'from first page load' : 'from return visit';
        console.log('GTM Event Sent: ' + this.config.eventName + ' (' + eventContext + ')');
      }
    }
  }

  runStoredConsentCallbacks() {
    this.config.consentTypes.forEach((type) => {
      const accepted = this.getConsentChoice(type.id);

      if (accepted) {
        this._injectConsentScripts(type);
      }

      this.triggerConsentIntegration(type, accepted);

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
  // Banner (EU-OPTIN full banner)
  // ----------------------------------------------------------------

  getBannerContent() {
    return getEuOptinBannerContent(this.config);
  }

  createBanner() {
    this.prompt = this.createWrapperChild(this.getBannerContent(), 'stcm-banner');

    if (this.prompt && this.config.prompt?.position) {
      const positionMap = {
        center: 'stcm-pos-center',
        bottomLeft: 'stcm-pos-bottom-left',
        bottomCenter: 'stcm-pos-bottom-center',
        bottomRight: 'stcm-pos-bottom-right',
      };
      const mappedPosition =
        positionMap[this.config.prompt.position] || this.config.prompt.position;
      this.prompt.classList.add(mappedPosition);
    }

    this.prompt.addEventListener(
      'animationend',
      () => {
        if (this.prompt) {
          this.prompt.classList.add('stcm-loaded');
        }
      },
      { once: true },
    );

    if (this.prompt && typeof this.config.onPromptOpen === 'function') {
      this.config.onPromptOpen();
    }
  }

  // ----------------------------------------------------------------
  // SOFT-OPTIN Banner
  // ----------------------------------------------------------------

  getSoftOptinBannerContent() {
    return getSoftOptinBannerContent(this.config);
  }

  createSoftOptinBanner() {
    this.prompt = this.createWrapperChild(this.getSoftOptinBannerContent(), 'stcm-banner');
    this.prompt.classList.add('stcm-banner-soft');
    this._applyBannerPosition();
    this._attachBannerAnimationEnd();
    if (typeof this.config.onPromptOpen === 'function') {
      this.config.onPromptOpen();
    }
  }

  // ----------------------------------------------------------------
  // CA-OPTOUT Banner
  // ----------------------------------------------------------------

  getCaOptoutBannerContent() {
    return getCaOptoutBannerContent(this.config);
  }

  createCaOptoutBanner() {
    this.prompt = this.createWrapperChild(this.getCaOptoutBannerContent(), 'stcm-banner');
    this.prompt.classList.add('stcm-banner-ca-optout');
    this._applyBannerPosition();
    this._attachBannerAnimationEnd();
    if (typeof this.config.onPromptOpen === 'function') {
      this.config.onPromptOpen();
    }
  }

  // ----------------------------------------------------------------
  // Shared banner helpers
  // ----------------------------------------------------------------

  _applyBannerPosition() {
    if (this.config.prompt?.position) {
      const positionMap = {
        center: 'stcm-pos-center',
        bottomLeft: 'stcm-pos-bottom-left',
        bottomCenter: 'stcm-pos-bottom-center',
        bottomRight: 'stcm-pos-bottom-right',
      };
      const mapped = positionMap[this.config.prompt.position] || this.config.prompt.position;
      this.prompt.classList.add(mapped);
    }
  }

  _attachBannerAnimationEnd() {
    this.prompt.addEventListener(
      'animationend',
      () => {
        if (this.prompt) this.prompt.classList.add('stcm-loaded');
      },
      { once: true },
    );
  }

  removeBanner() {
    if (this.prompt && this.prompt.parentNode) {
      this.prompt.parentNode.removeChild(this.prompt);
      this.prompt = null;

      if (typeof this.config.onPromptClose === 'function') {
        this.config.onPromptClose();
      }
    }
  }

  shouldShowPrompt() {
    if (this.config.autoShow === false) return false;
    return !this.getHasConsented();
  }

  // ----------------------------------------------------------------
  // Modal
  // ----------------------------------------------------------------

  getModalContent() {
    return getModalContent(this.config, this.getAcceptedConsents(), this.hasConsented());
  }

  createModal() {
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

      const modalCloseButton = this.preferences.querySelector('.stcm-modal-close');
      modalCloseButton.focus();

      if (typeof this.config.onPreferencesOpen === 'function') {
        this.config.onPreferencesOpen();
      }

      this.updateCheckboxState(false);
    } else {
      this.hideBackdrop();
      this.showCookieIcon();
      this.allowBodyScroll();

      if (typeof this.config.onPreferencesClose === 'function') {
        this.config.onPreferencesClose();
      }
    }
  }

  // ----------------------------------------------------------------
  // Cookie Icon
  // ----------------------------------------------------------------

  createCookieIcon() {
    this.icon = document.createElement('button');
    this.icon.id = 'stcm-icon';
    this.icon.title = 'Manage your consent preferences for this site';
    this.icon.innerHTML = getCookieIconContent();

    if (this.config.text?.prompt?.preferencesButtonAccessibleLabel) {
      this.icon.ariaLabel = this.config.text?.prompt?.preferencesButtonAccessibleLabel;
    }

    if (!this.wrapper || !document.body.contains(this.wrapper)) {
      this.createWrapper();
    }

    this.wrapper.appendChild(this.icon);

    if (this.icon && this.config.icon?.position) {
      const positionMap = {
        bottomRight: 'stcm-pos-bottom-right',
        bottomLeft: 'stcm-pos-bottom-left',
      };
      const mappedPosition = positionMap[this.config.icon.position] || this.config.icon.position;
      this.icon.classList.add(mappedPosition);
    }

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

  // ----------------------------------------------------------------
  // Default Consent
  // ----------------------------------------------------------------

  handleDefaultConsent() {
    this.config.consentTypes.forEach((type) => {
      let accepted = true;
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
      this.setHasConsented();
      this.updateCheckboxState();
    });
  }

  // ----------------------------------------------------------------
  // Focus Trap
  // ----------------------------------------------------------------

  getFocusableElements(element) {
    return element.querySelectorAll(
      'button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
  }

  // ----------------------------------------------------------------
  // Event Listeners
  // ----------------------------------------------------------------

  setupEventListeners() {
    if (this.prompt) {
      const acceptButton = this.prompt.querySelector('.stcm-accept-all');
      const rejectButton = this.prompt.querySelector('.stcm-reject-all');
      const preferencesButton = this.prompt.querySelector('.stcm-preferences-button');
      const dismissButton = this.prompt.querySelector('.stcm-dismiss');

      acceptButton?.addEventListener('click', () => this.handleConsentChoice(true));
      rejectButton?.addEventListener('click', () => this.handleConsentChoice(false));
      preferencesButton?.addEventListener('click', () => {
        this.showBackdrop();
        this.toggleModal(true);
      });

      dismissButton?.addEventListener('click', () => {
        if (this._isOptOutMode()) {
          this.setHasConsented();
          this.removeBanner();
          this.showCookieIcon();
        } else {
          this.handleConsentChoice(false);
        }
      });

      const focusableElements = this.getFocusableElements(this.prompt);
      const firstFocusableEl = focusableElements[0];
      const lastFocusableEl = focusableElements[focusableElements.length - 1];

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

      if (this.config.mode !== 'wizard') {
        acceptButton?.focus();
      }
    }

    if (this.preferences) {
      const closeButton = this.preferences.querySelector('.stcm-modal-close');
      const saveButton = this.preferences.querySelector('.stcm-modal-save');
      const rejectAllButton = this.preferences.querySelector('.stcm-modal-reject-all');

      closeButton?.addEventListener('click', () => {
        this.toggleModal(false);
        this.hideBackdrop();
      });

      saveButton?.addEventListener('click', () => {
        this.setHasConsented();

        const preferencesSection = this.preferences.querySelector('#stcm-form');
        const checkboxes = preferencesSection.querySelectorAll('input[type="checkbox"]');
        const consentStates = {};

        checkboxes.forEach((checkbox) => {
          const [, consentId] = checkbox.id.split('consent-');
          consentStates[consentId] = checkbox.checked;
        });

        this.batchUpdateConsents(consentStates);

        this.toggleModal(false);
        this.hideBackdrop();
        this.removeBanner();
        this.showCookieIcon();
      });

      rejectAllButton?.addEventListener('click', () => {
        this.setHasConsented();

        const preferencesSection = this.preferences.querySelector('#stcm-form');
        const checkboxes = preferencesSection.querySelectorAll('input[type="checkbox"]');

        checkboxes.forEach((checkbox) => {
          const [, consentId] = checkbox.id.split('consent-');
          const consentType = this.config.consentTypes.find((type) => type.id === consentId);
          if (consentType && !consentType.required) {
            checkbox.checked = false;
          }
        });

        const consentStates = {};
        this.config.consentTypes.forEach((type) => {
          consentStates[type.id] = type.required ? true : false;
        });

        this.batchUpdateConsents(consentStates);

        this.toggleModal(false);
        this.hideBackdrop();
        this.removeBanner();
        this.showCookieIcon();
      });

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
    }

    if (this.icon) {
      this.icon.addEventListener('click', () => {
        if (!this.preferences) {
          this.createModal();
          this.toggleModal(true);
          this.hideCookieIcon();
        } else if (
          this.preferences.style.display === 'none' ||
          this.preferences.style.display === ''
        ) {
          this.toggleModal(true);
          this.hideCookieIcon();
        } else {
          this.toggleModal(false);
        }
      });
    }
  }

  // ----------------------------------------------------------------
  // Body Scroll Lock
  // ----------------------------------------------------------------

  preventBodyScroll() {
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
  }

  allowBodyScroll() {
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.width = '';
  }
}
