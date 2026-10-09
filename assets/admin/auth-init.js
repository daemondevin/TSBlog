// Sign in and first-run setup: enhances the form with PluginAuth.
// Without this script the form still works as a normal page post.
(function ($) {
  'use strict';
  var $form = $('[data-plugin-auth]').first();
  if (!$form.length || typeof $.fn.themestrapPluginAuth !== 'function') return;

  var probe = $form.data('probe');
  var opts = { adapter: 'modx', toasts: false, redirectDelay: 150 };

  // Setup only: learn the time zone and what this server supports before the form is sent
  if (probe && window.tsProbe) {
    opts.beforeSubmit = function (data) {
      try { data.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) { data.timezone = ''; }
      return window.tsProbe(probe).then(function (r) {
        data.pretty = r.pretty ? '1' : '0';
        data.exposed = r.exposed === null ? '' : (r.exposed ? '1' : '0');
        return data;
      }).catch(function () { return data; });
    };
  }

  $form.themestrapPluginAuth(opts);
})(jQuery);
