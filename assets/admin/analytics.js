// Analytics page: clearing the recorded data asks first
(function ($) {
  'use strict';
  var btn = document.getElementById('a-clear');
  if (!btn) return;
  btn.addEventListener('click', function () {
    window.tsPrompt.confirm({ title: 'Clear all analytics?', message: 'Every recorded visit and click is deleted for good. Your posts and comments are not touched.', confirmLabel: 'Clear data', cancelLabel: 'Keep it', danger: true })
      .then(function (yes) {
        if (!yes) return;
        var fd = new FormData();
        fd.append('do', 'clear'); fd.append('_csrf', btn.getAttribute('data-csrf'));
        fetch(btn.getAttribute('data-endpoint'), { method: 'POST', body: fd, credentials: 'same-origin', headers: { 'X-CSRF-Token': btn.getAttribute('data-csrf') } })
          .then(function (r) { return r.json(); })
          .then(function (r) { if (r.ok) location.reload(); });
      });
  });
})(jQuery);
