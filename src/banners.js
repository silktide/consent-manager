/**
 * Silktide logo SVG used in banners
 */
const SILKTIDE_LOGO = `
  <a class="stcm-logo" href="https://silktide.com/consent-manager" target="_blank" rel="noreferrer" aria-label="Visit the Silktide Consent Manager page">
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="25" viewBox="0 0 24 25" fill="inherit">
      <path fill-rule="evenodd" clip-rule="evenodd" d="M14.1096 16.7745C13.8895 17.2055 13.3537 17.3805 12.9129 17.1653L8.28443 14.9055L2.73192 17.7651L11.1025 21.9814C11.909 22.3876 12.8725 22.3591 13.6524 21.9058L20.4345 17.9645C21.2845 17.4704 21.7797 16.5522 21.7164 15.5872L21.7088 15.4704C21.6487 14.5561 21.0962 13.7419 20.2579 13.3326L15.6793 11.0972L10.2283 13.9045L13.71 15.6043C14.1507 15.8195 14.3297 16.3434 14.1096 16.7745ZM8.2627 12.9448L13.7136 10.1375L10.2889 8.46543C9.84803 8.25021 9.66911 7.72629 9.88916 7.29524C10.1093 6.86417 10.6451 6.68921 11.0859 6.90442L15.6575 9.13647L21.2171 6.27325L12.8808 2.03496C12.0675 1.62147 11.0928 1.65154 10.3078 2.11432L3.54908 6.09869C2.70732 6.59492 2.21846 7.50845 2.28139 8.46761L2.29003 8.59923C2.35002 9.51362 2.9026 10.3278 3.7409 10.7371L8.2627 12.9448ZM6.31884 13.9458L2.94386 12.2981C1.53727 11.6113 0.610092 10.2451 0.509431 8.71094L0.500795 8.57933C0.3952 6.96993 1.21547 5.4371 2.62787 4.60447L9.38662 0.620092C10.7038 -0.156419 12.3392 -0.206861 13.7039 0.486938L23.3799 5.40639C23.4551 5.44459 23.5224 5.4918 23.5811 5.54596C23.7105 5.62499 23.8209 5.73754 23.897 5.87906C24.1266 6.30534 23.9594 6.83293 23.5234 7.05744L17.6231 10.0961L21.0549 11.7716C22.4615 12.4583 23.3887 13.8245 23.4893 15.3587L23.497 15.4755C23.6033 17.0947 22.7724 18.6354 21.346 19.4644L14.5639 23.4057C13.2554 24.1661 11.6386 24.214 10.2854 23.5324L0.621855 18.6649C0.477299 18.592 0.361696 18.4859 0.279794 18.361C0.210188 18.2968 0.150054 18.2204 0.10296 18.133C-0.126635 17.7067 0.0406445 17.1792 0.47659 16.9546L6.31884 13.9458Z" fill="inherit"/>
    </svg>
  </a>
`;

/**
 * Dismiss (X) button SVG used in compact banners
 */
const DISMISS_BUTTON = `<button class="stcm-dismiss stcm-banner-dismiss" aria-label="Dismiss">
  <svg width="14" height="14" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M19.4081 3.41559C20.189 2.6347 20.189 1.36655 19.4081 0.585663C18.6272 -0.195221 17.3591 -0.195221 16.5782 0.585663L10 7.17008L3.41559 0.59191C2.6347 -0.188974 1.36655 -0.188974 0.585663 0.59191C-0.195221 1.37279 -0.195221 2.64095 0.585663 3.42183L7.17008 10L0.59191 16.5844C-0.188974 17.3653 -0.188974 18.6335 0.59191 19.4143C1.37279 20.1952 2.64095 20.1952 3.42183 19.4143L10 12.8299L16.5844 19.4081C17.3653 20.189 18.6335 20.189 19.4143 19.4081C20.1952 18.6272 20.1952 17.3591 19.4143 16.5782L12.8299 10L19.4081 3.41559Z" fill="currentColor"/>
  </svg>
</button>`;

/**
 * Build a button element string
 * @param {string} className - CSS class(es)
 * @param {string} text - Button text
 * @param {string} [label] - Accessible label (only added if different from text)
 * @returns {string} HTML button string
 */
function buildButton(className, text, label) {
  const ariaAttr = label && label !== text ? ` aria-label="${label}"` : '';
  return `<button class="${className}"${ariaAttr}>${text}</button>`;
}

/**
 * Get EU-OPTIN banner HTML content (full banner with Accept All / Reject / Preferences)
 * @param {Object} config
 * @returns {string}
 */
export function getEuOptinBannerContent(config) {
  const description =
    config.text?.prompt?.description ||
    '<p>We use cookies on our site to enhance your user experience, provide personalized content, and analyze our traffic.</p>';

  const acceptButton = buildButton(
    'stcm-accept-all stcm-button stcm-button-primary',
    config.text?.prompt?.acceptAllButtonText || 'Accept all',
    config.text?.prompt?.acceptAllButtonAccessibleLabel,
  );

  const rejectButton = buildButton(
    'stcm-reject-all stcm-button stcm-button-primary',
    config.text?.prompt?.rejectNonEssentialButtonText || 'Reject non-essential',
    config.text?.prompt?.rejectNonEssentialButtonAccessibleLabel,
  );

  const preferencesText = config.text?.prompt?.preferencesButtonText || 'Preferences';
  const preferencesLabel = config.text?.prompt?.preferencesButtonAccessibleLabel;
  const preferencesButton = `<button class="stcm-preferences-button"${
    preferencesLabel && preferencesLabel !== preferencesText
      ? ` aria-label="${preferencesLabel}"`
      : ''
  }><span>${preferencesText}</span></button>`;

  return `
    ${description}
    <div class="stcm-actions">
      ${acceptButton}
      ${rejectButton}
      <div class="stcm-actions-row">
        ${preferencesButton}
        ${SILKTIDE_LOGO}
      </div>
    </div>
  `;
}

/**
 * Get SOFT-OPTIN banner HTML content (compact inline banner)
 * @param {Object} config
 * @returns {string}
 */
export function getSoftOptinBannerContent(config) {
  const description =
    config.text?.prompt?.description || '<p>We use cookies to improve your experience.</p>';

  const acceptButton = buildButton(
    'stcm-accept-all stcm-button stcm-button-primary',
    config.text?.prompt?.acceptAllButtonText || 'Accept',
    config.text?.prompt?.acceptAllButtonAccessibleLabel,
  );

  const customizeButton = buildButton(
    'stcm-preferences-button stcm-button stcm-button-secondary',
    config.text?.prompt?.preferencesButtonText || 'Customize',
    config.text?.prompt?.preferencesButtonAccessibleLabel,
  );

  return `
    <div class="stcm-compact-row">
      <div class="stcm-compact-text">${description}</div>
      <div class="stcm-actions stcm-actions-inline">
        ${acceptButton}
        ${customizeButton}
        ${DISMISS_BUTTON}
      </div>
    </div>
  `;
}

/**
 * Get CA-OPTOUT banner HTML content (small opt-out banner)
 * @param {Object} config
 * @returns {string}
 */
export function getCaOptoutBannerContent(config) {
  const description =
    config.text?.prompt?.description ||
    '<p>We use cookies for analytics and advertising. You can opt out at any time.</p>';

  const optOutButton = buildButton(
    'stcm-reject-all stcm-button stcm-button-secondary',
    config.text?.prompt?.rejectNonEssentialButtonText || 'Opt out',
    config.text?.prompt?.rejectNonEssentialButtonAccessibleLabel,
  );

  const customizeButton = buildButton(
    'stcm-preferences-button stcm-button stcm-button-secondary',
    config.text?.prompt?.preferencesButtonText || 'Customize',
    config.text?.prompt?.preferencesButtonAccessibleLabel,
  );

  return `
    <div class="stcm-compact-row">
      <div class="stcm-compact-text">${description}</div>
      <div class="stcm-actions stcm-actions-inline">
        ${optOutButton}
        ${customizeButton}
        ${DISMISS_BUTTON}
      </div>
    </div>
  `;
}

/**
 * Get modal HTML content
 * @param {Object} config
 * @param {Object} acceptedConsentMap - Map of consent ID to boolean
 * @param {boolean} hasConsented - Whether user has made an initial choice
 * @returns {string}
 */
export function getModalContent(config, acceptedConsentMap, hasConsented) {
  const title = config.text?.preferences?.title || 'Customize your cookie preferences';

  const description =
    config.text?.preferences?.description ||
    '<p>We respect your right to privacy. You can choose not to allow some types of cookies. Your cookie preferences will apply across our website.</p>';

  const preferencesButtonLabel = config.text?.prompt?.preferencesButtonAccessibleLabel;
  const closeModalButton = `<button class="stcm-modal-close"${preferencesButtonLabel ? ` aria-label="${preferencesButtonLabel}"` : ''}>
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M19.4081 3.41559C20.189 2.6347 20.189 1.36655 19.4081 0.585663C18.6272 -0.195221 17.3591 -0.195221 16.5782 0.585663L10 7.17008L3.41559 0.59191C2.6347 -0.188974 1.36655 -0.188974 0.585663 0.59191C-0.195221 1.37279 -0.195221 2.64095 0.585663 3.42183L7.17008 10L0.59191 16.5844C-0.188974 17.3653 -0.188974 18.6335 0.59191 19.4143C1.37279 20.1952 2.64095 20.1952 3.42183 19.4143L10 12.8299L16.5844 19.4081C17.3653 20.189 18.6335 20.189 19.4143 19.4081C20.1952 18.6272 20.1952 17.3591 19.4143 16.5782L12.8299 10L19.4081 3.41559Z"/>
    </svg>
  </button>`;

  const consentTypes = config.consentTypes || [];

  const saveButton = buildButton(
    'stcm-modal-save stcm-button stcm-button-primary',
    config.text?.preferences?.saveButtonText || 'Save and close',
    config.text?.preferences?.saveButtonAccessibleLabel,
  );

  const rejectButton = buildButton(
    'stcm-modal-reject-all stcm-button stcm-button-primary',
    config.text?.prompt?.rejectNonEssentialButtonText || 'Reject non-essential',
    config.text?.prompt?.rejectNonEssentialButtonAccessibleLabel,
  );

  const creditLinkText =
    config.text?.preferences?.creditLinkText || 'Get this consent manager for free';
  const creditLinkLabel = config.text?.preferences?.creditLinkAccessibleLabel;
  const creditLink = `<a class="stcm-credit-link" href="https://silktide.com/consent-manager" target="_blank" rel="noreferrer"${
    creditLinkLabel && creditLinkLabel !== creditLinkText ? ` aria-label="${creditLinkLabel}"` : ''
  }>${creditLinkText}</a>`;

  return `
    <header>
      <h1>${title}</h1>
      ${closeModalButton}
    </header>
    ${description}
    <section id="stcm-form">
      ${consentTypes
        .map((type) => {
          const accepted = acceptedConsentMap[type.id];
          let isChecked = false;

          if (accepted) {
            isChecked = true;
          }

          if (!accepted && !hasConsented) {
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
      ${rejectButton}
      ${creditLink}
    </footer>
  `;
}

/**
 * Get cookie icon SVG content
 * @returns {string}
 */
export function getCookieIconContent() {
  return `
    <svg width="38" height="38" viewBox="0 0 38 38" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M19.1172 1.15625C19.0547 0.734374 18.7344 0.390624 18.3125 0.328124C16.5859 0.0859365 14.8281 0.398437 13.2813 1.21875L7.5 4.30469C5.96094 5.125 4.71875 6.41406 3.95313 7.98437L1.08594 13.8906C0.320314 15.4609 0.0703136 17.2422 0.375001 18.9609L1.50781 25.4297C1.8125 27.1562 2.64844 28.7344 3.90625 29.9531L8.61719 34.5156C9.875 35.7344 11.4766 36.5156 13.2031 36.7578L19.6875 37.6719C21.4141 37.9141 23.1719 37.6016 24.7188 36.7812L30.5 33.6953C32.0391 32.875 33.2813 31.5859 34.0469 30.0078L36.9141 24.1094C37.6797 22.5391 37.9297 20.7578 37.625 19.0391C37.5547 18.625 37.2109 18.3125 36.7969 18.25C32.7734 17.6094 29.5469 14.5703 28.6328 10.6406C28.4922 10.0469 28.0078 9.59375 27.4063 9.5C23.1406 8.82031 19.7734 5.4375 19.1094 1.15625H19.1172ZM15.25 10.25C15.913 10.25 16.5489 10.5134 17.0178 10.9822C17.4866 11.4511 17.75 12.087 17.75 12.75C17.75 13.413 17.4866 14.0489 17.0178 14.5178C16.5489 14.9866 15.913 15.25 15.25 15.25C14.587 15.25 13.9511 14.9866 13.4822 14.5178C13.0134 14.0489 12.75 13.413 12.75 12.75C12.75 12.087 13.0134 11.4511 13.4822 10.9822C13.9511 10.5134 14.587 10.25 15.25 10.25ZM10.25 25.25C10.25 24.587 10.5134 23.9511 10.9822 23.4822C11.4511 23.0134 12.087 22.75 12.75 22.75C13.413 22.75 14.0489 23.0134 14.5178 23.4822C14.9866 23.9511 15.25 24.587 15.25 25.25C15.25 25.913 14.9866 26.5489 14.5178 27.0178C14.0489 27.4866 13.413 27.75 12.75 27.75C12.087 27.75 11.4511 27.4866 10.9822 27.0178C10.5134 26.5489 10.25 25.913 10.25 25.25ZM27.75 20.25C28.413 20.25 29.0489 20.5134 29.5178 20.9822C29.9866 21.4511 30.25 22.087 30.25 22.75C30.25 23.413 29.9866 24.0489 29.5178 24.5178C29.0489 24.9866 28.413 25.25 27.75 25.25C27.087 25.25 26.4511 24.9866 25.9822 24.5178C25.5134 24.0489 25.25 23.413 25.25 22.75C25.25 22.087 25.5134 21.4511 25.9822 20.9822C26.4511 20.5134 27.087 20.25 27.75 20.25Z" />
    </svg>
  `;
}
