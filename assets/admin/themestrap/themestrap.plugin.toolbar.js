// Toolbar
(((themestrap = {}, $) => {
    const instanceName = '__pluginToolbar';

    const STYLE_ID = 'ts-toolbar-styles';

    const CSS_TEXT = `/* Themestrap — PluginToolbar */
.ts-toolbar {
    --ts-tb-bg:            #f4f6f8;
    --ts-tb-border:        rgba(0,0,0,.1);
    --ts-tb-shadow:        0 1px 3px rgba(0,0,0,.08), 0 1px 2px rgba(0,0,0,.05);
    --ts-tb-pad:           4px;
    --ts-tb-gap:           2px;
    --ts-tb-radius:        8px;

    --ts-tb-item-h:        34px;
    --ts-tb-item-px:       10px;
    --ts-tb-item-radius:   5px;
    --ts-tb-item-fg:       #374151;
    --ts-tb-item-hover-bg: rgba(0,0,0,.06);
    --ts-tb-item-hover-fg: #111827;
    --ts-tb-item-active-bg: rgba(0,0,0,.09);
    --ts-tb-item-font:     0.875rem;

    --ts-tb-on-bg:         #e8672a;
    --ts-tb-on-fg:         #fff;
    --ts-tb-on-hover-bg:   #d2541b;

    --ts-tb-focus-ring:    #e8672a;
    --ts-tb-focus-offset:  2px;

    --ts-tb-sep-color:     rgba(0,0,0,.12);
    --ts-tb-sep-size:      1px;
    --ts-tb-sep-margin:    4px;

    --ts-tb-group-bg:      rgba(0,0,0,.05);
    --ts-tb-group-radius:  6px;
    --ts-tb-group-gap:     1px;

    --ts-tb-disabled-opacity: .4;
}

/* Dark theme — forced via class or auto via html.dark */
.ts-toolbar--dark,
html.dark .ts-toolbar:not(.ts-toolbar--light) {
    --ts-tb-bg:            #0e2238;
    --ts-tb-border:        rgba(255,255,255,.08);
    --ts-tb-shadow:        0 2px 8px rgba(0,0,0,.45);
    --ts-tb-item-fg:       rgba(255,255,255,.72);
    --ts-tb-item-hover-bg: rgba(255,255,255,.08);
    --ts-tb-item-hover-fg: #fff;
    --ts-tb-item-active-bg: rgba(255,255,255,.12);
    --ts-tb-on-bg:         #2ab8c8;
    --ts-tb-on-fg:         #0a1929;
    --ts-tb-on-hover-bg:   #1e9aaa;
    --ts-tb-focus-ring:    #2ab8c8;
    --ts-tb-sep-color:     rgba(255,255,255,.1);
    --ts-tb-group-bg:      rgba(255,255,255,.06);
}

/* Root */
.ts-toolbar {
    display         : inline-flex;
    align-items     : center;
    flex-wrap       : nowrap;
    gap             : var(--ts-tb-gap);
    padding         : var(--ts-tb-pad);
    background      : var(--ts-tb-bg);
    border          : 1px solid var(--ts-tb-border);
    border-radius   : var(--ts-tb-radius);
    box-shadow      : var(--ts-tb-shadow);
    width           : max-content;
    max-width       : 100%;
}

.ts-toolbar--vertical {
    flex-direction  : column;
    align-items     : stretch;
    width           : max-content;
}

.ts-toolbar--full {
    width           : 100%;
    flex-wrap       : wrap;
}

/* Shared item base */
.ts-toolbar [data-toolbar-button],
.ts-toolbar [data-toolbar-link],
.ts-toolbar [data-toolbar-toggle-item] {
    display         : inline-flex;
    align-items     : center;
    justify-content : center;
    gap             : 6px;
    height          : var(--ts-tb-item-h);
    padding         : 0 var(--ts-tb-item-px);
    font-size       : var(--ts-tb-item-font);
    font-weight     : 500;
    line-height     : 1;
    white-space     : nowrap;
    border          : 0;
    border-radius   : var(--ts-tb-item-radius);
    background      : transparent;
    color           : var(--ts-tb-item-fg);
    cursor          : pointer;
    text-decoration : none;
    transition      : background-color .12s ease,
                      color            .12s ease,
                      opacity          .12s ease;
    user-select     : none;
    -webkit-user-select: none;
    outline         : none;
    flex-shrink     : 0;
}

/* Icon-only button — narrow */
.ts-toolbar [data-toolbar-button].ts-tb-icon,
.ts-toolbar [data-toolbar-toggle-item].ts-tb-icon {
    width   : var(--ts-tb-item-h);
    padding : 0;
}

/* Hover */
.ts-toolbar [data-toolbar-button]:hover:not([data-toolbar-disabled]),
.ts-toolbar [data-toolbar-link]:hover:not([data-toolbar-disabled]),
.ts-toolbar [data-toolbar-toggle-item]:hover:not([data-toolbar-disabled]) {
    background : var(--ts-tb-item-hover-bg);
    color      : var(--ts-tb-item-hover-fg);
}

/* Focus */
.ts-toolbar [data-toolbar-button]:focus-visible,
.ts-toolbar [data-toolbar-link]:focus-visible,
.ts-toolbar [data-toolbar-toggle-item]:focus-visible {
    outline        : 2px solid var(--ts-tb-focus-ring);
    outline-offset : var(--ts-tb-focus-offset);
}

/* Active click flash */
.ts-toolbar [data-toolbar-button]:active:not([data-toolbar-disabled]),
.ts-toolbar [data-toolbar-link]:active:not([data-toolbar-disabled]) {
    background : var(--ts-tb-item-active-bg);
}

/* Pressed / selected toggle item */
.ts-toolbar [data-toolbar-toggle-item].ts-toolbar__toggle-item--on,
.ts-toolbar [data-toolbar-toggle-item][aria-pressed="true"] {
    background : var(--ts-tb-on-bg);
    color      : var(--ts-tb-on-fg);
}

.ts-toolbar [data-toolbar-toggle-item].ts-toolbar__toggle-item--on:hover:not([data-toolbar-disabled]),
.ts-toolbar [data-toolbar-toggle-item][aria-pressed="true"]:hover:not([data-toolbar-disabled]) {
    background : var(--ts-tb-on-hover-bg);
    color      : var(--ts-tb-on-fg);
}

/* Disabled */
.ts-toolbar [data-toolbar-button][data-toolbar-disabled],
.ts-toolbar [data-toolbar-link][data-toolbar-disabled],
.ts-toolbar [data-toolbar-toggle-item][data-toolbar-disabled] {
    opacity        : var(--ts-tb-disabled-opacity);
    cursor         : not-allowed;
    pointer-events : none;
}

/* Toggle group container */
.ts-toolbar [data-toolbar-toggle-group] {
    display         : inline-flex;
    align-items     : center;
    gap             : var(--ts-tb-group-gap);
    background      : var(--ts-tb-group-bg);
    border-radius   : var(--ts-tb-group-radius);
    padding         : 2px;
    flex-shrink     : 0;
}

.ts-toolbar--vertical [data-toolbar-toggle-group] {
    flex-direction  : column;
    align-items     : stretch;
}

/* Tighten radii on interior items within a group */
.ts-toolbar [data-toolbar-toggle-group] [data-toolbar-toggle-item]:not(:first-child):not(:last-child) {
    border-radius : 3px;
}
.ts-toolbar [data-toolbar-toggle-group] [data-toolbar-toggle-item]:first-child:not(:last-child) {
    border-bottom-right-radius : 3px;
    border-top-right-radius    : 3px;
}
.ts-toolbar [data-toolbar-toggle-group] [data-toolbar-toggle-item]:last-child:not(:first-child) {
    border-top-left-radius     : 3px;
    border-bottom-left-radius  : 3px;
}

/* Separator */
.ts-toolbar [data-toolbar-separator] {
    flex-shrink     : 0;
    align-self      : stretch;
    width           : var(--ts-tb-sep-size);
    background      : var(--ts-tb-sep-color);
    border          : none;
    margin          : var(--ts-tb-sep-margin) var(--ts-tb-sep-margin);
}

.ts-toolbar--vertical [data-toolbar-separator] {
    align-self : auto;
    width      : auto;
    height     : var(--ts-tb-sep-size);
    margin     : var(--ts-tb-sep-margin) var(--ts-tb-sep-margin);
}

/* Link item */
.ts-toolbar [data-toolbar-link] {
    color : var(--ts-tb-item-fg);
}

/* SVG icons inside items inherit color and scale to text size */
.ts-toolbar [data-toolbar-button] svg,
.ts-toolbar [data-toolbar-link] svg,
.ts-toolbar [data-toolbar-toggle-item] svg {
    width        : 1em;
    height       : 1em;
    flex-shrink  : 0;
    pointer-events: none;
}

/* Size modifiers on root */
.ts-toolbar--sm {
    --ts-tb-item-h   : 28px;
    --ts-tb-item-px  : 8px;
    --ts-tb-item-font: 0.8125rem;
    --ts-tb-pad      : 3px;
}

.ts-toolbar--lg {
    --ts-tb-item-h   : 40px;
    --ts-tb-item-px  : 14px;
    --ts-tb-item-font: 0.9375rem;
    --ts-tb-pad      : 5px;
}

@media (prefers-reduced-motion: reduce) {
    .ts-toolbar [data-toolbar-button],
    .ts-toolbar [data-toolbar-link],
    .ts-toolbar [data-toolbar-toggle-item] {
        transition: none;
    }
}`;

    function injectStyles() {
        if (document.getElementById(STYLE_ID)) return;
        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = CSS_TEXT;
        (document.head || document.documentElement).appendChild(style);
    }

    function ejectStyles() {
        const el = document.getElementById(STYLE_ID);
        if (el) el.parentNode.removeChild(el);
    }

    let _seq = 0;
    const uid = prefix => `${prefix}-${++_seq}-${Math.random().toString(36).slice(2, 7)}`;

    class PluginToolbar {

        constructor($el, opts) {
            return this.initialize($el, opts);
        }

        initialize($el, opts) {
            if ($el.data(instanceName)) return this;

            this.$el          = $el;
            this._uid         = uid('ts-tb');
            this._initialHTML = $el.html();
            this._focusedIdx  = 0;

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
            this.options = $.extend(true, {}, PluginToolbar.defaults, pluginOptions, opts, {
                wrapper: this.$el
            });
            return this;
        }

        build() {
            injectStyles();
            PluginToolbar.instances++;
            const self = this;
            const $el  = self.$el;
            const o    = self.options;

            /* Root ARIA */
            $el.addClass('ts-toolbar');
            if (!$el.attr('role')) $el.attr('role', 'toolbar');
            if (!$el.attr('aria-label') && o.ariaLabel) $el.attr('aria-label', o.ariaLabel);
            $el.attr('aria-orientation', o.orientation);
            if (o.dir) $el.attr('dir', o.dir);

            if (o.orientation === 'vertical') $el.addClass('ts-toolbar--vertical');
            if (o.size === 'sm') $el.addClass('ts-toolbar--sm');
            if (o.size === 'lg') $el.addClass('ts-toolbar--lg');
            if (o.dark) $el.addClass('ts-toolbar--dark');
            if (o.full) $el.addClass('ts-toolbar--full');

            /* Separators */
            $el.find('[data-toolbar-separator]').each(function() {
                const $sep = $(this);
                $sep.attr('role', 'separator');
                $sep.attr('aria-orientation',
                    o.orientation === 'horizontal' ? 'vertical' : 'horizontal'
                );
            });

            /* Buttons */
            $el.find('[data-toolbar-button]').each(function() {
                const $btn = $(this);
                if ($btn.is('button') && !$btn.attr('type')) $btn.attr('type', 'button');
            });

            /* Toggle groups */
            $el.find('[data-toolbar-toggle-group]').each(function() {
                const $group = $(this);
                const type   = $group.attr('data-toolbar-type') || 'single';
                $group.data('ts-tb-type', type);

                const groupLabel = $group.attr('data-toolbar-group-label');
                if (groupLabel && !$group.attr('aria-label')) {
                    $group.attr('role', 'group').attr('aria-label', groupLabel);
                } else {
                    $group.attr('role', 'group');
                }

                $group.find('[data-toolbar-toggle-item]').each(function() {
                    const $item    = $(this);
                    const isPressed = $item.attr('data-toolbar-pressed') === 'true';
                    if ($item.is('button') && !$item.attr('type')) $item.attr('type', 'button');
                    $item.attr('aria-pressed', isPressed ? 'true' : 'false');
                    $item.toggleClass('ts-toolbar__toggle-item--on', isPressed);
                });
            });

            /* Disabled ARIA */
            $el.find('[data-toolbar-disabled]').attr('aria-disabled', 'true').attr('tabindex', '-1');

            /* Roving tabindex — all items get -1 except the first */
            self._applyRovingTabindex();

            return this;
        }

        _items() {
            /* All interactive toolbar items, excluding disabled and hidden */
            return this.$el.find([
                '[data-toolbar-button]:not([data-toolbar-disabled])',
                '[data-toolbar-link]:not([data-toolbar-disabled])',
                '[data-toolbar-toggle-item]:not([data-toolbar-disabled])'
            ].join(','));
        }

        _applyRovingTabindex() {
            const $items = this._items();
            $items.attr('tabindex', '-1');
            const idx = Math.min(this._focusedIdx, $items.length - 1);
            if ($items.eq(idx).length) {
                $items.eq(idx).attr('tabindex', '0');
            } else if ($items.length) {
                $items.first().attr('tabindex', '0');
                this._focusedIdx = 0;
            }
        }

        _moveFocus(delta) {
            const $items = this._items();
            if (!$items.length) return;

            const $focused = $items.filter(':focus');
            let idx        = $items.index($focused);
            if (idx < 0) idx = this._focusedIdx;

            const o = this.options;
            let next = idx + delta;

            if (o.loop) {
                next = ((next % $items.length) + $items.length) % $items.length;
            } else {
                next = Math.max(0, Math.min($items.length - 1, next));
            }

            $items.attr('tabindex', '-1');
            $items.eq(next).attr('tabindex', '0').trigger('focus');
            this._focusedIdx = next;
        }

        _focusAt(idx) {
            const $items = this._items();
            if (!$items.length) return;
            const target = Math.max(0, Math.min($items.length - 1, idx));
            $items.attr('tabindex', '-1');
            $items.eq(target).attr('tabindex', '0').trigger('focus');
            this._focusedIdx = target;
        }

        events() {
            const self = this;
            const $el  = self.$el;
            const o    = self.options;
            const ns   = `.toolbar.${self._uid}`;

            const isHoriz = () => self.options.orientation === 'horizontal';
            const isRtl   = () => self.options.dir === 'rtl';

            /* Keyboard navigation — roving tabindex + arrow keys */
            $el.on(`keydown${ns}`, function(e) {
                const key = e.key;

                const horiz = isHoriz();
                const rtl   = isRtl();

                /* Determine prev / next axis keys */
                const prevKey = horiz ? (rtl ? 'ArrowRight' : 'ArrowLeft')  : 'ArrowUp';
                const nextKey = horiz ? (rtl ? 'ArrowLeft'  : 'ArrowRight') : 'ArrowDown';

                if (key === prevKey) {
                    e.preventDefault();
                    self._moveFocus(-1);
                } else if (key === nextKey) {
                    e.preventDefault();
                    self._moveFocus(1);
                } else if (key === 'Home') {
                    e.preventDefault();
                    self._focusAt(0);
                } else if (key === 'End') {
                    e.preventDefault();
                    self._focusAt(self._items().length - 1);
                }
            });

            /* Maintain roving tabindex on focusin */
            $el.on(`focusin${ns}`, function(e) {
                const $items  = self._items();
                const $target = $(e.target);
                const idx     = $items.index($target);
                if (idx >= 0) {
                    $items.attr('tabindex', '-1');
                    $target.attr('tabindex', '0');
                    self._focusedIdx = idx;
                }
            });

            /* Toggle item clicks */
            $el.on(`click${ns}`, '[data-toolbar-toggle-item]', function(e) {
                const $item  = $(this);
                if ($item.is('[data-toolbar-disabled]')) return;

                const $group = $item.closest('[data-toolbar-toggle-group]');
                const type   = $group.data('ts-tb-type') || 'single';
                const value  = $item.attr('data-toolbar-value') || null;

                if (type === 'single') {
                    const wasOn = $item.attr('aria-pressed') === 'true';
                    /* Deselect all siblings first */
                    $group.find('[data-toolbar-toggle-item]')
                          .attr('aria-pressed', 'false')
                          .removeClass('ts-toolbar__toggle-item--on');
                    /* Select this one unless it was already on (allow deselect when o.allowDeselect) */
                    if (!wasOn || o.allowDeselect) {
                        const newState = !wasOn;
                        $item.attr('aria-pressed', newState ? 'true' : 'false')
                             .toggleClass('ts-toolbar__toggle-item--on', newState);
                    } else {
                        $item.attr('aria-pressed', 'true')
                             .addClass('ts-toolbar__toggle-item--on');
                    }
                } else {
                    /* Multiple — toggle independently */
                    const wasOn   = $item.attr('aria-pressed') === 'true';
                    const newState = !wasOn;
                    $item.attr('aria-pressed', newState ? 'true' : 'false')
                         .toggleClass('ts-toolbar__toggle-item--on', newState);
                }

                const pressed = $item.attr('aria-pressed') === 'true';

                /* Fire native CustomEvent (no jQuery re-entry loop) */
                $el[0].dispatchEvent(new CustomEvent('toolbar:toggle', {
                    bubbles : true,
                    detail  : { value, pressed, item: $item[0], group: $group[0], instance: self }
                }));

                /* jQuery event for backward compatibility */
                $el.trigger('toolbar:toggle', [value, pressed, $item, $group, self]);

                if ($.isFunction(o.onToggle)) {
                    o.onToggle.call(self, value, pressed, $group[0]);
                }
            });

            /* Button clicks */
            $el.on(`click${ns}`, '[data-toolbar-button]', function() {
                const $btn = $(this);
                if ($btn.is('[data-toolbar-disabled]')) return;
                const value = $btn.attr('data-toolbar-value') || null;

                $el[0].dispatchEvent(new CustomEvent('toolbar:button', {
                    bubbles : true,
                    detail  : { value, button: $btn[0], instance: self }
                }));

                $el.trigger('toolbar:button', [value, $btn, self]);

                if ($.isFunction(o.onButton)) {
                    o.onButton.call(self, value, $btn[0]);
                }
            });

            /* Link clicks */
            $el.on(`click${ns}`, '[data-toolbar-link]', function() {
                const $link = $(this);
                if ($link.is('[data-toolbar-disabled]')) return;
                const value = $link.attr('data-toolbar-value') || $link.attr('href') || null;

                $el[0].dispatchEvent(new CustomEvent('toolbar:link', {
                    bubbles : true,
                    detail  : { value, link: $link[0], instance: self }
                }));

                $el.trigger('toolbar:link', [value, $link, self]);

                if ($.isFunction(o.onLink)) {
                    o.onLink.call(self, value, $link[0]);
                }
            });

            return this;
        }

        /* ── Public API ─────────────────────────────────── */

        /**
         * Get the current selected value(s) for a toggle group.
         * @param {string|Element|jQuery} [groupOrSelector] - target group (defaults to first)
         * @returns {string|string[]|null}
         */
        getValues(groupOrSelector) {
            const $group = groupOrSelector
                ? $(groupOrSelector).is('[data-toolbar-toggle-group]')
                    ? $(groupOrSelector)
                    : $(groupOrSelector).closest('[data-toolbar-toggle-group]')
                : this.$el.find('[data-toolbar-toggle-group]').first();

            const type  = $group.data('ts-tb-type') || 'single';
            const $on   = $group.find('[data-toolbar-toggle-item][aria-pressed="true"]');
            const vals  = $on.map(function() {
                return $(this).attr('data-toolbar-value') || null;
            }).get().filter(Boolean);

            return type === 'single' ? (vals[0] || null) : vals;
        }

        /**
         * Programmatically set a value in a toggle group.
         * @param {string} value
         * @param {string|Element|jQuery} [groupOrSelector]
         * @returns {this}
         */
        setValue(value, groupOrSelector) {
            const $group = groupOrSelector
                ? $(groupOrSelector).is('[data-toolbar-toggle-group]')
                    ? $(groupOrSelector)
                    : $(groupOrSelector).closest('[data-toolbar-toggle-group]')
                : this.$el.find('[data-toolbar-toggle-group]').first();

            const $item = $group.find(`[data-toolbar-toggle-item][data-toolbar-value="${value}"]`);
            if ($item.length) $item.trigger('click');
            return this;
        }

        /**
         * Set multiple values for a multiple-type toggle group.
         * @param {string[]} values
         * @param {string|Element|jQuery} [groupOrSelector]
         * @returns {this}
         */
        setValues(values, groupOrSelector) {
            const $group = groupOrSelector
                ? $(groupOrSelector).is('[data-toolbar-toggle-group]')
                    ? $(groupOrSelector)
                    : $(groupOrSelector).closest('[data-toolbar-toggle-group]')
                : this.$el.find('[data-toolbar-toggle-group]').first();

            if ($group.data('ts-tb-type') !== 'multiple') return this;

            /* Clear first */
            $group.find('[data-toolbar-toggle-item]')
                  .attr('aria-pressed', 'false')
                  .removeClass('ts-toolbar__toggle-item--on');

            /* Set each */
            values.forEach(val => {
                $group.find(`[data-toolbar-toggle-item][data-toolbar-value="${val}"]`)
                      .attr('aria-pressed', 'true')
                      .addClass('ts-toolbar__toggle-item--on');
            });
            return this;
        }

        /**
         * Clear all selections in a toggle group.
         * @param {string|Element|jQuery} [groupOrSelector]
         * @returns {this}
         */
        clearGroup(groupOrSelector) {
            const $group = groupOrSelector
                ? $(groupOrSelector).is('[data-toolbar-toggle-group]')
                    ? $(groupOrSelector)
                    : $(groupOrSelector).closest('[data-toolbar-toggle-group]')
                : this.$el.find('[data-toolbar-toggle-group]').first();

            $group.find('[data-toolbar-toggle-item]')
                  .attr('aria-pressed', 'false')
                  .removeClass('ts-toolbar__toggle-item--on');
            return this;
        }

        /**
         * Disable one or more items by value or selector.
         * @param {string} selectorOrValue
         * @returns {this}
         */
        disable(selectorOrValue) {
            const $target = this.$el.find(
                `[data-toolbar-value="${selectorOrValue}"], ${selectorOrValue}`
            );
            $target.attr('data-toolbar-disabled', 'true')
                   .attr('aria-disabled', 'true')
                   .attr('tabindex', '-1');
            this._applyRovingTabindex();
            return this;
        }

        /**
         * Enable one or more disabled items.
         * @param {string} selectorOrValue
         * @returns {this}
         */
        enable(selectorOrValue) {
            const $target = this.$el.find(
                `[data-toolbar-value="${selectorOrValue}"], ${selectorOrValue}`
            );
            $target.removeAttr('data-toolbar-disabled')
                   .removeAttr('aria-disabled');
            this._applyRovingTabindex();
            return this;
        }

        /**
         * Move focus to the toolbar (first or last-focused item).
         * @returns {this}
         */
        focus() {
            this._focusAt(this._focusedIdx);
            return this;
        }

        destroy() {
            const self = this;
            const $el  = self.$el;

            $el.off(`.toolbar.${self._uid}`);
            $el.html(self._initialHTML);
            $el.removeAttr('role aria-label aria-orientation dir')
               .removeClass('ts-toolbar ts-toolbar--vertical ts-toolbar--dark ts-toolbar--sm ts-toolbar--lg ts-toolbar--full');
            $el.removeData(instanceName);

            PluginToolbar.instances--;
            if (PluginToolbar.instances <= 0) {
                PluginToolbar.instances = 0;
                ejectStyles();
            }

            return this;
        }
    }

    PluginToolbar.instances = 0;

    PluginToolbar.defaults = {
        orientation   : 'horizontal',   // 'horizontal' | 'vertical'
        loop          : true,           // wrap arrow-key navigation at edges
        dir           : 'ltr',          // 'ltr' | 'rtl'
        ariaLabel     : 'Toolbar',      // aria-label on root
        size          : null,           // null | 'sm' | 'lg'
        dark          : false,          // force dark theme
        full          : false,          // stretch to 100% width
        allowDeselect : false,          // single-type: allow deselecting the active item
        onToggle      : null,           // fn(value, pressed, groupEl)
        onButton      : null,           // fn(value, buttonEl)
        onLink        : null,           // fn(value, linkEl)
    };

    $.extend(themestrap, { PluginToolbar });

    $.fn.themestrapPluginToolbar = function(opts) {
        return this.each(function() {
            const $this    = $(this);
            const instance = $this.data(instanceName);

            if (typeof opts === 'string') {
                if (instance && $.isFunction(instance[opts])) {
                    const args = Array.prototype.slice.call(arguments, 1);
                    instance[opts].apply(instance, args);
                }
                return;
            }

            if (!instance) {
                new PluginToolbar($this, opts);
            }
        });
    };

})).apply(this, [window.themestrap, jQuery]);
