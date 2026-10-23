// Comments: sends the form without a page reload and handles Reply. Everything also works without this script.
(function () {
  'use strict';
  var form = document.getElementById('respond');
  if (!form || !window.fetch || !window.FormData) return;
  var flash = document.getElementById('comment-flash');
  var parent = form.elements.parent;
  var bar = form.querySelector('.tsc-replying');
  var who = document.getElementById('tsc-replying-name');
  var submit = form.querySelector('.tsc-submit');

  function say(msg, kind) {
    flash.textContent = '';
    var p = document.createElement('p');
    p.className = 'alert alert-' + kind;
    p.textContent = msg;
    flash.appendChild(p);
    flash.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  function setReply(id, name) {
    parent.value = id || 0;
    who.textContent = name || '';
    bar.hidden = !id;
  }

  document.addEventListener('click', function (e) {
    var a = e.target.closest ? e.target.closest('.tsc-reply-link') : null;
    if (a) {
      e.preventDefault();
      setReply(a.getAttribute('data-reply'), a.getAttribute('data-name'));
      form.scrollIntoView({ behavior: 'smooth', block: 'center' });
      form.elements.body.focus({ preventScroll: true });
    } else if (e.target.id === 'tsc-cancel') {
      e.preventDefault();
      setReply(0, '');
    }
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!form.checkValidity()) { form.reportValidity(); return; }
    submit.disabled = true;
    fetch(form.getAttribute('data-endpoint'), { method: 'POST', body: new FormData(form), credentials: 'same-origin', headers: { 'X-Requested-With': 'fetch' } })
      .then(function (r) { return r.json(); })
      .then(function (r) {
        if (!r.ok) { say(r.message, 'danger'); submit.disabled = false; return; }
        if (r.code === 'ok') {
          var u = new URL(location.href);
          u.searchParams.delete('reply'); u.searchParams.set('c', 'ok'); u.hash = 'comments';
          location.href = u.toString();
          if (u.pathname + u.search === location.pathname + location.search) location.reload();
          return;
        }
        form.elements.body.value = '';
        setReply(0, '');
        say(r.message, 'success');
        submit.disabled = false;
      })
      .catch(function () { form.submit(); });
  });
})();
