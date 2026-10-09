// Filters the post list as you type
(function () {
  var f = document.getElementById('filter'), rows = document.querySelectorAll('#rows li');
  if (!f) return;
  f.addEventListener('input', function () {
    var q = f.value.trim().toLowerCase();
    rows.forEach(function (r) { r.hidden = q && r.getAttribute('data-text').indexOf(q) === -1; });
  });
})();
