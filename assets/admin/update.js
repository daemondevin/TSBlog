// Updates: the Settings card and the banner on the post list. No dependencies.
(function () {
  'use strict';
  var card = document.getElementById('updates'), banner = document.getElementById('update-banner');
  var host = card || banner;
  if (!host) return;
  var endpoint = host.getAttribute('data-endpoint'), csrf = host.getAttribute('data-csrf');

  function post(op) {
    var fd = new FormData(); fd.append('_csrf', csrf); fd.append('op', op);
    return fetch(endpoint, { method: 'POST', body: fd, credentials: 'same-origin', headers: { 'X-CSRF-Token': csrf, 'X-Requested-With': 'XMLHttpRequest' } })
      .then(function (r) { return r.json(); });
  }
  function el(id) { return document.getElementById(id); }

  function paint(st) {
    if (!st) return;
    if (banner) {
      banner.hidden = !st.available;
      if (el('update-version')) el('update-version').textContent = st.latest;
    }
    if (card) {
      el('update-pill').textContent = st.available ? 'Version ' + st.latest + ' available' : 'Up to date';
      el('update-pill').className = 'pill ' + (st.available ? 'sched' : 'live');
      el('update-install-version').textContent = st.latest;
      if (el('update-install')) el('update-install').hidden = !st.available || !!st.key_mismatch;
      if (el('update-keywarn')) { el('update-keywarn').hidden = !st.key_mismatch; if (el('update-releasekey')) el('update-releasekey').textContent = st.release_key || ''; }
      el('update-notes').textContent = st.notes || '';
      el('update-notes').hidden = !(st.available && st.notes);
      el('update-status').textContent = st.error ? 'The last check failed: ' + st.error : (st.available ? 'A new version is available.' : 'Nothing newer is available.');
    }
  }

  // Quiet background check from the post list, at most about once a day
  if (banner && banner.getAttribute('data-auto') === '1') {
    post('check_cached').then(function (j) { paint(j.status); }).catch(function () {});
  }
  if (!card) return;

  // Without an update address the card has no buttons, so there is nothing to wire up
  if (!el('update-check')) return;

  var msg = el('update-msg');
  function busy(on, text) {
    ['update-check', 'update-install', 'update-restore'].forEach(function (id) { if (el(id)) el(id).disabled = on; });
    msg.textContent = text || '';
  }

  el('update-check').addEventListener('click', function () {
    busy(true, 'Checking…');
    post('check').then(function (j) { paint(j.status); busy(false, j.message); })
      .catch(function () { busy(false, 'The check could not run.'); });
  });

  function ask(opts) {
    return window.tsPrompt ? window.tsPrompt.confirm(opts) : Promise.resolve(window.confirm(opts.message));
  }

  if (el('update-install')) el('update-install').addEventListener('click', function () {
    var version = el('update-install-version') ? el('update-install-version').textContent : '';
    ask({
      title: 'Install version ' + version + '?',
      message: 'The site pauses for a few seconds. Your posts, pictures and settings are not touched, and you can go back afterwards.',
      confirmLabel: 'Install update', cancelLabel: 'Not now'
    }).then(function (yes) {
      if (!yes) return;
      busy(true, 'Downloading and checking the update…');
      post('install').then(function (j) {
        if (j.ok) { msg.textContent = j.message + ' Reloading…'; setTimeout(function () { location.reload(); }, 900); }
        else busy(false, j.message);
      }).catch(function () { busy(false, 'The update could not be completed. Reload the page to see where things stand.'); });
    });
  });

  if (el('update-restore')) el('update-restore').addEventListener('click', function () {
    ask({
      title: 'Go back to the previous version?',
      message: 'The files the last update changed are put back exactly as they were. Your posts, pictures and settings are not touched.',
      confirmLabel: 'Go back', cancelLabel: 'Stay on this version'
    }).then(function (yes) {
      if (!yes) return;
      busy(true, 'Restoring…');
      post('restore').then(function (j) {
        if (j.ok) { msg.textContent = j.message + ' Reloading…'; setTimeout(function () { location.reload(); }, 900); }
        else busy(false, j.message);
      }).catch(function () { busy(false, 'Could not go back. Reload the page.'); });
    });
  });
})();
