(function () {
    'use strict';

    function initBunnyPlayer() {
        document.querySelectorAll('[data-bunny-player]').forEach(function (player) {
            var src = player.getAttribute('data-player-src');
            if (!src) return;

            // Use square video on mobile if provided
            var mobileSrc = player.getAttribute('data-player-src-mobile');
            if (mobileSrc && window.innerWidth <= 768) {
                src = mobileSrc;
            }

            var video = player.querySelector('video');
            if (!video) return;

            // Stop any existing playback
            try { video.pause(); } catch (_) { }
            try {
                video.removeAttribute('src');
                video.load();
            } catch (_) { }

            // --- Helpers ---
            function setAttr(name, value) {
                if (player.getAttribute(name) !== String(value)) {
                    player.setAttribute(name, value);
                }
            }

            function setStatus(s) { setAttr('data-player-status', s); }

            function setMuted(v) {
                video.muted = !!v;
                setAttr('data-player-muted', video.muted ? 'true' : 'false');
            }

            function setActivated(v) { setAttr('data-player-activated', v ? 'true' : 'false'); }

            function safePlay() {
                var p = video.play();
                if (p && typeof p.then === 'function') p.catch(function () { });
            }

            // --- Flags ---
            var isAttached = false;
            var wasPlaying = false; // Track if video was playing before scrolling out

            // --- Initial state ---
            setStatus('idle');
            setMuted(true);
            setActivated(false);
            setAttr('data-player-hover', 'idle');

            video.muted = true;
            video.loop = true;
            video.playsInline = true;
            video.autoplay = false;
            video.preload = 'none';
            video.setAttribute('playsinline', '');
            video.setAttribute('webkit-playsinline', '');
            if (typeof video.disableRemotePlayback !== 'undefined') {
                video.disableRemotePlayback = true;
            }

            // --- HLS detection ---
            // Use hls.js whenever supported (gives us quality control).
            // Only fall back to native HLS on browsers where MSE isn't available (e.g. iOS Safari).
            var canUseHls = !!(window.Hls && Hls.isSupported());
            var useNativeHls = !canUseHls && !!video.canPlayType('application/vnd.apple.mpegurl');

            // --- Attach media (once) ---
            function attachMedia() {
                if (isAttached) return;
                isAttached = true;

                if (canUseHls) {
                    var hls = new Hls({
                        startLevel: -1,
                        capLevelToPlayerSize: true,
                        abrEwmaDefaultEstimate: 8000000 // Assume 8Mbps — avoids starting at 240p
                    });

                    // Register handler BEFORE loadSource to avoid timing race
                    hls.on(Hls.Events.MANIFEST_PARSED, function () {
                        var playerWidth = player.offsetWidth * (window.devicePixelRatio || 1);
                        var bestLevel = -1;
                        var bestWidth = 0;
                        hls.levels.forEach(function (level, i) {
                            if (level.width <= playerWidth && level.width > bestWidth) {
                                bestLevel = i;
                                bestWidth = level.width;
                            }
                        });
                        if (bestLevel >= 0) {
                            hls.startLevel = bestLevel;
                            hls.nextLoadLevel = bestLevel;
                        }
                    });

                    hls.loadSource(src);
                    hls.attachMedia(video);
                    player._hls = hls;
                } else if (useNativeHls) {
                    video.src = src;
                } else {
                    video.src = src;
                }
            }

            // --- Controls ---
            player.addEventListener('click', function (e) {
                var btn = e.target.closest('[data-player-control]');
                if (!btn || !player.contains(btn)) return;
                var control = btn.getAttribute('data-player-control');

                if (control === 'playpause') {
                    if (video.paused || video.ended) {
                        if (!isAttached) attachMedia();
                        wasPlaying = true;
                        setStatus('loading');
                        safePlay();
                    } else {
                        video.pause();
                        wasPlaying = false;
                    }
                } else if (control === 'mute') {
                    setMuted(!video.muted);
                }
            });

            // --- Video events ---
            video.addEventListener('play', function () {
                setActivated(true);
                setStatus('playing');
            });

            video.addEventListener('playing', function () {
                setStatus('playing');
            });

            video.addEventListener('pause', function () {
                setStatus('paused');
            });

            video.addEventListener('waiting', function () {
                setStatus('loading');
            });

            video.addEventListener('ended', function () {
                setStatus('paused');
                setActivated(false);
            });

            // --- Hover / idle ---
            var hoverTimer;

            function setHover(state) { setAttr('data-player-hover', state); }

            function wake() {
                setHover('active');
                clearTimeout(hoverTimer);
                hoverTimer = setTimeout(function () { setHover('idle'); }, 3000);
            }

            player.addEventListener('pointerenter', wake);
            player.addEventListener('pointermove', wake);
            player.addEventListener('pointerdown', wake);
            player.addEventListener('pointerleave', function () {
                setHover('idle');
                clearTimeout(hoverTimer);
            });

            // --- Scroll: autoplay when in view, pause when out ---
            var io = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting) {
                        if (!isAttached) attachMedia();
                        if (video.paused && wasPlaying !== false) {
                            safePlay();
                        }
                    } else {
                        if (!video.paused) {
                            wasPlaying = true;
                            video.pause();
                        }
                    }
                });
            }, { threshold: 0.1 });

            // Start as wanting to play (autoplay)
            wasPlaying = true;
            io.observe(player);
        });
    }

    // Run immediately — Slater ensures DOM is ready
    initBunnyPlayer();
})();
