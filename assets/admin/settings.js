// Settings page: the "Test my server again" button.
(function () {
  'use strict';
  var b = document.getElementById('recheck'), m = document.getElementById('recheck-msg');
  if (!b || !window.tsProbe) return;
  var cfg = JSON.parse(b.getAttribute('data-probe'));
  b.addEventListener('click', function () {
    b.disabled = true; m.textContent = 'Testing…';
    window.tsProbe(cfg).then(function (r) {
      var fd = new FormData();
      fd.append('_csrf', cfg.csrf);
      fd.append('pretty', r.pretty ? '1' : '0');
      fd.append('exposed', r.exposed === null ? '' : (r.exposed ? '1' : '0'));
      return fetch(cfg.post, { method: 'POST', body: fd, credentials: 'same-origin', headers: { 'X-CSRF-Token': cfg.csrf } });
    }).then(function () { m.textContent = 'Done. Reloading…'; location.reload(); })
      .catch(function () { m.textContent = 'The test could not run.'; b.disabled = false; });
  });
})();
