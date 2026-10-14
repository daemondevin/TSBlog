// Settings page: PluginSelect for every dropdown and PluginNumberInput for the number fields.
(function ($) {
  'use strict';

  $('[data-plugin-select]').each(function () {
    var $w = $(this);
    if (typeof $.fn.themestrapPluginSelect !== 'function') return;
    $w.themestrapPluginSelect();
    // Name the button by its field label as well as its value, so a screen reader says "Time zone, Berlin"
    var $label = $w.closest('.field').find('.lbl').first();
    var trigger = $w.find('.ts-select-trigger')[0];
    if ($label.length && trigger && trigger.id) trigger.setAttribute('aria-labelledby', $label.attr('id') + ' ' + trigger.id);
  });

  if (typeof $.fn.themestrapPluginNumberInput === 'function') {
    $('[data-plugin-numberinput]').each(function () {
      $(this).themestrapPluginNumberInput($(this).data('plugin-options') || undefined);
    });
  }
})(jQuery);
