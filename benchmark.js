console.log('Benchmark script starting...');

// Variable to store form data
let formData = {
    firstName: '',
    restaurantType: '',
    grossProfit: 0,
    googleReviews: 0,
    labourCost: 0,
    // cogs: 0
};

// Map form values to API keys
function mapRestaurantType(formValue) {
    const mapping = {
        'Quick service restaurant': 'QSR (quick service restaurant)',
        'QSR': 'QSR (quick service restaurant)',
        'qsr': 'QSR (quick service restaurant)',
        'Casual dining': 'Casual dining',
        'casual dining': 'Casual dining',
        'Fine dining': 'Fine dining',
        'fine dining': 'Fine dining',
        'Pub / bar-restaurant': 'Pub / bar-restaurant',
        'pub / bar-restaurant': 'Pub / bar-restaurant',
        'Fast casual': 'Fast casual',
        'fast casual': 'Fast casual',
        'Upscale casual / polished casual': 'Upscale casual / polished casual',
        'upscale casual / polished casual': 'Upscale casual / polished casual',
        'Café / coffee shop': 'Café / coffee shop',
        'Cafe / coffee shop': 'Café / coffee shop',
        'café / coffee shop': 'Café / coffee shop',
        'cafe / coffee shop': 'Café / coffee shop',
        'Bakery / bakery café': 'Bakery / bakery café',
        'Bakery / bakery cafe': 'Bakery / bakery café',
        'bakery / bakery café': 'Bakery / bakery café',
        'bakery / bakery cafe': 'Bakery / bakery café',
        'Buffet / carvery': 'Buffet / carvery',
        'buffet / carvery': 'Buffet / carvery',
        'Food hall / hybrid': 'Food hall / hybrid',
        'food hall / hybrid': 'Food hall / hybrid',
        'Ghost kitchen / virtual brands': 'Ghost kitchen / virtual brands',
        'ghost kitchen / virtual brands': 'Ghost kitchen / virtual brands',
        'Competitive socialising': 'Competitive socialising',
        'competitive socialising': 'Competitive socialising'
    };

    // First try exact match
    if (mapping[formValue]) {
        return mapping[formValue];
    }

    // Try case-insensitive match
    const lowerFormValue = formValue.toLowerCase();
    for (const [key, value] of Object.entries(mapping)) {
        if (key.toLowerCase() === lowerFormValue) {
            return value;
        }
    }

    // If no match found, return original value and log warning
    console.warn('No mapping found for restaurant type:', formValue);
    return formValue;
}

// Wait for HubSpot form to be ready
setTimeout(function () {
    const form = document.querySelector('#benchmark-form form');

    if (form) {
        console.log('Form found, adding submit listener...');

        // Capture data on form submit (before HubSpot clears it)
        form.addEventListener('submit', function (e) {
            console.log('Form submit event triggered!');

            const firstNameInput = document.querySelector('input[name="0-1/firstname"]');
            const restaurantTypeInput = document.querySelector(
                'input[name="0-1/restaurant_vertical__benchmark_"]');
            const grossProfitInput = document.querySelector(
                'input[name="0-1/gross_profit__benchmark_"]');
            const googleReviewsInput = document.querySelector(
                'input[name="0-1/average_google_reviews__benchmark_"]');
            const labourCostInput = document.querySelector(
                'input[name="0-1/cost_of_labour__benchmark_"]');
            // const cogsInput = document.querySelector('input[name="0-1/cogs__benchmark_"]');

            formData.firstName = firstNameInput?.value || '';
            formData.restaurantType = mapRestaurantType(restaurantTypeInput?.value || '');
            formData.grossProfit = parseFloat(grossProfitInput?.value) || 0;
            formData.googleReviews = parseFloat(googleReviewsInput?.value) || 0;
            formData.labourCost = parseFloat(labourCostInput?.value) || 0;
            // formData.cogs = parseFloat(cogsInput?.value) || 0;

            console.log('Form data captured:', formData);
        });
    } else {
        console.error('Form not found');
    }
}, 2000);

// Function to fetch and process benchmark data
async function loadBenchmarkData() {
    try {
        // Fetch directly from Nory CDN
        const apiUrl = 'https://cdn.nory.ai/benchmark-flash-pnl.json';

        const response = await fetch(apiUrl);
        const data = await response.json();

        console.log('Raw data received');

        // Get UK data
        const ukData = data.GB;
        if (!ukData) {
            console.error('GB data not found');
            return null;
        }

        console.log('Looking for restaurant type:', formData.restaurantType);

        // Get data for the restaurant type
        const restaurantData = ukData[formData.restaurantType];
        if (!restaurantData) {
            console.error('No data found for restaurant type:', formData.restaurantType);
            console.log('Available types:', Object.keys(ukData));
            return null;
        }

        console.log('Restaurant data found!');

        // Calculate benchmarks
        const benchmarks = calculateBenchmarks(restaurantData);

        return benchmarks;

    } catch (error) {
        console.error('Error loading benchmark data:', error);
        return null;
    }
}

// Function to calculate min/max for each metric from arrays
function calculateBenchmarks(data) {
    // Helper function to filter and cap values
    const processValues = (arr, cap = null) => {
        let values = arr.filter(val => !isNaN(val) && val > 0);

        // Apply cap if specified (for labour and COGS)
        if (cap) {
            values = values.map(val => Math.min(val, cap));
        }

        return values;
    };

    // Gross Profit
    const gpValues = processValues(data.gross_profit || []);
    const gpMin = gpValues.length > 0 ? Math.min(...gpValues) : 0;
    const gpMax = gpValues.length > 0 ? Math.max(...gpValues) : 100;

    // Google Reviews (0-5 scale)
    const reviewValues = processValues(data.reviews || []);
    const reviewMin = 0; // Always 0
    const reviewMax = 5; // Always 5

    // Labour Cost (cap at 100%)
    const labourValues = processValues(data.labour || [], 100);
    const labourMin = labourValues.length > 0 ? Math.min(...labourValues) : 0;
    const labourMax = labourValues.length > 0 ? Math.max(...labourValues) : 100;

    // COGS (cap at 100%)
    // const cogsValues = processValues(data.cogs || [], 100);
    // const cogsMin = cogsValues.length > 0 ? Math.min(...cogsValues) : 0;
    // const cogsMax = cogsValues.length > 0 ? Math.max(...cogsValues) : 100;

    console.log('Calculated benchmarks:', {
        grossProfit: { min: gpMin, max: gpMax, count: gpValues.length },
        reviews: { min: reviewMin, max: reviewMax, count: reviewValues.length },
        labour: { min: labourMin, max: labourMax, count: labourValues.length }
        // cogs: { min: cogsMin, max: cogsMax, count: cogsValues.length }
    });

    return {
        grossProfit: { min: gpMin, max: gpMax },
        reviews: { min: reviewMin, max: reviewMax },
        labour: { min: labourMin, max: labourMax }
        // cogs: { min: cogsMin, max: cogsMax }
    };
}

// Add this helper function for number counting animation
function animateValue(element, start, end, duration, suffix = '') {
    const range = end - start;
    const startTime = performance.now();

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Easing function (ease-out)
        const easeProgress = 1 - Math.pow(1 - progress, 3);

        const current = start + (range * easeProgress);
        element.textContent = current.toFixed(1) + suffix;

        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }

    requestAnimationFrame(update);
}

// Function to update a benchmark bar
function updateBenchmarkBar(id, userValue, minValue, maxValue, isReversed = false) {
    const block = document.getElementById(id);
    if (!block) return;

    // Cap user value at 100% for labour and COGS
    if (isReversed && userValue > 100) {
        userValue = 100;
    }

    // Update user value with GSAP animation
    const userValueEl = block.querySelector('.benchmark_bar_user-value');
    if (userValueEl) {
        const suffix = id === 'benchmark-reviews' ? '' : '%';

        gsap.to({ val: 0 }, {
            val: userValue,
            duration: 1.5,
            ease: "power2.out",
            onUpdate: function () {
                userValueEl.textContent = this.targets()[0].val.toFixed(1) + suffix;
            }
        });
    }

    // Update min/max values
    const valueElements = block.querySelectorAll('.benchmark_bar_value');
    if (valueElements.length === 2) {
        if (id === 'benchmark-reviews') {
            valueElements[0].textContent = minValue.toFixed(1);
            valueElements[1].textContent = maxValue.toFixed(1);
        } else {
            // For reversed metrics (labour and COGS), swap the labels since lower is better
            if (isReversed) {
                valueElements[0].textContent = maxValue.toFixed(1) + '%'; // Left shows highest (worst)
                valueElements[1].textContent = minValue.toFixed(1) + '%'; // Right shows lowest (best)
            } else {
                valueElements[0].textContent = minValue.toFixed(1) + '%';
                valueElements[1].textContent = maxValue.toFixed(1) + '%';
            }
        }
    }

    // Calculate bar width percentage
    let percentage;
    if (isReversed) {
        // For labour and COGS, lower is better, so reverse the calculation
        percentage = ((maxValue - userValue) / (maxValue - minValue)) * 100;
    } else {
        // For GP and reviews, higher is better
        percentage = ((userValue - minValue) / (maxValue - minValue)) * 100;
    }

    // Clamp between 0 and 100
    percentage = Math.max(0, Math.min(100, percentage));

    // Animate bar fill with GSAP from 0%
    const barFill = block.querySelector('.benchmark_bar_fill');
    if (barFill) {
        gsap.fromTo(barFill, { width: '0%' }, {
            width: percentage + '%',
            duration: 1.5,
            ease: "power2.out"
        });
    }

    console.log(`${id}: user=${userValue}, min=${minValue}, max=${maxValue}, bar=${percentage}%`);
}

// Function to render all benchmarks with stagger
function renderBenchmarks(benchmarks) {
    console.log('Rendering benchmarks...');

    // Array of benchmark configurations
    const benchmarkConfigs = [
        {
            id: 'benchmark-gross-profit',
            value: formData.grossProfit,
            min: benchmarks.grossProfit.min,
            max: benchmarks.grossProfit.max,
            reversed: false
        },
        {
            id: 'benchmark-reviews',
            value: formData.googleReviews,
            min: benchmarks.reviews.min,
            max: benchmarks.reviews.max,
            reversed: false
        },
        {
            id: 'benchmark-labour',
            value: formData.labourCost,
            min: benchmarks.labour.min,
            max: benchmarks.labour.max,
            reversed: true
        }];

    // Render each benchmark with a staggered delay
    benchmarkConfigs.forEach((config, index) => {
        setTimeout(() => {
            updateBenchmarkBar(
                config.id,
                config.value,
                config.min,
                config.max,
                config.reversed
            );
        }, index * 200); // 200ms stagger between each bar
    });
}

// Function to calculate and display improvement opportunities
function displayImprovementOpportunities(benchmarks) {
    console.log('Calculating improvement opportunities...');

    let cardsShown = 0;

    // Gross Profit - potential to reach max benchmark
    const grossProfitCard = document.getElementById('potential-gross-profit');
    if (grossProfitCard) {
        const potentialGain = benchmarks.grossProfit.max - formData.grossProfit;
        const valueEl = grossProfitCard.querySelector('.benchmark_potential_figure');
        if (valueEl) {
            if (potentialGain > 0) {
                valueEl.textContent = '+' + potentialGain.toFixed(1) + '%';
                grossProfitCard.style.display = 'flex';
                cardsShown++;
            } else {
                grossProfitCard.style.display = 'none';
            }
        }
    }

    // Review Rating - potential to improve by 50% of gap to 5.0
    const reviewsCard = document.getElementById('potential-rating');
    if (reviewsCard) {
        const fullGap = 5.0 - formData.googleReviews;
        const potentialGain = fullGap * 0.5;
        const valueEl = reviewsCard.querySelector('.benchmark_potential_figure');
        if (valueEl) {
            if (potentialGain > 0) {
                valueEl.textContent = '+' + potentialGain.toFixed(1);
                reviewsCard.style.display = 'flex';
                cardsShown++;
            } else {
                reviewsCard.style.display = 'none';
            }
        }
    }

    // Labour Cost - potential to reach min benchmark
    const labourCard = document.getElementById('potential-labour');
    if (labourCard) {
        const potentialSaving = formData.labourCost - benchmarks.labour.min;
        const valueEl = labourCard.querySelector('.benchmark_potential_figure');
        if (valueEl) {
            if (potentialSaving > 0) {
                valueEl.textContent = '-' + potentialSaving.toFixed(1) + '%';
                labourCard.style.display = 'flex';
                cardsShown++;
            } else {
                labourCard.style.display = 'none';
            }
        }
    }

    // Hide entire section if no cards shown
    const potentialGroup = document.getElementById('benchmark-potential-group');
    if (potentialGroup) {
        if (cardsShown === 0) {
            potentialGroup.style.display = 'none';
            console.log('No improvement opportunities - hiding section');
        } else {
            potentialGroup.style.display = 'block';
            console.log(`Showing ${cardsShown} improvement opportunities`);
        }
    }

    console.log('Improvement opportunities displayed');
}

function displayRecommendationCards(benchmarks) {
    console.log('Calculating recommendation cards...');

    const cardsToShow = [];

    // Calculate Gross Profit gap
    const gpGap = benchmarks.grossProfit.max - formData.grossProfit;

    // 1. Real-Time Performance Tracking - if GP gap >= 15% (critical)
    if (gpGap >= 15) {
        cardsToShow.push({
            id: 'card-performance-tracking',
            priority: 1,
            gap: gpGap
        });
    }

    // 2. Smarter Stock Control - if GP gap >= 3%
    if (gpGap >= 3) {
        cardsToShow.push({
            id: 'card-stock-control',
            priority: 2,
            gap: gpGap
        });
    }

    // 3. Optimised Scheduling - if Labour gap >= 5%
    const labourGap = formData.labourCost - benchmarks.labour.min;
    if (labourGap >= 5) {
        cardsToShow.push({
            id: 'card-scheduling',
            priority: 3,
            gap: labourGap
        });
    }

    // 4. Turn Feedback into Action - if Reviews gap >= 0.5
    const reviewsGap = 5.0 - formData.googleReviews;
    if (reviewsGap >= 0.5) {
        cardsToShow.push({
            id: 'card-feedback',
            priority: 4,
            gap: reviewsGap
        });
    }

    // Sort by priority and take max 3
    cardsToShow.sort((a, b) => a.priority - b.priority);
    const cardsToDisplay = cardsToShow.slice(0, 3);

    // Hide all cards first
    const allCards = [
        'card-performance-tracking',
        'card-stock-control',
        'card-scheduling',
        'card-feedback'
    ];

    allCards.forEach(cardId => {
        const card = document.getElementById(cardId);
        if (card) {
            card.style.display = 'none';
        }
    });

    // If no cards qualify, show Performance Tracking as default
    if (cardsToDisplay.length === 0) {
        const defaultCard = document.getElementById('card-performance-tracking');
        if (defaultCard) {
            defaultCard.style.display = 'flex';
            console.log('No gaps qualify - showing Performance Tracking as default');
        }
    } else {
        // Show only the relevant cards
        cardsToDisplay.forEach(cardInfo => {
            const card = document.getElementById(cardInfo.id);
            if (card) {
                card.style.display = 'flex';
                console.log(`Showing ${cardInfo.id} (gap: ${cardInfo.gap.toFixed(1)})`);
            }
        });
    }

    console.log(`Displaying ${cardsToDisplay.length || 1} recommendation cards`);
}

// Function to display relevant success stories based on restaurant type
function displaySuccessStory() {
    console.log('Selecting success stories for:', formData.restaurantType);

    // Map restaurant types to story IDs (can be arrays for multiple stories)
    const storyMapping = {
        'QSR (quick service restaurant)': ['cupp', 'pizzarova', 'bubble-citea', 'josies'],
        'Fast casual': ['tasty-african-food', 'pizzarova', 'tasty-african-foods-2', 'josies'],
        'Café / coffee shop': ['cupp', 'pizzarova', 'bubble-citea'],
        'Casual dining': ['tasty-african-food', 'pizzarova', 'tasty-african-foods-2', 'josies'],
        'Fine dining': ['tasty-african-food', 'pizzarova', 'tasty-african-foods-2', 'josies'],
        'Upscale casual / polished casual': ['tasty-african-food', 'pizzarova',
            'tasty-african-foods-2', 'josies'
        ],
        'Pub / bar-restaurant': ['cupp', 'pizzarova', 'bubble-citea'],
        'Bakery / bakery café': ['cupp', 'pizzarova', 'bubble-citea'],
        'Buffet / carvery': ['pizzarova'],
        'Food hall / hybrid': ['pizzarova'],
        'Ghost kitchen / virtual brands': ['tasty-african-food', 'pizzarova', 'tasty-african-foods-2',
            'josies'
        ],
        'Competitive socialising': ['pizzarova']
    };

    // Hide all stories first
    const allStories = ['tasty-african-food', 'cupp', 'pizzarova', 'bubble-citea',
        'tasty-african-foods-2', 'roasting-plant-coffee', 'josies'
    ];
    allStories.forEach(storyId => {
        const story = document.getElementById(storyId);
        if (story) {
            story.style.display = 'none';
        }
    });

    // Show the relevant stories
    const storiesToShow = storyMapping[formData.restaurantType] || ['roasting-plant-coffee'];
    storiesToShow.forEach(storyId => {
        const story = document.getElementById(storyId);
        if (story) {
            story.style.display = 'flex';
            console.log(`Showing success story: ${storyId}`);
        }
    });

    console.log(`Displaying ${storiesToShow.length} success stories`);
}

// Watch for success message
const formContainer = document.getElementById('benchmark-form');

if (!formContainer) {
    console.error('benchmark-form not found!');
} else {
    console.log('Form container found, setting up observer...');

    const observer = new MutationObserver(async function (mutations) {
        const successMessage = formContainer.querySelector(
            '.hsfc-PostSubmit, .submitted-message');

        if (successMessage) {
            console.log('Success message detected! Processing benchmarks...');

            // Validate form data was captured
            console.log('Current form data:', formData);

            if (formData.grossProfit === 0 && formData.labourCost === 0 && formData
                .googleReviews === 0) {
                console.warn('⚠️ Form data appears empty! Attempting to recapture...');

                // Try to capture data again from the form
                const firstNameInput = document.querySelector('input[name="0-1/firstname"]');
                const restaurantTypeInput = document.querySelector(
                    'input[name="0-1/restaurant_vertical__benchmark_"]');
                const grossProfitInput = document.querySelector(
                    'input[name="0-1/gross_profit__benchmark_"]');
                const googleReviewsInput = document.querySelector(
                    'input[name="0-1/average_google_reviews__benchmark_"]');
                const labourCostInput = document.querySelector(
                    'input[name="0-1/cost_of_labour__benchmark_"]');

                formData.firstName = firstNameInput?.value || '';
                formData.restaurantType = mapRestaurantType(restaurantTypeInput?.value || '');
                formData.grossProfit = parseFloat(grossProfitInput?.value) || 0;
                formData.googleReviews = parseFloat(googleReviewsInput?.value) || 0;
                formData.labourCost = parseFloat(labourCostInput?.value) || 0;

                console.log('Recaptured form data:', formData);
            }

            // Final validation - if still no data, show error
            if (formData.grossProfit === 0 && formData.labourCost === 0 && formData
                .googleReviews === 0) {
                console.error('❌ Unable to capture form data after retry');

                // Hide all main sections
                formContainer.style.display = 'none';
                document.getElementById('benchmark-meta')?.style.setProperty('display', 'none',
                    'important');
                document.getElementById('benchmark-results')?.style.setProperty('display', 'none',
                    'important');

                // Show error section
                const errorSection = document.getElementById('benchmark-error');
                if (errorSection) {
                    errorSection.style.display = 'flex';
                }

                observer.disconnect();
                return; // Stop further processing
            }

            // Data is valid - proceed with normal flow
            console.log('✅ Form data validated successfully');

            // Hide form
            formContainer.style.display = 'none';

            // Show all results sections
            const sectionsToShow = [
                'benchmark-results',
                'benchmark-meta',
            ];

            sectionsToShow.forEach(sectionId => {
                const section = document.getElementById(sectionId);
                if (section) {
                    section.style.display = 'block';
                    console.log(`Showing section: ${sectionId}`);
                }
            });

            // Replace name and restaurant type in benchmark-results
            const resultsSection = document.getElementById('benchmark-results');
            if (resultsSection) {
                const nameElement = resultsSection.querySelector('.u-benchmark-name');
                if (nameElement && formData.firstName) {
                    nameElement.textContent = nameElement.textContent.replace('{Name}', formData
                        .firstName);
                }

                const paragraphElement = resultsSection.querySelector('.u-benchmark-paragraph');
                if (paragraphElement && formData.restaurantType) {
                    paragraphElement.textContent = paragraphElement.textContent.replace(
                        '{restaurant type}', formData.restaurantType);
                }
            }

            // Load and render benchmark data
            const benchmarks = await loadBenchmarkData();
            if (benchmarks) {
                renderBenchmarks(benchmarks);
                displayImprovementOpportunities(benchmarks);
                displayRecommendationCards(benchmarks);
                displaySuccessStory();
            } else {
                console.error('❌ Failed to load benchmark data');

                // Hide all main sections
                formContainer.style.display = 'none';
                document.getElementById('benchmark-meta')?.style.setProperty('display', 'none',
                    'important');
                document.getElementById('benchmark-results')?.style.setProperty('display', 'none',
                    'important');

                // Show error section
                const errorSection = document.getElementById('benchmark-error');
                if (errorSection) {
                    errorSection.style.display = 'flex';
                }
            }

            // Scroll to results
            if (resultsSection) {
                resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }

            observer.disconnect();
        }
    });

    observer.observe(formContainer, {
        childList: true,
        subtree: true
    });

    console.log('Observer is now watching for form changes');
}
