// Themestrap theme: dark mode, sticky header, menu, tabs, slider and lightbox. No dependencies.
// The first part runs straight away from the head so the right colors show before the page paints.
(function () {
  var d = document.documentElement, k = 'tsblog-theme', s = null, mq = matchMedia('(prefers-color-scheme: dark)');
  try { s = localStorage.getItem(k); } catch (e) {}
  function isDark() { var c = d.getAttribute('data-theme'); return c ? c === 'dark' : mq.matches; }
  // data-bs-theme and the "dark" class are for Bootstrap and Themestrap components (PluginAlert styles from html.dark)
  function sync() { d.classList.toggle('dark', isDark()); d.setAttribute('data-bs-theme', isDark() ? 'dark' : 'light'); }
  if (s) d.setAttribute('data-theme', s);
  sync();
  if (mq.addEventListener) mq.addEventListener('change', sync);
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-theme-toggle]');
    if (!b) return;
    var next = isDark() ? 'light' : 'dark';
    d.setAttribute('data-theme', next);
    sync();
    try { localStorage.setItem(k, next); } catch (e2) {}
  });
})();

document.addEventListener('DOMContentLoaded', function () {
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  // Header gets a shadow and shrinks after a little scrolling
  var header = document.getElementById('header');
  if (header) {
    var stuck = false;
    var onScroll = function () {
      var now = (window.pageYOffset || document.documentElement.scrollTop) > 70;
      if (now !== stuck) { stuck = now; header.classList.toggle('is-stuck', now); }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // Menu button on small screens
  var burger = document.querySelector('[data-nav-toggle]'), nav = document.getElementById('tsx-nav');
  if (burger && nav) {
    burger.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) { nav.classList.remove('is-open'); burger.setAttribute('aria-expanded', 'false'); burger.focus(); }
    });
  }

  // Tabs in the sidebar (arrow keys move between them)
  $$('[data-tabs]').forEach(function (box) {
    var tabs = $$('[role=tab]', box);
    function show(tab) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        t.tabIndex = on ? 0 : -1;
        var pane = document.getElementById(t.getAttribute('aria-controls'));
        if (pane) pane.hidden = !on;
      });
    }
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { show(t); });
      t.addEventListener('keydown', function (e) {
        var j = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : -1;
        if (j < 0) return;
        e.preventDefault();
        var n = tabs[(j + tabs.length) % tabs.length]; show(n); n.focus();
      });
    });
  });

  // Slider. Without this script the pictures still scroll sideways and snap into place.
  var arrow = function (dir) {
    return '<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + (dir < 0 ? 'm14.5 5-7 7 7 7' : 'm9.5 5 7 7-7 7') + '"/></svg>';
  };
  $$('[data-slider]').forEach(function (box) {
    var track = box.querySelector('[data-track]'), slides = $$('.tsx-slide', track);
    if (slides.length < 2) return;
    var prev = document.createElement('button'), next = document.createElement('button'), dots = document.createElement('div');
    prev.type = next.type = 'button';
    prev.className = 'tsx-nav-btn tsx-prev'; next.className = 'tsx-nav-btn tsx-next';
    prev.setAttribute('aria-label', 'Previous picture'); next.setAttribute('aria-label', 'Next picture');
    prev.innerHTML = arrow(-1); next.innerHTML = arrow(1);
    dots.className = 'tsx-dots';
    slides.forEach(function (_, i) {
      var b = document.createElement('button'); b.type = 'button'; b.setAttribute('aria-label', 'Picture ' + (i + 1));
      b.addEventListener('click', function () { go(i); }); dots.appendChild(b);
    });
    box.appendChild(prev); box.appendChild(next); box.appendChild(dots);
    function index() { return Math.round(track.scrollLeft / Math.max(1, track.clientWidth)); }
    function go(i) { i = Math.max(0, Math.min(slides.length - 1, i)); track.scrollTo({ left: i * track.clientWidth }); }
    function sync() {
      var i = index();
      prev.disabled = i <= 0; next.disabled = i >= slides.length - 1;
      $$('button', dots).forEach(function (b, n) { if (n === i) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current'); });
    }
    prev.addEventListener('click', function () { go(index() - 1); });
    next.addEventListener('click', function () { go(index() + 1); });
    track.addEventListener('scroll', function () { window.requestAnimationFrame(sync); }, { passive: true });
    window.addEventListener('resize', function () { track.style.scrollBehavior = 'auto'; go(index()); track.style.scrollBehavior = ''; sync(); });
    box.tabIndex = 0;
    box.addEventListener('keydown', function (e) {
      if (e.target !== box) return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(index() - 1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); go(index() + 1); }
    });
    sync();
  });

  // Lightbox for galleries
  var lb = null, items = [], at = 0, opener = null;
  function build() {
    lb = document.createElement('div');
    lb.className = 'tsx-lb'; lb.hidden = true;
    lb.setAttribute('role', 'dialog'); lb.setAttribute('aria-modal', 'true'); lb.setAttribute('aria-label', 'Picture viewer');
    lb.innerHTML = '<img alt=""><button type="button" class="lb-close" aria-label="Close">&times;</button>' +
      '<button type="button" class="lb-prev" aria-label="Previous picture">' + arrow(-1) + '</button>' +
      '<button type="button" class="lb-next" aria-label="Next picture">' + arrow(1) + '</button><div class="lb-count" aria-live="polite"></div>';
    document.body.appendChild(lb);
    lb.addEventListener('click', function (e) {
      if (e.target.closest('.lb-close') || e.target === lb) close();
      else if (e.target.closest('.lb-prev')) step(-1);
      else if (e.target.closest('.lb-next')) step(1);
    });
  }
  function show(i) {
    at = (i + items.length) % items.length;
    lb.querySelector('img').src = items[at].href;
    lb.querySelector('.lb-count').textContent = items.length > 1 ? (at + 1) + ' / ' + items.length : '';
    lb.querySelector('.lb-prev').hidden = lb.querySelector('.lb-next').hidden = items.length < 2;
  }
  function step(n) { show(at + n); }
  function open(list, i, from) {
    if (!lb) build();
    items = list; opener = from; show(i); lb.hidden = false;
    document.documentElement.style.overflow = 'hidden';
    lb.querySelector('.lb-close').focus();
  }
  function close() {
    if (!lb || lb.hidden) return;
    lb.hidden = true; lb.querySelector('img').removeAttribute('src');
    document.documentElement.style.overflow = '';
    if (opener) opener.focus();
  }
  document.addEventListener('keydown', function (e) {
    if (!lb || lb.hidden) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowLeft') step(-1);
    else if (e.key === 'ArrowRight') step(1);
    else if (e.key === 'Tab') {
      // Keep focus inside the viewer
      var f = $$('button', lb).filter(function (b) { return !b.hidden; }), first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  $$('[data-lightbox]').forEach(function (g) {
    var links = $$('a', g);
    links.forEach(function (a, i) {
      a.addEventListener('click', function (e) {
        if (e.ctrlKey || e.metaKey || e.shiftKey || e.button) return;
        e.preventDefault(); open(links, i, a);
      });
    });
  });
});
