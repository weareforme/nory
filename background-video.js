(function () {
    function initBunnyBackground() {
      var videos = document.querySelectorAll('.g_visual_wrap video[data-hls-src]');

      if (videos.length === 0) return;

      function setupVideos() {
        videos.forEach(function (video) {
          video.muted = true;
          video.loop = true;
          video.playsInline = true;
          video.autoplay = false;
          video.preload = 'none';
          video.setAttribute('playsinline', '');
          video.setAttribute('webkit-playsinline', '');

          var src = video.getAttribute('data-hls-src');
          var isAttached = false;

          function attachMedia() {
            if (isAttached) return;
            isAttached = true;

            if (window.Hls && Hls.isSupported()) {
              var hls = new Hls({
                startLevel: -1,
                capLevelToPlayerSize: true,
                abrEwmaDefaultEstimate: 8000000
              });

              function selectBestLevel() {
                var container = video.closest('.g_visual_wrap') || video.parentElement;
                var playerWidth = container.offsetWidth * (window.devicePixelRatio || 1);
                var bestLevel = -1;
                var bestWidth = 0;
                hls.levels.forEach(function (level, i) {
                  if (level.width <= playerWidth && level.width > bestWidth) {
                    bestLevel = i;
                    bestWidth = level.width;
                  }
                });
                if (bestLevel >= 0) {
                  hls.currentLevel = bestLevel;
                  hls.nextLoadLevel = bestLevel;
                }
              }

              hls.on(Hls.Events.MANIFEST_PARSED, selectBestLevel);
              hls.on(Hls.Events.BUFFER_APPENDED, selectBestLevel);

              hls.loadSource(src);
              hls.attachMedia(video);
            } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
              video.src = src;
            }
          }

          var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
              if (entry.isIntersecting) {
                if (!isAttached) attachMedia();
                if (video.paused) video.play().catch(function () {});
              } else {
                if (!video.paused) video.pause();
              }
            });
          }, { threshold: 0.1 });

          io.observe(video);
        });
      }

      // Load hls.js from CDN, then set up videos
      var hlsScript = document.createElement('script');
      hlsScript.src = 'https://cdn.jsdelivr.net/npm/hls.js@1.6.11';
      hlsScript.async = true;
      hlsScript.onload = setupVideos;
      hlsScript.onerror = setupVideos; // still run for Safari native HLS fallback
      document.body.appendChild(hlsScript);
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initBunnyBackground);
    } else {
      initBunnyBackground();
    }
  })();