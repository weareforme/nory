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
        USD: 379
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

// Returns the display name for a restaurant type value
function getRestaurantDisplayName() {
    const value = el.restaurantType.value;
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
    // Update DOM with formatted values
    // --------------------------
    el.currentGpValue.textContent = formatCurrency(currentGpValueDisplay);
    el.targetGpValue.textContent = formatCurrency(targetGpValueDisplay);
    el.gpVariancePercent.textContent = formatPercent(gpVariancePercent);
    el.gpVarianceAmount.textContent = formatCurrency(gpVarianceAmountDisplay);

    el.currentColValue.textContent = formatCurrency(currentColValueDisplay);
    el.targetColValue.textContent = formatCurrency(targetColValueDisplay);
    el.labourOverspendPercent.textContent = formatPercent(labourOverspendPercent);
    el.labourOverspendAmount.textContent = formatCurrency(labourOverspendAmountDisplay);

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
    el.noryInvestmentDescription.textContent = periodText + " for " + locations + " locations @ " +
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

// Show Step 2 and hide Step 1
function showStep2() {
    el.step1.style.display = "none";
    el.step2.style.display = "flex";

    // Scroll to top of page
    window.scrollTo({ top: 0, behavior: "smooth" });

    // Run Step 2 calculations
    calculateStep2();
}

// Show Step 1 and hide Step 2
function showStep1() {
    el.step2.style.display = "none";
    el.step1.style.display = "flex";

    // Scroll to top of page
    window.scrollTo({ top: 0, behavior: "smooth" });
}

// ================================
// VALIDATION
// ================================
// Validates Step 1 inputs before showing Step 2

function validateStep1() {
    const revenue = parseRevenue(el.revenueInput.value);
    const restaurantType = el.restaurantType.value;
    const locations = parseInt(el.locationsInput.value) || 0;
    const currentGp = el.currentGpInput.value;
    const targetGp = el.targetGpInput.value;
    const currentCol = el.currentColInput.value;
    const targetCol = el.targetColInput.value;

    // Check all required fields have values
    if (revenue <= 0) {
        alert("Please enter your revenue");
        el.revenueInput.focus();
        return false;
    }

    if (!restaurantType) {
        alert("Please select a restaurant type");
        el.restaurantType.focus();
        return false;
    }

    if (locations <= 0) {
        alert("Please enter the number of locations");
        el.locationsInput.focus();
        return false;
    }

    if (currentGp === "" || targetGp === "") {
        alert("Please enter your gross profit percentages");
        el.currentGpInput.focus();
        return false;
    }

    if (currentCol === "" || targetCol === "") {
        alert("Please enter your cost of labour percentages");
        el.currentColInput.focus();
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
el.revenueInput.addEventListener("blur", function () {
    this.value = formatRevenueInput(this.value);
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
