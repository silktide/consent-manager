const C = {
  "EU-OPTIN": "EU-OPTIN",
  "SOFT-OPTIN": "SOFT-OPTIN",
  "US-OPTOUT": "US-OPTOUT",
  "CA-OPTOUT-BANNER": "CA-OPTOUT-BANNER"
}, y = {
  // EU member states -> EU-OPTIN
  AT: "EU-OPTIN",
  BE: "EU-OPTIN",
  BG: "EU-OPTIN",
  HR: "EU-OPTIN",
  CY: "EU-OPTIN",
  CZ: "EU-OPTIN",
  DK: "EU-OPTIN",
  EE: "EU-OPTIN",
  FI: "EU-OPTIN",
  FR: "EU-OPTIN",
  DE: "EU-OPTIN",
  GR: "EU-OPTIN",
  HU: "EU-OPTIN",
  IE: "EU-OPTIN",
  IT: "EU-OPTIN",
  LV: "EU-OPTIN",
  LT: "EU-OPTIN",
  LU: "EU-OPTIN",
  MT: "EU-OPTIN",
  NL: "EU-OPTIN",
  PL: "EU-OPTIN",
  PT: "EU-OPTIN",
  RO: "EU-OPTIN",
  SK: "EU-OPTIN",
  SI: "EU-OPTIN",
  ES: "EU-OPTIN",
  SE: "EU-OPTIN",
  // EEA (non-EU)
  IS: "EU-OPTIN",
  LI: "EU-OPTIN",
  NO: "EU-OPTIN",
  // UK
  GB: "EU-OPTIN",
  // United States -> US-OPTOUT
  US: "US-OPTOUT",
  // Canada -> CA-OPTOUT-BANNER
  CA: "CA-OPTOUT-BANNER",
  // Brazil -> SOFT-OPTIN
  BR: "SOFT-OPTIN",
  // Default bucket countries -> SOFT-OPTIN
  AU: "SOFT-OPTIN",
  NZ: "SOFT-OPTIN",
  SG: "SOFT-OPTIN",
  KR: "SOFT-OPTIN",
  IN: "SOFT-OPTIN",
  AE: "SOFT-OPTIN",
  SA: "SOFT-OPTIN",
  ZA: "SOFT-OPTIN",
  MX: "SOFT-OPTIN",
  AR: "SOFT-OPTIN",
  CL: "SOFT-OPTIN",
  CO: "SOFT-OPTIN",
  JP: "SOFT-OPTIN"
};
async function w(n, t) {
  if (n.consentMode && C[n.consentMode])
    return n.debug && console.log("STCM: Using manual consent mode:", n.consentMode), n.consentMode;
  const e = n.geolocation || {};
  if (!e.apiKey) {
    const c = e.defaultMode && C[e.defaultMode] ? e.defaultMode : "EU-OPTIN";
    return n.debug && console.log("STCM: No API key, using default mode:", c), c;
  }
  const o = E(n, t);
  if (o)
    return n.debug && console.log("STCM: Using cached country:", o), v(o, n);
  try {
    const c = await fetch(
      `https://api.geoapify.com/v1/ipinfo?apiKey=${encodeURIComponent(e.apiKey)}`
    );
    if (!c.ok) throw new Error(`HTTP ${c.status}`);
    const i = (await c.json())?.country?.iso_code;
    if (i)
      return I(i, n, t), n.debug && console.log("STCM: Geoapify country:", i), v(i, n);
    throw new Error("No country code in response");
  } catch (c) {
    return console.warn("STCM: Geolocation failed, using default mode.", c), e.defaultMode && C[e.defaultMode] ? e.defaultMode : "EU-OPTIN";
  }
}
function v(n, t) {
  if (y[n])
    return y[n];
  const e = t.geolocation || {};
  return e.defaultMode && C[e.defaultMode] ? e.defaultMode : "SOFT-OPTIN";
}
function L(n) {
  return `stcm.${n.namespace ? `${n.namespace}.` : ""}geo`;
}
function T(n) {
  return `stcm.${n.namespace ? `${n.namespace}.` : ""}resolvedMode`;
}
function E(n, t) {
  const e = L(n), o = t.get(e);
  if (!o) return null;
  try {
    const c = JSON.parse(o), r = n.geolocation?.cacheTTL || 864e5;
    return Date.now() - c.timestamp < r ? c.country : (t.remove(e), null);
  } catch {
    return null;
  }
}
function I(n, t, e) {
  const o = L(t);
  e.set(
    o,
    JSON.stringify({
      country: n,
      timestamp: Date.now()
    })
  );
}
function B(n) {
  return n === "US-OPTOUT" || n === "CA-OPTOUT-BANNER";
}
function _(n, t, e) {
  navigator.globalPrivacyControl === !0 && (n.debug && console.log("STCM: GPC signal detected. Opting out of non-essential tracking."), n.consentTypes.forEach((o) => {
    t(o.id, !!o.required);
  }), e());
}
function O(n, t, e) {
  n.consentTypes.forEach((o) => {
    t(o.id) === null && e(o.id, !0);
  });
}
function P(n) {
  document.querySelectorAll("[data-stcm-privacy-link]").forEach((e) => {
    e.addEventListener("click", (o) => {
      o.preventDefault(), n();
    });
  });
}
const M = `
  <a class="stcm-logo" href="https://silktide.com/consent-manager" target="_blank" rel="noreferrer" aria-label="Visit the Silktide Consent Manager page">
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="25" viewBox="0 0 24 25" fill="inherit">
      <path fill-rule="evenodd" clip-rule="evenodd" d="M14.1096 16.7745C13.8895 17.2055 13.3537 17.3805 12.9129 17.1653L8.28443 14.9055L2.73192 17.7651L11.1025 21.9814C11.909 22.3876 12.8725 22.3591 13.6524 21.9058L20.4345 17.9645C21.2845 17.4704 21.7797 16.5522 21.7164 15.5872L21.7088 15.4704C21.6487 14.5561 21.0962 13.7419 20.2579 13.3326L15.6793 11.0972L10.2283 13.9045L13.71 15.6043C14.1507 15.8195 14.3297 16.3434 14.1096 16.7745ZM8.2627 12.9448L13.7136 10.1375L10.2889 8.46543C9.84803 8.25021 9.66911 7.72629 9.88916 7.29524C10.1093 6.86417 10.6451 6.68921 11.0859 6.90442L15.6575 9.13647L21.2171 6.27325L12.8808 2.03496C12.0675 1.62147 11.0928 1.65154 10.3078 2.11432L3.54908 6.09869C2.70732 6.59492 2.21846 7.50845 2.28139 8.46761L2.29003 8.59923C2.35002 9.51362 2.9026 10.3278 3.7409 10.7371L8.2627 12.9448ZM6.31884 13.9458L2.94386 12.2981C1.53727 11.6113 0.610092 10.2451 0.509431 8.71094L0.500795 8.57933C0.3952 6.96993 1.21547 5.4371 2.62787 4.60447L9.38662 0.620092C10.7038 -0.156419 12.3392 -0.206861 13.7039 0.486938L23.3799 5.40639C23.4551 5.44459 23.5224 5.4918 23.5811 5.54596C23.7105 5.62499 23.8209 5.73754 23.897 5.87906C24.1266 6.30534 23.9594 6.83293 23.5234 7.05744L17.6231 10.0961L21.0549 11.7716C22.4615 12.4583 23.3887 13.8245 23.4893 15.3587L23.497 15.4755C23.6033 17.0947 22.7724 18.6354 21.346 19.4644L14.5639 23.4057C13.2554 24.1661 11.6386 24.214 10.2854 23.5324L0.621855 18.6649C0.477299 18.592 0.361696 18.4859 0.279794 18.361C0.210188 18.2968 0.150054 18.2204 0.10296 18.133C-0.126635 17.7067 0.0406445 17.1792 0.47659 16.9546L6.31884 13.9458Z" fill="inherit"/>
    </svg>
  </a>
`, k = `<button class="stcm-dismiss stcm-banner-dismiss" aria-label="Dismiss">
  <svg width="14" height="14" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M19.4081 3.41559C20.189 2.6347 20.189 1.36655 19.4081 0.585663C18.6272 -0.195221 17.3591 -0.195221 16.5782 0.585663L10 7.17008L3.41559 0.59191C2.6347 -0.188974 1.36655 -0.188974 0.585663 0.59191C-0.195221 1.37279 -0.195221 2.64095 0.585663 3.42183L7.17008 10L0.59191 16.5844C-0.188974 17.3653 -0.188974 18.6335 0.59191 19.4143C1.37279 20.1952 2.64095 20.1952 3.42183 19.4143L10 12.8299L16.5844 19.4081C17.3653 20.189 18.6335 20.189 19.4143 19.4081C20.1952 18.6272 20.1952 17.3591 19.4143 16.5782L12.8299 10L19.4081 3.41559Z" fill="currentColor"/>
  </svg>
</button>`;
function g(n, t, e) {
  const o = e && e !== t ? ` aria-label="${e}"` : "";
  return `<button class="${n}"${o}>${t}</button>`;
}
function A(n) {
  const t = n.text?.prompt?.description || "<p>We use cookies on our site to enhance your user experience, provide personalized content, and analyze our traffic.</p>", e = g(
    "stcm-accept-all stcm-button stcm-button-primary",
    n.text?.prompt?.acceptAllButtonText || "Accept all",
    n.text?.prompt?.acceptAllButtonAccessibleLabel
  ), o = g(
    "stcm-reject-all stcm-button stcm-button-primary",
    n.text?.prompt?.rejectNonEssentialButtonText || "Reject non-essential",
    n.text?.prompt?.rejectNonEssentialButtonAccessibleLabel
  ), c = n.text?.prompt?.preferencesButtonText || "Preferences", r = n.text?.prompt?.preferencesButtonAccessibleLabel, i = `<button class="stcm-preferences-button"${r && r !== c ? ` aria-label="${r}"` : ""}><span>${c}</span></button>`;
  return `
    ${t}
    <div class="stcm-actions">
      ${e}
      ${o}
      <div class="stcm-actions-row">
        ${i}
        ${M}
      </div>
    </div>
  `;
}
function N(n) {
  const t = n.text?.prompt?.description || "<p>We use cookies to improve your experience.</p>", e = g(
    "stcm-accept-all stcm-button stcm-button-primary",
    n.text?.prompt?.acceptAllButtonText || "Accept",
    n.text?.prompt?.acceptAllButtonAccessibleLabel
  ), o = g(
    "stcm-preferences-button stcm-button stcm-button-secondary",
    n.text?.prompt?.preferencesButtonText || "Customize",
    n.text?.prompt?.preferencesButtonAccessibleLabel
  );
  return `
    <div class="stcm-compact-row">
      <div class="stcm-compact-text">${t}</div>
      <div class="stcm-actions stcm-actions-inline">
        ${e}
        ${o}
        ${k}
      </div>
    </div>
  `;
}
function U(n) {
  const t = n.text?.prompt?.description || "<p>We use cookies for analytics and advertising. You can opt out at any time.</p>", e = g(
    "stcm-reject-all stcm-button stcm-button-secondary",
    n.text?.prompt?.rejectNonEssentialButtonText || "Opt out",
    n.text?.prompt?.rejectNonEssentialButtonAccessibleLabel
  ), o = g(
    "stcm-preferences-button stcm-button stcm-button-secondary",
    n.text?.prompt?.preferencesButtonText || "Customize",
    n.text?.prompt?.preferencesButtonAccessibleLabel
  );
  return `
    <div class="stcm-compact-row">
      <div class="stcm-compact-text">${t}</div>
      <div class="stcm-actions stcm-actions-inline">
        ${e}
        ${o}
        ${k}
      </div>
    </div>
  `;
}
function x(n, t, e) {
  const o = n.text?.preferences?.title || "Customize your cookie preferences", c = n.text?.preferences?.description || "<p>We respect your right to privacy. You can choose not to allow some types of cookies. Your cookie preferences will apply across our website.</p>", r = n.text?.prompt?.preferencesButtonAccessibleLabel, i = `<button class="stcm-modal-close"${r ? ` aria-label="${r}"` : ""}>
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M19.4081 3.41559C20.189 2.6347 20.189 1.36655 19.4081 0.585663C18.6272 -0.195221 17.3591 -0.195221 16.5782 0.585663L10 7.17008L3.41559 0.59191C2.6347 -0.188974 1.36655 -0.188974 0.585663 0.59191C-0.195221 1.37279 -0.195221 2.64095 0.585663 3.42183L7.17008 10L0.59191 16.5844C-0.188974 17.3653 -0.188974 18.6335 0.59191 19.4143C1.37279 20.1952 2.64095 20.1952 3.42183 19.4143L10 12.8299L16.5844 19.4081C17.3653 20.189 18.6335 20.189 19.4143 19.4081C20.1952 18.6272 20.1952 17.3591 19.4143 16.5782L12.8299 10L19.4081 3.41559Z"/>
    </svg>
  </button>`, s = n.consentTypes || [], l = g(
    "stcm-modal-save stcm-button stcm-button-primary",
    n.text?.preferences?.saveButtonText || "Save and close",
    n.text?.preferences?.saveButtonAccessibleLabel
  ), a = g(
    "stcm-modal-reject-all stcm-button stcm-button-primary",
    n.text?.prompt?.rejectNonEssentialButtonText || "Reject non-essential",
    n.text?.prompt?.rejectNonEssentialButtonAccessibleLabel
  ), d = n.text?.preferences?.creditLinkText || "Get this consent manager for free", u = n.text?.preferences?.creditLinkAccessibleLabel, f = `<a class="stcm-credit-link" href="https://silktide.com/consent-manager" target="_blank" rel="noreferrer"${u && u !== d ? ` aria-label="${u}"` : ""}>${d}</a>`;
  return `
    <header>
      <h1>${o}</h1>
      ${i}
    </header>
    ${c}
    <section id="stcm-form">
      ${s.map((h) => {
    const m = t[h.id];
    let b = !1;
    return m && (b = !0), !m && !e && (b = h.defaultValue), `
          <fieldset>
            <legend>${h.label}</legend>
            <div class="stcm-consent-row">
              <div class="stcm-consent-description">${h.description}</div>
              <label class="stcm-toggle" for="consent-${h.id}">
                <input type="checkbox" id="consent-${h.id}" ${h.required ? "checked disabled" : b ? "checked" : ""} />
                <span class="stcm-toggle-track" aria-hidden="true"></span>
                <span class="stcm-toggle-thumb" aria-hidden="true"></span>
                <span class="stcm-toggle-off" aria-hidden="true">Off</span>
                <span class="stcm-toggle-on" aria-hidden="true">On</span>
              </label>
            </div>
          </fieldset>
        `;
  }).join("")}
    </section>
    <footer>
      ${l}
      ${a}
      ${f}
    </footer>
  `;
}
function $() {
  return `
    <svg width="38" height="38" viewBox="0 0 38 38" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M19.1172 1.15625C19.0547 0.734374 18.7344 0.390624 18.3125 0.328124C16.5859 0.0859365 14.8281 0.398437 13.2813 1.21875L7.5 4.30469C5.96094 5.125 4.71875 6.41406 3.95313 7.98437L1.08594 13.8906C0.320314 15.4609 0.0703136 17.2422 0.375001 18.9609L1.50781 25.4297C1.8125 27.1562 2.64844 28.7344 3.90625 29.9531L8.61719 34.5156C9.875 35.7344 11.4766 36.5156 13.2031 36.7578L19.6875 37.6719C21.4141 37.9141 23.1719 37.6016 24.7188 36.7812L30.5 33.6953C32.0391 32.875 33.2813 31.5859 34.0469 30.0078L36.9141 24.1094C37.6797 22.5391 37.9297 20.7578 37.625 19.0391C37.5547 18.625 37.2109 18.3125 36.7969 18.25C32.7734 17.6094 29.5469 14.5703 28.6328 10.6406C28.4922 10.0469 28.0078 9.59375 27.4063 9.5C23.1406 8.82031 19.7734 5.4375 19.1094 1.15625H19.1172ZM15.25 10.25C15.913 10.25 16.5489 10.5134 17.0178 10.9822C17.4866 11.4511 17.75 12.087 17.75 12.75C17.75 13.413 17.4866 14.0489 17.0178 14.5178C16.5489 14.9866 15.913 15.25 15.25 15.25C14.587 15.25 13.9511 14.9866 13.4822 14.5178C13.0134 14.0489 12.75 13.413 12.75 12.75C12.75 12.087 13.0134 11.4511 13.4822 10.9822C13.9511 10.5134 14.587 10.25 15.25 10.25ZM10.25 25.25C10.25 24.587 10.5134 23.9511 10.9822 23.4822C11.4511 23.0134 12.087 22.75 12.75 22.75C13.413 22.75 14.0489 23.0134 14.5178 23.4822C14.9866 23.9511 15.25 24.587 15.25 25.25C15.25 25.913 14.9866 26.5489 14.5178 27.0178C14.0489 27.4866 13.413 27.75 12.75 27.75C12.087 27.75 11.4511 27.4866 10.9822 27.0178C10.5134 26.5489 10.25 25.913 10.25 25.25ZM27.75 20.25C28.413 20.25 29.0489 20.5134 29.5178 20.9822C29.9866 21.4511 30.25 22.087 30.25 22.75C30.25 23.413 29.9866 24.0489 29.5178 24.5178C29.0489 24.9866 28.413 25.25 27.75 25.25C27.087 25.25 26.4511 24.9866 25.9822 24.5178C25.5134 24.0489 25.25 23.413 25.25 22.75C25.25 22.087 25.5134 21.4511 25.9822 20.9822C26.4511 20.5134 27.087 20.25 27.75 20.25Z" />
    </svg>
  `;
}
class j {
  constructor(t) {
    this._validateConfig(t), this.config = t, this.config.eventName = this.config.eventName || "stcm_consent_update", this.config.debug = this.config.debug === !0, this.wrapper = null, this.prompt = null, this.preferences = null, this.icon = null, this.backdrop = null, this.localStorageAvailable = this._checkLocalStorageAvailable(), this._needsReload = !1, this._resolvedMode = null, this._initialized = !1, this._storage = {
      get: (e) => this._getLocalStorageItem(e),
      set: (e, o) => this._setLocalStorageItem(e, o),
      remove: (e) => this._removeLocalStorageItem(e)
    }, this.createWrapper(), this._initPromise = w(this.config, this._storage).then((e) => {
      this._resolvedMode = e, this._buildUI();
    });
  }
  // ----------------------------------------------------------------
  // Consent Mode Helpers
  // ----------------------------------------------------------------
  _isOptOutMode() {
    return B(this._resolvedMode);
  }
  // ----------------------------------------------------------------
  // UI Builder (mode dispatch)
  // ----------------------------------------------------------------
  _buildUI() {
    this._initialized = !0;
    const t = T(this.config), e = this._getLocalStorageItem(t);
    switch (e && e !== this._resolvedMode && (this.config.debug && console.log(
      "STCM: Consent mode changed from",
      e,
      "to",
      this._resolvedMode,
      "- resetting consent."
    ), this.clearAllConsents()), this._setLocalStorageItem(t, this._resolvedMode), this._resolvedMode) {
      case "EU-OPTIN":
        this._buildEuOptinUI();
        break;
      case "SOFT-OPTIN":
        this._buildSoftOptinUI();
        break;
      case "US-OPTOUT":
        this._buildUsOptoutUI();
        break;
      case "CA-OPTOUT-BANNER":
        this._buildCaOptoutBannerUI();
        break;
      default:
        this._buildEuOptinUI();
    }
    this.setupEventListeners(), this.runConsentCallbacksOnLoad();
  }
  _buildEuOptinUI() {
    this.shouldShowBackdrop() && this.createBackdrop(), this.createCookieIcon(), this.createModal(), this.shouldShowPrompt() ? (this.createBanner(), this.showBackdrop()) : this.showCookieIcon();
  }
  _buildSoftOptinUI() {
    this.createCookieIcon(), this.createModal(), this.shouldShowPrompt() ? (this.createSoftOptinBanner(), this.shouldShowBackdrop() && (this.createBackdrop(), this.showBackdrop())) : this.showCookieIcon();
  }
  _buildUsOptoutUI() {
    _(
      this.config,
      (t, e) => this.setConsentChoice(t, e),
      () => this.setHasConsented()
    ), this.getHasConsented() || O(
      this.config,
      (t) => this.getConsentChoice(t),
      (t, e) => this.setConsentChoice(t, e)
    ), this.createCookieIcon(), this.showCookieIcon(), this.createModal(), P(() => this.toggleModal(!0));
  }
  _buildCaOptoutBannerUI() {
    this.getHasConsented() || O(
      this.config,
      (t) => this.getConsentChoice(t),
      (t, e) => this.setConsentChoice(t, e)
    ), this.createCookieIcon(), this.createModal(), this.shouldShowPrompt() ? this.createCaOptoutBanner() : this.showCookieIcon();
  }
  // ----------------------------------------------------------------
  // Config Validation
  // ----------------------------------------------------------------
  _validateConfig(t) {
    if (!t)
      throw new Error("Silktide Consent Manager: config is required");
    if (!t.consentTypes || !Array.isArray(t.consentTypes))
      throw new Error("Silktide Consent Manager: config.consentTypes must be an array");
    if (t.consentTypes.length === 0)
      throw new Error("Silktide Consent Manager: config.consentTypes cannot be empty");
  }
  // ----------------------------------------------------------------
  // localStorage
  // ----------------------------------------------------------------
  _checkLocalStorageAvailable() {
    try {
      const t = "__stcm_test__";
      return localStorage.setItem(t, "1"), localStorage.removeItem(t), !0;
    } catch (t) {
      return console.warn(
        "Silktide Consent Manager: localStorage is not available. Consent choices will not persist.",
        t
      ), !1;
    }
  }
  _getLocalStorageItem(t) {
    if (!this.localStorageAvailable) return null;
    try {
      return localStorage.getItem(t);
    } catch (e) {
      return console.warn("Silktide Consent Manager: Error reading from localStorage", e), null;
    }
  }
  _setLocalStorageItem(t, e) {
    if (!this.localStorageAvailable) return !1;
    try {
      return localStorage.setItem(t, e), !0;
    } catch (o) {
      return console.warn("Silktide Consent Manager: Error writing to localStorage", o), !1;
    }
  }
  _removeLocalStorageItem(t) {
    if (!this.localStorageAvailable) return !1;
    try {
      return localStorage.removeItem(t), !0;
    } catch (e) {
      return console.warn("Silktide Consent Manager: Error removing from localStorage", e), !1;
    }
  }
  // ----------------------------------------------------------------
  // Destroy / Clear
  // ----------------------------------------------------------------
  destroy() {
    this.wrapper && this.wrapper.parentNode && this.wrapper.parentNode.removeChild(this.wrapper), this.allowBodyScroll(), this.wrapper = null, this.prompt = null, this.preferences = null, this.icon = null, this.backdrop = null;
  }
  clearAllConsents() {
    if (!this.localStorageAvailable) return;
    const t = [];
    try {
      for (let e = 0; e < localStorage.length; e++) {
        const o = localStorage.key(e);
        o && (o.startsWith("silktideCookieBanner_") || o.startsWith("silktideCookieChoice_") || o.startsWith("stcm.")) && t.push(o);
      }
      t.forEach((e) => this._removeLocalStorageItem(e));
    } catch {
    }
  }
  // ----------------------------------------------------------------
  // localStorage Helper Methods (with lazy migration)
  // ----------------------------------------------------------------
  _buildOldConsentKey(t) {
    const e = this.config.namespace ? `_${this.config.namespace}` : "";
    return `silktideCookieChoice_${t}${e}`;
  }
  _buildOldHasConsentedKey() {
    return `silktideCookieBanner_InitialChoice${this.config.namespace ? `_${this.config.namespace}` : ""}`;
  }
  _buildConsentKey(t) {
    return `stcm.${this.config.namespace ? `${this.config.namespace}.` : ""}consent.${t}`;
  }
  _buildHasConsentedKey() {
    return `stcm.${this.config.namespace ? `${this.config.namespace}.` : ""}hasConsented`;
  }
  getConsentChoice(t) {
    const e = this._buildConsentKey(t);
    let o = this._getLocalStorageItem(e);
    if (o === null) {
      const c = this._buildOldConsentKey(t);
      o = this._getLocalStorageItem(c), o !== null && (this._setLocalStorageItem(e, o), this._removeLocalStorageItem(c));
    }
    return o === null ? null : o === "true";
  }
  setConsentChoice(t, e) {
    const o = this._buildConsentKey(t);
    this._setLocalStorageItem(o, e.toString());
    const c = this._buildOldConsentKey(t);
    this._getLocalStorageItem(c) !== null && this._removeLocalStorageItem(c);
  }
  getHasConsented() {
    const t = this._buildHasConsentedKey();
    let e = this._getLocalStorageItem(t);
    if (e === null) {
      const o = this._buildOldHasConsentedKey();
      e = this._getLocalStorageItem(o), e !== null && (this._setLocalStorageItem(t, e), this._removeLocalStorageItem(o));
    }
    return e !== null;
  }
  setHasConsented() {
    const t = this._buildHasConsentedKey();
    this._setLocalStorageItem(t, "1");
    const e = this._buildOldHasConsentedKey();
    this._getLocalStorageItem(e) !== null && this._removeLocalStorageItem(e);
  }
  hasConsented() {
    return this.getHasConsented();
  }
  // ----------------------------------------------------------------
  // Script Injection
  // ----------------------------------------------------------------
  _injectScript(t, e) {
    const { url: o, load: c, type: r, crossorigin: i, integrity: s } = t;
    if (!o) {
      console.warn("Silktide Consent Manager: Script URL is required", t);
      return;
    }
    if (document.querySelector(`script[src="${o}"]`)) return;
    const a = document.createElement("script");
    a.src = o, a.dataset.consentId = e, c === "async" && (a.async = !0), c === "defer" && (a.defer = !0), r && (a.type = r), i && (a.crossOrigin = i), s && (a.integrity = s), document.head.appendChild(a);
  }
  _injectConsentScripts(t) {
    !t.scripts || !Array.isArray(t.scripts) || t.scripts.forEach((e) => {
      this._injectScript(e, t.id);
    });
  }
  _wasConsentRevoked(t, e) {
    return this.getConsentChoice(t) === !0 && e === !1;
  }
  // ----------------------------------------------------------------
  // Wrapper
  // ----------------------------------------------------------------
  createWrapper() {
    this.wrapper = document.createElement("div"), this.wrapper.id = "stcm-wrapper", document.body.insertBefore(this.wrapper, document.body.firstChild);
  }
  createWrapperChild(t, e) {
    const o = document.createElement("div");
    return o.id = e, o.innerHTML = t, (!this.wrapper || !document.body.contains(this.wrapper)) && this.createWrapper(), this.wrapper.appendChild(o), o;
  }
  // ----------------------------------------------------------------
  // Backdrop
  // ----------------------------------------------------------------
  createBackdrop() {
    this.backdrop = this.createWrapperChild(null, "stcm-backdrop"), this.backdrop.addEventListener("click", () => {
      this.nudgePrompt();
    });
  }
  showBackdrop() {
    this.backdrop && (this.backdrop.style.display = "block"), typeof this.config.onBackdropOpen == "function" && this.config.onBackdropOpen();
  }
  hideBackdrop() {
    this.backdrop && (this.backdrop.style.display = "none"), typeof this.config.onBackdropClose == "function" && this.config.onBackdropClose();
  }
  shouldShowBackdrop() {
    return this.config?.backdrop?.show || !1;
  }
  nudgePrompt() {
    this.prompt && (this.prompt.classList.remove("stcm-nudge"), this.prompt.offsetWidth, this.prompt.classList.add("stcm-nudge"), this.prompt.addEventListener(
      "animationend",
      () => {
        this.prompt && this.prompt.classList.remove("stcm-nudge");
      },
      { once: !0 }
    ));
  }
  // ----------------------------------------------------------------
  // Checkbox State
  // ----------------------------------------------------------------
  updateCheckboxState(t = !1) {
    this.preferences.querySelector("#stcm-form").querySelectorAll('input[type="checkbox"]').forEach((c) => {
      const [, r] = c.id.split("consent-"), i = this.config.consentTypes.find((s) => s.id === r);
      if (i)
        if (t) {
          const s = c.checked;
          if (i.required)
            this.setConsentChoice(r, !0);
          else {
            const l = this.getConsentChoice(r), a = this._wasConsentRevoked(r, s), d = i.scripts?.length > 0;
            this.setConsentChoice(r, s), s !== l && (this.triggerConsentIntegration(i, s), s && typeof i.onAccept == "function" ? i.onAccept() : !s && typeof i.onReject == "function" && i.onReject()), a && d && (this._needsReload = !0);
          }
        } else if (i.required)
          c.checked = !0, c.disabled = !0;
        else {
          const s = this.getConsentChoice(r);
          s !== null ? c.checked = s : c.checked = !!i.defaultValue;
        }
    });
  }
  // ----------------------------------------------------------------
  // Consent Integration (gtag / dataLayer)
  // ----------------------------------------------------------------
  triggerConsentIntegration(t, e) {
    if (!t.gtag) return;
    const o = Array.isArray(t.gtag) ? t.gtag : [t.gtag];
    if (typeof gtag == "function") {
      const c = e ? "granted" : "denied", r = {};
      o.forEach((i) => {
        r[i] = c;
      }), gtag("consent", "update", r);
    } else o.includes("analytics_storage") && typeof window.silktide == "function" && window.silktide(e ? "consent" : "unconsent");
    window.dataLayer = window.dataLayer || [], window.dataLayer.push({ event: this.config.eventName });
  }
  // ----------------------------------------------------------------
  // Batch Consent Update
  // ----------------------------------------------------------------
  batchUpdateConsents(t) {
    const e = [], o = {};
    let c = !1, r = !1;
    if (this.config.consentTypes.forEach((i) => {
      const s = t[i.id], l = this.getConsentChoice(i.id);
      if (s !== l) {
        c = !0, e.push({
          type: i,
          newState: s,
          previousState: l
        });
        const a = l === !0 && s === !1, d = i.scripts?.length > 0;
        if (a && d && (r = !0), i.gtag) {
          const u = Array.isArray(i.gtag) ? i.gtag : [i.gtag], f = s ? "granted" : "denied";
          u.forEach((h) => {
            o[h] = f;
          });
        }
      }
    }), !c) return !1;
    if (e.forEach(({ type: i, newState: s }) => {
      this.setConsentChoice(i.id, s);
    }), Object.keys(o).length > 0 && typeof gtag == "function")
      gtag("consent", "update", o), this.config.debug && console.log("gtag consent updated (from user action):", o);
    else if (o.analytics_storage && typeof window.silktide == "function") {
      const i = o.analytics_storage === "granted";
      window.silktide(i ? "consent" : "unconsent");
    }
    return window.dataLayer = window.dataLayer || [], window.dataLayer.push({ event: this.config.eventName }), this.config.debug && console.log("GTM Event Sent: " + this.config.eventName + " (from user action)"), e.forEach(({ type: i, newState: s }) => {
      s ? (this._injectConsentScripts(i), typeof i.onAccept == "function" && i.onAccept()) : typeof i.onReject == "function" && i.onReject();
    }), r && setTimeout(() => {
      window.location.reload();
    }, 100), !0;
  }
  // ----------------------------------------------------------------
  // Consent Handling
  // ----------------------------------------------------------------
  handleConsentChoice(t) {
    this.setHasConsented(), this.removeBanner(), this.hideBackdrop(), this.toggleModal(!1), this.showCookieIcon();
    const e = {};
    this.config.consentTypes.forEach((o) => {
      e[o.id] = o.required ? !0 : t;
    }), this.batchUpdateConsents(e), t && typeof this.config.onAcceptAll == "function" ? this.config.onAcceptAll() : !t && typeof this.config.onRejectAll == "function" && this.config.onRejectAll(), this.updateCheckboxState();
  }
  getAcceptedConsents() {
    return (this.config.consentTypes || []).reduce((t, e) => (t[e.id] = this.getConsentChoice(e.id), t), {});
  }
  getRejectedConsents() {
    return (this.config.consentTypes || []).reduce((t, e) => {
      const o = this.getConsentChoice(e.id);
      return t[e.id] = o === !1, t;
    }, {});
  }
  // ----------------------------------------------------------------
  // On-Load Consent Callbacks
  // ----------------------------------------------------------------
  runConsentCallbacksOnLoad() {
    if (!this.config.consentTypes) return;
    const t = {};
    let e = !1, o = !1;
    const c = this.getAcceptedConsents(), r = this.getRejectedConsents();
    if (this.config.consentTypes.forEach((s) => {
      if (s.required) {
        this.getConsentChoice(s.id) === null && (this.setConsentChoice(s.id, !0), o = !0), this._injectConsentScripts(s), s.gtag && (e = !0, (Array.isArray(s.gtag) ? s.gtag : [s.gtag]).forEach((m) => {
          t[m] = "granted";
        })), typeof s.onAccept == "function" && s.onAccept();
        return;
      }
      const l = c[s.id], a = r[s.id];
      l || !l && !a && this._isOptOutMode() ? (this._injectConsentScripts(s), s.gtag && (e = !0, (Array.isArray(s.gtag) ? s.gtag : [s.gtag]).forEach((h) => {
        t[h] = "granted";
      })), typeof s.onAccept == "function" && s.onAccept()) : a && (s.gtag && (e = !0, (Array.isArray(s.gtag) ? s.gtag : [s.gtag]).forEach((h) => {
        t[h] = "denied";
      })), typeof s.onReject == "function" && s.onReject());
    }), e && typeof gtag == "function")
      gtag("consent", "update", t), this.config.debug && console.log("gtag consent updated (on page load):", t);
    else if (t.analytics_storage && typeof window.silktide == "function") {
      const s = t.analytics_storage === "granted";
      window.silktide(s ? "consent" : "unconsent");
    }
    const i = Object.values(t).some(
      (s) => s === "granted"
    );
    if (e && i && (window.dataLayer = window.dataLayer || [], window.dataLayer.push({ event: this.config.eventName }), this.config.debug)) {
      const s = o ? "from first page load" : "from return visit";
      console.log("GTM Event Sent: " + this.config.eventName + " (" + s + ")");
    }
  }
  runStoredConsentCallbacks() {
    this.config.consentTypes.forEach((t) => {
      const e = this.getConsentChoice(t.id);
      e && this._injectConsentScripts(t), this.triggerConsentIntegration(t, e), e ? typeof t.onAccept == "function" && t.onAccept() : typeof t.onReject == "function" && t.onReject();
    });
  }
  // ----------------------------------------------------------------
  // Banner (EU-OPTIN full banner)
  // ----------------------------------------------------------------
  getBannerContent() {
    return A(this.config);
  }
  createBanner() {
    if (this.prompt = this.createWrapperChild(this.getBannerContent(), "stcm-banner"), this.prompt && this.config.prompt?.position) {
      const e = {
        center: "stcm-pos-center",
        bottomLeft: "stcm-pos-bottom-left",
        bottomCenter: "stcm-pos-bottom-center",
        bottomRight: "stcm-pos-bottom-right"
      }[this.config.prompt.position] || this.config.prompt.position;
      this.prompt.classList.add(e);
    }
    this.prompt.addEventListener(
      "animationend",
      () => {
        this.prompt && this.prompt.classList.add("stcm-loaded");
      },
      { once: !0 }
    ), this.prompt && typeof this.config.onPromptOpen == "function" && this.config.onPromptOpen();
  }
  // ----------------------------------------------------------------
  // SOFT-OPTIN Banner
  // ----------------------------------------------------------------
  getSoftOptinBannerContent() {
    return N(this.config);
  }
  createSoftOptinBanner() {
    this.prompt = this.createWrapperChild(this.getSoftOptinBannerContent(), "stcm-banner"), this.prompt.classList.add("stcm-banner-soft"), this._applyBannerPosition(), this._attachBannerAnimationEnd(), typeof this.config.onPromptOpen == "function" && this.config.onPromptOpen();
  }
  // ----------------------------------------------------------------
  // CA-OPTOUT Banner
  // ----------------------------------------------------------------
  getCaOptoutBannerContent() {
    return U(this.config);
  }
  createCaOptoutBanner() {
    this.prompt = this.createWrapperChild(this.getCaOptoutBannerContent(), "stcm-banner"), this.prompt.classList.add("stcm-banner-ca-optout"), this._applyBannerPosition(), this._attachBannerAnimationEnd(), typeof this.config.onPromptOpen == "function" && this.config.onPromptOpen();
  }
  // ----------------------------------------------------------------
  // Shared banner helpers
  // ----------------------------------------------------------------
  _applyBannerPosition() {
    if (this.config.prompt?.position) {
      const e = {
        center: "stcm-pos-center",
        bottomLeft: "stcm-pos-bottom-left",
        bottomCenter: "stcm-pos-bottom-center",
        bottomRight: "stcm-pos-bottom-right"
      }[this.config.prompt.position] || this.config.prompt.position;
      this.prompt.classList.add(e);
    }
  }
  _attachBannerAnimationEnd() {
    this.prompt.addEventListener(
      "animationend",
      () => {
        this.prompt && this.prompt.classList.add("stcm-loaded");
      },
      { once: !0 }
    );
  }
  removeBanner() {
    this.prompt && this.prompt.parentNode && (this.prompt.parentNode.removeChild(this.prompt), this.prompt = null, typeof this.config.onPromptClose == "function" && this.config.onPromptClose());
  }
  shouldShowPrompt() {
    return this.config.autoShow === !1 ? !1 : !this.getHasConsented();
  }
  // ----------------------------------------------------------------
  // Modal
  // ----------------------------------------------------------------
  getModalContent() {
    return x(this.config, this.getAcceptedConsents(), this.hasConsented());
  }
  createModal() {
    this.preferences = this.createWrapperChild(this.getModalContent(), "stcm-modal");
  }
  toggleModal(t) {
    this.preferences && (this.preferences.style.display = t ? "flex" : "none", t ? (this.showBackdrop(), this.hideCookieIcon(), this.removeBanner(), this.preventBodyScroll(), this.preferences.querySelector(".stcm-modal-close").focus(), typeof this.config.onPreferencesOpen == "function" && this.config.onPreferencesOpen(), this.updateCheckboxState(!1)) : (this.hideBackdrop(), this.showCookieIcon(), this.allowBodyScroll(), typeof this.config.onPreferencesClose == "function" && this.config.onPreferencesClose()));
  }
  // ----------------------------------------------------------------
  // Cookie Icon
  // ----------------------------------------------------------------
  createCookieIcon() {
    if (this.icon = document.createElement("button"), this.icon.id = "stcm-icon", this.icon.title = "Manage your consent preferences for this site", this.icon.innerHTML = $(), this.config.text?.prompt?.preferencesButtonAccessibleLabel && (this.icon.ariaLabel = this.config.text?.prompt?.preferencesButtonAccessibleLabel), (!this.wrapper || !document.body.contains(this.wrapper)) && this.createWrapper(), this.wrapper.appendChild(this.icon), this.icon && this.config.icon?.position) {
      const e = {
        bottomRight: "stcm-pos-bottom-right",
        bottomLeft: "stcm-pos-bottom-left"
      }[this.config.icon.position] || this.config.icon.position;
      this.icon.classList.add(e);
    }
    this.icon && this.config.icon?.colorScheme && this.icon.classList.add(this.config.icon.colorScheme);
  }
  showCookieIcon() {
    this.icon && (this.icon.style.display = "flex");
  }
  hideCookieIcon() {
    this.icon && (this.icon.style.display = "none");
  }
  // ----------------------------------------------------------------
  // Default Consent
  // ----------------------------------------------------------------
  handleDefaultConsent() {
    this.config.consentTypes.forEach((t) => {
      let e = !0;
      t.required || t.defaultValue ? this.setConsentChoice(t.id, !0) : (e = !1, this.setConsentChoice(t.id, !1)), e ? typeof t.onAccept == "function" && t.onAccept() : typeof t.onReject == "function" && t.onReject(), this.setHasConsented(), this.updateCheckboxState();
    });
  }
  // ----------------------------------------------------------------
  // Focus Trap
  // ----------------------------------------------------------------
  getFocusableElements(t) {
    return t.querySelectorAll(
      'button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
  }
  // ----------------------------------------------------------------
  // Event Listeners
  // ----------------------------------------------------------------
  setupEventListeners() {
    if (this.prompt) {
      const t = this.prompt.querySelector(".stcm-accept-all"), e = this.prompt.querySelector(".stcm-reject-all"), o = this.prompt.querySelector(".stcm-preferences-button"), c = this.prompt.querySelector(".stcm-dismiss");
      t?.addEventListener("click", () => this.handleConsentChoice(!0)), e?.addEventListener("click", () => this.handleConsentChoice(!1)), o?.addEventListener("click", () => {
        this.showBackdrop(), this.toggleModal(!0);
      }), c?.addEventListener("click", () => {
        this._isOptOutMode() ? (this.setHasConsented(), this.removeBanner(), this.showCookieIcon()) : this.handleConsentChoice(!1);
      });
      const r = this.getFocusableElements(this.prompt), i = r[0], s = r[r.length - 1];
      this.prompt.addEventListener("keydown", (l) => {
        l.key === "Tab" && (l.shiftKey ? document.activeElement === i && (s.focus(), l.preventDefault()) : document.activeElement === s && (i.focus(), l.preventDefault()));
      }), this.config.mode !== "wizard" && t?.focus();
    }
    if (this.preferences) {
      const t = this.preferences.querySelector(".stcm-modal-close"), e = this.preferences.querySelector(".stcm-modal-save"), o = this.preferences.querySelector(".stcm-modal-reject-all");
      t?.addEventListener("click", () => {
        this.toggleModal(!1), this.hideBackdrop();
      }), e?.addEventListener("click", () => {
        this.setHasConsented();
        const l = this.preferences.querySelector("#stcm-form").querySelectorAll('input[type="checkbox"]'), a = {};
        l.forEach((d) => {
          const [, u] = d.id.split("consent-");
          a[u] = d.checked;
        }), this.batchUpdateConsents(a), this.toggleModal(!1), this.hideBackdrop(), this.removeBanner(), this.showCookieIcon();
      }), o?.addEventListener("click", () => {
        this.setHasConsented(), this.preferences.querySelector("#stcm-form").querySelectorAll('input[type="checkbox"]').forEach((d) => {
          const [, u] = d.id.split("consent-"), f = this.config.consentTypes.find((h) => h.id === u);
          f && !f.required && (d.checked = !1);
        });
        const a = {};
        this.config.consentTypes.forEach((d) => {
          a[d.id] = !!d.required;
        }), this.batchUpdateConsents(a), this.toggleModal(!1), this.hideBackdrop(), this.removeBanner(), this.showCookieIcon();
      });
      const c = this.getFocusableElements(this.preferences), r = c[0], i = c[c.length - 1];
      this.preferences.addEventListener("keydown", (s) => {
        s.key === "Tab" && (s.shiftKey ? document.activeElement === r && (i.focus(), s.preventDefault()) : document.activeElement === i && (r.focus(), s.preventDefault())), s.key === "Escape" && this.toggleModal(!1);
      }), t?.focus();
    }
    this.icon && this.icon.addEventListener("click", () => {
      this.preferences ? this.preferences.style.display === "none" || this.preferences.style.display === "" ? (this.toggleModal(!0), this.hideCookieIcon()) : this.toggleModal(!1) : (this.createModal(), this.toggleModal(!0), this.hideCookieIcon());
    });
  }
  // ----------------------------------------------------------------
  // Body Scroll Lock
  // ----------------------------------------------------------------
  preventBodyScroll() {
    document.body.style.overflow = "hidden", document.body.style.position = "fixed", document.body.style.width = "100%";
  }
  allowBodyScroll() {
    document.body.style.overflow = "", document.body.style.position = "", document.body.style.width = "";
  }
}
let p;
function S(n = {}) {
  const t = () => (p && (p.destroy(), p = null), p = new j(n), p._initPromise);
  return document.body ? t() : new Promise((e) => {
    document.addEventListener("DOMContentLoaded", () => e(t()), { once: !0 });
  });
}
function R(n = {}) {
  if (!p) {
    console.error(
      "Silktide Consent Manager: Cannot update - no instance initialized. Call init() first."
    );
    return;
  }
  function t(o, c) {
    const r = { ...o };
    for (const i in c)
      c[i] && typeof c[i] == "object" && !Array.isArray(c[i]) ? r[i] = t(o[i] || {}, c[i]) : r[i] = c[i];
    return r;
  }
  const e = t(p.config, n);
  S(e);
}
function K() {
  if (!p) {
    console.error("Silktide Consent Manager: Cannot reset - no instance initialized.");
    return;
  }
  p.clearAllConsents(), S(p.config);
}
function q() {
  return p;
}
function F() {
  return p?._resolvedMode || null;
}
window.silktideConsentManager = {
  init: S,
  update: R,
  getInstance: q,
  resetConsent: K,
  getConsentMode: F
};
export {
  j as SilktideConsentManager,
  F as getConsentMode,
  q as getInstance,
  S as init,
  K as resetConsent,
  R as update
};
//# sourceMappingURL=silktide-consent-manager.js.map
