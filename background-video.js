(function () {
  var hlsScript = document.createElement('script');
  hlsScript.src = 'https://cdn.jsdelivr.net/npm/hls.js@1.6.11';
  hlsScript.async = true;
  hlsScript.onload = function () {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var video = entry.target;
          var src = video.getAttribute('data-hls-src');
          if (Hls.isSupported()) {
            var hls = new Hls({
              startLevel: -1,
              capLevelToPlayerSize: true,
              abrEwmaDefaultEstimate: 8000000
            });

            hls.on(Hls.Events.MANIFEST_PARSED, function () {
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
            });

            hls.loadSource(src);
            hls.attachMedia(video);
          } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = src;
          }
          observer.unobserve(video);
        }
      });
    }, { rootMargin: '10%' });
    document.querySelectorAll('.g_visual_wrap video[data-hls-src]').forEach(function (video) {
      observer.observe(video);
    });
  };
  document.body.appendChild(hlsScript);
})();
