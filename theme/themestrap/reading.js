// Reading progress. Same markup and class names as the Themestrap framework snippet
// (.progress-reading .progress-bar), but measured against the post's own text rather than the whole page,
// so the footer and the next/previous links do not count. No dependencies.
(function () {
  var bars = document.querySelectorAll('.progress-reading');
  if (!bars.length) return;
  var queued = false;

  function targetOf(bar) {
    var sel = bar.getAttribute('data-reading-target');
    return (sel && document.querySelector(sel)) || bar.closest('article') || null;
  }

  function update() {
    queued = false;
    var vh = window.innerHeight || document.documentElement.clientHeight;
    for (var i = 0; i < bars.length; i++) {
      var bar = bars[i], el = targetOf(bar), fill = bar.querySelector('.progress-bar'), p;
      if (el) {
        // 0 when the entry's top meets the top of the screen, 100 when its end meets the bottom
        var r = el.getBoundingClientRect(), span = r.height - vh;
        bar.classList.toggle('is-idle', span <= 0);
        p = span > 0 ? (-r.top / span) * 100 : 100;
      } else {
        var page = document.documentElement.scrollHeight - vh;
        p = page > 0 ? ((window.pageYOffset || document.documentElement.scrollTop) / page) * 100 : 0;
      }
      p = Math.min(100, Math.max(0, p));
      if (fill) fill.style.width = p.toFixed(1) + '%';
      bar.setAttribute('aria-valuenow', Math.round(p));
    }
  }

  function queue() {
    if (queued) return;
    queued = true;
    window.requestAnimationFrame(update);
  }

  window.addEventListener('scroll', queue, { passive: true });
  window.addEventListener('resize', queue, { passive: true });
  window.addEventListener('load', queue);
  // Images and fonts change the height after load
  if (typeof ResizeObserver === 'function') {
    var ro = new ResizeObserver(queue);
    for (var i = 0; i < bars.length; i++) { var t = targetOf(bars[i]); if (t) ro.observe(t); }
  }
  update();
})();
