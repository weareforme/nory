// Replaces HubSpot's custom dropdown UIs with native <select> elements.
// Runs via a MutationObserver since HubSpot renders the form asynchronously.
// Covers: Role, ePOS dropdowns, and the phone country picker.

(function () {
    // Reads the correct HubSpot option values from the island config already on
    // the page, keyed by display label. Falls back to label text if not found.
    function getHubSpotOptionValues() {
        try {
            const islands = window.__islands || [];
            const form = islands[0]?.props?.renderDefinition?.form;
            if (!form) return null;
            const allModules = form.modules.flatMap(s => s.modules || [])
                .flatMap(r => r.modules || []);
            const dropdown = allModules.find(m => m.type === 'dropdownSelect');
            if (!dropdown) return null;
            return Object.fromEntries(dropdown.options.map(o => [o.label, o.value]));
        } catch (e) {
            return null;
        }
    }

    // Role / ePOS dropdowns
    // HubSpot stores the selected value in a hidden input — we sync our native
    // select to that input using the native React setter so HubSpot detects it.
    function replaceDropdowns(form) {
        form.querySelectorAll('.hsfc-DropdownField').forEach(function (field) {
            if (field.querySelector('select.nory-select')) return; // already replaced

            const dropdownInput = field.querySelector('.hsfc-DropdownInput');
            const hiddenInput = field.querySelector('input[type="hidden"]');
            const items = field.querySelectorAll('.hsfc-DropdownOptions__List__ListItem');
            if (!dropdownInput || !items.length) return;

            const valueMap = getHubSpotOptionValues();

            const select = document.createElement('select');
            select.className = 'nory-select';

            const blank = document.createElement('option');
            blank.value = '';
            blank.textContent = 'Please select';
            blank.disabled = true;
            blank.selected = true;
            select.appendChild(blank);

            items.forEach(function (item) {
                const label = item.textContent.trim();
                const opt = document.createElement('option');
                opt.value = valueMap?.[label] || label;
                opt.textContent = label;
                select.appendChild(opt);
            });

            select.addEventListener('change', function () {
                // Find the matching HubSpot list item by display label and click it
                // directly — this lets HubSpot's own React handler update its state.
                const selectedLabel = select.options[select.selectedIndex].textContent.trim();
                const items = field.querySelectorAll('.hsfc-DropdownOptions__List__ListItem');
                let matched = null;
                items.forEach(function (item) {
                    if (item.textContent.trim() === selectedLabel) matched = item;
                });
                if (!matched) return;
                // Open the HubSpot dropdown, then click the matching item
                const combobox = field.querySelector('input[role="combobox"]');
                if (combobox) combobox.click();
                setTimeout(function () { matched.click(); }, 50);
            });

            dropdownInput.style.display = 'none';
            dropdownInput.insertAdjacentElement('afterend', select);
        });
    }

    // Phone country picker
    // Selecting a country updates the tel input's dial code prefix, not a hidden
    // input. We read the current dial code from the tel input to set the initial
    // selected option — the --selected class can't be trusted here as HubSpot's
    // geo-detection runs async and may not have fired yet when we build the select.
    function replacePhoneDropdown(form) {
        const phoneField = form.querySelector('.hsfc-PhoneInput');
        if (!phoneField || phoneField.querySelector('select.nory-phone-select')) return;

        const flagAndCaret = phoneField.querySelector('.hsfc-PhoneInput__FlagAndCaret');
        const telInput = phoneField.querySelector('input[type="tel"]');
        const items = [...phoneField.querySelectorAll('.hsfc-DropdownOptions__List__ListItem')];
        if (!flagAndCaret || !items.length) return;

        const select = document.createElement('select');
        select.className = 'nory-select nory-phone-select';

        items.forEach(function (item) {
            const text = item.textContent.trim();
            const dialCode = text.match(/\+\d+/)?.[0] || '';
            const opt = document.createElement('option');
            opt.value = dialCode;
            opt.textContent = text;
            select.appendChild(opt);
        });

        // Sync the select to whatever dial code is currently in the tel input
        function syncFromTel() {
            const dialCode = telInput?.value.match(/^\+\d+/)?.[0] || '';
            if (dialCode) select.value = dialCode;
        }

        // Set initial value and watch for HubSpot's async geo-update
        syncFromTel();
        telInput.addEventListener('change', syncFromTel);
        telInput.addEventListener('input', syncFromTel);

        // Also poll briefly on load to catch the geo update
        let attempts = 0;
        const poll = setInterval(function () {
            syncFromTel();
            if (++attempts >= 10) clearInterval(poll);
        }, 200);

        select.addEventListener('change', function () {
            if (!telInput) return;
            const stripped = telInput.value.replace(/^\+\d+\s?/, '');
            const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
            nativeSetter.call(telInput, select.value + (stripped ? ' ' + stripped : ''));
            telInput.dispatchEvent(new Event('input', { bubbles: true }));
            telInput.dispatchEvent(new Event('change', { bubbles: true }));
        });

        flagAndCaret.style.display = 'none';
        flagAndCaret.insertAdjacentElement('afterend', select);
    }

    // Watch for HubSpot rendering into the DOM and trigger replacements
    const observer = new MutationObserver(function () {
        const form = document.querySelector('.hubspot-form');
        if (!form) return;
        if (form.querySelector('.hsfc-DropdownField .hsfc-DropdownOptions__List__ListItem')) {
            setTimeout(function () { replaceDropdowns(form); }, 300);
        }
        if (form.querySelector('.hsfc-PhoneInput .hsfc-DropdownOptions__List__ListItem')) replacePhoneDropdown(form);
    });

    observer.observe(document.body, { childList: true, subtree: true });
})();
