/**
 * Themestrap NumberInput
 *
 * Replaces the browser's tiny spin arrows with a proper stepper: minus and plus buttons that match
 * the other Themestrap inputs, hold-to-repeat, keyboard control, bounds, and an optional unit label.
 * The original <input type="number"> stays in the page and keeps the value, so forms, validation and
 * code that reads the input keep working.
 *
 * Markup:
 *
 *   <input type="number" name="per_page" value="8" min="1" max="50" step="1"
 *          data-plugin-numberinput
 *          data-plugin-options='{"unit": "posts"}'>
 *
 * Layouts: 'split' (default)  [ - | 8 posts | + ]
 *          'stacked'          [ 8 posts | up/down ]
 *
 * Public API (via stored instance):
 *   const ni = $('#per_page').data('__pluginNumberInput');
 *   ni.getValue();            // number, or null when empty
 *   ni.setValue(12, silent);  // clamps to min and max, silent skips the events
 *   ni.increment(n);          // n steps up (default 1)
 *   ni.decrement(n);
 *   ni.setMin(1); ni.setMax(100); ni.setStep(5);
 *   ni.enable(); ni.disable();
 *   ni.destroy();
 *
 * Events (native CustomEvent, bubbling, dispatched on the input):
 *   ts.numberinput.change   detail: { instance, value, previousValue, source }
 *                           source is 'button', 'keyboard', 'wheel', 'typing' or 'api'
 *   The input also fires ordinary 'input' and 'change' events, so existing listeners keep working.
 *
 * Keyboard (on the input):
 *   Up / Down          one step           Shift + Up / Down, Page Up / Down   ten steps
 *   Home / End         minimum / maximum  Enter                               apply the typed value
 *
 * CSS custom properties (all optional):
 *   --ts-ni-h, --ts-ni-bg, --ts-ni-border, --ts-ni-border-focus, --ts-ni-radius, --ts-ni-text,
 *   --ts-ni-muted, --ts-ni-btn-bg, --ts-ni-btn-hover, --ts-ni-focus-ring, --ts-ni-width
 *
 * Init.js wiring:
 *   if ($.isFunction($.fn['themestrapPluginNumberInput']) && $('[data-plugin-numberinput]').length) {
 *       themestrap.fn.intObsInit('[data-plugin-numberinput]:not(.manual)', 'themestrapPluginNumberInput');
 *   }
 */
// Number Input
(((themestrap = {}, $) => {
    const instanceName = '__pluginNumberInput';
    const STYLE_ID     = 'ts-numberinput-styles';
    const EVENT        = 'ts.numberinput.change';

    let instanceCount = 0;
    let seq           = 0;

    const ICON = {
        minus: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M5 12h14"/></svg>',
        plus:  '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
        up:    '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 15 6-6 6 6"/></svg>',
        down:  '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>'
    };

    const LIGHT = `
        --ni-h:            var(--ts-ni-h, 2.45rem);
        --ni-bg:           var(--ts-ni-bg, #ffffff);
        --ni-border:       var(--ts-ni-border, rgba(0,0,0,.18));
        --ni-border-focus: var(--ts-ni-border-focus, #00a89f);
        --ni-radius:       var(--ts-ni-radius, 7px);
        --ni-text:         var(--ts-ni-text, #1f2937);
        --ni-muted:        var(--ts-ni-muted, rgba(31,41,55,.55));
        --ni-btn-bg:       var(--ts-ni-btn-bg, rgba(0,0,0,.035));
        --ni-btn-hover:    var(--ts-ni-btn-hover, rgba(0,0,0,.09));
        --ni-ring:         var(--ts-ni-focus-ring, 0 0 0 3px rgba(0,168,159,.20));
    `;
    const DARK = `
        --ni-bg:           var(--ts-ni-bg, rgba(255,255,255,.03));
        --ni-border:       var(--ts-ni-border, rgba(255,255,255,.14));
        --ni-border-focus: var(--ts-ni-border-focus, #00c7be);
        --ni-text:         var(--ts-ni-text, #d5dfeb);
        --ni-muted:        var(--ts-ni-muted, rgba(213,223,235,.55));
        --ni-btn-bg:       var(--ts-ni-btn-bg, rgba(255,255,255,.05));
        --ni-btn-hover:    var(--ts-ni-btn-hover, rgba(255,255,255,.12));
        --ni-ring:         var(--ts-ni-focus-ring, 0 0 0 3px rgba(0,199,190,.22));
    `;

    const CSS_TEXT = `
        .ts-ni { ${LIGHT} }
        @media (prefers-color-scheme: dark) { .ts-ni { ${DARK} } }
        html.dark .ts-ni,
        [data-bs-theme="dark"] .ts-ni { ${DARK} }
        [data-bs-theme="light"] .ts-ni { ${LIGHT} }

        .ts-ni {
            display: inline-flex;
            align-items: stretch;
            width: var(--ts-ni-width, auto);
            height: var(--ni-h);
            background: var(--ni-bg);
            border: 1px solid var(--ni-border);
            border-radius: var(--ni-radius);
            color: var(--ni-text);
            overflow: hidden;
            transition: border-color .15s, box-shadow .15s;
            box-sizing: border-box;
        }
        .ts-ni:focus-within { border-color: var(--ni-border-focus); box-shadow: var(--ni-ring); }
        .ts-ni--block { display: flex; width: 100%; }
        .ts-ni--sm { --ni-h: 2rem; font-size: .85rem; }
        .ts-ni--lg { --ni-h: 2.9rem; font-size: 1.05rem; }
        .ts-ni--disabled { opacity: .55; }

        .ts-ni-field { display: flex; align-items: center; flex: 1 1 auto; min-width: 0; }
        .ts-ni input.ts-ni-input {
            flex: 1 1 auto;
            min-width: 2.6rem;
            width: var(--ts-ni-input-width, 4.5rem);
            height: 100%;
            margin: 0;
            padding: 0 .4rem;
            border: 0;
            outline: 0;
            background: transparent;
            color: inherit;
            font: inherit;
            text-align: center;
            box-shadow: none;
            border-radius: 0;
            -moz-appearance: textfield;
            appearance: textfield;
        }
        .ts-ni input.ts-ni-input::-webkit-outer-spin-button,
        .ts-ni input.ts-ni-input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        .ts-ni--block input.ts-ni-input { width: auto; }
        .ts-ni-unit { padding-right: .6rem; color: var(--ni-muted); font-size: .85em; pointer-events: none; white-space: nowrap; }

        .ts-ni-btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            flex: 0 0 var(--ni-h);
            width: var(--ni-h);
            padding: 0;
            border: 0;
            background: var(--ni-btn-bg);
            color: var(--ni-text);
            cursor: pointer;
            user-select: none;
            -webkit-user-select: none;
            touch-action: manipulation;
            transition: background-color .12s;
        }
        .ts-ni-btn:hover { background: var(--ni-btn-hover); }
        .ts-ni-btn:active { background: var(--ni-btn-hover); }
        .ts-ni-btn.is-disabled { opacity: .35; cursor: default; background: var(--ni-btn-bg); }
        .ts-ni--split .ts-ni-dec { border-right: 1px solid var(--ni-border); }
        .ts-ni--split .ts-ni-inc { border-left: 1px solid var(--ni-border); }

        .ts-ni-stack { display: flex; flex-direction: column; flex: 0 0 1.9rem; border-left: 1px solid var(--ni-border); }
        .ts-ni--stacked .ts-ni-btn { flex: 1 1 50%; width: 100%; height: 50%; }
        .ts-ni--stacked .ts-ni-inc { border-bottom: 1px solid var(--ni-border); }

        @media (prefers-reduced-motion: reduce) { .ts-ni, .ts-ni-btn { transition: none; } }
    `;

    function decimals(n) {
        const s = String(n);
        if (/e-/.test(s)) return parseInt(s.split('e-')[1], 10);
        const i = s.indexOf('.');
        return i === -1 ? 0 : s.length - i - 1;
    }

    class PluginNumberInput {
        constructor($el, opts) {
            return this.initialize($el, opts);
        }

        initialize($el, opts) {
            if ($el.data(instanceName)) {
                return this;
            }

            this.$el     = $el;
            this._uid    = ++seq;
            this._ns     = `.tsni${this._uid}`;
            this._failed = false;
            this._hold   = null;

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
            const el = this.$el[0];
            const fromAttr = {};
            ['min', 'max', 'step'].forEach((k) => {
                const v = el.getAttribute(k);
                if (v !== null && v !== '' && !isNaN(parseFloat(v))) fromAttr[k] = parseFloat(v);
            });
            this.options = $.extend(true, {}, PluginNumberInput.defaults, fromAttr, opts, { wrapper: this.$el });
            if (!(this.options.step > 0)) this.options.step = 1;
            this.options.precision = this.options.precision != null
                ? this.options.precision
                : Math.max(decimals(this.options.step), isFinite(this.options.min) ? decimals(this.options.min) : 0);
            return this;
        }

        build() {
            const self = this;
            const o    = self.options;

            if (!self.$el.is('input')) {
                console.error('PluginNumberInput: the host element must be an <input>.');
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
            el.setAttribute('type', 'number');
            if (isFinite(o.min)) el.setAttribute('min', o.min);
            if (isFinite(o.max)) el.setAttribute('max', o.max);
            el.setAttribute('step', o.step);
            self.$el.addClass('ts-ni-input');

            const layout = o.layout === 'stacked' ? 'stacked' : 'split';
            self.$wrap = $(`<div class="ts-ni ts-ni--${layout}" role="group"></div>`);
            if (o.size === 'sm' || o.size === 'lg') self.$wrap.addClass(`ts-ni--${o.size}`);
            if (o.block) self.$wrap.addClass('ts-ni--block');

            const id = el.id || `ts-ni-${self._uid}`;
            if (!el.id) el.id = id;

            const btn = (cls, label, icon) => $(`<button type="button" class="ts-ni-btn ${cls}" tabindex="-1" aria-controls="${id}" aria-label="${label}">${icon}</button>`);
            self.$dec = btn('ts-ni-dec', o.labels.decrease, layout === 'stacked' ? ICON.down : ICON.minus);
            self.$inc = btn('ts-ni-inc', o.labels.increase, layout === 'stacked' ? ICON.up : ICON.plus);

            self.$wrap.insertBefore(self.$el);
            const $field = $('<div class="ts-ni-field"></div>').append(self.$el);
            if (o.unit) $field.append($('<span class="ts-ni-unit" aria-hidden="true"></span>').text(o.unit));

            if (layout === 'stacked') {
                self.$wrap.append($field, $('<div class="ts-ni-stack"></div>').append(self.$inc, self.$dec));
            } else {
                self.$wrap.append(self.$dec, $field, self.$inc);
            }

            if (el.disabled || el.readOnly) self._applyDisabled(true);
            self._lastValue = self.getValue();
            self._syncButtons();
            return this;
        }

        events() {
            const self = this;
            if (self._failed) return this;
            const ns = self._ns;

            // Press, hold to repeat
            const down = (dir) => (e) => {
                if (e.type === 'mousedown' && e.button !== 0) return;
                e.preventDefault();                 // keep focus where it is
                self.$el.trigger('focus');
                self._startHold(dir);
            };
            const stop = () => self._stopHold();
            const usePointer = typeof window.PointerEvent === 'function';
            const downEvt = usePointer ? 'pointerdown' : 'mousedown touchstart';
            self.$dec.on(`${downEvt.split(' ').join(ns + ' ')}${ns}`, down(-1));
            self.$inc.on(`${downEvt.split(' ').join(ns + ' ')}${ns}`, down(1));
            $(document).on(`${usePointer ? 'pointerup pointercancel' : 'mouseup touchend touchcancel'}${ns}`, stop);
            self.$dec.add(self.$inc).on(`${usePointer ? 'pointerleave' : 'mouseleave'}${ns}`, stop);

            self.$el
                .on(`keydown${ns}`, (e) => self._onKeydown(e))
                .on(`input${ns}`, () => self._onTyping())
                .on(`blur${ns}`, () => self._commit('typing'))
                .on(`wheel${ns}`, (e) => {
                    if (!self.options.wheel || document.activeElement !== self.$el[0]) return;
                    e.preventDefault();
                    const up = (e.originalEvent || e).deltaY < 0;
                    self._step(up ? 1 : -1, 'wheel');
                });

            return this;
        }

        // Value helpers

        _bounds() {
            return { min: isFinite(this.options.min) ? this.options.min : -Infinity, max: isFinite(this.options.max) ? this.options.max : Infinity };
        }

        _clamp(v) {
            const { min, max } = this._bounds();
            return Math.min(max, Math.max(min, v));
        }

        _format(v) {
            return v === null || isNaN(v) ? '' : Number(v).toFixed(this.options.precision).replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
        }

        getValue() {
            const raw = String(this.$el.val()).trim().replace(',', '.');
            if (raw === '' || isNaN(Number(raw))) return null;
            return Number(raw);
        }

        _write(v) {
            this.$el.val(this._format(v));
            this._lastValue = v;
            this._syncButtons();
        }

        _syncButtons() {
            const v = this.getValue();
            const { min, max } = this._bounds();
            this.$dec.toggleClass('is-disabled', v !== null && v <= min).attr('aria-disabled', v !== null && v <= min ? 'true' : 'false');
            this.$inc.toggleClass('is-disabled', v !== null && v >= max).attr('aria-disabled', v !== null && v >= max ? 'true' : 'false');
        }

        _emit(source, previous, silent) {
            if (silent) return;
            const el = this.$el[0];
            el.dispatchEvent(new Event('input',  { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
            el.dispatchEvent(new CustomEvent(EVENT, {
                bubbles: true,
                detail: { instance: this, value: this.getValue(), previousValue: previous, source }
            }));
            if (typeof this.options.onChange === 'function') this.options.onChange.call(this, this.getValue());
        }

        // Moves by n steps from the current value (or from the bound when empty)
        _step(n, source) {
            if (this._isLocked()) return this;
            const o = this.options;
            const prev = this.getValue();
            const { min } = this._bounds();
            let base = prev;
            if (base === null) base = isFinite(min) ? min - o.step * Math.sign(n) : 0;
            if (o.snap) base = Math.round(base / o.step) * o.step;
            const next = this._clamp(Number((base + n * o.step).toFixed(Math.max(o.precision, 8))));
            if (prev !== null && next === prev) { this._syncButtons(); return this; }
            this._write(next);
            this._emit(source, prev, false);
            return this;
        }

        increment(n) { return this._step(n === undefined ? 1 : n, 'api'); }
        decrement(n) { return this._step(-(n === undefined ? 1 : n), 'api'); }

        setValue(v, silent) {
            const prev = this.getValue();
            const num = v === null || v === '' || isNaN(Number(v)) ? null : this._clamp(Number(v));
            this._write(num);
            if (num !== prev) this._emit('api', prev, !!silent);
            return this;
        }

        setMin(n) { this.options.min = n; this.$el.attr('min', n); this._syncButtons(); return this; }
        setMax(n) { this.options.max = n; this.$el.attr('max', n); this._syncButtons(); return this; }
        setStep(n) {
            if (!(n > 0)) return this;
            this.options.step = n;
            this.options.precision = Math.max(decimals(n), isFinite(this.options.min) ? decimals(this.options.min) : 0);
            this.$el.attr('step', n);
            return this;
        }

        // Typing and committing

        _onTyping() {
            const o = this.options;
            let raw = String(this.$el.val());
            if (o.precision === 0 && /[.,]/.test(raw)) raw = raw.replace(/[.,].*$/, '');
            if (raw !== String(this.$el.val())) this.$el.val(raw);
            this._syncButtons();
        }

        // Applies the typed text: parse, clamp, format. An empty field stays empty.
        _commit(source) {
            const prev = this._lastValue;
            const v = this.getValue();
            if (v === null) { this._lastValue = null; this._syncButtons(); return; }
            const next = this._clamp(this.options.snap ? Math.round(v / this.options.step) * this.options.step : v);
            this._write(next);
            if (next !== prev) this._emit(source, prev, false);
        }

        _onKeydown(e) {
            const o = this.options;
            if (e.isComposing) return;
            const big = e.shiftKey ? 10 : 1;
            switch (e.key) {
                case 'ArrowUp':   e.preventDefault(); this._step(big, 'keyboard'); break;
                case 'ArrowDown': e.preventDefault(); this._step(-big, 'keyboard'); break;
                case 'PageUp':    e.preventDefault(); this._step(10, 'keyboard'); break;
                case 'PageDown':  e.preventDefault(); this._step(-10, 'keyboard'); break;
                case 'Home':
                    if (isFinite(o.min)) { e.preventDefault(); this.setValue(o.min); }
                    break;
                case 'End':
                    if (isFinite(o.max)) { e.preventDefault(); this.setValue(o.max); }
                    break;
                case 'Enter':     this._commit('typing'); break;
            }
        }

        // Press and hold: first step now, then repeat, speeding up
        _startHold(dir) {
            const self = this;
            self._stopHold();
            self._step(dir, 'button');
            if (!self.options.repeat) return;
            let n = 0;
            const tick = () => {
                self._step(dir, 'button');
                n++;
                const interval = Math.max(self.options.holdMinInterval, self.options.holdInterval - n * 4);
                self._hold = setTimeout(tick, interval);
            };
            self._hold = setTimeout(tick, self.options.holdDelay);
        }

        _stopHold() {
            clearTimeout(this._hold);
            this._hold = null;
        }

        _isLocked() {
            return this.$el[0].disabled || this.$el[0].readOnly;
        }

        _applyDisabled(on) {
            this.$wrap.toggleClass('ts-ni--disabled', !!on);
            this.$dec.add(this.$inc).attr('aria-disabled', on ? 'true' : 'false');
        }

        enable()  { this.$el.prop('disabled', false); this._applyDisabled(false); this._syncButtons(); return this; }
        disable() { this.$el.prop('disabled', true);  this._applyDisabled(true);  return this; }

        destroy() {
            const self = this;
            if (self._failed) return this;
            self._stopHold();
            $(document).off(self._ns);
            self.$el.off(self._ns);
            self.$dec.off(self._ns).remove();
            self.$inc.off(self._ns).remove();
            self.$el.removeClass('ts-ni-input').insertBefore(self.$wrap);
            self.$wrap.remove();
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

    PluginNumberInput.defaults = {
        min:            null,         // read from the min attribute when not given
        max:            null,
        step:           1,            // read from the step attribute when not given
        precision:      null,         // decimals shown. Defaults to those of step and min
        layout:         'split',      // 'split' (minus and plus at the sides) or 'stacked' (arrows at the right)
        size:           'md',         // 'sm' | 'md' | 'lg'
        block:          false,        // fill the width of the parent
        unit:           '',           // text shown after the value, such as 'posts'
        repeat:         true,         // hold a button to repeat
        holdDelay:      420,          // ms before repeating starts
        holdInterval:   90,           // ms between repeats, speeding up
        holdMinInterval: 25,
        wheel:          false,        // change with the mouse wheel while focused
        snap:           false,        // round typed values to a multiple of step
        labels:         { increase: 'Increase', decrease: 'Decrease' },
        onChange:       null          // function (value) {}
    };

    $.extend(themestrap, { PluginNumberInput });

    $.fn.themestrapPluginNumberInput = function (opts) {
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
            return new PluginNumberInput($this, typeof opts === 'object' ? opts : undefined);
        });
    };

})).apply(this, [window.themestrap, jQuery]);
