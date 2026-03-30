function initCookies() {
  const banner = document.getElementById("cookie-banner");
  const acceptBtn = document.getElementById("cookie-accept");
  const rejectBtn = document.getElementById("cookie-reject");
  const preferencesCheckbox = document.getElementById("analytics-checkbox");

  // ==== Set Consent Mode Defaults BEFORE GTM Loads ====
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { dataLayer.push(arguments); };

  gtag('consent', 'default', {
    ad_storage: 'denied',
    analytics_storage: 'denied',
    functionality_storage: 'denied',
    ad_user_data: 'granted', // Allow for Enhanced Conversions
    ad_personalization: 'denied',
    region: [
      'GB', 'AT', 'BE', 'BG', 'CH', 'CY', 'DE', 'DK', 'EE', 'ES', 'FI',
      'FR', 'GG', 'GR', 'HR', 'HU', 'IE', 'IM', 'IT', 'JE', 'LT', 'LU',
      'LV', 'MT', 'NL', 'PL', 'PT', 'RO', 'SE', 'SI', 'SK'
    ]
  });

  // ==== Load GTM ====
  console.log("[Cookie] Injecting GTM...");
  const gtmScript = document.createElement("script");
  gtmScript.innerHTML = `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s);j.async=true;j.src=
'https://load.sst.nory.ai/gtm.js?'+i;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','id=GTM-TSMXKK9');`;
  document.head.insertBefore(gtmScript, document.head.firstChild);

  // ==== Load and Initialize Google Ads ====
  console.log("[Cookie] Loading Google Ads library...");

  const gtagScript = document.createElement("script");
  gtagScript.src = "https://www.googletagmanager.com/gtag/js?id=AW-11149818068";
  gtagScript.async = true;
  document.head.appendChild(gtagScript);

  gtagScript.onload = function () {
    console.log("[Cookie] Google Ads library loaded, initializing...");
    window.gtag = window.gtag || function () { dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', 'AW-11149818068');
  };

  // ==== Load Segment Separately (only if accepted) ====
  function loadSegment() {
    console.log("[Cookie] Injecting Segment...");
    window.analytics = window.analytics || [];
    if (!window.analytics.initialize) {
      if (window.analytics.invoked) {
        console.error("Segment snippet included twice.");
      } else {
        window.analytics.invoked = true;
        window.analytics.methods = [
          "trackSubmit", "trackClick", "trackLink", "trackForm", "pageview", "identify",
          "reset", "group", "track", "ready", "alias", "debug", "page", "screen",
          "once", "off", "on", "addSourceMiddleware", "addIntegrationMiddleware",
          "setAnonymousId", "addDestinationMiddleware", "register"
        ];
        window.analytics.factory = function (method) {
          return function () {
            const args = Array.prototype.slice.call(arguments);
            args.unshift(method);
            window.analytics.push(args);
            return window.analytics;
          };
        };
        for (let i = 0; i < window.analytics.methods.length; i++) {
          const key = window.analytics.methods[i];
          window.analytics[key] = window.analytics.factory(key);
        }
        window.analytics.load = function (key, options) {
          const t = document.createElement("script");
          t.type = "text/javascript";
          t.async = true;
          t.src = "https://cdn.segment.com/analytics.js/v1/" + key + "/analytics.min.js";
          const s = document.getElementsByTagName("script")[0];
          s.parentNode.insertBefore(t, s);
          window.analytics._loadOptions = options;
        };
        window.analytics._writeKey = "E3Y9Km9MK7PgAmMT6FKBgVidLmwt7KtQ";
        window.analytics.SNIPPET_VERSION = "5.2.0";
        window.analytics.load("E3Y9Km9MK7PgAmMT6FKBgVidLmwt7KtQ");
        window.analytics.page();
      }
    }
  }

  // ==== Update Consent Settings Post-User Choice ====
  function updateConsent(consent) {
    const state = consent ? 'granted' : 'denied';
    console.log(`[Cookie] Updating consent: ${state}`);

    gtag('consent', 'update', {
      ad_storage: state,
      analytics_storage: state,
      functionality_storage: state,
      ad_user_data: 'granted', // Always allow - needed for Enhanced Conversions
      ad_personalization: state
    });

    dataLayer.push({
      event: 'cookie_consent_update',
      consent_ad_storage: state,
      consent_analytics_storage: state,
      consent_functionality_storage: state,
      consent_ad_user_data: 'granted',
      consent_ad_personalization: state
    });
  }

  function handleConsent(consent) {
    console.log(`[Cookie] User selected: ${consent ? "Accept" : "Reject"}`);
    document.cookie = "cookie_consent=" + (consent ? "true" : "false") +
      "; path=/; max-age=31536000";

    if (banner) banner.style.display = "none";
    if (preferencesCheckbox) preferencesCheckbox.checked = consent;

    updateConsent(consent);

    if (consent) {
      loadSegment();
    }
  }

  // ==== Check Cookie on Load ====
  const match = document.cookie.match(/(?:^|; )cookie_consent=(true|false)/);
  const consentSet = !!match;
  const consentGiven = match?.[1] === "true";

  if (consentSet) {
    updateConsent(consentGiven);
    if (consentGiven) {
      loadSegment();
    }
  }

  if (banner) {
    banner.style.display = consentSet ? "none" : "flex";
  }

  if (acceptBtn) acceptBtn.addEventListener("click", () => handleConsent(true));
  if (rejectBtn) rejectBtn.addEventListener("click", () => handleConsent(false));

  if (preferencesCheckbox) {
    preferencesCheckbox.checked = consentGiven;
    preferencesCheckbox.addEventListener("change", () => {
      handleConsent(preferencesCheckbox.checked);
    });
  }
}

// ==== DOM-Ready Wrapper ====
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCookies);
} else {
  initCookies();
}
