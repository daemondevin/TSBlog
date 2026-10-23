// Alert
(((themestrap = {}, $) => {
    const instanceName = '__pluginAlert';

    // Injected stylesheet — keyed to STYLE_ID so it runs only once per page
    const STYLE_ID = 'ts-alert-styles';
    // CSS_TEXT is injected lazily by injectStyles() on first build (see below),
    // so loading this script never adds CSS to pages that don't use the plugin.
    const CSS_TEXT = `/* Themestrap — PluginAlert */
.alert-ts-primary {
    --alert-ts-bg           : var(--primary-rgba-10);
    --alert-ts-border       : var(--primary);
    --alert-ts-icon         : var(--primary);
    --alert-ts-title        : var(--primary-300);
    --alert-ts-text         : var(--primary-200);
    --alert-ts-action       : var(--primary-200);
    --alert-ts-action-hover : var(--primary-300);
    --alert-ts-close        : var(--primary--200);
    --alert-ts-close-hover  : var(--primary-300);
}

.alert-ts-secondary {
    --alert-ts-bg           : var(--secondary-rgba-10);
    --alert-ts-border       : var(--secondary);
    --alert-ts-icon         : var(--secondary);
    --alert-ts-title        : var(--secondary-300);
    --alert-ts-text         : var(--secondary-200);
    --alert-ts-action       : var(--secondary-200);
    --alert-ts-action-hover : var(--secondary-300);
    --alert-ts-close        : var(--secondary--200);
    --alert-ts-close-hover  : var(--secondary-300);
}

.alert-ts-tertiary {
    --alert-ts-bg           : var(--tertiary-rgba-10);
    --alert-ts-border       : var(--tertiary);
    --alert-ts-icon         : var(--tertiary);
    --alert-ts-title        : var(--tertiary-300);
    --alert-ts-text         : var(--tertiary-200);
    --alert-ts-action       : var(--tertiary-200);
    --alert-ts-action-hover : var(--tertiary-300);
    --alert-ts-close        : var(--tertiary--200);
    --alert-ts-close-hover  : var(--tertiary-300);
}

.alert-ts-quaternary {
    --alert-ts-bg           : var(--quaternary-rgba-10);
    --alert-ts-border       : var(--quaternary);
    --alert-ts-icon         : var(--quaternary);
    --alert-ts-title        : var(--quaternary-300);
    --alert-ts-text         : var(--quaternary-200);
    --alert-ts-action       : var(--quaternary-200);
    --alert-ts-action-hover : var(--quaternary-300);
    --alert-ts-close        : var(--quaternary--200);
    --alert-ts-close-hover  : var(--quaternary-300);
}

.alert-ts-light {
    --alert-ts-bg           : var(--light-100);
    --alert-ts-border       : var(--grey-800);
    --alert-ts-icon         : var(--light-300);
    --alert-ts-title        : var(--dark-300);
    --alert-ts-text         : var(--dark-200);
    --alert-ts-action       : var(--dark-200);
    --alert-ts-action-hover : var(--dark-300);
    --alert-ts-close        : var(--dark--200);
    --alert-ts-close-hover  : var(--dark-300);
}

.alert-ts-dark {
    --alert-ts-bg           : var(--dark--300);
    --alert-ts-border       : var(--dark-300);
    --alert-ts-icon         : var(--dark-300);
    --alert-ts-title        : var(--light-300);
    --alert-ts-text         : var(--light-200);
    --alert-ts-action       : var(--light-200);
    --alert-ts-action-hover : var(--light-300);
    --alert-ts-close        : var(--light--200);
    --alert-ts-close-hover  : var(--light-300);
}

.alert-ts-info {
    --alert-ts-bg           : #eff6ff;
    --alert-ts-border       : #3b82f6;
    --alert-ts-icon         : #3b82f6;
    --alert-ts-title        : #1e40af;
    --alert-ts-text         : #1d4ed8;
    --alert-ts-action       : #1d4ed8;
    --alert-ts-action-hover : #1e40af;
    --alert-ts-close        : #93c5fd;
    --alert-ts-close-hover  : #1d4ed8;
}

.alert-ts-success {
    --alert-ts-bg           : #f0fdf4;
    --alert-ts-border       : #22c55e;
    --alert-ts-icon         : #22c55e;
    --alert-ts-title        : #14532d;
    --alert-ts-text         : #15803d;
    --alert-ts-action       : #15803d;
    --alert-ts-action-hover : #14532d;
    --alert-ts-close        : #86efac;
    --alert-ts-close-hover  : #15803d;
}

.alert-ts-warning {
    --alert-ts-bg           : #fffbeb;
    --alert-ts-border       : #f59e0b;
    --alert-ts-icon         : #f59e0b;
    --alert-ts-title        : #78350f;
    --alert-ts-text         : #92400e;
    --alert-ts-action       : #92400e;
    --alert-ts-action-hover : #78350f;
    --alert-ts-close        : #fcd34d;
    --alert-ts-close-hover  : #92400e;
}

.alert-ts-danger {
    --alert-ts-bg           : #fef2f2;
    --alert-ts-border       : #ef4444;
    --alert-ts-icon         : #ef4444;
    --alert-ts-title        : #7f1d1d;
    --alert-ts-text         : #991b1b;
    --alert-ts-action       : #991b1b;
    --alert-ts-action-hover : #7f1d1d;
    --alert-ts-close        : #fca5a5;
    --alert-ts-close-hover  : #991b1b;
}

.alert-ts-neutral {
    --alert-ts-bg           : #f9fafb;
    --alert-ts-border       : #6b7280;
    --alert-ts-icon         : #6b7280;
    --alert-ts-title        : #111827;
    --alert-ts-text         : #374151;
    --alert-ts-action       : #374151;
    --alert-ts-action-hover : #111827;
    --alert-ts-close        : #d1d5db;
    --alert-ts-close-hover  : #374151;
}


/* Base alert-ts layout */
.alert.alert-ts {
    display          : flex;
    align-items      : flex-start;
    gap              : 0.75rem;
    padding          : 1rem 1rem 1rem 1.25rem;
    border-radius    : 0.5rem;
    border-width     : 0;
    border-left      : 4px solid var(--alert-ts-border);
    background-color : var(--alert-ts-bg);
    position         : relative;
    overflow         : hidden;   /* clips countdown bar */
}

.alert.alert-ts.alert-sm {
    padding: 5px 10px;
    font-size: 0.9em;
}

.alert.alert-ts.alert-lg {
    padding: 20px;
    font-size: 1.2em;
}

/* Remove Bootstrap's default coloured border/bg — our tokens take over */
.alert.alert-ts[class*="alert-primary"],
.alert.alert-ts[class*="alert-secondary"],
.alert.alert-ts[class*="alert-success"],
.alert.alert-ts[class*="alert-danger"],
.alert.alert-ts[class*="alert-warning"],
.alert.alert-ts[class*="alert-info"],
.alert.alert-ts[class*="alert-light"],
.alert.alert-ts[class*="alert-dark"] {
    background-color : var(--alert-ts-bg);
    border-color     : transparent;
    border-left-color: var(--alert-ts-border);
    color            : var(--alert-ts-text);
}


/* Icon */
.alert-ts-icon {
    flex-shrink    : 0;
    width          : 1.25rem;   /* 20 px */
    height         : 1.25rem;
    color          : var(--alert-ts-icon);
    margin-top     : 1px;       /* optical alignment with first line of text */
}

.alert-ts-icon svg {
    display : block;
    width   : 100%;
    height  : 100%;
}

/* Body */
.alert-ts-body {
    flex    : 1 1 auto;
    min-width: 0;
}

.alert-ts-title {
    font-size   : 0.975rem;   /* 14 px */
    font-weight : 600;
    line-height : 1.4;
    color       : var(--alert-ts-title);
    margin      : 0 0 0.25rem;
}

.alert-ts-text {
    font-size   : 0.975rem;
    line-height : 1.5;
    color       : var(--alert-ts-text);
}

.alert-ts-text p:last-child {
    margin-bottom: 0;
}


/* Action buttons */
.alert-ts-actions {
    display     : flex;
    flex-wrap   : wrap;
    gap         : 0.5rem;
    margin-top  : 0.75rem;
}

.alert-ts-action {
    display         : inline-flex;
    align-items     : center;
    padding         : 0.375rem 0.75rem;
    font-size       : 0.875rem;
    font-weight     : 500;
    line-height     : 1;
    border-radius   : 0.375rem;
    border          : 1.5px solid transparent;
    cursor          : pointer;
    transition      : background-color 0.15s ease,
                      border-color     0.15s ease,
                      color            0.15s ease;
    text-decoration : none;
    white-space     : nowrap;
}

/* Primary action — filled */
.alert-ts-action-primary {
    background-color : var(--alert-ts-action);
    border-color     : var(--alert-ts-action);
    color            : #fff;
}

.alert-ts-action-primary:hover,
.alert-ts-action-primary:focus-visible {
    background-color : var(--alert-ts-action-hover);
    border-color     : var(--alert-ts-action-hover);
    color            : #fff;
}

/* Secondary action — ghost / outlined */
.alert-ts-action-secondary {
    background-color : transparent;
    border-color     : var(--alert-ts-action);
    color            : var(--alert-ts-action);
}

.alert-ts-action-secondary:hover,
.alert-ts-action-secondary:focus-visible {
    background-color : var(--alert-ts-action);
    color            : #fff;
}

/* Link-style action — no border, just tinted text */
.alert-ts-action-link {
    background  : none;
    border-color: transparent;
    color       : var(--alert-ts-action);
    padding-left : 0;
    padding-right: 0;
}

.alert-ts-action-link:hover,
.alert-ts-action-link:focus-visible {
    color           : var(--alert-ts-action-hover);
    text-decoration : underline;
}

.alert-ts-action:focus-visible {
    outline        : 2px solid var(--alert-ts-border);
    outline-offset : 2px;
}


/* Dismiss (×) button */
.alert-ts-close {
    flex-shrink      : 0;
    display          : inline-flex;
    align-items      : center;
    justify-content  : center;
    width            : 1.5rem;
    height           : 1.5rem;
    padding          : 0;
    margin-left      : auto;
    background       : none;
    border           : none;
    border-radius    : 0.375rem;
    color            : var(--alert-ts-close);
    cursor           : pointer;
    transition       : color 0.15s ease, background-color 0.15s ease;
}

.alert-ts-close svg {
    display : block;
    width   : 1.25rem;
    height  : 1.25rem;
}

.alert-ts-close:hover {
    color            : var(--alert-ts-close-hover);
    background-color : color-mix(in srgb, var(--alert-ts-border) 12%, transparent);
}

.alert-ts-close:focus-visible {
    outline        : 2px solid var(--alert-ts-border);
    outline-offset : 2px;
    color          : var(--alert-ts-close-hover);
}


/* Countdown progress bar */
.alert-ts-countdown {
    position         : absolute;
    bottom           : 0;
    left             : 0;
    width            : 100%;
    height           : 3px;
    background-color : var(--alert-ts-border);
    opacity          : 0.45;
    transform        : scaleX(1);
    transform-origin : left center;
    transition-property    : transform;
    transition-timing-function: linear;
    /* transitionDuration is set dynamically by JS */
}


/* Toast stack (programmatic / create()) */
.alert-toast-stack {
    position   : fixed;
    top        : 1.25rem;
    right      : 1.25rem;
    z-index    : 1090;
    display    : flex;
    flex-direction : column;
    gap        : 0.625rem;
    width      : clamp(280px, 90vw, 400px);
    pointer-events: none;
}

.alert-toast-stack > .alert-ts {
    pointer-events : auto;
    box-shadow     : 0 4px 6px -1px rgba(0,0,0,.08),
                     0 2px 4px -2px rgba(0,0,0,.06);
}

/* Slide-in entrance for toasts */
.alert-ts-toast {
    animation: alertTsSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) both;
}

@keyframes alertTsSlideIn {
    from {
        opacity   : 0;
        transform : translateX(2rem);
    }
    to {
        opacity   : 1;
        transform : translateX(0);
    }
}

/* Dark-mode palette */
html.dark .alert-ts-info {
    --alert-ts-bg           : #172554;
    --alert-ts-border       : #3b82f6;
    --alert-ts-icon         : #60a5fa;
    --alert-ts-title        : #bfdbfe;
    --alert-ts-text         : #93c5fd;
    --alert-ts-action       : #93c5fd;
    --alert-ts-action-hover : #bfdbfe;
    --alert-ts-close        : #3b82f6;
    --alert-ts-close-hover  : #bfdbfe;
}

html.dark .alert-ts-success {
    --alert-ts-bg           : #052e16;
    --alert-ts-border       : #22c55e;
    --alert-ts-icon         : #4ade80;
    --alert-ts-title        : #bbf7d0;
    --alert-ts-text         : #86efac;
    --alert-ts-action       : #86efac;
    --alert-ts-action-hover : #bbf7d0;
    --alert-ts-close        : #22c55e;
    --alert-ts-close-hover  : #bbf7d0;
}

html.dark .alert-ts-warning {
    --alert-ts-bg           : #27170a;
    --alert-ts-border       : #f59e0b;
    --alert-ts-icon         : #fbbf24;
    --alert-ts-title        : #fde68a;
    --alert-ts-text         : #fcd34d;
    --alert-ts-action       : #fcd34d;
    --alert-ts-action-hover : #fde68a;
    --alert-ts-close        : #f59e0b;
    --alert-ts-close-hover  : #fde68a;
}

html.dark .alert-ts-danger {
    --alert-ts-bg           : #2d0a0a;
    --alert-ts-border       : #ef4444;
    --alert-ts-icon         : #f87171;
    --alert-ts-title        : #fecaca;
    --alert-ts-text         : #fca5a5;
    --alert-ts-action       : #fca5a5;
    --alert-ts-action-hover : #fecaca;
    --alert-ts-close        : #ef4444;
    --alert-ts-close-hover  : #fecaca;
}

html.dark .alert-ts-neutral {
    --alert-ts-bg           : #111827;
    --alert-ts-border       : #6b7280;
    --alert-ts-icon         : #9ca3af;
    --alert-ts-title        : #f9fafb;
    --alert-ts-text         : #d1d5db;
    --alert-ts-action       : #d1d5db;
    --alert-ts-action-hover : #f9fafb;
    --alert-ts-close        : #6b7280;
    --alert-ts-close-hover  : #f9fafb;
}

.alert.alert-ts {
    box-shadow: inset 0 0 0 1px rgba(255,255,255,.06);
}

/* Reduced-motion overrides */
@media (prefers-reduced-motion: reduce) {
    .alert-ts-toast {
        animation: none;
    }

    .alert-ts-countdown {
        transition: none;
    }
}`;

    // Inject the stylesheet only when the plugin is actually used (called
    // from build()), so loading the script never adds CSS to unused pages.
    function injectStyles() {
        if (document.getElementById(STYLE_ID)) return;
        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = CSS_TEXT;
        (document.head || document.documentElement).appendChild(style);
    }

    const ICONS = {
        info: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
	<path fill="currentColor" fill-rule="evenodd" d="M22 12c0 5.523-4.477 10-10 10S2 17.523 2 12S6.477 2 12 2s10 4.477 10 10m-10 5.75a.75.75 0 0 0 .75-.75v-6a.75.75 0 0 0-1.5 0v6c0 .414.336.75.75.75M12 7a1 1 0 1 1 0 2a1 1 0 0 1 0-2" clip-rule="evenodd" />
</svg>`,
        success: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
	<path fill="currentColor" fill-rule="evenodd" d="M22 12c0 5.523-4.477 10-10 10S2 17.523 2 12S6.477 2 12 2s10 4.477 10 10m-5.97-3.03a.75.75 0 0 1 0 1.06l-5 5a.75.75 0 0 1-1.06 0l-2-2a.75.75 0 1 1 1.06-1.06l1.47 1.47l2.235-2.235L14.97 8.97a.75.75 0 0 1 1.06 0" clip-rule="evenodd" />
</svg>`,
        warning: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
	<path fill="currentColor" fill-rule="evenodd" d="M5.312 10.762C8.23 5.587 9.689 3 12 3s3.77 2.587 6.688 7.762l.364.644c2.425 4.3 3.638 6.45 2.542 8.022S17.786 21 12.364 21h-.728c-5.422 0-8.134 0-9.23-1.572s.117-3.722 2.542-8.022zM12 7.25a.75.75 0 0 1 .75.75v5a.75.75 0 0 1-1.5 0V8a.75.75 0 0 1 .75-.75M12 17a1 1 0 1 0 0-2a1 1 0 0 0 0 2" clip-rule="evenodd" />
</svg>`,
        danger: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
	<path fill="currentColor" fill-rule="evenodd" d="M22 12c0 5.523-4.477 10-10 10S2 17.523 2 12S6.477 2 12 2s10 4.477 10 10M8.97 8.97a.75.75 0 0 1 1.06 0L12 10.94l1.97-1.97a.75.75 0 0 1 1.06 1.06L13.06 12l1.97 1.97a.75.75 0 0 1-1.06 1.06L12 13.06l-1.97 1.97a.75.75 0 0 1-1.06-1.06L10.94 12l-1.97-1.97a.75.75 0 0 1 0-1.06" clip-rule="evenodd" />
</svg>`,
        neutral: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
	<path fill="currentColor" fill-rule="evenodd" d="M9.25 18.709c0-.42.336-.76.75-.76h4c.414 0 .75.34.75.76s-.336.76-.75.76h-4a.755.755 0 0 1-.75-.76m.667 2.532c0-.42.335-.76.75-.76h2.666c.415 0 .75.34.75.76a.754.754 0 0 1-.75.759h-2.666a.755.755 0 0 1-.75-.76" clip-rule="evenodd" />
	<path fill="currentColor" d="m7.41 13.828l1.105 1.053c.31.295.485.707.485 1.137c0 .647.518 1.172 1.157 1.172h3.686c.639 0 1.157-.525 1.157-1.172c0-.43.176-.842.485-1.137l1.104-1.053c1.542-1.48 2.402-3.425 2.41-5.446L19 8.297C19 4.842 15.866 2 12 2S5 4.842 5 8.297v.085c.009 2.021.87 3.966 2.41 5.446" />
</svg>`
    };

    //Bootstrap class ? plugin type 
    const BS_TYPE_MAP = {
        'alert-default'    : 'neutral',
        'alert-primary'    : 'primary',
        'alert-secondary'  : 'secondary',
        'alert-tertiary'   : 'tertiary',
        'alert-quaternary' : 'quaternary',
        'alert-info'       : 'info',
        'alert-success'    : 'success',
        'alert-warning'    : 'warning',
        'alert-danger'     : 'danger',
        'alert-secondary'  : 'secondary',
        'alert-light'      : 'light',
        'alert-dark'       : 'dark'
    };

    // Close-button SVG
    const CLOSE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                         <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"/>
                       </svg>`;

    class PluginAlert {

        constructor($el, opts) {
            return this.initialize($el, opts);
        }

        initialize($el, opts) {
            if ($el.data(instanceName)) {
                return this;
            }

            this.$el          = $el;
            this.$countdown   = null;
            this._timer       = null;
            this._startTime   = null;
            this._remaining   = null;
            this._initialHTML = $el.html();   // saved before build mutates the DOM

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
            const pluginOptions = themestrap.fn.getOptions(this.$el.data('plugin-options'));
            this.options = $.extend(true, {}, PluginAlert.defaults, pluginOptions, opts, {
                wrapper: this.$el
            });
            return this;
        }

        build() {
            // Inject component CSS lazily - only when an instance is built.
            injectStyles();
            const self = this;
            const o    = self.options;

            // Resolve type from Bootstrap classes when not explicitly provided
            if (!o.type) {
                o.type = self._detectType();
            }

            // Apply skin classes
            self.$el
                .addClass(`alert-ts alert-ts-${o.type}`)
                .attr('role', 'alert');

            // Restructure markup
            self._buildStructure();

            // Countdown progress bar
            if (o.showCountdown && o.autoDismiss) {
                self.$el.css('position', 'relative');

                self.$countdown = $('<div>', { class: 'alert-ts-countdown' })
                    .appendTo(self.$el);

                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        if (self.$countdown) {
                            self.$countdown.css({
                                transitionDuration : `${o.delay}ms`,
                                transform          : 'scaleX(0)'
                            });
                        }
                    });
                });
            }

            // Auto-dismiss timer
            if (o.autoDismiss) {
                self._remaining = o.delay;
                self._startTimer();
            }

            return this;
        }

        _detectType() {
            let type = 'info';
            $.each(BS_TYPE_MAP, (cls, mapped) => {
                if (this.$el.hasClass(cls)) {
                    type = mapped;
                    return false; // break $.each
                }
            });
            return type;
        }

        /**
         * Rearranges the alert's inner HTML
         * Works for HTML-authored alerts and create()-generated ones.
         */
        _buildStructure() {
            const self = this;
            const o    = self.options;

            // Detach any existing Bootstrap close button
            const $bsClose = self.$el.find('.btn-close').detach();

            // Capture remaining content as the message (only when no explicit message option)
            const messageHTML = (o.message != null)
                ? o.message
                : self.$el.html().trim();

            self.$el.empty();

            // Icon 
            if (o.showIcon) {
                $('<div>', { class: 'alert-ts-icon', 'aria-hidden': 'true' })
                    .html(ICONS[o.type] || ICONS.info)
                    .appendTo(self.$el);
            }

            // Body
            const $body = $('<div>', { class: 'alert-ts-body' }).appendTo(self.$el);

            if (o.title) {
                $('<p>', { class: 'alert-ts-title' }).text(o.title).appendTo($body);
            }

            if (messageHTML) {
                $('<div>', { class: 'alert-ts-text' }).html(messageHTML).appendTo($body);
            }

            // Action links / buttons
            if (o.actions && o.actions.length) {
                const $actions = $('<div>', { class: 'alert-ts-actions' });
                o.actions.forEach(action => {
                    $('<button>', {
                        type         : 'button',
                        class        : `alert-ts-action alert-ts-action-${action.variant || 'primary'} ${action.class || ''}`.trim(),
                        text         : action.label,
                        'data-action': action.key || ''
                    }).appendTo($actions);
                });
                $actions.appendTo($body);
            }

            // Dismiss button
            if (o.dismissible) {
                $('<button>', {
                    type        : 'button',
                    class       : 'alert-ts-close',
                    'aria-label': 'Dismiss alert'
                }).html(CLOSE_SVG).appendTo(self.$el);
            } else if ($bsClose.length) {
                // Preserve original Bootstrap close button when present
                $bsClose.addClass('alert-ts-close').appendTo(self.$el);
            }
        }

        events() {
            const self = this;
            const o    = self.options;

            // Dismiss on close-button click
            self.$el.on('click.pluginalert', '.alert-ts-close, .btn-close', e => {
                e.preventDefault();
                e.stopPropagation();
                self.dismiss();
            });

            // Action button clicks — fire a namespaced jQuery event and optional callback
            self.$el.on('click.pluginalert', '.alert-ts-action', function() {
                const key = $(this).data('action');
                self.$el.trigger('action.alert', [key, self]);
                if ($.isFunction(o.onAction)) {
                    o.onAction.call(self, key);
                }
            });

            // Hover-pause
            if (o.pauseOnHover && o.autoDismiss) {
                self.$el
                    .on('mouseenter.pluginalert', () => self._pauseTimer())
                    .on('mouseleave.pluginalert', () => self._resumeTimer());
            }

            return this;
        }

        _startTimer() {
            this._startTime = Date.now();
            this._timer     = setTimeout(() => this.dismiss(), this._remaining);
            return this;
        }

        _pauseTimer() {
            if (!this._timer) return this;

            clearTimeout(this._timer);
            this._timer     = null;
            this._remaining -= Date.now() - this._startTime;

            if (this.$countdown) {
                const ratio = Math.max(0, this._remaining / this.options.delay);
                this.$countdown.css({
                    transitionDuration : '0ms',
                    transform          : `scaleX(${ratio})`
                });
            }
            return this;
        }

        _resumeTimer() {
            if (this._timer) return this;
            this._startTimer();

            if (this.$countdown) {
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        if (this.$countdown) {
                            this.$countdown.css({
                                transitionDuration : `${this._remaining}ms`,
                                transform          : 'scaleX(0)'
                            });
                        }
                    });
                });
            }
            return this;
        }

        /**
         * Animate the alert out, then remove or hide it.
         * Fires close.bs.alert and closed.bs.alert to preserve Bootstrap compatibility.
         */
        dismiss() {
            const self = this;
            const o    = self.options;

            clearTimeout(self._timer);
            self._timer = null;

            self.$el.trigger('close.bs.alert');

            if (o.animation === 'slide') {
                self.$el.css({
                    overflow   : 'hidden',
                    maxHeight  : `${self.$el.outerHeight(true)}px`,
                    transition : `max-height ${o.animationDuration}ms ease,
                                  opacity     ${o.animationDuration}ms ease,
                                  margin      ${o.animationDuration}ms ease,
                                  padding     ${o.animationDuration}ms ease`
                });

                setTimeout(() => {
                    self.$el.css({
                        maxHeight     : '0px',
                        opacity       : 0,
                        marginTop     : 0,
                        marginBottom  : 0,
                        paddingTop    : 0,
                        paddingBottom : 0
                    });
                    setTimeout(() => self._afterDismiss(), o.animationDuration);
                }, 20);

            } else {
                self.$el.css({
                    transition : `opacity ${o.animationDuration}ms ease`,
                    opacity    : 0
                });
                setTimeout(() => self._afterDismiss(), o.animationDuration);
            }

            return this;
        }

        _afterDismiss() {
            const self = this;
            self.$el.trigger('closed.bs.alert');

            if ($.isFunction(self.options.onDismiss)) {
                self.options.onDismiss.call(self);
            }

            if (self.options.remove) {
                self.$el.remove();
            } else {
                self.$el.css('display', 'none');
            }
        }

        destroy() {
            const self = this;

            clearTimeout(self._timer);
            self._timer = null;

            self.$el.off('.pluginalert');
            self.$el.html(self._initialHTML);
            self.$el.removeClass((_, cls) =>
                cls.split(' ').filter(c => c.startsWith('alert-ts')).join(' ')
            );
            self.$el.css({
                position      : '',
                overflow      : '',
                maxHeight     : '',
                opacity       : '',
                transition    : '',
                marginTop     : '',
                marginBottom  : '',
                paddingTop    : '',
                paddingBottom : ''
            });

            self.$countdown = null;
            self.$el.removeData(instanceName);
            return this;
        }
    }

    PluginAlert.defaults = {
        // Type: 'info' | 'success' | 'warning' | 'danger' | 'neutral'
        // Auto-detected from Bootstrap classes when null.
        type              : null,

        // Layout / content
        showIcon          : false,   // inject icon matching the type
        dismissible       : false,   // render dismiss button
        title             : null,    // bold heading above the message
        message           : null,    // message HTML (used by create(); HTML alerts auto-detect)
        actions           : [],      // [{label, key, variant, class}]

        // Behaviour
        autoDismiss       : false,
        delay             : 5000,    // ms before auto-dismiss
        pauseOnHover      : true,

        // Animation
        animation         : 'fade',  // 'slide' | 'fade'
        animationDuration : 400,
        showCountdown     : true,    // shrinking bar along the bottom edge

        // Lifecycle callbacks
        onDismiss         : null,    // fn() — called after the alert is removed
        onAction          : null,    // fn(key) — called when an action button is clicked

        remove            : true     // true: remove from DOM; false: display:none
    };

    /**
     * PluginAlert.create(containerSelector, opts)
     *
     * Programmatically create and inject a new alert. If no container is given,
     * alerts stack inside a shared `.alert-toast-stack` (auto-created on <body>).
     *
     * @param {string|jQuery} container  Target selector / jQuery object (optional).
     * @param {object}        opts       Any PluginAlert options. `message` is expected.
     * @returns {PluginAlert}            The newly-created plugin instance.
     *
     * Examples:
     *
     *   // Toast with a title and two action buttons
     *   themestrap.PluginAlert.create({
     *       type    : 'warning',
     *       title   : 'Unsaved changes',
     *       message : 'You have unsaved changes. Do you want to save them?',
     *       delay   : 8000,
     *       actions : [
     *           { label: 'Save',    key: 'save',    variant: 'primary' },
     *           { label: 'Discard', key: 'discard', variant: 'secondary' }
     *       ],
     *       onAction(key) {
     *           if (key === 'save') saveChanges();
     *           this.dismiss();
     *       }
     *   });
     *
     *   // Inject into a specific container
     *   themestrap.PluginAlert.create('#page-notifications', {
     *       type    : 'success',
     *       message : 'Profile updated successfully.'
     *   });
     */
    PluginAlert.create = function(container, opts) {
        // Allow omitting container argument
        if (container && typeof container === 'object' && !container.jquery) {
            opts      = container;
            container = null;
        }

        const o = $.extend(true, {}, PluginAlert.defaults, opts);

        // Resolve / create container
        let $container = container ? $(container) : null;
        if (!$container || !$container.length) {
            $container = $('.alert-toast-stack');
            if (!$container.length) {
                $container = $('<div>', { class: 'alert-toast-stack' }).appendTo('body');
            }
        }

        // Build a minimal Bootstrap-compatible alert element
        const $alert = $('<div>', {
            class : `alert alert-ts alert-ts-${o.type || 'info'} alert-ts-toast`,
            role  : 'alert'
        }).appendTo($container);

        return new PluginAlert($alert, o);
    };

    $.extend(themestrap, { PluginAlert });

    $.fn.themestrapPluginAlert = function(opts) {
        return this.each(function() {
            const $this    = $(this);
            const instance = $this.data(instanceName);

            if (typeof opts === 'string') {
                if (instance && $.isFunction(instance[opts])) {
                    instance[opts]();
                } else if (opts !== 'dismiss' && opts !== 'destroy') {
                    console.warn(`[PluginAlert] Unknown command: "${opts}"`);
                }
                return;
            }

            if (!instance) {
                new PluginAlert($this, opts);
            }
        });
    };

})).apply(this, [window.themestrap, jQuery]);
