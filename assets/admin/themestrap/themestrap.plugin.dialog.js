/**
 * Themestrap Dialog Plugin
 * Accessible, focus-trapped dialogs with backdrop, scroll-lock, and transition support.
 * Part of the Themestrap component library for MODX 3
 *
 * Markup anatomy:
 *
 *   <!-- Trigger (anywhere in the DOM) -->
 *   <button data-dialog-open="payment-dialog">Open</button>
 *
 *   <!-- Dialog root -->
 *   <div data-plugin-dialog id="payment-dialog"
 *        data-plugin-options='{"animationIn": "fadeInDown", "closeOnBackdrop": true}'>
 *
 *     <!-- Backdrop: click-to-close overlay -->
 *     <div data-dialog-backdrop></div>
 *
 *     <!-- Panel: the visible card -->
 *     <div data-dialog-panel>
 *
 *       <!-- Title & description wired to ARIA automatically -->
 *       <h2 data-dialog-title>Confirm Payment</h2>
 *       <p data-dialog-description>Review the details below before confirming.</p>
 *
 *       <!-- Any content here -->
 *
 *       <!-- Dedicated close trigger(s) inside the panel -->
 *       <button data-dialog-close>Cancel</button>
 *       <button data-dialog-close>Confirm</button>
 *     </div>
 *   </div>
 *
 * Public API (via stored instance):
 *   const dlg = $('#payment-dialog').data('__pluginDialog');
 *   dlg.open();
 *   dlg.close();
 *   dlg.toggle();
 *
 * Events fired on the dialog root element:
 *   dialog:open   — after open animation starts   (receives instance as arg)
 *   dialog:close  — after close animation ends     (receives instance as arg)
 *
 * Init.js wiring (DOMReady-immediate — dialogs must be ready before any trigger fires):
 *   if ($.isFunction($.fn['themestrapPluginDialog']) && $('[data-plugin-dialog]').length) {
 *       $(() => {
 *           $('[data-plugin-dialog]:not(.manual)').each(function () {
 *               const $this = $(this);
 *               const opts = themestrap.fn.getOptions($this.data('plugin-options')) || undefined;
 *               $this.themestrapPluginDialog(opts);
 *           });
 *       });
 *   }
 */
(((themestrap = {}, $) => {
    const instanceName = '__pluginDialog';

    // Focusable selector (ARIA-compliant set)
    const FOCUSABLE = [
        'a[href]',
        'button:not([disabled])',
        'input:not([disabled])',
        'select:not([disabled])',
        'textarea:not([disabled])',
        '[tabindex]:not([tabindex="-1"])',
        '[contenteditable="true"]',
    ].join(', ');

    // generate a short collision-resistant ID
    let _seq = 0;
    const uid = (prefix) => `${prefix}-${++_seq}-${Math.random().toString(36).slice(2, 7)}`;
    
    // Injected stylesheet — keyed to STYLE_ID so it runs only once per page
    const STYLE_ID = 'ts-dialog-styles';
    // CSS_TEXT is injected lazily by injectStyles() on first build (see below),
    // so loading this script never adds CSS to pages that don't use the plugin.
    const CSS_TEXT = `/**
 * PluginDialog — Themestrap Dialog Styles
 *
 * Structure expected:
 * .dialog-root                    ← [data-plugin-dialog] — full-screen container
 * ├── [data-dialog-backdrop]      ← dim overlay
 * └── [data-dialog-panel]         ← visible card / content region
 *     ├── [data-dialog-title]
 *     ├── [data-dialog-description]
 *     └── …content…
 *
 * State classes (toggled by the plugin):
 * .dialog-root.dialog-hidden      ← closed (display:none equivalent via CSS)
 * .dialog-root.dialog-is-open     ← open
 * body.dialog-scroll-lock         ← scroll disabled while a dialog is open
 */
.dialog-root {
    position: fixed;
    inset: 0;                  /* top/right/bottom/left: 0 */
    z-index: 1060;             /* above Bootstrap modals (1055) */
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
    isolation: isolate;        /* keep backdrop/panel layering deterministic */

    /* Hidden state — plugin toggles this class */
    &.dialog-hidden {
        display: none;
        pointer-events: none;
        visibility: hidden;
    }
}

[data-dialog-backdrop] {
    position: absolute;
    inset: 0;
    z-index: 0;
    background-color: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(2px);
    -webkit-backdrop-filter: blur(2px);

    /* Fade in with the dialog */
    .dialog-is-open & {
        animation: dialogBackdropIn 0.2s ease forwards;
    }
}

@keyframes dialogBackdropIn {
    from { opacity: 0; }
    to   { opacity: 1; }
}

[data-dialog-panel] {
    position: relative;         /* sit above backdrop */
    z-index: 1;
    background: #fff;
    border-radius: 0.75rem;
    box-shadow:
        0 20px 60px rgba(0, 0, 0, 0.25),
        0 4px  12px rgba(0, 0, 0, 0.12);
    padding: 2rem;
    width: 100%;
    max-width: 32rem;           /* ~512px — override with data-plugin-options if needed */
    max-height: calc(100vh - 4rem);
    overflow-y: auto;

    /* Scrollbar styling (WebKit) */
    scrollbar-width: thin;
    &::-webkit-scrollbar       { width: 4px; }
    &::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.2); border-radius: 2px; }
}

[data-dialog-title] {
    font-size: 1.25rem;
    font-weight: 600;
    line-height: 1.3;
    margin-top: 0;
    margin-bottom: 0.5rem;
    color: inherit;
}

[data-dialog-description] {
    font-size: 0.9375rem;
    color: #6b7280;
    margin-bottom: 1.5rem;
    line-height: 1.5;
}

body.ts-scroll-lock {
    overflow: hidden;
    /* Prevent layout shift from scrollbar disappearing */
    padding-right: var(--ts-scrollbar-width, 0px);
}

/* The plugin adds these classes to [data-dialog-panel].
   Uses Animate.css-style naming so Themestrap's existing
   animationIn/Out options work with zero extra CSS.               */
@keyframes dialogFadeIn {
    from { opacity: 0; transform: scale(0.97) translateY(-6px); }
    to   { opacity: 1; transform: scale(1)    translateY(0); }
}

@keyframes dialogFadeOut {
    from { opacity: 1; transform: scale(1)    translateY(0); }
    to   { opacity: 0; transform: scale(0.97) translateY(-6px); }
}

[data-dialog-panel].fadeIn  { animation: dialogFadeIn  0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
[data-dialog-panel].fadeOut { animation: dialogFadeOut 0.2s  ease-in                        forwards; }

@keyframes dialogFadeInDown {
    from { opacity: 0; transform: translateY(-24px); }
    to   { opacity: 1; transform: translateY(0); }
}

@keyframes dialogFadeOutUp {
    from { opacity: 1; transform: translateY(0); }
    to   { opacity: 0; transform: translateY(-24px); }
}

[data-dialog-panel].fadeInDown { animation: dialogFadeInDown 0.28s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
[data-dialog-panel].fadeOutUp  { animation: dialogFadeOutUp  0.2s  ease-in                        forwards; }

@keyframes dialogFadeInUp {
    from { opacity: 0; transform: translateY(24px); }
    to   { opacity: 1; transform: translateY(0); }
}

@keyframes dialogFadeOutDown {
    from { opacity: 1; transform: translateY(0); }
    to   { opacity: 0; transform: translateY(24px); }
}

[data-dialog-panel].fadeInUp   { animation: dialogFadeInUp   0.28s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
[data-dialog-panel].fadeOutDown{ animation: dialogFadeOutDown 0.2s  ease-in                        forwards; }

@keyframes dialogZoomIn {
    from { opacity: 0; transform: scale(0.85); }
    to   { opacity: 1; transform: scale(1); }
}

@keyframes dialogZoomOut {
    from { opacity: 1; transform: scale(1); }
    to   { opacity: 0; transform: scale(0.85); }
}

[data-dialog-panel].zoomIn  { animation: dialogZoomIn  0.25s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
[data-dialog-panel].zoomOut { animation: dialogZoomOut 0.18s ease-in                            forwards; }

@media (max-width: 575.98px) {
    .dialog-root {
        align-items: flex-end;
        padding: 0;
    }

    [data-dialog-panel] {
        border-radius: 1rem 1rem 0 0;
        max-width: 100%;
        max-height: 92vh;
        padding: 1.5rem 1.25rem 2rem;
    }

    /* Override panel animations with a sheet-style slide-up on mobile */
    [data-dialog-panel].fadeIn,
    [data-dialog-panel].fadeInDown,
    [data-dialog-panel].fadeInUp,
    [data-dialog-panel].zoomIn {
        animation: dialogFadeInUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    [data-dialog-panel].fadeOut,
    [data-dialog-panel].fadeOutUp,
    [data-dialog-panel].fadeOutDown,
    [data-dialog-panel].zoomOut {
        animation: dialogFadeOutDown 0.2s ease-in forwards;
    }
}

/* Add .dialog-sm / .dialog-lg / .dialog-xl / .dialog-full to [data-dialog-panel] */
[data-dialog-panel].dialog-sm   { max-width: 22rem; }
[data-dialog-panel].dialog-lg   { max-width: 48rem; }
[data-dialog-panel].dialog-xl   { max-width: 64rem; }
[data-dialog-panel].dialog-full {
    max-width: calc(100vw - 2rem);
    max-height: calc(100vh - 2rem);
    width: 100%;
}

/* Add .dialog-alert to [data-plugin-dialog] for a compact centered alert. */
.dialog-alert [data-dialog-panel] {
    text-align: center;
    padding: 2.5rem 2rem;
    max-width: 26rem;
}

.dialog-alert [data-dialog-title] {
    font-size: 1.1rem;
    margin-bottom: 0.75rem;
}

@media (prefers-color-scheme: dark) {
    [data-dialog-panel] {
        background: #1e2939;
        color: #f3f4f6;
        box-shadow:
            0 20px 60px rgba(0, 0, 0, 0.55),
            0 4px  12px rgba(0, 0, 0, 0.3);
    }

    [data-dialog-description] {
        color: #9ca3af;
    }
}
`;

    // Inject the stylesheet only when the plugin is actually used (called
    // from build()), so loading the script never adds CSS to unused pages.
    function injectStyles() {
        if (document.getElementById(STYLE_ID)) return;
        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = CSS_TEXT;
        (document.head || document.documentElement).appendChild(style);
    }

    class PluginDialog {
        constructor($el, opts) {
            return this.initialize($el, opts);
        }

        initialize($el, opts) {
            if ($el.data(instanceName)) {
                return this;
            }

            this.$el            = $el;
            this.$previousFocus = null;
            this.isOpen         = false;
            this._uid           = uid('dialog');

            this
                .setData()
                .setOptions(opts)
                .build()
                .events();

            return this;
        }

        setData() {
            this.$el.data(instanceName, this);
            return this;
        }

        setOptions(opts) {
            this.options = $.extend(true, {}, PluginDialog.defaults, opts, {
                wrapper: this.$el,
            });
            return this;
        }

        build() {
            // Inject component CSS lazily - only when an instance is built.
            injectStyles();
            const self = this;
            const $el  = self.$el;
            const opts = self.options;

            // ARIA role / modal flag
            if (!$el.attr('role')) $el.attr('role', 'dialog');
            $el.attr('aria-modal', 'true');

            // Auto-wire title → aria-labelledby
            const $title = $el.find('[data-dialog-title]').first();
            if ($title.length && !$el.attr('aria-labelledby')) {
                const id = $title.attr('id') || uid('dialog-title');
                $title.attr('id', id);
                $el.attr('aria-labelledby', id);
            }

            // Auto-wire description → aria-describedby
            const $desc = $el.find('[data-dialog-description]').first();
            if ($desc.length && !$el.attr('aria-describedby')) {
                const id = $desc.attr('id') || uid('dialog-desc');
                $desc.attr('id', id);
                $el.attr('aria-describedby', id);
            }

            // Ensure a backdrop element exists when option is on
            if (opts.backdrop) {
                self.$backdrop = $el.find('[data-dialog-backdrop]');
                if (!self.$backdrop.length) {
                    self.$backdrop = $('<div data-dialog-backdrop></div>');
                    $el.prepend(self.$backdrop);
                }
            }

            // Grab the panel (content card) — may be absent for simple dialogs
            self.$panel = $el.find('[data-dialog-panel]');

            // Hidden by default — use CSS class rather than inline style so
            // theme CSS retains full control of transitions.
            $el
                .addClass('dialog-root')
                .attr('aria-hidden', 'true')
                .attr('tabindex', '-1');

            if (!$el.hasClass('dialog-is-open')) {
                $el.addClass('dialog-hidden');
            }

            return this;
        }

        events() {
            const self     = this;
            const $el      = self.$el;
            const opts     = self.options;
            const dialogId = $el.attr('id');

            // External trigger buttons (open)
            if (dialogId) {
                $(document).on(
                    `click.dialog.${self._uid}`,
                    `[data-dialog-open="${dialogId}"]`,
                    function (e) {
                        e.preventDefault();
                        self.open();
                    }
                );
            }

            // Internal close buttons
            $el.on('click.dialog', '[data-dialog-close]', function (e) {
                e.preventDefault();
                self.close();
            });

            // Backdrop click to close
            if (opts.closeOnBackdrop && self.$backdrop && self.$backdrop.length) {
                $el.on('click.dialog.backdrop', function (e) {
                    if ($(e.target).is('[data-dialog-backdrop]')) {
                        self.close();
                    }
                });
            }

            // Escape key (document-level, scoped to this instance)
            if (opts.closeOnEscape) {
                $(document).on(`keydown.dialog.${self._uid}`, function (e) {
                    if (self.isOpen && (e.key === 'Escape' || e.keyCode === 27)) {
                        e.preventDefault();
                        self.close();
                    }
                });
            }

            return this;
        }

        open() {
            const self = this;
            const $el  = self.$el;
            const opts = self.options;

            if (self.isOpen) return this;
            self.isOpen = true;

            // Remember where focus was so we can restore it on close
            self.$previousFocus = $(document.activeElement);

            // Scroll lock: add class to <body>.
            // CSS rule:  body.ts-scroll-lock { overflow: hidden; padding-right: var(--ts-scrollbar-width, 0px); }
            // The padding-right compensates for the scrollbar disappearing, preventing layout shift.
            if (opts.scrollLock) {
                $('body').addClass('ts-scroll-lock');
            }

            // Reveal
            $el
                .removeClass('dialog-hidden')
                .addClass('dialog-is-open')
                .attr('aria-hidden', 'false');

            // Panel-level entrance animation
            const $animTarget = self.$panel.length ? self.$panel : $el;
            if (opts.animationIn) {
                $animTarget
                    .addClass(`dialog-anim-enter ${opts.animationIn}`)
                    .one('animationend webkitAnimationEnd', function () {
                        $animTarget.removeClass(`dialog-anim-enter ${opts.animationIn}`);
                    });

                setTimeout(() => {
                    $animTarget.removeClass(`dialog-anim-enter ${opts.animationIn}`);
                }, opts.animationDuration + 50);
            }

            // Focus management
            setTimeout(() => self._focusFirst(), 50);

            // Focus trap: intercept Tab / Shift+Tab
            $el.on('keydown.dialog.trap', (e) => {
                if (e.key === 'Tab' || e.keyCode === 9) {
                    self._trapFocus(e);
                }
            });

            // Callback & event
            if (typeof opts.onOpen === 'function') opts.onOpen.call(self, $el);
            $el.trigger('dialog:open', [self]);

            return this;
        }

        close() {
            const self = this;
            const $el  = self.$el;
            const opts = self.options;

            if (!self.isOpen) return this;

            $el.off('keydown.dialog.trap');

            const $animTarget = self.$panel.length ? self.$panel : $el;

            if (opts.animationOut) {
                $animTarget
                    .addClass(`dialog-anim-leave ${opts.animationOut}`)
                    .one('animationend webkitAnimationEnd', function () {
                        $animTarget.removeClass(`dialog-anim-leave ${opts.animationOut}`);
                        self._finishClose();
                    });

                setTimeout(() => {
                    $animTarget.removeClass(`dialog-anim-leave ${opts.animationOut}`);
                    self._finishClose();
                }, opts.animationDuration + 50);
            } else {
                self._finishClose();
            }

            return this;
        }

        toggle() {
            return this.isOpen ? this.close() : this.open();
        }

        _finishClose() {
            const self = this;
            const $el  = self.$el;
            const opts = self.options;

            if (!self.isOpen) return;
            self.isOpen = false;

            $el
                .addClass('dialog-hidden')
                .removeClass('dialog-is-open')
                .attr('aria-hidden', 'true');

            if (opts.scrollLock) {
                $('body').removeClass('ts-scroll-lock');
            }

            // Restore focus to the element that opened the dialog
            if (self.$previousFocus && self.$previousFocus.length) {
                self.$previousFocus.trigger('focus');
                self.$previousFocus = null;
            }

            if (typeof opts.onClose === 'function') opts.onClose.call(self, $el);
            $el.trigger('dialog:close', [self]);
        }

        _focusFirst() {
            const focusable = this._focusable();
            if (focusable.length) {
                focusable.first().trigger('focus');
            } else {
                this.$el.trigger('focus');
            }
        }

        _trapFocus(e) {
            const focusable = this._focusable();
            if (!focusable.length) return;

            const $first   = focusable.first();
            const $last    = focusable.last();
            const $current = $(document.activeElement);

            if (e.shiftKey) {
                if ($current.is($first)) {
                    e.preventDefault();
                    $last.trigger('focus');
                }
            } else {
                if ($current.is($last)) {
                    e.preventDefault();
                    $first.trigger('focus');
                }
            }
        }

        _focusable() {
            return this.$el.find(FOCUSABLE).filter(':visible').not('[data-dialog-backdrop]');
        }

        destroy() {
            const self = this;
            const $el  = self.$el;

            if (self.isOpen) self.close();

            $(document).off(`click.dialog.${self._uid}`);
            $(document).off(`keydown.dialog.${self._uid}`);
            $el.off('.dialog');

            $el
                .removeData(instanceName)
                .removeAttr('role aria-modal aria-hidden aria-labelledby aria-describedby tabindex')
                .removeClass('dialog-root dialog-hidden dialog-is-open');

            return this;
        }
    }

    PluginDialog.defaults = {
        closeOnBackdrop  : true,    // close when [data-dialog-backdrop] is clicked
        closeOnEscape    : true,    // close on Escape key
        backdrop         : true,    // inject/require a [data-dialog-backdrop] element
        animationIn      : 'fadeIn',        // CSS animation class applied to [data-dialog-panel]
        animationOut     : 'fadeOut',       // CSS animation class applied on close
        animationDuration: 300,             // ms — fallback if animationend never fires
        scrollLock       : true,    // add .ts-scroll-lock to <body> while open
        onOpen           : null,    // function(dialogElement) {}
        onClose          : null,    // function(dialogElement) {}
    };

    $.extend(themestrap, { PluginDialog });

    $.fn.themestrapPluginDialog = function (opts) {
        return this.map(function () {
            const $this = $(this);
            if ($this.data(instanceName)) {
                return $this.data(instanceName);
            }
            return new PluginDialog($this, opts);
        });
    };

})).apply(this, [window.themestrap, jQuery]);
