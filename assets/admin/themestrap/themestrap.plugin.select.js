// Select
(((themestrap = {}, $) => {

    const STYLE_ID   = 'ts-select-styles';
    const instanceName = '__pluginSelect';
    let _instanceCount = 0;
    let _uid = 0;

    const SVG_CHEVRON = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>`;
    const SVG_CHECK   = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`;

    const CSS = `
        .ts-select {
            --ts-select-h:                2.25rem;
            --ts-select-trigger-bg:       var(--bs-body-bg, #fff);
            --ts-select-trigger-border:   var(--bs-border-color, #dee2e6);
            --ts-select-trigger-radius:   0.375rem;
            --ts-select-trigger-color:    var(--bs-body-color, #212529);
            --ts-select-trigger-muted:    var(--bs-secondary-color, #6c757d);
            --ts-select-trigger-dim-bg:   var(--bs-secondary-bg, #e9ecef);
            --ts-select-focus-ring:       0 0 0 0.25rem rgba(13,110,253,.25);
            --ts-select-focus-border:     #86b7fe;
            --ts-select-content-bg:       var(--bs-body-bg, #fff);
            --ts-select-content-border:   var(--bs-border-color, #dee2e6);
            --ts-select-content-radius:   0.5rem;
            --ts-select-content-shadow:   0 4px 16px -2px rgba(0,0,0,.1), 0 2px 4px -2px rgba(0,0,0,.06);
            --ts-select-content-z:        1050;
            --ts-select-item-h:           2rem;
            --ts-select-item-radius:      0.25rem;
            --ts-select-item-color:       var(--bs-body-color, #212529);
            --ts-select-item-hover-bg:    var(--bs-tertiary-bg, #f8f9fa);
            --ts-select-separator-bg:     var(--bs-border-color, #dee2e6);
            position: relative;
            display: block;
        }

        @media (prefers-color-scheme: dark) {
            .ts-select {
                --ts-select-trigger-bg:      var(--bs-body-bg, #212529);
                --ts-select-trigger-border:  var(--bs-border-color, #495057);
                --ts-select-trigger-color:   var(--bs-body-color, #dee2e6);
                --ts-select-trigger-muted:   var(--bs-secondary-color, #adb5bd);
                --ts-select-trigger-dim-bg:  var(--bs-secondary-bg, #343a40);
                --ts-select-content-bg:      var(--bs-body-bg, #1a1d20);
                --ts-select-content-border:  var(--bs-border-color, #495057);
                --ts-select-content-shadow:  0 4px 16px -2px rgba(0,0,0,.4), 0 2px 4px -2px rgba(0,0,0,.3);
                --ts-select-item-hover-bg:   var(--bs-tertiary-bg, #2b2f33);
            }
        }

        html.dark .ts-select,
        [data-bs-theme="dark"] .ts-select {
            --ts-select-trigger-bg:      var(--bs-body-bg, #212529);
            --ts-select-trigger-border:  var(--bs-border-color, #495057);
            --ts-select-trigger-color:   var(--bs-body-color, #dee2e6);
            --ts-select-trigger-muted:   var(--bs-secondary-color, #adb5bd);
            --ts-select-trigger-dim-bg:  var(--bs-secondary-bg, #343a40);
            --ts-select-content-bg:      var(--bs-body-bg, #1a1d20);
            --ts-select-content-border:  var(--bs-border-color, #495057);
            --ts-select-content-shadow:  0 4px 16px -2px rgba(0,0,0,.4), 0 2px 4px -2px rgba(0,0,0,.3);
            --ts-select-item-hover-bg:   var(--bs-tertiary-bg, #2b2f33);
        }

        [data-bs-theme="light"] .ts-select {
            --ts-select-trigger-bg:      var(--bs-body-bg, #fff);
            --ts-select-trigger-border:  var(--bs-border-color, #dee2e6);
            --ts-select-trigger-color:   var(--bs-body-color, #212529);
            --ts-select-trigger-muted:   var(--bs-secondary-color, #6c757d);
            --ts-select-trigger-dim-bg:  var(--bs-secondary-bg, #e9ecef);
            --ts-select-content-bg:      var(--bs-body-bg, #fff);
            --ts-select-content-border:  var(--bs-border-color, #dee2e6);
            --ts-select-content-shadow:  0 4px 16px -2px rgba(0,0,0,.1), 0 2px 4px -2px rgba(0,0,0,.06);
            --ts-select-item-hover-bg:   var(--bs-tertiary-bg, #f8f9fa);
        }

        /* hide the native select — stays in DOM for form submission */
        .ts-select select { display: none !important; }

        /* trigger */
        .ts-select-trigger {
            display: inline-flex;
            align-items: center;
            justify-content: space-between;
            gap: 0.5rem;
            width: 100%;
            height: var(--ts-select-h);
            padding: 0 0.75rem;
            background: var(--ts-select-trigger-bg);
            border: 1px solid var(--ts-select-trigger-border);
            border-radius: var(--ts-select-trigger-radius);
            color: var(--ts-select-trigger-color);
            font-family: inherit;
            font-size: 0.875rem;
            line-height: 1;
            cursor: default;
            text-align: left;
            white-space: nowrap;
            user-select: none;
            transition: border-color .15s ease, box-shadow .15s ease;
            outline: none;
        }
        .ts-select-trigger:focus-visible {
            border-color: var(--ts-select-focus-border);
            box-shadow: var(--ts-select-focus-ring);
        }
        .ts-select-trigger:disabled,
        .ts-select--disabled .ts-select-trigger {
            background: var(--ts-select-trigger-dim-bg);
            color: var(--ts-select-trigger-muted);
            cursor: not-allowed;
            opacity: 0.65;
        }

        .ts-select-value {
            flex: 1;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        .ts-select-value.ts-select-placeholder {
            color: var(--ts-select-trigger-muted);
        }

        .ts-select-icon {
            flex-shrink: 0;
            display: flex;
            align-items: center;
            color: var(--ts-select-trigger-muted);
            transition: transform .2s ease;
        }
        .ts-select--open .ts-select-icon {
            transform: rotate(180deg);
        }

        /* dropdown */
        .ts-select-content {
            position: absolute;
            top: calc(100% + 4px);
            left: 0;
            right: 0;
            z-index: var(--ts-select-content-z);
            background: var(--ts-select-content-bg);
            border: 1px solid var(--ts-select-content-border);
            border-radius: var(--ts-select-content-radius);
            box-shadow: var(--ts-select-content-shadow);
            padding: 0.25rem;
            overflow: hidden;
            opacity: 0;
            visibility: hidden;
            pointer-events: none;
            transform: translateY(-4px) scale(.98);
            transform-origin: top center;
            transition: opacity .15s ease, transform .15s ease, visibility 0ms .15s;
            outline: none;
        }
        .ts-select-content--open {
            opacity: 1;
            visibility: visible;
            pointer-events: auto;
            transform: none;
            transition-delay: 0ms;
        }

        /* flip upward when there is more space above */
        .ts-select--up .ts-select-content {
            top: auto;
            bottom: calc(100% + 4px);
            transform-origin: bottom center;
        }
        .ts-select--up .ts-select-content:not(.ts-select-content--open) {
            transform: translateY(4px) scale(.98);
        }

        /* scrollable option list */
        .ts-select-viewport {
            max-height: 280px;
            overflow-y: auto;
            scrollbar-width: thin;
            scrollbar-color: var(--ts-select-separator-bg) transparent;
        }
        .ts-select-viewport::-webkit-scrollbar        { width: 4px; }
        .ts-select-viewport::-webkit-scrollbar-track  { background: transparent; }
        .ts-select-viewport::-webkit-scrollbar-thumb  {
            background: var(--ts-select-separator-bg);
            border-radius: 2px;
        }

        /* option items */
        .ts-select-item {
            position: relative;
            display: flex;
            align-items: center;
            padding: 0 0.5rem 0 2rem;
            min-height: var(--ts-select-item-h);
            border-radius: var(--ts-select-item-radius);
            color: var(--ts-select-item-color);
            font-size: 0.875rem;
            cursor: default;
            user-select: none;
        }
        .ts-select-item:not(.ts-select-item--disabled):hover,
        .ts-select-item:not(.ts-select-item--disabled).ts-select-item--focus {
            background: var(--ts-select-item-hover-bg);
        }
        .ts-select-item--disabled {
            color: var(--ts-select-trigger-muted);
            opacity: 0.5;
            pointer-events: none;
        }

        /* checkmark indicator */
        .ts-select-item-indicator {
            position: absolute;
            left: 0.5rem;
            display: flex;
            align-items: center;
            width: 1rem;
            height: 1rem;
            opacity: 0;
        }
        .ts-select-item--selected .ts-select-item-indicator {
            opacity: 1;
        }

        .ts-select-item-text {
            flex: 1;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        /* option groups */
        .ts-select-group:not(:first-child) {
            border-top: 1px solid var(--ts-select-separator-bg);
            margin-top: 0.25rem;
            padding-top: 0.25rem;
        }
        .ts-select-group-label {
            padding: 0.375rem 0.5rem 0.25rem;
            font-size: 0.75rem;
            font-weight: 600;
            line-height: 1.5;
            color: var(--ts-select-trigger-muted);
            user-select: none;
            pointer-events: none;
        }

        /* explicit separator element */
        .ts-select-separator {
            height: 1px;
            background: var(--ts-select-separator-bg);
            margin: 0.25rem 0;
        }
    `;

    class PluginSelect {

        constructor($el, opts) {
            return this.initialize($el, opts);
        }

        initialize($el, opts) {
            if ($el.data(instanceName)) { return this; }
            this.$el             = $el;
            this.initialHTML     = $el.html();
            this.isOpen          = false;
            this._uid            = ++_uid;
            this._typeaheadTimer  = null;
            this._typeaheadBuffer = '';
            this.setData().setOptions(opts).build().events();
            return this;
        }

        setData() {
            this.$el.data(instanceName, this);
            return this;
        }

        setOptions(opts) {
            this.options = $.extend(true, {}, PluginSelect.defaults, opts, { wrapper: this.$el });
            return this;
        }

        build() {
            const self = this;
            const opts = self.options;

            if (!document.getElementById(STYLE_ID)) {
                $('<style>').attr('id', STYLE_ID).text(CSS).appendTo('head');
            }
            _instanceCount++;

            self.$native = self.$el.find('select');
            if (!self.$native.length) { return this; }

            if (self.$native.is(':disabled')) { opts.disabled = true; }

            self._items = self._parseSelect();

            /* read placeholder text from the first blank <option> */
            const $blank = self.$native.find('option').filter(function() {
                return $(this).val() === '';
            }).first();
            if ($blank.length) {
                opts.placeholder = $blank.text().trim() || opts.placeholder;
            }

            const id        = `ts-select-${self._uid}`;
            const listboxId = `${id}-listbox`;
            const rawVal    = self.$native.val() || '';
            const current   = self._findItem(rawVal);
            self.currentValue = current ? rawVal : '';
            self.currentText  = current ? current.text : opts.placeholder;

            self.$el.addClass('ts-select');
            if (opts.disabled) { self.$el.addClass('ts-select--disabled'); }

            /* trigger button */
            const $trigger = $('<button>', {
                type:            'button',
                class:           'ts-select-trigger',
                role:            'combobox',
                'aria-expanded': 'false',
                'aria-haspopup': 'listbox',
                'aria-controls': listboxId,
                id:              `${id}-trigger`
            });
            if (opts.disabled) {
                $trigger.prop('disabled', true).attr('aria-disabled', 'true');
            }

            self.$value = $('<span>', {
                class: 'ts-select-value' + (current ? '' : ' ts-select-placeholder')
            }).text(self.currentText);

            const $icon = $('<span class="ts-select-icon">').html(SVG_CHEVRON);
            $trigger.append(self.$value, $icon);

            /* dropdown */
            self.$viewport = $('<div class="ts-select-viewport">').html(self._buildItems());
            self.$content  = $('<div>', {
                class:             'ts-select-content',
                role:              'listbox',
                id:                listboxId,
                'aria-labelledby': `${id}-trigger`,
                tabindex:          '-1'
            }).append(self.$viewport);

            self.$trigger = $trigger;
            self.$el.append(self.$trigger, self.$content);
            return this;
        }

        /* parse native <select> into a plain items array */
        _parseSelect() {
            const items = [];
            this.$native.children().each(function() {
                const $c = $(this);
                if ($c.is('optgroup')) {
                    const group = { type: 'group', label: $c.attr('label') || '', children: [] };
                    $c.find('option').each(function() {
                        const $o = $(this);
                        group.children.push({ type: 'option', value: $o.val(), text: $o.text().trim(), disabled: $o.is(':disabled') });
                    });
                    if (group.children.length) { items.push(group); }
                } else if ($c.is('option') && $c.val() !== '') {
                    items.push({ type: 'option', value: $c.val(), text: $c.text().trim(), disabled: $c.is(':disabled') });
                }
            });
            return items;
        }

        /* find a non-disabled item by value */
        _findItem(value) {
            if (!value) { return null; }
            for (const item of this._items) {
                if (item.type === 'option' && item.value === value && !item.disabled) { return item; }
                if (item.type === 'group') {
                    for (const c of item.children) {
                        if (c.value === value && !c.disabled) { return c; }
                    }
                }
            }
            return null;
        }

        /* build inner HTML for the dropdown viewport */
        _buildItems() {
            const self = this;
            let html = '';
            let gi   = 0;
            self._items.forEach(item => {
                if (item.type === 'option') {
                    html += self._buildOption(item);
                } else if (item.type === 'group') {
                    const lid = `ts-select-${self._uid}-gl-${++gi}`;
                    html += `<div class="ts-select-group" role="group" aria-labelledby="${lid}">`;
                    html += `<div class="ts-select-group-label" id="${lid}">${self._esc(item.label)}</div>`;
                    item.children.forEach(c => { html += self._buildOption(c); });
                    html += '</div>';
                }
            });
            return html;
        }

        _buildOption(item) {
            const sel = item.value === this.currentValue;
            const cls = ['ts-select-item', sel ? 'ts-select-item--selected' : '', item.disabled ? 'ts-select-item--disabled' : ''].filter(Boolean).join(' ');
            return `<div class="${cls}" role="option" data-value="${this._esc(item.value)}" aria-selected="${sel}"${item.disabled ? ' aria-disabled="true"' : ''}>`
                + `<span class="ts-select-item-indicator">${SVG_CHECK}</span>`
                + `<span class="ts-select-item-text">${this._esc(item.text)}</span>`
                + '</div>';
        }

        _esc(str) {
            return String(str)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;');
        }

        events() {
            const self = this;

            /* open / close on trigger click */
            self.$trigger.on('click.select', function(e) {
                e.stopPropagation();
                if (self.$trigger.prop('disabled')) { return; }
                self.isOpen ? self.close() : self.open();
            });

            /* select on item click */
            self.$content.on('click.select', '.ts-select-item:not(.ts-select-item--disabled)', function(e) {
                e.stopPropagation();
                self.select($(this).data('value'));
                self.close();
            });

            /* keyboard on the trigger */
            self.$trigger.on('keydown.select', function(e) { self._onTriggerKey(e); });

            /* keyboard on the open dropdown */
            self.$content.on('keydown.select', function(e) { self._onContentKey(e); });

            /* close on outside click */
            $(document).on(`click.select.${self._uid}`, function(e) {
                if (self.isOpen && !self.$el.is(e.target) && !$.contains(self.$el[0], e.target)) {
                    self.close();
                }
            });

            return this;
        }

        _onTriggerKey(e) {
            const self = this;
            if (['ArrowDown', 'ArrowUp', 'Enter', ' '].indexOf(e.key) !== -1) {
                e.preventDefault();
                if (!self.isOpen) {
                    self.open();
                    const $sel = self.$content.find('[aria-selected="true"]');
                    if ($sel.length) { self._focusItem($sel); } else { self._moveFocus(0); }
                }
            } else if (e.key === 'Escape') {
                self.close();
            }
        }

        _onContentKey(e) {
            const self   = this;
            const $items = self.$content.find('.ts-select-item:not(.ts-select-item--disabled)');
            const idx    = $items.index(self.$content.find('.ts-select-item--focus'));

            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    self._moveFocus(Math.min(idx + 1, $items.length - 1), $items);
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    self._moveFocus(idx <= 0 ? 0 : idx - 1, $items);
                    break;
                case 'Home':
                    e.preventDefault();
                    self._moveFocus(0, $items);
                    break;
                case 'End':
                    e.preventDefault();
                    self._moveFocus($items.length - 1, $items);
                    break;
                case 'Enter':
                case ' ': {
                    e.preventDefault();
                    const $f = self.$content.find('.ts-select-item--focus');
                    if ($f.length) { self.select($f.data('value')); self.close(); }
                    break;
                }
                case 'Escape':
                case 'Tab':
                    e.preventDefault();
                    self.close();
                    self.$trigger[0].focus();
                    break;
                default:
                    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
                        self._typeahead(e.key, $items);
                    }
            }
        }

        _focusItem($item) {
            const self = this;
            self.$content.find('.ts-select-item--focus').removeClass('ts-select-item--focus');
            $item.addClass('ts-select-item--focus');
            /* scroll into view within the viewport */
            const el = $item[0];
            const vp = self.$viewport[0];
            if (el && vp) {
                const t = el.offsetTop;
                const b = t + el.offsetHeight;
                if (t < vp.scrollTop)                        { vp.scrollTop = t; }
                else if (b > vp.scrollTop + vp.clientHeight) { vp.scrollTop = b - vp.clientHeight; }
            }
        }

        _moveFocus(idx, $items) {
            const $all = $items || this.$content.find('.ts-select-item:not(.ts-select-item--disabled)');
            if ($all.length && idx >= 0) { this._focusItem($all.eq(idx)); }
        }

        /* type-ahead character search */
        _typeahead(char, $items) {
            const self = this;
            clearTimeout(self._typeaheadTimer);
            self._typeaheadBuffer += char.toLowerCase();
            const buf = self._typeaheadBuffer;
            const $m  = $items.filter(function() {
                return $(this).find('.ts-select-item-text').text().trim().toLowerCase().startsWith(buf);
            }).first();
            if ($m.length) { self._focusItem($m); }
            self._typeaheadTimer = setTimeout(() => { self._typeaheadBuffer = ''; }, 500);
        }

        /* detect whether the dropdown should open above or below */
        _position() {
            const r     = this.$trigger[0].getBoundingClientRect();
            const below = window.innerHeight - r.bottom;
            const above = r.top;
            if (below < 300 && above > below) {
                this.$el.addClass('ts-select--up');
            } else {
                this.$el.removeClass('ts-select--up');
            }
        }

        open() {
            const self = this;
            if (self.isOpen || self.$trigger.prop('disabled')) { return this; }
            self._position();
            self.isOpen = true;
            self.$el.addClass('ts-select--open');
            self.$content.addClass('ts-select-content--open');
            self.$trigger.attr('aria-expanded', 'true');
            // Long lists open at the selected item instead of at the top
            const $sel = self.$viewport.find('.ts-select-item--selected').first();
            if ($sel.length) {
                const v = self.$viewport[0];
                const delta = $sel[0].getBoundingClientRect().top - v.getBoundingClientRect().top;
                v.scrollTop = Math.max(0, v.scrollTop + delta - (v.clientHeight - $sel[0].offsetHeight) / 2);
            }
            self.$content[0].focus();
            self.$el[0].dispatchEvent(new CustomEvent('ts.select.open', {
                bubbles: true,
                detail:  { value: self.currentValue }
            }));
            return this;
        }

        close() {
            const self = this;
            if (!self.isOpen) { return this; }
            self.isOpen = false;
            self.$el.removeClass('ts-select--open');
            self.$content.removeClass('ts-select-content--open');
            self.$trigger.attr('aria-expanded', 'false');
            self.$content.find('.ts-select-item--focus').removeClass('ts-select-item--focus');
            self.$el[0].dispatchEvent(new CustomEvent('ts.select.close', {
                bubbles: true,
                detail:  { value: self.currentValue }
            }));
            return this;
        }

        select(value) {
            const self = this;
            const prev = self.currentValue;
            const item = self._findItem(value);
            if (!item) { return this; }
            self.currentValue = value;
            self.currentText  = item.text;
            self.$native.val(value);
            self.$value.text(item.text).removeClass('ts-select-placeholder');
            self.$content.find('[role="option"]').each(function() {
                const $o = $(this);
                const s  = $o.data('value') === value;
                $o.attr('aria-selected', s ? 'true' : 'false').toggleClass('ts-select-item--selected', s);
            });
            self.$el[0].dispatchEvent(new CustomEvent('ts.select.change', {
                bubbles: true,
                detail:  { value, text: item.text, previousValue: prev }
            }));
            // The wrapped <select> behaves like a native one: forms, validators and listeners see input and change
            if (value !== prev) {
                self.$native[0].dispatchEvent(new Event('input',  { bubbles: true }));
                self.$native[0].dispatchEvent(new Event('change', { bubbles: true }));
            }
            return this;
        }

        getValue() { return this.currentValue; }

        setValue(value) { return this.select(value); }

        reset() {
            const self = this;
            self.currentValue = '';
            self.currentText  = self.options.placeholder;
            self.$native.val('');
            self.$value.text(self.options.placeholder).addClass('ts-select-placeholder');
            self.$content.find('[role="option"]').attr('aria-selected', 'false').removeClass('ts-select-item--selected');
            return this;
        }

        enable() {
            this.options.disabled = false;
            this.$trigger.prop('disabled', false).removeAttr('aria-disabled');
            this.$el.removeClass('ts-select--disabled');
            return this;
        }

        disable() {
            this.options.disabled = true;
            this.$trigger.prop('disabled', true).attr('aria-disabled', 'true');
            this.$el.addClass('ts-select--disabled');
            return this;
        }

        destroy() {
            const self = this;
            clearTimeout(self._typeaheadTimer);
            $(document).off(`.select.${self._uid}`);
            self.$el.html(self.initialHTML);
            self.$el.removeClass('ts-select ts-select--open ts-select--disabled ts-select--up');
            self.$el.removeData(instanceName);
            _instanceCount--;
            if (_instanceCount <= 0) {
                const s = document.getElementById(STYLE_ID);
                if (s) { s.remove(); }
                _instanceCount = 0;
            }
            return this;
        }
    }

    PluginSelect.defaults = {
        placeholder: 'Select an option…',
        disabled:    false
    };

    $.extend(themestrap, { PluginSelect });

    $.fn.themestrapPluginSelect = function(opts) {
        const args = Array.prototype.slice.call(arguments, 1);
        return this.map(function() {
            const $this = $(this);
            const inst  = $this.data(instanceName);
            if (inst) {
                if (typeof opts === 'string' && typeof inst[opts] === 'function') {
                    return inst[opts].apply(inst, args);
                }
                return inst;
            }
            return new PluginSelect($this, typeof opts !== 'string' ? opts : undefined);
        });
    };

})).apply(this, [window.themestrap, jQuery]);
