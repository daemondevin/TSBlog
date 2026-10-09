// Post page extras built on Themestrap's ScrollShadow plugin.
(function () {
  var $ = window.jQuery;
  if (!$ || typeof $.fn.themestrapPluginScrollShadow !== 'function') return;

  // Wide code blocks and tables scroll sideways: fade the edges that have more
  $('.prose pre, .prose table').themestrapPluginScrollShadow({ orientation: 'horizontal', size: '28px' });

  // The post itself: a fade at the bottom of the screen while there is more to read
  $('.prose').themestrapPluginScrollShadow({ scope: 'page', edges: ['bottom'], size: '110px', hint: 'Keep reading' });
})();
