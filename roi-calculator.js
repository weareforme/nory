// ================================
// ROI Calculator - Full Logic
// ================================

// ================================
// CONFIGURATION
// ================================
// Nory cost per month (per currency) and vertical-specific reduction percentages
// These values will be updated by Nory once confirmed

const CONFIG = {
    noryCostPerMonth: {
        GBP: 299,
        EUR: 349,
        USD: 399
    },
    verticals: {
        "fine-dining": { colReduction: 10, gpVarianceReduction: 50 },
        "casual-dining": { colReduction: 10, gpVarianceReduction: 50 },
        "fast-casual": { colReduction: 10, gpVarianceReduction: 50 },
        "qsr": { colReduction: 10, gpVarianceReduction: 50 },
        "upscale-casual": { colReduction: 10, gpVarianceReduction: 50 },
        "pub-restaurant": { colReduction: 10, gpVarianceReduction: 50 },
        "coffee-shop": { colReduction: 10, gpVarianceReduction: 50 },
        "bakery": { colReduction: 10, gpVarianceReduction: 50 },
        "ghost-kitchen": { colReduction: 10, gpVarianceReduction: 50 }
    }
};

// ================================
// CURRENCY SYMBOLS
// ================================
// Maps currency codes to their display symbols

const CURRENCY_SYMBOLS = {
    GBP: "£",
    EUR: "€",
    USD: "$"
};

// ================================
// RESTAURANT TYPE DISPLAY NAMES
// ================================
// Maps option values to readable display names

const RESTAURANT_DISPLAY_NAMES = {
    "fine-dining": "Fine dining",
    "casual-dining": "Casual dining",
    "fast-casual": "Fast casual",
    "qsr": "QSR",
    "upscale-casual": "Upscale casual",
    "pub-restaurant": "Pub-restaurant",
    "coffee-shop": "Coffee shop",
    "bakery": "Bakery",
    "ghost-kitchen": "Ghost kitchen"
};

// US overrides, used when USD is selected. Option values stay the same
const RESTAURANT_DISPLAY_NAMES_US = {
    "pub-restaurant": "Bar & grill / sports bar"
};

// ================================
// US HERO INTRO COPY
// ================================
// Shown in the hero intro when USD is selected. Copy supplied by Nory, do not edit
// The default copy stays in Webflow and is restored for GBP / EUR

const HERO_INTRO_US = "Built for multi-location operators in the US \u2014 from fast casual chains to upscale groups. In 60 seconds we'll show you what labor overspend and gross profit variance are costing you today, and what you'd recoup with Nory.";

// ================================
// DOM ELEMENTS
// ================================
// Cache all input and output elements for performance

const el = {
    // --------------------------
    // Step containers
    // --------------------------
    step1: document.getElementById("step-1"),
    step2: document.getElementById("step-2"),

    // --------------------------
    // Step 1: Revenue section
    // --------------------------
    revenuePeriod: document.getElementById("revenue-period"),
    currencySelect: document.getElementById("currency-select"),
    revenueInput: document.getElementById("revenue-input"),
    revenueLabel: document.querySelector('label[for="revenue-input"]'),
    restaurantType: document.getElementById("restaurant-type"),
    locationsInput: document.getElementById("locations-input"),

    // --------------------------
    // Step 1: Gross Profit section - inputs
    // --------------------------
    currentGpInput: document.getElementById("current-gp-input"),
    targetGpInput: document.getElementById("target-gp-input"),

    // --------------------------
    // Step 1: Gross Profit section - calculated displays
    // --------------------------
    currentGpValue: document.getElementById("current-gp-value"),
    targetGpValue: document.getElementById("target-gp-value"),
    gpVariancePercent: document.getElementById("gp-variance-percent"),
    gpVarianceAmount: document.getElementById("gp-variance-amount"),

    // --------------------------
    // Step 1: Labour section - inputs
    // --------------------------
    currentColInput: document.getElementById("current-col-input"),
    targetColInput: document.getElementById("target-col-input"),

    // --------------------------
    // Step 1: Labour section - calculated displays
    // --------------------------
    currentColValue: document.getElementById("current-col-value"),
    targetColValue: document.getElementById("target-col-value"),
    labourOverspendPercent: document.getElementById("labour-overspend-percent"),
    labourOverspendAmount: document.getElementById("labour-overspend-amount"),

    // --------------------------
    // Step 1: Button
    // --------------------------
    showResultsBtn: document.getElementById("show-results-btn"),

    // --------------------------
    // Step 2: Header
    // --------------------------
    revenuePeriodStep2: document.getElementById("revenue-period-step-2"),
    backToStep1Btn: document.getElementById("back-to-step-1"),

    // --------------------------
    // Hero (collapses to a slim band on Step 2)
    // --------------------------
    heroContent: document.querySelector(".n_hero_content"),
    heroVisual: document.querySelector(".n_hero_visual"),
    heroIntro: document.querySelector(".js-hero-intro p"),

    // --------------------------
    // Step 2: Restaurant type displays (all instances)
    // --------------------------
    restaurantTypeDisplays: document.querySelectorAll(".js-restaurant-type"),

    // --------------------------
    // Step 2: Average reduction section
    // --------------------------
    colReductionPercent: document.getElementById("col-reduction-percent"),
    gpReductionPercent: document.getElementById("gp-reduction-percent"),

    // --------------------------
    // Step 2: Projected impact section
    // --------------------------
    newColPercent: document.getElementById("new-col-percent"),
    newColDescription: document.getElementById("new-col-description"),
    labourSavingsValue: document.getElementById("labour-savings-value"),
    labourSavingsDescription: document.getElementById("new-labour-savings-description"),
    gpSavingsValue: document.getElementById("gp-savings-value"),
    gpSavingsDescription: document.getElementById("new-gp-variance-savings-description"),

    // --------------------------
    // Step 2: Totals section
    // --------------------------
    noryInvestmentValue: document.getElementById("nory-investment-value"),
    noryInvestmentDescription: document.getElementById("nory-investment-description"),
    annualSavingsLabel: document.getElementById("annual-savings-label"),
    annualSavingsValue: document.getElementById("annual-savings-value"),
    netRoiValue: document.getElementById("net-roi-value"),
    netRoiDescription: document.getElementById("net-roi-description")
};

// ================================
// TRACK REVENUE PERIOD
// ================================
// Used to convert revenue when switching between monthly/annually

let previousPeriod = "annually";

// ================================
// HERO INTRO DEFAULT COPY
// ================================
// Captured from Webflow on load so it can be restored when switching away from USD

const heroIntroDefault = el.heroIntro ? el.heroIntro.textContent : "";

// ================================
// US SPELLING ORIGINALS
// ================================
// Stores the original Webflow text of any node changed to US spelling, so it can be restored

const usSpellingOriginals = new Map();

// ================================
// HELPER FUNCTIONS
// ================================

// Returns the currency symbol based on dropdown selection
function getCurrencySymbol() {
    return CURRENCY_SYMBOLS[el.currencySelect.value] || "£";
}

// Returns the Nory cost per month based on selected currency
function getNoryCostPerMonth() {
    return CONFIG.noryCostPerMonth[el.currencySelect.value] || CONFIG.noryCostPerMonth.GBP;
}

// Strips non-numeric characters from revenue input and returns a number
function parseRevenue(value) {
    const cleaned = value.replace(/[^0-9.]/g, "");
    return parseFloat(cleaned) || 0;
}

// Formats a number as currency with appropriate rounding (rounds DOWN for savings)
// - Handles negative numbers correctly (-£40k not £-40k)
// - Rounds down to nearest £1k for values >= £10k
// - Rounds down to nearest £500 for values >= £5k
// - Rounds down to nearest £100 for values >= £1k
// - Rounds down to nearest £10 for values >= £100
// - Shows exact value (rounded to nearest £1) for anything under £100
// - Displays as "m" for millions, "k" for thousands
function formatCurrency(value) {
    const symbol = getCurrencySymbol();

    // Handle negative numbers
    const isNegative = value < 0;
    const absValue = Math.abs(value);

    // Round down based on size
    let rounded;
    if (absValue >= 10000) {
        rounded = Math.floor(absValue / 1000) * 1000;
    } else if (absValue >= 5000) {
        rounded = Math.floor(absValue / 500) * 500;
    } else if (absValue >= 1000) {
        rounded = Math.floor(absValue / 100) * 100;
    } else if (absValue >= 100) {
        rounded = Math.floor(absValue / 10) * 10;
    } else {
        rounded = Math.floor(absValue);
    }

    // Format for display
    let formatted;
    if (rounded >= 1000000) {
        formatted = symbol + (rounded / 1000000).toFixed(2) + "m";
    } else if (rounded >= 1000) {
        const kValue = rounded / 1000;
        if (kValue % 1 === 0) {
            formatted = symbol + kValue + "k";
        } else {
            formatted = symbol + kValue.toFixed(2).replace(/\.?0+$/, "") + "k";
        }
    } else {
        formatted = symbol + rounded;
    }

    // Add negative sign before symbol
    return isNegative ? "-" + formatted : formatted;
}

// Formats a cost value as currency, rounding UP to avoid underquoting
// - Handles negative numbers correctly (-£40k not £-40k)
// Uses same display logic as formatCurrency but rounds up instead of down
function formatCurrencyCost(value) {
    const symbol = getCurrencySymbol();

    // Handle negative numbers
    const isNegative = value < 0;
    const absValue = Math.abs(value);

    // Round UP based on size
    let rounded;
    if (absValue >= 10000) {
        rounded = Math.ceil(absValue / 1000) * 1000;
    } else if (absValue >= 5000) {
        rounded = Math.ceil(absValue / 500) * 500;
    } else if (absValue >= 1000) {
        rounded = Math.ceil(absValue / 100) * 100;
    } else if (absValue >= 100) {
        rounded = Math.ceil(absValue / 10) * 10;
    } else {
        rounded = Math.ceil(absValue);
    }

    // Format for display
    let formatted;
    if (rounded >= 1000000) {
        formatted = symbol + (rounded / 1000000).toFixed(2) + "m";
    } else if (rounded >= 1000) {
        const kValue = rounded / 1000;
        if (kValue % 1 === 0) {
            formatted = symbol + kValue + "k";
        } else {
            formatted = symbol + kValue.toFixed(2).replace(/\.?0+$/, "") + "k";
        }
    } else {
        formatted = symbol + rounded;
    }

    // Add negative sign before symbol
    return isNegative ? "-" + formatted : formatted;
}

// Formats a number as a percentage with one decimal place
function formatPercent(value) {
    return value.toFixed(1) + "%";
}

// Formats the revenue input with comma separators for readability
// e.g. 3200000 becomes "3,200,000"
function formatRevenueInput(value) {
    const num = parseRevenue(value);
    if (num === 0) return "";
    return num.toLocaleString("en-GB");
}

// Sets a Step 1 calculated value, or a 0 at 50% opacity if its inputs have an error
function setStep1Display(element, value, fallback, isInvalid) {
    element.textContent = isInvalid ? fallback : value;
    element.style.opacity = isInvalid ? "0.5" : "";
}

// Returns the display name for a restaurant type value
function getRestaurantDisplayName() {
    const value = el.restaurantType.value;

    if (el.currencySelect.value === "USD" && RESTAURANT_DISPLAY_NAMES_US[value]) {
        return RESTAURANT_DISPLAY_NAMES_US[value];
    }

    return RESTAURANT_DISPLAY_NAMES[value] || "restaurant";
}

// Returns "Annually" or "Monthly" based on current period selection
function getPeriodDisplayText() {
    return el.revenuePeriod.value === "monthly" ? "Monthly" : "Annually";
}

// ================================
// STEP 1: REVENUE PERIOD HANDLING
// ================================
// Updates the revenue label and converts the value when switching periods

function handleRevenuePeriodChange() {
    const currentPeriod = el.revenuePeriod.value;
    const currentRevenue = parseRevenue(el.revenueInput.value);

    // Update the label
    if (currentPeriod === "monthly") {
        el.revenueLabel.textContent = "Monthly Revenue";
    } else {
        el.revenueLabel.textContent = "Annual Revenue";
    }

    // Convert the revenue value if there's a value entered
    if (currentRevenue > 0) {
        let newRevenue;

        if (previousPeriod === "annually" && currentPeriod === "monthly") {
            // Switching from annual to monthly - divide by 12, round to 2 decimals
            newRevenue = Math.floor((currentRevenue / 12) * 100) / 100;
        } else if (previousPeriod === "monthly" && currentPeriod === "annually") {
            // Switching from monthly to annual - multiply by 12, round to 2 decimals
            newRevenue = Math.floor((currentRevenue * 12) * 100) / 100;
        } else {
            newRevenue = currentRevenue;
        }

        el.revenueInput.value = formatRevenueInput(newRevenue.toString());
    }

    // Sync Step 2 dropdown with Step 1
    el.revenuePeriodStep2.value = currentPeriod;

    // Update the previous period tracker
    previousPeriod = currentPeriod;

    // Recalculate Step 1
    calculateStep1();

    // If Step 2 is visible, recalculate it too
    if (el.step2.style.display !== "none") {
        calculateStep2();
    }
}

// Handles revenue period change from Step 2 dropdown
function handleRevenuePeriodStep2Change() {
    // Sync Step 1 dropdown with Step 2
    el.revenuePeriod.value = el.revenuePeriodStep2.value;

    // Use the same handler to do the conversion and recalculation
    handleRevenuePeriodChange();
}

// ================================
// STEP 1: CALCULATIONS
// ================================
// Runs all Step 1 calculations and updates the display

function calculateStep1() {
    // Get input values
    const revenueInput = parseRevenue(el.revenueInput.value);
    const currentGp = parseFloat(el.currentGpInput.value) || 0;
    const targetGp = parseFloat(el.targetGpInput.value) || 0;
    const currentCol = parseFloat(el.currentColInput.value) || 0;
    const targetCol = parseFloat(el.targetColInput.value) || 0;

    // Convert to annual revenue for calculations if monthly is selected
    const isMonthly = el.revenuePeriod.value === "monthly";
    const annualRevenue = isMonthly ? revenueInput * 12 : revenueInput;

    // --------------------------
    // Gross Profit calculations (always based on annual, then convert for display)
    // --------------------------
    // Current GP £ = Revenue × Current GP %
    const currentGpValueAnnual = annualRevenue * (currentGp / 100);

    // Target GP £ = Revenue × Target GP %
    const targetGpValueAnnual = annualRevenue * (targetGp / 100);

    // GP Variance % = Target GP % − Current GP %
    const gpVariancePercent = targetGp - currentGp;

    // GP Variance £ = Revenue × GP Variance %
    const gpVarianceAmountAnnual = annualRevenue * (gpVariancePercent / 100);

    // --------------------------
    // Labour calculations (always based on annual, then convert for display)
    // --------------------------
    // Current COL £ = Revenue × Current COL %
    const currentColValueAnnual = annualRevenue * (currentCol / 100);

    // Target COL £ = Revenue × Target COL %
    const targetColValueAnnual = annualRevenue * (targetCol / 100);

    // Labour Overspend % = Current COL % − Target COL %
    const labourOverspendPercent = currentCol - targetCol;

    // Labour Overspend £ = Revenue × Labour Overspend %
    const labourOverspendAmountAnnual = annualRevenue * (labourOverspendPercent / 100);

    // --------------------------
    // Convert for display based on period
    // --------------------------
    const displayDivisor = isMonthly ? 12 : 1;

    const currentGpValueDisplay = currentGpValueAnnual / displayDivisor;
    const targetGpValueDisplay = targetGpValueAnnual / displayDivisor;
    const gpVarianceAmountDisplay = gpVarianceAmountAnnual / displayDivisor;

    const currentColValueDisplay = currentColValueAnnual / displayDivisor;
    const targetColValueDisplay = targetColValueAnnual / displayDivisor;
    const labourOverspendAmountDisplay = labourOverspendAmountAnnual / displayDivisor;

    // --------------------------
    // Check which inputs are showing an error
    // --------------------------
    // Values that depend on an input with an error show a faded 0 instead of a misleading figure
    const revenueInvalid = hasFieldError(el.revenueInput);
    const currentGpInvalid = hasFieldError(el.currentGpInput);
    const targetGpInvalid = hasFieldError(el.targetGpInput);
    const currentColInvalid = hasFieldError(el.currentColInput);
    const targetColInvalid = hasFieldError(el.targetColInput);

    const gpVarianceInvalid = currentGpInvalid || targetGpInvalid;
    const labourOverspendInvalid = currentColInvalid || targetColInvalid;

    // --------------------------
    // Update DOM with formatted values
    // --------------------------
    setStep1Display(el.currentGpValue, formatCurrency(currentGpValueDisplay), formatCurrency(0),
        revenueInvalid || currentGpInvalid);
    setStep1Display(el.targetGpValue, formatCurrency(targetGpValueDisplay), formatCurrency(0),
        revenueInvalid || targetGpInvalid);
    setStep1Display(el.gpVariancePercent, formatPercent(gpVariancePercent), formatPercent(0),
        gpVarianceInvalid);
    setStep1Display(el.gpVarianceAmount, formatCurrency(gpVarianceAmountDisplay), formatCurrency(0),
        revenueInvalid || gpVarianceInvalid);

    setStep1Display(el.currentColValue, formatCurrency(currentColValueDisplay), formatCurrency(0),
        revenueInvalid || currentColInvalid);
    setStep1Display(el.targetColValue, formatCurrency(targetColValueDisplay), formatCurrency(0),
        revenueInvalid || targetColInvalid);
    setStep1Display(el.labourOverspendPercent, formatPercent(labourOverspendPercent), formatPercent(0),
        labourOverspendInvalid);
    setStep1Display(el.labourOverspendAmount, formatCurrency(labourOverspendAmountDisplay), formatCurrency(0),
        revenueInvalid || labourOverspendInvalid);

    // Update button state
    updateShowResultsButtonState();
}

// ================================
// STEP 2: CALCULATIONS
// ================================
// Runs all Step 2 calculations and updates the display

function calculateStep2() {
    // --------------------------
    // Get values from Step 1 inputs
    // --------------------------
    const revenueInput = parseRevenue(el.revenueInput.value);
    const currentCol = parseFloat(el.currentColInput.value) || 0;
    const targetCol = parseFloat(el.targetColInput.value) || 0;
    const currentGp = parseFloat(el.currentGpInput.value) || 0;
    const targetGp = parseFloat(el.targetGpInput.value) || 0;
    const locations = parseInt(el.locationsInput.value) || 0;
    const restaurantType = el.restaurantType.value;
    const currency = el.currencySelect.value;
    const isMonthly = el.revenuePeriod.value === "monthly";

    // Convert to annual revenue for calculations
    const annualRevenue = isMonthly ? revenueInput * 12 : revenueInput;

    // --------------------------
    // Get vertical-specific reduction percentages from config
    // --------------------------
    const verticalConfig = CONFIG.verticals[restaurantType] || {
        colReduction: 0,
        gpVarianceReduction: 0
    };
    const colReduction = verticalConfig.colReduction;
    const gpVarianceReduction = verticalConfig.gpVarianceReduction;

    // --------------------------
    // Calculate values (all based on annual figures)
    // --------------------------

    // New COL % = Current COL % − (Current COL % × COL Reduction %)
    const newColPercent = currentCol - (currentCol * (colReduction / 100));

    // Labour Savings £ = (Revenue × Current COL %) × COL Reduction %
    const currentColValueAnnual = annualRevenue * (currentCol / 100);
    const labourSavingsAnnual = currentColValueAnnual * (colReduction / 100);

    // GP Variance £ = Revenue × (Target GP % − Current GP %)
    const gpVarianceAmountAnnual = annualRevenue * ((targetGp - currentGp) / 100);

    // GP Variance Savings £ = GP Variance £ × GP Variance Reduction %
    const gpSavingsAnnual = gpVarianceAmountAnnual * (gpVarianceReduction / 100);

    // Nory Investment £ = Number of locations × Nory cost per month × 12
    const noryCostPerMonth = getNoryCostPerMonth();
    const noryInvestmentAnnual = locations * noryCostPerMonth * 12;

    // Annual Savings £ = Labour Savings + GP Variance Savings
    const annualSavingsAnnual = labourSavingsAnnual + gpSavingsAnnual;

    // Net ROI £ = Annual Savings − Nory Investment
    const netRoiAnnual = annualSavingsAnnual - noryInvestmentAnnual;

    // --------------------------
    // Convert for display based on period
    // --------------------------
    const displayDivisor = isMonthly ? 12 : 1;

    const labourSavingsDisplay = labourSavingsAnnual / displayDivisor;
    const gpSavingsDisplay = gpSavingsAnnual / displayDivisor;
    const noryInvestmentDisplay = noryInvestmentAnnual / displayDivisor;
    const annualSavingsDisplay = annualSavingsAnnual / displayDivisor;
    const netRoiDisplay = netRoiAnnual / displayDivisor;

    // --------------------------
    // Update restaurant type displays (all instances with .js-restaurant-type class)
    // --------------------------
    const restaurantDisplayName = getRestaurantDisplayName();
    el.restaurantTypeDisplays.forEach(element => {
        element.textContent = restaurantDisplayName;
    });

    // --------------------------
    // Update average reduction section
    // --------------------------
    el.colReductionPercent.textContent = colReduction + "%";
    el.gpReductionPercent.textContent = gpVarianceReduction + "%";

    // --------------------------
    // Update projected impact section
    // --------------------------
    el.newColPercent.textContent = formatPercent(newColPercent);
    el.newColDescription.textContent = "Reduced from " + currentCol + "%";

    el.labourSavingsValue.textContent = formatCurrency(labourSavingsDisplay);
    el.labourSavingsDescription.textContent = getPeriodDisplayText();

    el.gpSavingsValue.textContent = formatCurrency(gpSavingsDisplay);
    el.gpSavingsDescription.textContent = getPeriodDisplayText();

    // --------------------------
    // Update totals section
    // --------------------------
    const symbol = getCurrencySymbol();
    const periodText = getPeriodDisplayText();

    // Use formatCurrencyCost for Nory Investment (rounds UP to avoid underquoting)
    el.noryInvestmentValue.textContent = formatCurrencyCost(noryInvestmentDisplay);
    const locationsText = locations === 1 ? " location @ " : " locations @ ";
    el.noryInvestmentDescription.textContent = periodText + " for " + locations + locationsText +
        symbol + noryCostPerMonth + " p/month";

    // Update savings label based on period
    el.annualSavingsLabel.textContent = periodText === "Monthly" ? "Monthly Savings" :
        "Annual Savings";
    el.annualSavingsValue.textContent = formatCurrency(annualSavingsDisplay);

    el.netRoiValue.textContent = formatCurrency(netRoiDisplay);
    el.netRoiDescription.textContent = periodText + " after Nory investment";
}

// ================================
// STEP NAVIGATION
// ================================
// Handles showing/hiding steps

// Shows or hides the hero content and visual, leaving the band and back link in place
// Setting display to an empty string hands control back to the Webflow stylesheet
function setHeroVisible(isVisible) {
    const value = isVisible ? "" : "none";

    if (el.heroContent) {
        el.heroContent.style.display = value;
    }

    if (el.heroVisual) {
        el.heroVisual.style.display = value;
    }
}

// Swaps the hero intro copy to the US version when USD is selected
function updateHeroIntro() {
    if (!el.heroIntro) return;

    el.heroIntro.textContent = el.currencySelect.value === "USD" ? HERO_INTRO_US : heroIntroDefault;
}

// Swaps "Labour" to "Labor" in the calculator text when USD is selected
// Only text is changed, so labels, ids and aria references stay intact
// Original Webflow text is restored for GBP / EUR
function updateUsSpelling() {
    const isUsd = el.currencySelect.value === "USD";

    [el.step1, el.step2].forEach(step => {
        if (!step) return;

        const walker = document.createTreeWalker(step, NodeFilter.SHOW_TEXT);
        let node;

        while ((node = walker.nextNode())) {
            if (isUsd && /labour/i.test(node.nodeValue)) {
                usSpellingOriginals.set(node, node.nodeValue);
                node.nodeValue = node.nodeValue.replace(/Labour/g, "Labor").replace(/labour/g, "labor");
            }
        }
    });

    if (!isUsd) {
        usSpellingOriginals.forEach((original, node) => {
            node.nodeValue = original;
        });
        usSpellingOriginals.clear();
    }
}

// Swaps restaurant type dropdown options to their US names when USD is selected
// Original Webflow option text is stored on first run and restored for GBP / EUR
function updateRestaurantTypeOptions() {
    const isUsd = el.currencySelect.value === "USD";

    Array.from(el.restaurantType.options).forEach(option => {
        const usName = RESTAURANT_DISPLAY_NAMES_US[option.value];
        if (!usName) return;

        if (option.dataset.defaultText === undefined) {
            option.dataset.defaultText = option.text;
        }

        option.text = isUsd ? usName : option.dataset.defaultText;
    });
}

// Show Step 2 and hide Step 1
function showStep2() {
    el.step1.style.display = "none";
    el.step2.style.display = "flex";

    // Collapse the hero to a slim band
    setHeroVisible(false);

    // Scroll to top of page
    window.scrollTo({ top: 0, behavior: "smooth" });

    // Run Step 2 calculations
    calculateStep2();
}

// Show Step 1 and hide Step 2
function showStep1() {
    el.step2.style.display = "none";
    el.step1.style.display = "flex";

    // Restore the full hero
    setHeroVisible(true);

    // Scroll to top of page
    window.scrollTo({ top: 0, behavior: "smooth" });
}

// ================================
// VALIDATION
// ================================
// Inline field errors and sensible bounds for Step 1 inputs
// Error elements and their styles are created by JS, so nothing is needed in Webflow
// Styles match the site's form errors (book-a-chat)

const VALIDATION_LIMITS = {
    revenueAnnualMax: 1000000000,
    locationsMin: 1,
    locationsMax: 1000,
    percentMin: 0,
    percentMax: 100
};

const VALIDATION_MESSAGES = {
    revenueRequired: "Please enter your revenue.",
    revenueFormat: "Please use commas for thousands, e.g. 1,000,000.",
    revenueMax: "Please enter a revenue under 1 billion a year.",
    restaurantType: "Please select a restaurant type.",
    locations: "Please enter a whole number between 1 and 1,000.",
    percent: "Please enter a percentage between 0 and 100.",
    targetGp: "Target should be equal to or higher than current.",
    targetCol: "Target should be equal to or lower than current."
};

const FIELD_ERROR_CLASS = "roi-calculator_field-error";

// Adds the error styles to the page once
function injectFieldErrorStyles() {
    const style = document.createElement("style");
    style.textContent =
        // The field wrapper already has an 8px gap, so 2px here gives 10px below the input
        "." + FIELD_ERROR_CLASS + "{color:#E51520;font-size:14px;font-weight:500;line-height:1.4;margin-top:2px;}" +
        // Screen reader only prefix
        "." + FIELD_ERROR_CLASS + "-sr{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;}" +
        // Keeps side by side fields top aligned when one of them shows an error
        ".roi-calculator_row:has(." + FIELD_ERROR_CLASS + "){align-items:flex-start;}";
    document.head.appendChild(style);
}

// True if the revenue looks like it uses full stops for thousands, e.g. 1.000.000
function hasThousandsFullStop(value) {
    return /\.\d{3}(\D|$)/.test(value.trim());
}

// Returns the value as a number, or null if empty or not a number
function getNumberValue(input) {
    const raw = input.value.trim();
    if (raw === "") return null;

    const num = Number(raw);
    return isNaN(num) ? null : num;
}

// True if the input holds a percentage between 0 and 100
function isValidPercent(input) {
    const num = getNumberValue(input);
    return num !== null && num >= VALIDATION_LIMITS.percentMin && num <= VALIDATION_LIMITS.percentMax;
}

// Returns the error message for a field, or an empty string if it is valid
function getFieldError(input) {
    if (input === el.revenueInput) {
        const raw = input.value.trim();

        if (hasThousandsFullStop(raw)) return VALIDATION_MESSAGES.revenueFormat;
        if (parseRevenue(raw) <= 0) return VALIDATION_MESSAGES.revenueRequired;

        const isMonthly = el.revenuePeriod.value === "monthly";
        const annualRevenue = isMonthly ? parseRevenue(raw) * 12 : parseRevenue(raw);
        if (annualRevenue > VALIDATION_LIMITS.revenueAnnualMax) return VALIDATION_MESSAGES.revenueMax;

        return "";
    }

    if (input === el.restaurantType) {
        return input.value ? "" : VALIDATION_MESSAGES.restaurantType;
    }

    if (input === el.locationsInput) {
        const num = getNumberValue(input);
        const isValid = num !== null && Number.isInteger(num) &&
            num >= VALIDATION_LIMITS.locationsMin && num <= VALIDATION_LIMITS.locationsMax;
        return isValid ? "" : VALIDATION_MESSAGES.locations;
    }

    // Percentage fields
    if (!isValidPercent(input)) return VALIDATION_MESSAGES.percent;

    // Target GP must be equal to or higher than current GP
    if (input === el.targetGpInput && isValidPercent(el.currentGpInput) &&
        getNumberValue(input) < getNumberValue(el.currentGpInput)) {
        return VALIDATION_MESSAGES.targetGp;
    }

    // Target COL must be equal to or lower than current COL
    if (input === el.targetColInput && isValidPercent(el.currentColInput) &&
        getNumberValue(input) > getNumberValue(el.currentColInput)) {
        return VALIDATION_MESSAGES.targetCol;
    }

    return "";
}

// Shows an error below the field and links it to the input for screen readers
function showFieldError(input, message) {
    const wrapper = input.closest(".roi-calculator_field");
    if (!wrapper) return;

    let error = wrapper.querySelector("." + FIELD_ERROR_CLASS);

    if (!error) {
        error = document.createElement("div");
        error.className = FIELD_ERROR_CLASS;
        error.id = input.id + "-error";
        error.setAttribute("aria-live", "polite");
        wrapper.appendChild(error);
    }

    error.innerHTML = "";
    const prefix = document.createElement("span");
    prefix.className = FIELD_ERROR_CLASS + "-sr";
    prefix.textContent = "Error: ";
    error.appendChild(prefix);
    error.appendChild(document.createTextNode(message));

    input.setAttribute("aria-invalid", "true");
    input.setAttribute("aria-describedby", error.id);

    // Keep the value display (e.g. $0) aligned to the input, not the input plus error
    const valueDisplay = wrapper.querySelector(".roi-calculator_field-value");
    if (valueDisplay) {
        valueDisplay.style.bottom = "auto";
        valueDisplay.style.height = input.offsetHeight + "px";
    }
}

// Removes the error from a field
function clearFieldError(input) {
    const wrapper = input.closest(".roi-calculator_field");
    if (!wrapper) return;

    const error = wrapper.querySelector("." + FIELD_ERROR_CLASS);
    if (error) error.remove();

    input.removeAttribute("aria-invalid");
    input.removeAttribute("aria-describedby");

    const valueDisplay = wrapper.querySelector(".roi-calculator_field-value");
    if (valueDisplay) {
        valueDisplay.style.bottom = "";
        valueDisplay.style.height = "";
    }
}

// True if the field is currently showing an error
function hasFieldError(input) {
    return input.getAttribute("aria-invalid") === "true";
}

// Validates one field, shows or clears its error, and returns true if valid
// Recalculates Step 1 so values linked to the field update with the error state
function validateField(input) {
    const message = getFieldError(input);

    if (message) {
        showFieldError(input, message);
    } else {
        clearFieldError(input);
    }

    calculateStep1();
    return !message;
}

// Rechecks a field only if it is already showing an error
function revalidateIfInvalid(input) {
    if (hasFieldError(input)) {
        validateField(input);
    }
}

// Validates all Step 1 fields before showing Step 2 and focuses the first invalid one
function validateStep1() {
    const fields = [
        el.revenueInput,
        el.restaurantType,
        el.locationsInput,
        el.currentGpInput,
        el.targetGpInput,
        el.currentColInput,
        el.targetColInput
    ];

    let firstInvalid = null;

    fields.forEach(input => {
        if (!validateField(input) && !firstInvalid) {
            firstInvalid = input;
        }
    });

    if (firstInvalid) {
        firstInvalid.focus();
        return false;
    }

    return true;
}

// ================================
// BUTTON STATE
// ================================
// Enables/disables the Show Results button based on form completion

function updateShowResultsButtonState() {
    const revenue = parseRevenue(el.revenueInput.value);
    const restaurantType = el.restaurantType.value;
    const locations = parseInt(el.locationsInput.value) || 0;
    const currentGp = el.currentGpInput.value;
    const targetGp = el.targetGpInput.value;
    const currentCol = el.currentColInput.value;
    const targetCol = el.targetColInput.value;

    // Check all required fields have values
    const isComplete = (
        revenue > 0 &&
        restaurantType !== "" &&
        locations > 0 &&
        currentGp !== "" &&
        targetGp !== "" &&
        currentCol !== "" &&
        targetCol !== ""
    );

    // Toggle the active class
    if (isComplete) {
        el.showResultsBtn.classList.add("is-active");
    } else {
        el.showResultsBtn.classList.remove("is-active");
    }
}

// ================================
// EVENT LISTENERS
// ================================

// --------------------------
// Step 1: Revenue input formatting
// --------------------------
// Format revenue input on blur (when user leaves field)
// Adds comma separators for readability
// Skipped for full stop thousands (e.g. 1.000.000) so the value is kept for the error message
el.revenueInput.addEventListener("blur", function () {
    if (!hasThousandsFullStop(this.value)) {
        this.value = formatRevenueInput(this.value);
    }
    calculateStep1();
});

// Recalculate on revenue input (live as user types)
el.revenueInput.addEventListener("input", calculateStep1);

// --------------------------
// Step 1: Revenue period handling
// --------------------------
// Handle revenue period change (updates label, converts value, recalculates)
el.revenuePeriod.addEventListener("change", handleRevenuePeriodChange);

// --------------------------
// Step 1: Currency handling
// --------------------------
// Recalculate when currency changes
el.currencySelect.addEventListener("change", calculateStep1);

// Swap the hero intro copy when currency changes, and set it on load
el.currencySelect.addEventListener("change", updateHeroIntro);
updateHeroIntro();

// Swap to US spelling when currency changes, and set it on load
el.currencySelect.addEventListener("change", updateUsSpelling);
updateUsSpelling();

// Swap restaurant type options to US names when currency changes, and set them on load
el.currencySelect.addEventListener("change", updateRestaurantTypeOptions);
updateRestaurantTypeOptions();

// --------------------------
// Step 1: Gross Profit inputs
// --------------------------
// Recalculate when Gross Profit inputs change
el.currentGpInput.addEventListener("input", calculateStep1);
el.targetGpInput.addEventListener("input", calculateStep1);

// --------------------------
// Step 1: Labour inputs
// --------------------------
// Recalculate when Labour inputs change
el.currentColInput.addEventListener("input", calculateStep1);
el.targetColInput.addEventListener("input", calculateStep1);

// --------------------------
// Step 1: Fields that affect button state but don't trigger calculateStep1
// --------------------------
el.restaurantType.addEventListener("change", updateShowResultsButtonState);
el.locationsInput.addEventListener("input", updateShowResultsButtonState);

// Default locations to 2 on load if empty. Users can still change it to 1 or more
if (el.locationsInput.value === "") {
    el.locationsInput.value = "2";
}

// --------------------------
// Step 1: Field validation
// --------------------------
// Check a field when the user leaves it, then recheck as they type once an error is showing
injectFieldErrorStyles();

[
    el.revenueInput,
    el.restaurantType,
    el.locationsInput,
    el.currentGpInput,
    el.targetGpInput,
    el.currentColInput,
    el.targetColInput
].forEach(input => {
    input.addEventListener("blur", () => validateField(input));
    input.addEventListener("input", () => revalidateIfInvalid(input));
    input.addEventListener("change", () => revalidateIfInvalid(input));
});

// Recheck targets when their current value changes, if the target is filled in
el.currentGpInput.addEventListener("blur", () => {
    if (el.targetGpInput.value !== "") validateField(el.targetGpInput);
});
el.currentColInput.addEventListener("blur", () => {
    if (el.targetColInput.value !== "") validateField(el.targetColInput);
});

// Recheck revenue when the period changes, as the upper limit is annual
el.revenuePeriod.addEventListener("change", () => revalidateIfInvalid(el.revenueInput));

// --------------------------
// Step 1: Show results button
// --------------------------
// Validate inputs and show Step 2
el.showResultsBtn.addEventListener("click", function (e) {
    e.preventDefault();

    if (validateStep1()) {
        showStep2();
    }
});

// --------------------------
// Step 2: Revenue period handling
// --------------------------
// Sync with Step 1 and recalculate
el.revenuePeriodStep2.addEventListener("change", handleRevenuePeriodStep2Change);

// --------------------------
// Step 2: Back button
// --------------------------
// Return to Step 1
el.backToStep1Btn.addEventListener("click", function (e) {
    e.preventDefault();
    showStep1();
});
