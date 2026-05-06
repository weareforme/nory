(function () {
  function init() {
    var videos = document.querySelectorAll('video[data-hls-src]:not(.assistant-cards_video)');

    if (videos.length === 0) return;

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
                capLevelToPlayerSize: true
              });
              hls.loadSource(src);
              hls.attachMedia(video);
              hls.on(Hls.Events.MANIFEST_PARSED, function () {
                video.play().catch(function () { });
              });
            } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
              video.src = src;
            }
            observer.unobserve(video);
          }
        });
      }, { rootMargin: '10%' });

      videos.forEach(function (video) {
        observer.observe(video);
      });
    };

    hlsScript.onerror = function () { };
    document.body.appendChild(hlsScript);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();