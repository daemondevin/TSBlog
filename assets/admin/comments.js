// Comment moderation: approve, mark as spam, or delete without leaving the page
(function ($) {
  'use strict';
  var list = document.getElementById('comment-rows');
  if (!list) return;

  function toast(msg, bad) {
    var t = document.getElementById('toast');
    t.textContent = msg; t.hidden = false; t.className = 'toast' + (bad ? ' bad' : '');
    clearTimeout(toast.t); toast.t = setTimeout(function () { t.hidden = true; }, 3500);
  }

  function send(id, what) {
    var fd = new FormData();
    fd.append('id', id); fd.append('do', what); fd.append('_csrf', list.getAttribute('data-csrf'));
    return fetch(list.getAttribute('data-endpoint'), { method: 'POST', body: fd, credentials: 'same-origin', headers: { 'X-CSRF-Token': list.getAttribute('data-csrf') } })
      .then(function (r) { return r.json().catch(function () { return { ok: false, errors: ['Unexpected response from the server.'] }; }); });
  }

  function badge(n) {
    var b = document.getElementById('pending-badge');
    if (b) { if (n) b.textContent = n; else b.remove(); }
  }

  $(list).on('click', 'button[data-do]', function () {
    var btn = $(this), row = btn.closest('li'), id = row.data('id'), what = btn.data('do');
    var go = function () {
      send(id, what).then(function (r) {
        if (!r.ok) { toast((r.errors || ['Could not change that comment.']).join(' '), true); return; }
        badge(r.pending);
        // Reload keeps counts and filters right without duplicating the page logic here
        if (what === 'delete') { row.remove(); toast('Comment deleted.'); }
        else location.reload();
      });
    };
    if (what !== 'delete') return go();
    window.tsPrompt.confirm({ title: 'Delete this comment?', message: 'It is removed for good. If it is spam, marking it as spam instead keeps repeats out.', confirmLabel: 'Delete', cancelLabel: 'Keep it', danger: true })
      .then(function (yes) { if (yes) go(); });
  });
})(jQuery);
