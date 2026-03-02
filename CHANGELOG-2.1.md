# Consent Manager v2.1.0 — Geolocation-Based Consent Modes

## Overview

v2.1 adds **4 consent modes** that automatically activate based on the visitor's country via Geoapify IP geolocation. This enables a single installation to comply with EU opt-in requirements, US opt-out expectations, Canadian OBA rules, and a conservative default for the rest of the world.

---

## Consent Modes

| Mode | Banner | Tracking Default | Dismiss (X) Behavior |
|------|--------|-----------------|---------------------|
| **EU-OPTIN** | Full popup (Accept All / Reject / Preferences) | Blocked until opt-in | N/A (no dismiss button) |
| **SOFT-OPTIN** | Compact banner (Accept / Customize / Dismiss) | Blocked until opt-in | Reject non-essential |
| **US-OPTOUT** | No banner (cog + footer link only) | Enabled by default | N/A (no banner) |
| **CA-OPTOUT-BANNER** | Small banner (Opt out / Customize / Dismiss) | Enabled by default | Acknowledge & hide |

## Country Mapping

| Region | Mode | Countries |
|--------|------|-----------|
| EU/EEA + UK | EU-OPTIN | AT, BE, BG, HR, CY, CZ, DK, EE, FI, FR, DE, GR, HU, IE, IT, LV, LT, LU, MT, NL, PL, PT, RO, SK, SI, ES, SE, IS, LI, NO, GB |
| United States | US-OPTOUT | US |
| Canada | CA-OPTOUT-BANNER | CA |
| Brazil | SOFT-OPTIN | BR |
| Default bucket | SOFT-OPTIN | AU, NZ, SG, KR, IN, AE, SA, ZA, MX, AR, CL, CO, JP |
| Unmapped countries | Fallback to `defaultMode` | All others |

---

## JS Changes (`silktide-consent-manager.js`)

### New Config Properties

```js
silktideConsentManager.init({
  // ... existing config ...

  // Option A: Manual mode override (no geolocation)
  consentMode: 'EU-OPTIN',

  // Option B: Geolocation-based mode selection
  geolocation: {
    apiKey: 'YOUR_GEOAPIFY_KEY',   // Required for auto-detection
    defaultMode: 'SOFT-OPTIN',     // Fallback when geo fails or country unmapped
    cacheTTL: 86400000             // Cache duration in ms (default: 24h)
  }
});
```

### Mode Resolution Priority

1. Manual `consentMode` config (if set)
2. Cached geolocation result (localStorage, 24h TTL)
3. Geoapify API call (`/v1/ipinfo`)
4. `geolocation.defaultMode` fallback (defaults to `EU-OPTIN`)

### Two-Phase Initialization

The constructor now uses async mode resolution:
- **Phase 1 (sync):** Create wrapper element
- **Phase 2 (async):** Resolve consent mode → build mode-specific UI

Backward compatible — `init()` returns a Promise but existing callers that don't await it work fine since the Promise resolves near-instantly when no API call is needed.

### GPC (Global Privacy Control)

For US-OPTOUT mode, `navigator.globalPrivacyControl` is checked on every page load. If GPC is detected, all non-required consents are automatically opted out.

### Privacy Link (US-OPTOUT)

Users add a `data-stcm-privacy-link` attribute to any element on their page:

```html
<a href="#" data-stcm-privacy-link>Privacy Choices</a>
```

The consent manager automatically attaches a click handler that opens the preferences modal.

### Mode Change Detection

The resolved mode is stored in localStorage. If it changes between visits (e.g. VPN, travel), all consent choices are cleared and the appropriate UI is re-shown.

### New Public API

```js
silktideConsentManager.getConsentMode()  // Returns: 'EU-OPTIN' | 'SOFT-OPTIN' | 'US-OPTOUT' | 'CA-OPTOUT-BANNER' | null
```

---

## CSS Changes (`silktide-consent-manager.css`)

- `.stcm-banner-soft` — compact SOFT-OPTIN banner styles
- `.stcm-banner-ca-optout` — compact CA-OPTOUT banner styles
- `.stcm-compact-row` / `.stcm-actions-inline` — inline text + buttons layout
- `.stcm-button-secondary` — outline button style for secondary actions
- `.stcm-banner-dismiss` — dismiss (X) button with hover/focus states
- Mobile responsive breakpoint (< 600px) — stacks to column layout

---

## WYSIWYG Editor Changes (silktide-website-2026)

### New Types (`types.ts`)
- `ConsentMode` — union type for the 4 modes
- `GeolocationConfig` — `{ apiKey: string; defaultMode: ConsentMode }`
- Added `geolocation` to `ConfigOptions`
- New actions: `SET_GEO_API_KEY`, `SET_GEO_DEFAULT_MODE`

### New Constants (`constants.ts`)
- `CONSENT_MODES` — array of `{ value, label, description }` for each mode
- Default geolocation config added to `DEFAULT_CONFIG`

### New Reducer Cases (`hooks/useWizardState.ts`)
- `SET_GEO_API_KEY` — updates `geolocation.apiKey`
- `SET_GEO_DEFAULT_MODE` — updates `geolocation.defaultMode`

### New Component (`sections/GeolocationSection.tsx`)
- Geoapify API key text input with help text
- Default consent mode radio selector with descriptions
- US-OPTOUT footer link HTML snippet (shown when relevant)

### Updated Wizard (`CookieBannerWizardClient.tsx`)
- `GeolocationSection` added as accordion section between "Cookie icon" and "Cookie types"

### Updated Code Generation (`hooks/useCodeGeneration.ts`)
- Outputs `geolocation: { apiKey, defaultMode }` when API key is provided
- Outputs `consentMode: '...'` as manual override when no API key but non-default mode
- Adds HTML comment with `data-stcm-privacy-link` snippet when US-OPTOUT is relevant

### Updated Preview (`hooks/usePreviewMessaging.ts`)
- Passes `consentMode` override to preview iframe (uses `defaultMode` value)
- Strips `geolocation` config from preview to prevent API calls in iframe

---

## Files Modified

| File | Lines | Change Type |
|------|-------|-------------|
| `silktide-consent-manager.js` | 1525 → 2052 | Constants, 2-phase init, 4 mode builders, geo methods, GPC, dismiss handler |
| `silktide-consent-manager.css` | 590 → 708 | Compact banner styles, dismiss button, secondary button, responsive |
| `types.ts` | 122 → 128 | ConsentMode, GeolocationConfig, new actions |
| `constants.ts` | 180 → 200 | CONSENT_MODES array, default geolocation config |
| `hooks/useWizardState.ts` | 243 → 263 | Two new reducer cases |
| `sections/GeolocationSection.tsx` | — (new) | 115 lines, new component |
| `CookieBannerWizardClient.tsx` | +8 lines | Import + accordion section |
| `hooks/useCodeGeneration.ts` | +18 lines | Geolocation config output |
| `hooks/usePreviewMessaging.ts` | +6 lines | Mode override for preview |

---

## Edge Cases

- **No API key:** Uses `defaultMode` for all visitors (no delay, no API call)
- **API failure:** Falls back to `defaultMode` with console warning
- **Cached result:** Geo stored in localStorage for 24h, subsequent visits are instant
- **GPC + explicit choice:** GPC takes precedence, overrides stored choices
- **Mode change:** Detected and consents are reset automatically
- **Backward compatibility:** No new config = existing EU-OPTIN behavior unchanged
