const tabs = document.querySelectorAll('.what-is-nory_tab');

// Only run if tabs exist
if (tabs.length > 0) {
    const zoomTarget = document.querySelector('.wahat-is-nory_zoom-target');
    const tagGroups = document.querySelectorAll('.what-is-nory_tag-group');
    const svgEmbeds = document.querySelectorAll('.what-is-nory_svg-embed');

    // Drag functionality variables
    let isDragging = false;
    let startX = 0,
        startY = 0;
    let currentX = 0,
        currentY = 0;
    let dragEnabled = false;

    function enableDrag() {
        const isMobile = window.innerWidth <= 767;
        const activeTab = document.querySelector('.what-is-nory_tab.is-active');
        const isFullSuite = activeTab?.getAttribute('data-target') === 'full';

        dragEnabled = isMobile && isFullSuite;

        if (dragEnabled) {
            zoomTarget.style.cursor = 'grab';
            addDragListeners();
        } else {
            zoomTarget.style.cursor = 'default';
            removeDragListeners();
        }
    }
    // Enable drag immediately since page loads with full suite active
    enableDrag();

    function addDragListeners() {
        // Mouse events
        zoomTarget.addEventListener('mousedown', startDrag);
        // Touch events for mobile
        zoomTarget.addEventListener('touchstart', startDrag, { passive: false });
    }

    function removeDragListeners() {
        zoomTarget.removeEventListener('mousedown', startDrag);
        zoomTarget.removeEventListener('touchstart', startDrag);
        document.removeEventListener('mousemove', drag);
        document.removeEventListener('touchmove', drag);
        document.removeEventListener('mouseup', endDrag);
        document.removeEventListener('touchend', endDrag);
    }

    function startDrag(e) {
        if (!dragEnabled) return;

        isDragging = true;
        zoomTarget.style.cursor = 'grabbing';

        // Get starting position (mouse or touch)
        const clientX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
        const clientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;

        startX = clientX;
        startY = clientY;

        // Get current transform values
        currentX = gsap.getProperty(zoomTarget, 'x') || 0;
        currentY = gsap.getProperty(zoomTarget, 'y') || 0;

        // Add move and end listeners
        document.addEventListener('mousemove', drag);
        document.addEventListener('touchmove', drag, { passive: false });
        document.addEventListener('mouseup', endDrag);
        document.addEventListener('touchend', endDrag);

        e.preventDefault();
    }

    function drag(e) {
        if (!isDragging || !dragEnabled) return;

        // Get current position (mouse or touch)
        const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
        const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;

        // Calculate movement
        const deltaX = clientX - startX;
        const deltaY = clientY - startY;

        // Update position using GSAP
        gsap.set(zoomTarget, {
            x: currentX + deltaX,
            y: currentY + deltaY
        });

        e.preventDefault();
    }

    function endDrag() {
        if (!isDragging) return;

        isDragging = false;
        zoomTarget.style.cursor = 'grab';

        // Remove listeners
        document.removeEventListener('mousemove', drag);
        document.removeEventListener('touchmove', drag);
        document.removeEventListener('mouseup', endDrag);
        document.removeEventListener('touchend', endDrag);
    }

    function getZoomSettings() {
        const w = window.innerWidth;
        if (w <= 479) {
            return {
                full: { scale: 1, x: '0%', y: '0%' },
                business: { scale: 2, x: '0%', y: '50%' },
                workforce: { scale: 1.2, x: '-58%', y: '-15%' },
                inventory: { scale: 1.2, x: '56%', y: '-27%' },
                payroll: { scale: 2.2, x: '40%', y: '60%' },
                capital: { scale: 2, x: '105%', y: '45%' }
            };
        } else if (w <= 767) {
            return {
                full: { scale: 1, x: '0%', y: '0%' },
                business: { scale: 2, x: '0%', y: '50%' },
                workforce: { scale: 1.5, x: '-46%', y: '-15%' },
                inventory: { scale: 1.5, x: '46%', y: '-45%' },
                payroll: { scale: 2.2, x: '25%', y: '60%' },
                capital: { scale: 2, x: '55%', y: '55%' }
            };
        } else if (w <= 991) {
            return {
                full: { scale: 1, x: '0%', y: '0%' },
                business: { scale: 2, x: '0%', y: '50%' },
                workforce: { scale: 1.5, x: '-46%', y: '-15%' },
                inventory: { scale: 1.5, x: '43%', y: '-35%' },
                payroll: { scale: 2, x: '5%', y: '40%' },
                capital: { scale: 2, x: '55%', y: '55%' }
            };
        } else {
            return {
                full: { scale: 1, x: '0%', y: '0%' },
                business: { scale: 1.8, x: '0%', y: '40%' },
                workforce: { scale: 1.8, x: '-28%', y: '-22%' },
                inventory: { scale: 1.8, x: '28%', y: '-48%' },
                payroll: { scale: 1.8, x: '5%', y: '40%' },
                capital: { scale: 1.8, x: '36%', y: '45%' }
            };
        }
    }

    function updateZoom(target) {
        const { scale, x, y } = getZoomSettings()[target];

        gsap.to(zoomTarget, {
            scale,
            xPercent: parseFloat(x),
            yPercent: parseFloat(y),
            x: 0, // Reset drag position when zooming
            y: 0, // Reset drag position when zooming
            duration: 1.2,
            ease: 'power3.inOut',
            onUpdate: () => {
                // Your existing scale compensation code
                const currentScale = gsap.getProperty(zoomTarget, 'scale');
                document.querySelectorAll('.what-is-nory_tag-item').forEach(tag => {
                    gsap.set(tag, {
                        scale: 1 / currentScale,
                        transformOrigin: 'center center'
                    });
                });
                document.querySelectorAll('.what-is-nory_tag-line').forEach(line => {
                    gsap.set(line, {
                        scaleY: 1 / currentScale,
                        scaleX: 1,
                        transformOrigin: '0% 0%'
                    });
                });
            },
            onComplete: () => {
                enableDrag(); // Enable drag after zoom completes
            }
        });
    }

    function switchTagGroup(target) {
        const nextGroup = document.querySelector(`.what-is-nory_tag-group[data-tags="${target}"]`);
        const activeGroup = document.querySelector('.what-is-nory_tag-group.is-active');

        if (activeGroup !== nextGroup) {
            const oldTags = activeGroup?.querySelectorAll(
                '.what-is-nory_tag-line, .what-is-nory_tag-item');
            const newTags = nextGroup?.querySelectorAll('.what-is-nory_tag-line, .what-is-nory_tag-item');

            if (oldTags) {
                gsap.to(oldTags, {
                    opacity: 0,
                    duration: 0.3,
                    onComplete: () => {
                        activeGroup?.classList.remove('is-active');
                        if (nextGroup) {
                            nextGroup.classList.add('is-active');
                            gsap.to(newTags, {
                                opacity: 1,
                                duration: 0.5,
                                ease: 'power2.out'
                            });
                        }
                    }
                });
            } else if (nextGroup && !nextGroup.classList.contains('is-active')) {
                nextGroup.classList.add('is-active');
                gsap.to(nextGroup.querySelectorAll('.what-is-nory_tag-line, .what-is-nory_tag-item'), {
                    opacity: 1,
                    duration: 0.5,
                    ease: 'power2.out'
                });
            }
        }
    }

    function switchSVG(target) {
        svgEmbeds.forEach(svg => {
            const tags = svg.getAttribute('data-tags');
            const isBase = tags === 'base';
            const match = tags === target;
            if (match || isBase) {
                svg.classList.remove('is-off');
                gsap.to(svg, { opacity: 1, duration: 0.5, ease: 'power2.out' });
            } else {
                gsap.to(svg, {
                    opacity: 0,
                    duration: 0.3,
                    onComplete: () => svg.classList.add('is-off')
                });
            }
        });
    }

    // Initial load: always show base SVG, fade in full suite after 1s
    setTimeout(() => {
        const fullSvg = document.querySelector('.what-is-nory_svg-embed[data-tags="full"]');
        if (fullSvg) {
            fullSvg.classList.remove('is-off');
            gsap.to(fullSvg, { opacity: 1, duration: 0.5, ease: 'power2.out' });
        }

        // Animate in 'full' tag group on ALL screen sizes
        const fullGroup = document.querySelector('.what-is-nory_tag-group[data-tags="full"]');
        if (fullGroup) {
            fullGroup.classList.add('is-active');
            gsap.to(fullGroup.querySelectorAll('.what-is-nory_tag-line, .what-is-nory_tag-item'), {
                opacity: 1,
                duration: 0.6,
                ease: 'power2.out',
                delay: 0.5
            });
        }
    }, 1000);

    // Tab interaction
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.getAttribute('data-target');
            tabs.forEach(t => t.classList.remove('is-active'));
            tab.classList.add('is-active');

            // Disable drag before zoom transition
            if (target !== 'full') {
                dragEnabled = false;
                removeDragListeners();
                zoomTarget.style.cursor = 'default';
            }

            updateZoom(target);
            switchSVG(target);
            switchTagGroup(target);
        });
    });

    // Handle screen resize to re-apply zoom
    window.addEventListener('resize', () => {
        const activeTab = document.querySelector('.what-is-nory_tab.is-active');
        if (activeTab) {
            const target = activeTab.getAttribute('data-target');
            updateZoom(target);
        }
    });

}
