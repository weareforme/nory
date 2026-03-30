console.log('Enhanced Conversions: Thank you page script loaded');
(function () {
    async function sha256(str) {
        const buffer = new TextEncoder().encode(str);
        const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    async function hashUserData(data) {
        const normalized = {
            email: data.email ? data.email.toLowerCase().trim() : '',
            phone_number: data.phone ? data.phone.replace(/\D/g, '') : '',
            address: {
                first_name: data.firstName ? data.firstName.toLowerCase().trim() : '',
                last_name: data.lastName ? data.lastName.toLowerCase().trim() : ''
            }
        };

        return {
            email: normalized.email ? await sha256(normalized.email) : undefined,
            phone_number: normalized.phone_number ? await sha256(normalized.phone_number) : undefined,
            address: {
                first_name: normalized.address.first_name ? await sha256(normalized.address
                    .first_name) : undefined,
                last_name: normalized.address.last_name ? await sha256(normalized.address.last_name) :
                    undefined
            }
        };
    }

    async function sendEnhancedConversion() {
        let storedData = sessionStorage.getItem('enhancedConversionData');
        if (!storedData) {
            storedData = localStorage.getItem('enhancedConversionData');
            console.log('Using localStorage backup');
        }

        if (!storedData) {
            console.warn('Enhanced Conversions: No form data found in storage');
            return;
        }

        console.log('Form data found in storage');
        const formData = JSON.parse(storedData);
        const hashedData = await hashUserData(formData);

        console.log('Data hashed, preparing to send');

        // Wait for gtag to be available
        let attempts = 0;
        const maxAttempts = 50;

        function tryToSend() {
            attempts++;

            if (window.gtag && typeof window.gtag === 'function') {
                gtag('event', 'conversion', {
                    'send_to': 'AW-11149818068/YQwFCP2_75gYENTx0sQp',
                    'enhanced_conversions_data': hashedData
                });

                console.log('Enhanced Conversions: Data sent to Google Ads', hashedData);

                sessionStorage.removeItem('enhancedConversionData');
                localStorage.removeItem('enhancedConversionData');
            } else if (attempts < maxAttempts) {
                console.log('Waiting for gtag... attempt ' + attempts);
                setTimeout(tryToSend, 100);
            } else {
                console.error('Enhanced Conversions: gtag not found after 5 seconds');
            }
        }

        tryToSend();
    }

    sendEnhancedConversion();
})();
