if (document.querySelector('.hubspot-form')) {
  // ─── Config ───────────────────────────────────────────────────────────────────
  var FORM_GUID = 'd80002b0-19f6-4456-ae5d-82bdf1c2d84e';
  var FORM_SELECTOR = '.hubspot-form';
  var ANON_ID_FIELD = 'input[name="0-1/segment_anonymous_id"]';
  var HS_ORIGINS = [
    'https://forms-eu1.hsforms.com',
    'https://forms.hsforms.com',
  ];

  // ─── Country grouping ─────────────────────────────────────────────────────────
  var MQL_COUNTRIES = [
    // Europe (EU + broader Europe)
    'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT',
    'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE',
    'GB', 'NO', 'CH', 'IS', 'AL', 'AD', 'AM', 'AZ', 'BY', 'BA', 'GE', 'LI', 'MK', 'MD',
    'MC', 'ME', 'RS', 'SM', 'TR', 'UA', 'VA', 'XK',
    // US
    'US',
    // Arab countries
    'AE', 'BH', 'DZ', 'EG', 'IQ', 'JO', 'KW', 'LB', 'LY', 'MA', 'MR', 'OM', 'PS', 'QA',
    'SA', 'SD', 'SY', 'TN', 'YE',
  ];

  var SAL_COUNTRIES = ['GB', 'IE', 'US'];

  function getCountryFlags(countryCode) {
    if (!countryCode) return { is_mql_country: false, is_sal_country: false };
    var code = countryCode.toUpperCase();
    return {
      is_mql_country: MQL_COUNTRIES.indexOf(code) !== -1,
      is_sal_country: SAL_COUNTRIES.indexOf(code) !== -1,
    };
  }

  // ─── Geo lookup on page load ──────────────────────────────────────────────────
  window.userGeo = { country: null };
  fetch('https://ipapi.co/json/')
    .then(function (r) { return r.json(); })
    .then(function (d) {
      window.userGeo.country_code = d.country_code || null;
      window.userGeo.country_name = d.country_name || null;
    })
    .catch(function () { });

  // ─── Helpers ──────────────────────────────────────────────────────────────────
  function getFieldValue(form, name) {
    var el = form && form.querySelector('[name="' + name + '"]');
    return (el && el.value) ? el.value : null;
  }

  function setFieldValue(field, value) {
    try {
      var nativeSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype, 'value'
      ).set;
      nativeSetter.call(field, value);
      field.dispatchEvent(new Event('input', { bubbles: true }));
      field.dispatchEvent(new Event('change', { bubbles: true }));
    } catch (e) {
      console.warn('[Segment] Failed to set field value:', e);
    }
  }

  function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
} 

function getUrlParam(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

  // Normalize PII to lift match rates on ad destinations (Meta CAPI, Google EC)
  function normalizeEmail(v) {
    return v ? String(v).trim().toLowerCase() : null;
  }

  // Dial codes for our markets, longest-first so 3-digit codes match before 2/1.
  // Used to detect and drop a national trunk "0" that sits right after the
  // country code (e.g. +44 0 7909... -> +447909...), which otherwise breaks
  // hashed-phone matching on Meta/Google.
  var DIAL_CODES = [
    '359', '385', '357', '420', '372', '358', '371', '370', '352', '356', '351',
    '421', '386', '354', '355', '376', '374', '994', '375', '387', '995', '423',
    '389', '373', '377', '382', '381', '378', '379', '383', '380', '971', '973',
    '213', '964', '962', '965', '961', '218', '212', '222', '968', '970', '974',
    '966', '249', '963', '216', '967',
    '43', '32', '45', '33', '49', '30', '36', '39', '48', '40', '34', '46', '44',
    '47', '41', '90', '20',
    '1',
  ];
  // Codes whose national numbers can legitimately start with 0 (keep it).
  var KEEP_TRUNK_ZERO = ['39']; // Italy: landlines retain the leading 0

  function normalizePhone(v) {
    if (!v) return null;
    var p = String(v).replace(/[\s()\-.]/g, ''); // strip spaces, parens, dashes, dots
    if (p.indexOf('00') === 0) p = '+' + p.slice(2); // 00<cc> -> +<cc> (E.164)
    if (p.charAt(0) !== '+') return p || null; // no country code: leave national number as-is
    var digits = p.slice(1);
    for (var i = 0; i < DIAL_CODES.length; i++) {
      var cc = DIAL_CODES[i];
      if (digits.indexOf(cc) === 0) {
        var rest = digits.slice(cc.length);
        if (KEEP_TRUNK_ZERO.indexOf(cc) === -1) rest = rest.replace(/^0+/, ''); // drop trunk prefix
        return '+' + cc + rest;
      }
    }
    return p; // unrecognised country code: leave intact
  }

  // ─── Step 1: Capture fields + inject anonymous ID and UTMs on form submit ──────
  var capturedFields = {};

  function captureAndInject() {
    var form = document.querySelector(FORM_SELECTOR);
    if (!form) return;

    // Inject anonymous ID
    var anonId = window.analytics && window.analytics.user().anonymousId();
    var anonField = form.querySelector(ANON_ID_FIELD);
    if (anonField && anonId) setFieldValue(anonField, anonId);

    // Inject UTMs into HubSpot hidden fields
    var utms = window.getSessionUTMs ? window.getSessionUTMs() : {};
    var utmFieldMap = {
      '0-1/segment_last_touch_source': utms.utm_source,
      '0-1/segment_last_touch_medium': utms.utm_medium,
      '0-1/segment_last_touch_campaign': utms.utm_campaign,
      '0-1/segment_last_touch_term': utms.utm_term,
      '0-1/segment_last_touch_content': utms.utm_content,
    };

    Object.keys(utmFieldMap).forEach(function (name) {
      var field = form.querySelector('input[name="' + name + '"]');
      if (field && utmFieldMap[name]) setFieldValue(field, utmFieldMap[name]);
    });

    function val(name) { return getFieldValue(form, name); }

    capturedFields = {
      email: normalizeEmail(val('0-1/email')),
      first_name: val('0-1/firstname'),
      last_name: val('0-1/lastname'),
      phone: normalizePhone(val('0-1/phone')),
      num_venues: parseInt(val('0-1/number_of_locations'), 10) || null,
      segment_anonymous_id: anonField ? (anonField.value || null) : null,
      // Prefer the Meta Pixel's own _fbc (accurate observation time);
      // fall back to the fbc we build from fbclid in the header.
      fbc: getCookie('_fbc') || getCookie('_click_fbc') || null,
      fbp: getCookie('_fbp') || null,
      fbclid: getUrlParam('fbclid') || getCookie('_click_fbclid') || null,
      gclid: getUrlParam('gclid') || getCookie('_click_gclid') || null,
      gbraid: getUrlParam('gbraid') || getCookie('_click_gbraid') || null,
      wbraid: getUrlParam('wbraid') || getCookie('_click_wbraid') || null,
      gcl_au: getCookie('_gcl_au') || null,
      // LinkedIn first-party click ID (li_fat_id) — LinkedIn CAPI match key
      li_fat_id: getUrlParam('li_fat_id') || getCookie('_click_li_fat_id') || null,
      // Microsoft Ads (Bing) click ID — UET auto-tags it; kept here for Bing CAPI / offline import
      msclkid: getUrlParam('msclkid') || getCookie('_click_msclkid') || getCookie('_uetmsclkid') || null,

    };
  }

  // Cover both click and Enter key submission
  document.addEventListener('click', function (e) {
    if (e.target.closest('.hsfc-NavigationRow__Buttons button')) captureAndInject();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') captureAndInject();
  });

  // ─── Step 2: Fire Segment event once HubSpot confirms submission ───────────────
  window.addEventListener('message', function (event) {
    if (!HS_ORIGINS.includes(event.origin)) return;
    if (event.data.formGuid !== FORM_GUID) return;
    if (event.data.accepted !== true) return;
    // Consent — fall back to all-false if onConsent hasn't resolved yet
    var consent = window.ketchConsent || {
      essential_services: true,
      analytics: false,
      targeted_advertising: false
    };

    var consentCtx = {
      context: {
        consent: {
          categoryPreferences: consent
        }
      }
    };

    var countryCode = (window.userGeo && window.userGeo.country_code) || null;
    var countryFlags = getCountryFlags(countryCode);
    var numVenues = capturedFields.num_venues || 0;

    var eventProps = Object.assign(
      {
        form_name: 'form_mql',
        page_url: window.location.href,
        country: (window.userGeo && window.userGeo.country_name) || null,
        country_code: (window.userGeo && window.userGeo.country_code) || null,
        is_mql_country: countryFlags.is_mql_country,
        is_sal_country: countryFlags.is_sal_country,
        is_mql: countryFlags.is_mql_country,
        is_sal: countryFlags.is_sal_country && numVenues > 1,
        consent_analytics: consent.analytics,
        consent_targeted_advertising: consent.targeted_advertising,
      },
      capturedFields,
      window.getSessionUTMs ? window.getSessionUTMs() : {}
    );

    // Identify — only if analytics consent given.
    // Canonical camelCase traits (firstName/lastName) so destination default
    // mappings (Meta CAPI, Google EC) pick them up without manual remapping.
    if (consent.analytics) {
      var identifyTraits = {
        email: capturedFields.email,
        firstName: capturedFields.first_name,
        lastName: capturedFields.last_name,
        phone: capturedFields.phone,
      };
      if (countryCode) identifyTraits.address = { country: countryCode };
      window.analytics.identify(identifyTraits, consentCtx);
    }

    // Form Submitted — always fires
    window.analytics.track('Form Submitted', eventProps, consentCtx);

    // MQL — fires if country is in MQL list 
    if (countryFlags.is_mql_country) { window.analytics.track('segment_mql', eventProps, consentCtx); }

    // SAL — fires if country is in SAL list AND more than 1 venue 
    if (countryFlags.is_sal_country && numVenues > 1) { window.analytics.track('segment_sal', eventProps, consentCtx); }

  });
}