// Turns the alerts a post contains (GitHub style [!NOTE] blocks) into Themestrap PluginAlert components.
(function () {
  var $ = window.jQuery;
  if (!$ || typeof $.fn.themestrapPluginAlert !== 'function') return;
  $('[data-plugin-alert]').themestrapPluginAlert();
})();
