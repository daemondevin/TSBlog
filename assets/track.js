// Link click counting for the blog's own analytics. No cookies. Sends one small message per outbound, file or email click.
(function () {
  'use strict';
  var s = document.currentScript;
  if (!s || !navigator.sendBeacon || !window.FormData) return;
  var endpoint = s.getAttribute('data-endpoint'), token = s.getAttribute('data-token');
  var files = /\.(zip|pdf|docx?|xlsx?|pptx?|csv|txt|rar|7z|gz|tgz|dmg|exe|msi|apk|mp3|mp4|mov|epub|iso)$/i;

  function report(e) {
    var a = e.target.closest ? e.target.closest('a[href]') : null;
    if (!a) return;
    var type = '', url = a.href;
    if (/^(mailto|tel):/i.test(url)) type = 'mail';
    else if (/^https?:$/.test(a.protocol)) {
      if (a.host !== location.host) type = 'out';
      else if (files.test(a.pathname)) type = 'file';
    }
    if (!type) return;
    var fd = new FormData();
    fd.append('u', url); fd.append('t', type); fd.append('from', location.pathname + (location.search.indexOf('r=') > -1 ? location.search : ''));
    fd.append('token', token);
    navigator.sendBeacon(endpoint, fd);
  }

  document.addEventListener('click', report, true);
  document.addEventListener('auxclick', function (e) { if (e.button === 1) report(e); }, true);
})();
