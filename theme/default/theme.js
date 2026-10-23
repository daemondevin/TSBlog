// Dark mode: follows the system setting until the reader picks one. Loaded in the head to avoid a flash.
// The "dark" class on <html> mirrors the result, for Themestrap components that style themselves from it.
(function () {
  var d = document.documentElement, k = 'tsblog-theme', s = null, mq = matchMedia('(prefers-color-scheme: dark)');
  try { s = localStorage.getItem(k); } catch (e) {}
  function isDark() { var c = d.getAttribute('data-theme'); return c ? c === 'dark' : mq.matches; }
  function sync() { d.classList.toggle('dark', isDark()); }
  if (s) d.setAttribute('data-theme', s);
  sync();
  if (mq.addEventListener) mq.addEventListener('change', sync);
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-theme-toggle]');
    if (!b) return;
    var next = isDark() ? 'light' : 'dark';
    d.setAttribute('data-theme', next);
    sync();
    try { localStorage.setItem(k, next); } catch (e) {}
  });
})();

