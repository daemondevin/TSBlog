/**
 * Themestrap TimePicker
 *
 * A time field with a popover of scrollable hour, minute and AM/PM columns, built to sit beside
 * PluginCalendar. You can also type: "8:30pm", "830", "20.30" and "9" are all understood.
 * The original input stays in the page (hidden) and always holds the value as 24 hour "HH:mm",
 * whatever format is displayed, so forms and server code see one consistent format.
 *
 * Markup:
 *
 *   <input type="text" name="publish_time" value="08:30" data-plugin-timepicker
 *          data-plugin-options='{"format": "12", "minuteStep": 5}'>
 *
 * Public API (via stored instance):
 *   const tp = $('input[name=publish_time]').data('__pluginTimePicker');
 *   tp.getValue();                 // "08:30", or "" when empty
 *   tp.getTime();                  // { hour: 8, minute: 30 } or null
 *   tp.setValue('20:15', silent);  // "HH:mm", "8:15pm", or { hour, minute }. silent skips the events
 *   tp.setNow();                   // the current time
 *   tp.open(); tp.close(); tp.toggle();
 *   tp.enable(); tp.disable();
 *   tp.destroy();
 *
 * Events (native CustomEvent, bubbling, dispatched on the original input):
 *   ts.timepicker.change   detail: { instance, value, hour, minute, display, source }
 *                          source is 'popover', 'typing', 'keyboard', 'now' or 'api'
 *   ts.timepicker.open / ts.timepicker.close
 *   The input also fires ordinary 'input' and 'change' events.
 *
 * Keyboard (in the field):  Up / Down change the minutes (Shift: the hours), Alt + Down or the clock
 * button opens the popover, Enter applies the typed text, Escape closes.
 * Keyboard (in the popover): Up / Down change the focused column, Left / Right move between columns,
 * Home / End jump to the first or last value, Enter or Escape close.
 *
 * CSS custom properties (all optional):
 *   --ts-tp-h, --ts-tp-bg, --ts-tp-border, --ts-tp-border-focus, --ts-tp-radius, --ts-tp-text,
 *   --ts-tp-muted, --ts-tp-pop-bg, --ts-tp-hover, --ts-tp-accent, --ts-tp-accent-text,
 *   --ts-tp-focus-ring, --ts-tp-shadow
 *
 * Init.js wiring:
 *   if ($.isFunction($.fn['themestrapPluginTimePicker']) && $('[data-plugin-timepicker]').length) {
 *       themestrap.fn.intObsInit('[data-plugin-timepicker]:not(.manual)', 'themestrapPluginTimePicker');
 *   }
 */
// Time Picker
(((themestrap = {}, $) => {
    const instanceName = '__pluginTimePicker';
    const STYLE_ID     = 'ts-timepicker-styles';
    const EVENT        = 'ts.timepicker';

    let instanceCount = 0;
    let seq           = 0;

    const ICON_CLOCK = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>';

    const LIGHT = `
        --tp-h:            var(--ts-tp-h, 2.45rem);
        --tp-bg:           var(--ts-tp-bg, #ffffff);
        --tp-border:       var(--ts-tp-border, rgba(0,0,0,.18));
        --tp-border-focus: var(--ts-tp-border-focus, #00a89f);
        --tp-radius:       var(--ts-tp-radius, 7px);
        --tp-text:         var(--ts-tp-text, #1f2937);
        --tp-muted:        var(--ts-tp-muted, rgba(31,41,55,.55));
        --tp-pop-bg:       var(--ts-tp-pop-bg, #ffffff);
        --tp-hover:        var(--ts-tp-hover, rgba(0,0,0,.06));
        --tp-accent:       var(--ts-tp-accent, #00a89f);
        --tp-accent-text:  var(--ts-tp-accent-text, #04211f);
        --tp-ring:         var(--ts-tp-focus-ring, 0 0 0 3px rgba(0,168,159,.20));
        --tp-shadow:       var(--ts-tp-shadow, 0 12px 32px -6px rgba(0,0,0,.22), 0 4px 10px -4px rgba(0,0,0,.12));
    `;
    const DARK = `
        --tp-bg:           var(--ts-tp-bg, rgba(255,255,255,.03));
        --tp-border:       var(--ts-tp-border, rgba(255,255,255,.14));
        --tp-border-focus: var(--ts-tp-border-focus, #00c7be);
        --tp-text:         var(--ts-tp-text, #d5dfeb);
        --tp-muted:        var(--ts-tp-muted, rgba(213,223,235,.55));
        --tp-pop-bg:       var(--ts-tp-pop-bg, #0e2238);
        --tp-hover:        var(--ts-tp-hover, rgba(255,255,255,.08));
        --tp-accent:       var(--ts-tp-accent, #00c7be);
        --tp-ring:         var(--ts-tp-focus-ring, 0 0 0 3px rgba(0,199,190,.22));
        --tp-shadow:       var(--ts-tp-shadow, 0 12px 32px -6px rgba(0,0,0,.6), 0 4px 10px -4px rgba(0,0,0,.4));
    `;

    const CSS_TEXT = `
        .ts-tp { ${LIGHT} }
        @media (prefers-color-scheme: dark) { .ts-tp { ${DARK} } }
        html.dark .ts-tp,
        [data-bs-theme="dark"] .ts-tp { ${DARK} }
        [data-bs-theme="light"] .ts-tp { ${LIGHT} }

        .ts-tp { position: relative; display: inline-block; color: var(--tp-text); }
        .ts-tp--block { display: block; }
        .ts-tp-field {
            display: flex;
            align-items: center;
            gap: .45rem;
            height: var(--tp-h);
            padding: 0 .35rem 0 .7rem;
            background: var(--tp-bg);
            border: 1px solid var(--tp-border);
            border-radius: var(--tp-radius);
            box-sizing: border-box;
            transition: border-color .15s, box-shadow .15s;
        }
        .ts-tp-field:focus-within, .ts-tp.is-open .ts-tp-field { border-color: var(--tp-border-focus); box-shadow: var(--tp-ring); }
        .ts-tp--disabled { opacity: .55; }
        .ts-tp-icon { display: inline-flex; color: var(--tp-muted); }
        input.ts-tp-input {
            flex: 1 1 auto;
            min-width: 4.5rem;
            width: 5.5rem;
            height: 100%;
            margin: 0;
            padding: 0;
            border: 0;
            outline: 0;
            background: transparent;
            color: inherit;
            font: inherit;
            box-shadow: none;
        }
        input.ts-tp-input::placeholder { color: var(--tp-muted); }
        .ts-tp--block input.ts-tp-input { width: auto; }
        .ts-tp-toggle {
            display: inline-flex; align-items: center; justify-content: center;
            width: 1.9rem; height: 1.9rem; padding: 0; border: 0; border-radius: 5px;
            background: transparent; color: var(--tp-muted); cursor: pointer;
        }
        .ts-tp-toggle:hover { background: var(--tp-hover); color: var(--tp-text); }

        .ts-tp-pop {
            display: none;
            position: fixed;
            z-index: 1070;
            padding: 8px;
            background: var(--tp-pop-bg);
            border: 1px solid var(--tp-border);
            border-radius: 10px;
            box-shadow: var(--tp-shadow);
            box-sizing: border-box;
        }
        .ts-tp.is-open > .ts-tp-pop { display: block; }
        .ts-tp--inline > .ts-tp-pop { display: block; position: static; margin-top: 6px; box-shadow: none; }

        .ts-tp-cols { display: flex; gap: 6px; }
        .ts-tp-col {
            position: relative;
            flex: 1 1 0;
            min-width: 3.6rem;
            height: 11.25rem;
            overflow-y: auto;
            padding: 2px;
            border-radius: 8px;
            outline: none;
            scrollbar-width: thin;
            scrollbar-color: var(--tp-border) transparent;
        }
        .ts-tp-col:focus-visible { box-shadow: var(--tp-ring); }
        .ts-tp-item {
            display: flex; align-items: center; justify-content: center;
            height: 2rem; border-radius: 6px; cursor: pointer;
            font-variant-numeric: tabular-nums; user-select: none;
        }
        .ts-tp-item:hover { background: var(--tp-hover); }
        .ts-tp-item[aria-selected="true"] { background: var(--tp-accent); color: var(--tp-accent-text); font-weight: 700; }
        .ts-tp-foot { display: flex; justify-content: space-between; gap: .5rem; padding: 8px 4px 2px; }
        .ts-tp-link {
            padding: 2px 4px; border: 0; background: none; color: var(--tp-accent);
            font: inherit; font-size: .88em; font-weight: 600; cursor: pointer; border-radius: 4px;
        }
        .ts-tp-link:hover { text-decoration: underline; }
        @media (prefers-reduced-motion: reduce) { .ts-tp-field { transition: none; } }
    `;

    const pad = (n) => (n < 10 ? '0' : '') + n;

    // Understands "8:30pm", "830", "2030", "8.30 am", "9", "20:15"
    function parseTime(input) {
        let s = String(input == null ? '' : input).trim().toLowerCase().replace(/\s+/g, '');
        if (s === '') return null;
        let period = '';
        const pm = s.match(/(a\.?m?\.?|p\.?m?\.?)$/);
        if (pm) { period = pm[1][0]; s = s.slice(0, s.length - pm[1].length); }
        let h, m;
        let x;
        if ((x = s.match(/^(\d{1,2})[:.h](\d{1,2})$/))) { h = +x[1]; m = +x[2]; }
        else if ((x = s.match(/^(\d{1,2})$/)))          { h = +x[1]; m = 0; }
        else if ((x = s.match(/^(\d{3,4})$/)))          { h = +x[1].slice(0, -2); m = +x[1].slice(-2); }
        else return null;
        if (period) {
            if (h < 1 || h > 12) return null;
            if (period === 'a') h = h === 12 ? 0 : h;
            else h = h === 12 ? 12 : h + 12;
        }
        if (h < 0 || h > 23 || m < 0 || m > 59) return null;
        return { hour: h, minute: m };
    }

    class PluginTimePicker {
        constructor($el, opts) {
            return this.initialize($el, opts);
        }

        initialize($el, opts) {
            if ($el.data(instanceName)) {
                return this;
            }

            this.$el     = $el;
            this._uid    = ++seq;
            this._ns     = `.tstp${this._uid}`;
            this._failed = false;
            this._time   = null;
            this._open   = false;

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
            this.options = $.extend(true, {}, PluginTimePicker.defaults, opts, { wrapper: this.$el });
            let f = this.options.format;
            if (f !== '12' && f !== '24') {
                try { f = new Intl.DateTimeFormat(this.options.locale || undefined, { hour: 'numeric' }).resolvedOptions().hour12 ? '12' : '24'; }
                catch (e) { f = '24'; }
            }
            this.options.format = f;
            this.options.minuteStep = Math.max(1, Math.min(30, parseInt(this.options.minuteStep, 10) || 5));
            return this;
        }

        build() {
            const self = this;
            const o    = self.options;

            if (!self.$el.is('input')) {
                console.error('PluginTimePicker: the host element must be an <input>.');
                self._failed = true;
                self.$el.removeData(instanceName);
                return this;
            }

            instanceCount++;
            if (!document.getElementById(STYLE_ID)) {
                const style       = document.createElement('style');
                style.id          = STYLE_ID;
                style.textContent = CSS_TEXT;
                document.head.appendChild(style);
            }

            const el = self.$el[0];
            self._origType = el.getAttribute('type');
            self._origId   = el.id;
            const baseId   = self._origId || `ts-tp-${self._uid}`;
            const popId    = `${baseId}-popover`;

            self.$wrap = $('<div class="ts-tp"></div>');
            if (o.block) self.$wrap.addClass('ts-tp--block');
            if (o.inline) self.$wrap.addClass('ts-tp--inline');

            self.$input = $(`<input type="text" class="ts-tp-input" inputmode="text" autocomplete="off" spellcheck="false"
                                    role="combobox" aria-haspopup="dialog" aria-expanded="false" aria-controls="${popId}">`)
                .attr('placeholder', o.placeholder)
                .attr('aria-label', el.getAttribute('aria-label') || o.ariaLabel);
            // The original keeps its id (so $('#id') and .data() work as everywhere else in Themestrap).
            // Labels that point at it are wired to the visible field instead: click focuses it, and it is named by them.
            if (self._origId) {
                self.$input.attr('id', `${self._origId}-input`);
                self.$labels = $(`label[for="${self._origId}"]`);
                const ids = [];
                self.$labels.each(function (i) {
                    if (!this.id) this.id = `${self._origId}-label-${i}`;
                    ids.push(this.id);
                });
                if (ids.length) self.$input.attr('aria-labelledby', ids.join(' ')).removeAttr('aria-label');
                self.$labels.on(`click${self._ns}`, (e) => { e.preventDefault(); self.$input.trigger('focus'); });
            }
            self.$toggle = $(`<button type="button" class="ts-tp-toggle" tabindex="-1" aria-label="${o.labels.choose}">${ICON_CLOCK}</button>`);
            self.$field = $('<div class="ts-tp-field"></div>')
                .append($(`<span class="ts-tp-icon" aria-hidden="true">${ICON_CLOCK}</span>`), self.$input);
            if (!o.inline) self.$field.append(self.$toggle);

            self.$pop = $(`<div class="ts-tp-pop" id="${popId}" role="dialog" aria-label="${o.labels.choose}"></div>`);
            self.$cols = $('<div class="ts-tp-cols"></div>');
            self.$hours = self._column(o.labels.hours);
            self.$mins  = self._column(o.labels.minutes);
            self.$cols.append(self.$hours, self.$mins);
            if (o.format === '12') {
                self.$period = self._column(o.labels.period);
                self.$cols.append(self.$period);
            }
            self.$pop.append(self.$cols);
            if (o.showNow) {
                self.$now  = $(`<button type="button" class="ts-tp-link ts-tp-now">${o.labels.now}</button>`);
                self.$done = $(`<button type="button" class="ts-tp-link ts-tp-done">${o.labels.done}</button>`);
                self.$pop.append($('<div class="ts-tp-foot"></div>').append(self.$now, o.inline ? '' : self.$done));
            }

            self.$wrap.insertBefore(self.$el);
            self.$wrap.append(self.$el, self.$field, self.$pop);
            el.setAttribute('type', 'hidden');

            self._buildHours();
            self._buildPeriod();
            const initial = parseTime(el.value);
            self._time = initial;
            self._renderValue();
            if (el.disabled) self._applyDisabled(true);
            if (o.inline) self.$wrap.addClass('is-open');
            return this;
        }

        _column(label) {
            return $(`<div class="ts-tp-col" role="listbox" tabindex="0" aria-label="${label}"></div>`);
        }

        events() {
            const self = this;
            if (self._failed) return this;
            const ns = self._ns;

            self.$toggle.on(`click${ns}`, () => { self.toggle(); self.$input.trigger('focus'); });
            self.$input
                .on(`keydown${ns}`, (e) => self._onFieldKey(e))
                .on(`blur${ns}`, () => self._commitText('typing'))
                .on(`click${ns}`, () => { if (self.options.openOnClick) self.open(); });

            // Picking: pointerdown keeps focus in the field and acts at once
            self.$pop.on(`mousedown${ns}`, (e) => e.preventDefault());
            self.$pop.on(`click${ns}`, '.ts-tp-item', function () {
                const $i = $(this);
                self._pick($i.closest('.ts-tp-col')[0] === self.$hours[0] ? 'h' : ($i.closest('.ts-tp-col')[0] === self.$mins[0] ? 'm' : 'p'), $i.data('v'));
            });
            self.$pop.on(`keydown${ns}`, '.ts-tp-col', (e) => self._onColKey(e));
            if (self.$now) self.$now.on(`click${ns}`, () => self.setNow('now'));
            if (self.$done) self.$done.on(`click${ns}`, () => { self.close(); self.$input.trigger('focus'); });

            if (!self.options.inline) {
                $(document).on(`mousedown${ns} touchstart${ns}`, (e) => {
                    if (self._open && !self.$wrap[0].contains(e.target)) self.close();
                });
                $(document).on(`focusin${ns}`, (e) => {
                    if (self._open && !self.$wrap[0].contains(e.target)) self.close();
                });
                $(window).on(`resize${ns}`, () => { if (self._open) self._position(); });
                document.addEventListener('scroll', self._onScroll = () => { if (self._open) self._position(); }, true);
            }
            return this;
        }

        // Building

        _buildHours() {
            const o = this.options;
            const list = o.format === '12' ? Array.from({ length: 12 }, (_, i) => i + 1) : Array.from({ length: 24 }, (_, i) => i);
            this.$hours.html(list.map((h) => `<div class="ts-tp-item" role="option" data-v="${h}" aria-selected="false">${pad(h)}</div>`).join(''));
        }

        _buildMinutes() {
            const o = this.options;
            const set = [];
            for (let m = 0; m < 60; m += o.minuteStep) set.push(m);
            if (this._time && set.indexOf(this._time.minute) === -1) { set.push(this._time.minute); set.sort((a, b) => a - b); }
            this.$mins.html(set.map((m) => `<div class="ts-tp-item" role="option" data-v="${m}" aria-selected="false">${pad(m)}</div>`).join(''));
        }

        _buildPeriod() {
            if (!this.$period) return;
            const o = this.options;
            this.$period.html(`<div class="ts-tp-item" role="option" data-v="am" aria-selected="false">${o.labels.am}</div><div class="ts-tp-item" role="option" data-v="pm" aria-selected="false">${o.labels.pm}</div>`);
        }

        // Value and display

        _display(t) {
            if (!t) return '';
            const o = this.options;
            if (o.format === '24') return `${pad(t.hour)}:${pad(t.minute)}`;
            const h12 = t.hour % 12 === 0 ? 12 : t.hour % 12;
            return `${h12}:${pad(t.minute)} ${t.hour < 12 ? o.labels.am : o.labels.pm}`;
        }

        _canonical(t) { return t ? `${pad(t.hour)}:${pad(t.minute)}` : ''; }

        _renderValue() {
            const t = this._time;
            this.$el.val(this._canonical(t));
            this.$input.val(this._display(t));
            this._buildMinutes();
            this._markSelected();
        }

        _markSelected() {
            const t = this._time;
            const o = this.options;
            const set = ($col, v) => {
                $col.find('.ts-tp-item').each(function () {
                    const on = t && String($(this).data('v')) === String(v);
                    this.setAttribute('aria-selected', on ? 'true' : 'false');
                });
            };
            set(this.$hours, t ? (o.format === '12' ? (t.hour % 12 === 0 ? 12 : t.hour % 12) : t.hour) : null);
            set(this.$mins, t ? t.minute : null);
            if (this.$period) set(this.$period, t ? (t.hour < 12 ? 'am' : 'pm') : null);
            if (this._open) this._centerSelected();
        }

        _centerSelected() {
            [this.$hours, this.$mins, this.$period].forEach(($c) => {
                if (!$c) return;
                const sel = $c.find('[aria-selected="true"]')[0];
                if (!sel) { $c[0].scrollTop = 0; return; }
                $c[0].scrollTop = Math.max(0, sel.offsetTop - ($c[0].clientHeight - sel.offsetHeight) / 2);
            });
        }

        _emit(source, previous, silent) {
            if (silent) return;
            const el = this.$el[0];
            const t  = this._time;
            el.dispatchEvent(new Event('input',  { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
            el.dispatchEvent(new CustomEvent(`${EVENT}.change`, {
                bubbles: true,
                detail: { instance: this, value: this._canonical(t), hour: t ? t.hour : null, minute: t ? t.minute : null, display: this._display(t), source, previousValue: previous }
            }));
            if (typeof this.options.onChange === 'function') this.options.onChange.call(this, this._canonical(t));
        }

        _apply(t, source, silent) {
            const prev = this._canonical(this._time);
            this._time = t;
            this._renderValue();
            if (this._canonical(t) !== prev) this._emit(source, prev, silent);
        }

        getValue() { return this._canonical(this._time); }
        getTime()  { return this._time ? { hour: this._time.hour, minute: this._time.minute } : null; }

        setValue(v, silent) {
            let t = null;
            if (v && typeof v === 'object') t = { hour: v.hour, minute: v.minute };
            else if (v !== '' && v != null) t = parseTime(v);
            this._apply(t, 'api', !!silent);
            return this;
        }

        setNow(source) {
            const d = new Date();
            this._apply({ hour: d.getHours(), minute: d.getMinutes() }, source || 'api', false);
            return this;
        }

        // Typing

        _commitText(source) {
            const text = this.$input.val();
            if (text.trim() === '') { if (this._time) this._apply(null, source, false); return; }
            const t = parseTime(text);
            if (t) this._apply(t, source, false);
            else this._renderValue();           // unreadable: put the last good value back
        }

        _onFieldKey(e) {
            if (e.isComposing) return;
            const o = this.options;
            if (e.key === 'ArrowDown' && e.altKey) { e.preventDefault(); this.open(); return; }
            if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                e.preventDefault();
                this._commitText('typing');
                const dir = e.key === 'ArrowUp' ? 1 : -1;
                const t = this._time || parseTime(o.defaultTime) || { hour: 9, minute: 0 };
                let total = t.hour * 60 + t.minute + dir * (e.shiftKey ? 60 : o.minuteStep);
                if (!this._time) total = t.hour * 60 + t.minute;
                total = ((total % 1440) + 1440) % 1440;
                this._apply({ hour: Math.floor(total / 60), minute: total % 60 }, 'keyboard', false);
                return;
            }
            if (e.key === 'Enter') { this._commitText('typing'); if (this._open && !o.inline) { e.preventDefault(); this.close(); } return; }
            if (e.key === 'Escape' && this._open && !o.inline) { e.preventDefault(); e.stopPropagation(); this.close(); }
        }

        // Picking from the popover

        _pick(part, v) {
            const o = this.options;
            const t = this._time ? { hour: this._time.hour, minute: this._time.minute } : (parseTime(o.defaultTime) || { hour: 9, minute: 0 });
            if (part === 'h') {
                const h = parseInt(v, 10);
                if (o.format === '12') t.hour = (h % 12) + (t.hour >= 12 ? 12 : 0); else t.hour = h;
            } else if (part === 'm') {
                t.minute = parseInt(v, 10);
            } else {
                if (v === 'am' && t.hour >= 12) t.hour -= 12;
                if (v === 'pm' && t.hour < 12) t.hour += 12;
            }
            this._apply(t, 'popover', false);
        }

        _onColKey(e) {
            const $col = $(e.currentTarget);
            const cols = [this.$hours, this.$mins, this.$period].filter(Boolean);
            const idx = cols.findIndex(($c) => $c[0] === $col[0]);
            const part = idx === 0 ? 'h' : (idx === 1 ? 'm' : 'p');
            const items = $col.find('.ts-tp-item');
            let cur = items.index($col.find('[aria-selected="true"]'));
            const go = (i) => {
                const n = Math.max(0, Math.min(items.length - 1, i));
                this._pick(part, $(items[n]).data('v'));
            };
            switch (e.key) {
                case 'ArrowDown': e.preventDefault(); go(cur < 0 ? 0 : cur + 1); break;
                case 'ArrowUp':   e.preventDefault(); go(cur < 0 ? 0 : cur - 1); break;
                case 'Home':      e.preventDefault(); go(0); break;
                case 'End':       e.preventDefault(); go(items.length - 1); break;
                case 'ArrowRight': e.preventDefault(); if (cols[idx + 1]) cols[idx + 1][0].focus(); break;
                case 'ArrowLeft':  e.preventDefault(); if (cols[idx - 1]) cols[idx - 1][0].focus(); break;
                case 'Enter': case 'Escape':
                    if (!this.options.inline) { e.preventDefault(); e.stopPropagation(); this.close(); this.$input.trigger('focus'); }
                    break;
            }
        }

        // Open and close

        _position() {
            const pop = this.$pop[0];
            if (this.options.inline) return;
            const r = this.$field[0].getBoundingClientRect();
            pop.style.minWidth = Math.max(r.width, 0) + 'px';
            const ph = pop.offsetHeight || 260, pw = pop.offsetWidth || 220;
            const vh = window.innerHeight, vw = window.innerWidth;
            const up = vh - r.bottom < ph + 10 && r.top > vh - r.bottom;
            pop.style.top  = Math.max(8, up ? r.top - ph - 6 : r.bottom + 6) + 'px';
            pop.style.left = Math.max(8, Math.min(r.left, vw - pw - 8)) + 'px';
            this.$wrap.toggleClass('ts-tp--up', up);
        }

        open() {
            if (this._open || this.$el[0].disabled || this.options.inline) return this;
            this._open = true;
            this.$wrap.addClass('is-open');
            this.$input.attr('aria-expanded', 'true');
            this._position();
            this._centerSelected();
            this.$el[0].dispatchEvent(new CustomEvent(`${EVENT}.open`, { bubbles: true, detail: { instance: this } }));
            return this;
        }

        close() {
            if (!this._open || this.options.inline) return this;
            this._open = false;
            this.$wrap.removeClass('is-open');
            this.$input.attr('aria-expanded', 'false');
            this.$el[0].dispatchEvent(new CustomEvent(`${EVENT}.close`, { bubbles: true, detail: { instance: this } }));
            return this;
        }

        toggle() { return this._open ? this.close() : this.open(); }

        _applyDisabled(on) {
            this.$wrap.toggleClass('ts-tp--disabled', !!on);
            this.$input.prop('disabled', !!on);
            this.$toggle.prop('disabled', !!on);
        }

        enable()  { this.$el.prop('disabled', false); this._applyDisabled(false); return this; }
        disable() { this.close(); this.$el.prop('disabled', true); this._applyDisabled(true); return this; }

        destroy() {
            const self = this;
            if (self._failed) return this;
            self.close();
            $(document).off(self._ns);
            $(window).off(self._ns);
            if (self._onScroll) document.removeEventListener('scroll', self._onScroll, true);
            self.$input.off(self._ns);
            self.$pop.off(self._ns);
            self.$el.insertBefore(self.$wrap);
            self.$wrap.remove();
            if (self.$labels) self.$labels.off(self._ns);
            if (self._origType === null) self.$el.removeAttr('type'); else self.$el.attr('type', self._origType);
            self.$el.removeData(instanceName);

            instanceCount--;
            if (instanceCount <= 0) {
                instanceCount = 0;
                const styleEl = document.getElementById(STYLE_ID);
                if (styleEl) styleEl.remove();
            }
            return this;
        }
    }

    PluginTimePicker.parse = parseTime;

    PluginTimePicker.defaults = {
        format:      'auto',        // '12', '24', or 'auto' to follow the visitor's locale
        locale:      '',            // used when format is 'auto'
        minuteStep:  5,             // minutes between entries in the popover (typing allows any minute)
        defaultTime: '09:00',       // used for the parts you have not chosen yet
        placeholder: 'Time',
        ariaLabel:   'Time',
        block:       false,         // fill the width of the parent
        inline:      false,         // show the columns in the page instead of a popover
        showNow:     true,          // a "Now" link in the popover
        openOnClick: true,          // clicking the field opens the popover
        labels: { choose: 'Choose a time', hours: 'Hours', minutes: 'Minutes', period: 'AM or PM', am: 'AM', pm: 'PM', now: 'Now', done: 'Done' },
        onChange:    null           // function (value) {}
    };

    $.extend(themestrap, { PluginTimePicker });

    $.fn.themestrapPluginTimePicker = function (opts) {
        const args = Array.prototype.slice.call(arguments, 1);
        return this.map(function () {
            const $this = $(this);
            const inst  = $this.data(instanceName);
            if (inst) {
                if (typeof opts === 'string' && typeof inst[opts] === 'function') {
                    return inst[opts].apply(inst, args);
                }
                return inst;
            }
            return new PluginTimePicker($this, typeof opts === 'object' ? opts : undefined);
        });
    };

})).apply(this, [window.themestrap, jQuery]);
