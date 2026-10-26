console.log('Enhanced Conversions: Script loaded');

(function () {
    let lastCapturedData = '';
    let lastForm = null; // the form the visitor most recently interacted with

    const FORM_SELECTOR = 'form[data-hsfc-id="Form"]';

    function formFromEvent(e) {
        return e.target && e.target.closest ? e.target.closest(FORM_SELECTOR) : null;
    }

    // Track whichever form last received focus or input
    function trackForm(e) {
        const form = formFromEvent(e);
        if (form) lastForm = form;
    }

    function getFieldValue(form, name) {
        const el = form.querySelector('input[name="' + name + '"]');
        return (el && el.value) || '';
    }

    // Pick the form to read from:
    // 1. the last form the visitor interacted with
    // 2. otherwise (e.g. autofill with no events) the first form with an email filled in
    function resolveForm() {
        if (lastForm && lastForm.isConnected) return lastForm;
        const forms = document.querySelectorAll(FORM_SELECTOR);
        for (let i = 0; i < forms.length; i++) {
            if (getFieldValue(forms[i], '0-1/email')) return forms[i];
        }
        return null;
    }

    function captureAndStoreData() {
        const form = resolveForm();
        if (!form) return;

        const formData = {
            email: getFieldValue(form, '0-1/email'),
            phone: getFieldValue(form, '0-1/phone'),
            firstName: getFieldValue(form, '0-1/firstname'),
            lastName: getFieldValue(form, '0-1/lastname')
        };

        // Only store if we have at least email and data has changed
        const currentData = JSON.stringify(formData);
        if (formData.email && currentData !== lastCapturedData) {
            sessionStorage.setItem('enhancedConversionData', currentData);
            localStorage.setItem('enhancedConversionData', currentData);
            lastCapturedData = currentData;
            console.log('Form data captured and stored:', formData);
        }
    }

    function initFormCapture() {
        const form = document.querySelector(FORM_SELECTOR);

        if (!form) {
            console.log('Form not found yet, retrying...');
            setTimeout(initFormCapture, 500);
            return;
        }

        console.log('Form found, starting continuous monitoring');

        // Delegated listeners (capture phase) so they cover every form, including re-rendered ones
        document.addEventListener('focusin', trackForm, true);
        document.addEventListener('input', trackForm, true);

        // Poll the active form every 500ms to check for data
        setInterval(function () {
            captureAndStoreData();
        }, 500);

        console.log('Monitoring active - checking form every 500ms');
    }

    // Run immediately (Slater executes after DOM is ready)
    initFormCapture();
})();
