// 🎯 HubSpot Multi-Step Form Validation Handler
(function () {
    console.log('🚀 Starting validation...');

    let retryCount = 0;
    const MAX_RETRIES = 60;
    let currentFormId = null;

    function init() {
        retryCount++;

        const formWrapper = document.getElementById('benchmark-form-visible');

        if (!formWrapper) {
            if (retryCount < MAX_RETRIES) {
                setTimeout(init, 500);
                return;
            }
            return;
        }

        const actualForm = formWrapper.querySelector('form[data-form-id]');
        const formId = actualForm ? actualForm.getAttribute('data-instance-id') : null;

        if (formId && formId === currentFormId) {
            return;
        }

        currentFormId = formId;
        console.log('✅ Form found/updated');

        const nextButton = formWrapper.querySelector('button[type="button"][data-hsfc-id="Button"]');
        if (!nextButton) {
            if (retryCount < MAX_RETRIES) {
                setTimeout(init, 500);
                return;
            }
            return;
        }

        console.log('✅ Button found');

        // Add CSS once
        if (!document.getElementById('validation-styles')) {
            const style = document.createElement('style');
            style.id = 'validation-styles';
            style.textContent = `
        #benchmark-form-visible input::placeholder,
        #benchmark-form-visible textarea::placeholder {
          color: transparent !important;
          opacity: 0 !important;
        }
        
        #benchmark-form-visible button[data-hsfc-id="Button"].btn-validation-disabled,
        #benchmark-form-visible button[type="submit"].btn-validation-disabled {
          opacity: 0.5 !important;
          pointer-events: none !important;
          cursor: not-allowed !important;
        }
        
        /* Keep button styled during HubSpot loading state */
        #benchmark-form-visible button.hsfc-Button--loading {
          /* Preserve all Webflow styles */
        }
      `;
            document.head.appendChild(style);
            console.log('✅ Styles added');
        }

        // Remove placeholders
        function removePlaceholders() {
            const inputs = formWrapper.querySelectorAll('input[placeholder], textarea[placeholder]');
            inputs.forEach(input => input.removeAttribute('placeholder'));
        }

        removePlaceholders();

        const placeholderObserver = new MutationObserver(removePlaceholders);
        placeholderObserver.observe(formWrapper, {
            attributes: true,
            attributeFilter: ['placeholder'],
            subtree: true
        });

        // Protect Submit button classes from being replaced
        function protectSubmitButton() {
            const submitButton = formWrapper.querySelector('button[type="submit"]');

            if (submitButton && !submitButton.dataset.protected) {
                submitButton.dataset.protected = 'true';

                // Store original classes
                const originalClasses = submitButton.className;
                console.log('🛡️ Protecting Submit button classes:', originalClasses);

                // Watch for class changes
                const classObserver = new MutationObserver((mutations) => {
                    mutations.forEach((mutation) => {
                        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                            const currentClasses = submitButton.className;

                            // If HubSpot removed our Webflow classes, add them back
                            if (!currentClasses.includes('_wf-hs_button')) {
                                console.log('⚠️ Webflow classes removed, restoring...');

                                // Keep HubSpot's loading classes but add back Webflow classes
                                const hubspotClasses = currentClasses.split(' ').filter(c => c.startsWith(
                                    'hsfc-'));
                                const webflowClasses = originalClasses.split(' ').filter(c => !c
                                    .startsWith('hsfc-'));
                                const combinedClasses = [...webflowClasses, ...hubspotClasses].join(' ');

                                submitButton.className = combinedClasses;
                                console.log('✅ Classes restored:', combinedClasses);
                            }
                        }
                    });
                });

                classObserver.observe(submitButton, {
                    attributes: true,
                    attributeOldValue: true,
                    attributeFilter: ['class']
                });
            }
        }

        function isFormValid() {
            const visibleInputs = Array.from(formWrapper.querySelectorAll(
                'input[aria-required="true"], select[aria-required="true"]'))
                .filter(input => input.offsetParent !== null && input.type !== 'hidden');

            for (let visibleInput of visibleInputs) {
                const container = visibleInput.closest('[data-hsfc-id="NumberInput"]') ||
                    visibleInput.closest('[data-hsfc-id="NumberField"]') ||
                    visibleInput.closest('[data-hsfc-id="Row"]');

                const hiddenInput = container ? container.querySelector('input[type="hidden"][name]') :
                    null;
                const valueToCheck = hiddenInput ? hiddenInput.value : visibleInput.value;

                if (!valueToCheck || valueToCheck.trim() === '') {
                    return false;
                }
            }

            const errors = formWrapper.querySelectorAll('.hsfc-ErrorAlert');
            for (let error of errors) {
                if (error.offsetParent !== null) {
                    return false;
                }
            }

            return true;
        }

        function updateButtonState() {
            const currentNextButton = formWrapper.querySelector(
                'button[type="button"][data-hsfc-id="Button"]');
            const submitButton = formWrapper.querySelector('button[type="submit"]');
            const activeButton = (submitButton && submitButton.offsetParent !== null) ? submitButton :
                currentNextButton;

            if (!activeButton) return;

            // Protect submit button when it appears
            if (submitButton && submitButton.offsetParent !== null) {
                protectSubmitButton();
            }

            const valid = isFormValid();

            if (valid) {
                activeButton.classList.remove('btn-validation-disabled');
                activeButton.disabled = false;
                console.log('🔓 Enabled');
            } else {
                activeButton.classList.add('btn-validation-disabled');
                activeButton.disabled = true;
                console.log('🔒 Disabled');
            }
        }

        setTimeout(() => {
            console.log('=== Initial validation ===');
            updateButtonState();
        }, 1500);

        formWrapper.addEventListener('input', () => setTimeout(updateButtonState, 150), true);
        formWrapper.addEventListener('blur', () => setTimeout(updateButtonState, 150), true);
        formWrapper.addEventListener('change', () => setTimeout(updateButtonState, 150), true);

        // Watch for HubSpot replacing the form
        const formObserver = new MutationObserver(() => {
            const newForm = formWrapper.querySelector('form[data-instance-id]');
            const newFormId = newForm ? newForm.getAttribute('data-instance-id') : null;

            if (newFormId && newFormId !== currentFormId) {
                console.log('🔄 Form replaced, re-initializing...');
                formObserver.disconnect();
                setTimeout(init, 100);
            }
        });

        formObserver.observe(formWrapper, {
            childList: true,
            subtree: true
        });

        console.log('✅ Active');
    }

    init();
})();
