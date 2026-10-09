// Admin dark mode: follows the system setting until a choice is made. Loaded in the head to avoid a flash.
(function () {
  var d = document.documentElement, k = 'tsblog-theme', s = null;
  try { s = localStorage.getItem(k); } catch (e) {}
  if (s) d.setAttribute('data-theme', s);
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-theme-toggle]');
    if (!b) return;
    var dark = d.getAttribute('data-theme') ? d.getAttribute('data-theme') === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    var next = dark ? 'light' : 'dark';
    d.setAttribute('data-theme', next);
    d.classList.toggle('dark', next === 'dark');
    try { localStorage.setItem(k, next); } catch (e) {}
  });
  var t = d.getAttribute('data-theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  d.classList.toggle('dark', t === 'dark');
  d.setAttribute('data-bs-theme', t);
})();
