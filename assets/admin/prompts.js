// Admin prompts. Every question or notice goes through Themestrap's PluginDialog, never the browser's own
// confirm() and alert() boxes. Without the plugin on the page it falls back to the native ones.
(function ($) {
  'use strict';
  var classes = { confirm: 'btn primary', danger: 'btn warn', cancel: 'btn', actions: '' };

  function run(kind, opts) {
    opts = typeof opts === 'string' ? { message: opts } : (opts || {});
    var D = window.themestrap && window.themestrap.PluginDialog;
    if (D && typeof D[kind] === 'function') return D[kind]($.extend(true, { classes: classes }, opts));
    var text = (opts.title ? opts.title + '\n\n' : '') + (opts.message || '');
    if (kind === 'alert') { window.alert(text); return Promise.resolve(true); }
    return Promise.resolve(window.confirm(text));
  }

  window.tsPrompt = {
    confirm: function (opts) { return run('confirm', opts); },
    alert:   function (opts) { return run('alert', opts); }
  };
})(jQuery);
