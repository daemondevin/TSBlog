// Browser side checks the server cannot do itself:
//   pretty   do addresses like /ts-probe reach the blog?
//   exposed  can a visitor read a file inside the private "content" folder?
window.tsProbe = function (u) {
  function get(url, ms) {
    var c = typeof AbortController === 'function' ? new AbortController() : null;
    var timer = c ? setTimeout(function () { c.abort(); }, ms || 4000) : null;
    return fetch(url, { cache: 'no-store', credentials: 'omit', signal: c ? c.signal : undefined })
      .then(function (r) { return r.text(); })
      .then(function (t) { clearTimeout(timer); return t; });
  }
  var pretty = get(u.pretty).then(function (t) { return t.indexOf('tsblog-probe') === 0; }).catch(function () { return false; });
  var exposed = get(u.exposed).then(function (t) { return t.indexOf('tsblog-private-probe') !== -1; }).catch(function () { return null; });
  return Promise.all([pretty, exposed]).then(function (a) { return { pretty: a[0], exposed: a[1] }; });
};
