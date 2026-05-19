// ─── Config ───────────────────────────────────────────────────────────────────
var FORM_GUID = 'd80002b0-19f6-4456-ae5d-82bdf1c2d84e';
var FORM_SELECTOR = '.hubspot-form';
var ANON_ID_FIELD = 'input[name="0-1/segment_anonymous_id"]';
var HS_ORIGINS = [
  'https://forms-eu1.hsforms.com',
  'https://forms.hsforms.com',
];

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
    email: val('0-1/email'),
    first_name: val('0-1/firstname'),
    last_name: val('0-1/lastname'),
    phone: val('0-1/phone'),
    num_venues: parseInt(val('0-1/number_of_locations'), 10) || null,
    segment_anonymous_id: anonField ? (anonField.value || null) : null,
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

  var eventProps = Object.assign(
    {
      form_name: 'form_mql',
      page_url: window.location.href,
      country: (window.userGeo && window.userGeo.country_name) || null,
      country_code: (window.userGeo && window.userGeo.country_code) || null,
      consent_analytics: consent.analytics,
      consent_targeted_advertising: consent.targeted_advertising,
    },
    capturedFields,
    window.getSessionUTMs ? window.getSessionUTMs() : {}
  );

  // Identify — only if analytics consent given
  if (consent.analytics) {
    window.analytics.identify(
      {
        email: capturedFields.email,
        first_name: capturedFields.first_name,
        last_name: capturedFields.last_name,
        phone: capturedFields.phone,
      },
      consentCtx
    );
  }

  // Form Submitted — always fires
  window.analytics.track('Form Submitted', eventProps, consentCtx);
});