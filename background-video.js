(function () {
    function initBunnyBackground() {
      var videos = document.querySelectorAll('.g_visual_wrap video[data-hls-src]');
      
      if (videos.length === 0) return;

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

            hls.on(Hls.Events.MANIFEST_PARSED, function () {
              var playerWidth = video.offsetWidth * (window.devicePixelRatio || 1);
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

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initBunnyBackground);
    } else {
      initBunnyBackground();
    }
  })();