console.log('Enhanced Conversions: Script loaded');

(function () {
    let lastCapturedData = '';

    function captureAndStoreData() {
        const formData = {
            email: document.querySelector('input[name="0-1/email"]')?.value || '',
            phone: document.querySelector('input[name="0-1/phone"]')?.value || '',
            firstName: document.querySelector('input[name="0-1/firstname"]')?.value || '',
            lastName: document.querySelector('input[name="0-1/lastname"]')?.value || ''
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
        const form = document.querySelector('form[data-hsfc-id="Form"]');

        if (!form) {
            console.log('Form not found yet, retrying...');
            setTimeout(initFormCapture, 500);
            return;
        }

        console.log('Form found, starting continuous monitoring');

        // Poll the form every 500ms to check for data
        setInterval(function () {
            captureAndStoreData();
        }, 500);

        console.log('Monitoring active - checking form every 500ms');
    }

    // Run immediately (Slater executes after DOM is ready)
    initFormCapture();
})();
