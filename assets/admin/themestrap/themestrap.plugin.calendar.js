// Calendar
(((themestrap = {}, $) => {
    const instanceName = '__pluginCalendar';
    const STYLE_ID     = 'ts-calendar-styles';

    const CSS = `
/* PluginCalendar */
.ts-calendar {
    display: inline-flex;
    flex-direction: column;
    font-family: var(--font-ui, system-ui, sans-serif);
    font-size: 13px;
    color: var(--text-normal, #c0c0c0);
    background: var(--bg-raised, #252627);
    border: 1px solid var(--border-soft, rgba(255,255,255,0.12));
    border-radius: 8px;
    padding: 14px 12px;
    user-select: none;
}

.ts-cal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 4px;
    margin-bottom: 10px;
}

.ts-cal-caption {
    flex: 1;
    text-align: center;
    font-size: 13px;
    font-weight: 600;
    color: var(--text-bright, #f0f0f0);
    letter-spacing: 0.03em;
}

.ts-cal-nav {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 26px;
    height: 26px;
    padding: 0 0 1px;
    border: 1px solid var(--border-soft, rgba(255,255,255,0.12));
    border-radius: 5px;
    background: transparent;
    color: var(--text-muted, rgba(255,255,255,0.35));
    font-size: 18px;
    line-height: 1;
    cursor: pointer;
    transition: background 0.12s, color 0.12s, border-color 0.12s;
}
.ts-cal-nav:hover {
    background: var(--bg-hover, #2e2f30);
    color: var(--text-bright, #f0f0f0);
    border-color: var(--border-mid, rgba(255,255,255,0.20));
}
.ts-cal-nav:focus-visible {
    outline: 2px solid var(--accent-cyan, #5ecfdb);
    outline-offset: 2px;
}

.ts-cal-table {
    border-collapse: collapse;
    table-layout: fixed;
    width: 100%;
}

.ts-cal-head-cell {
    width: calc(100% / 7);
    padding: 0 0 6px;
    font-size: 10px;
    font-weight: 500;
    text-align: center;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: var(--text-muted, rgba(255,255,255,0.35));
}

.ts-cal-cell {
    padding: 0;
    text-align: center;
}
.ts-cal-cell--in-range {
    background: rgba(94,207,219,0.10);
}
.ts-cal-cell--range-start {
    background: linear-gradient(to right, transparent 50%, rgba(94,207,219,0.10) 50%);
}
.ts-cal-cell--range-end {
    background: linear-gradient(to left, transparent 50%, rgba(94,207,219,0.10) 50%);
}

.ts-cal-day {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    position: relative;
    width: 36px;
    height: 36px;
    margin: 1px 0;
    padding: 0;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: var(--text-normal, #c0c0c0);
    font-family: var(--font-ui, system-ui, sans-serif);
    font-size: 12.5px;
    cursor: pointer;
    transition: background 0.1s, color 0.1s;
}
.ts-cal-day:hover:not([disabled]) {
    background: var(--bg-hover, #2e2f30);
    color: var(--text-bright, #f0f0f0);
}
.ts-cal-day:focus-visible {
    outline: 2px solid var(--accent-cyan, #5ecfdb);
    outline-offset: 1px;
    z-index: 1;
}

.ts-cal-day--outside {
    color: var(--text-dim, rgba(255,255,255,0.18));
}
.ts-cal-day--outside:hover:not([disabled]) {
    color: var(--text-muted, rgba(255,255,255,0.40));
}

.ts-cal-day--today {
    color: var(--accent-cyan, #5ecfdb);
    font-weight: 600;
}
.ts-cal-day--today::after {
    content: '';
    position: absolute;
    bottom: 3px;
    left: 50%;
    transform: translateX(-50%);
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: var(--accent-cyan, #5ecfdb);
}

.ts-cal-day--disabled {
    color: var(--text-dim, rgba(255,255,255,0.18));
    cursor: not-allowed;
    opacity: 0.45;
    pointer-events: none;
}

.ts-cal-day--selected {
    background: var(--accent-cyan, #5ecfdb);
    color: #0d0e0f;
    font-weight: 600;
}
.ts-cal-day--selected:hover {
    background: var(--accent-cyan, #5ecfdb);
    color: #0d0e0f;
    opacity: 0.9;
}
.ts-cal-day--selected.ts-cal-day--today::after {
    background: #0d0e0f;
}

.ts-cal-day--range-start,
.ts-cal-day--range-end {
    background: var(--accent-cyan, #5ecfdb);
    color: #0d0e0f;
    font-weight: 600;
    border-radius: 6px;
}
.ts-cal-day--range-start:hover,
.ts-cal-day--range-end:hover {
    background: var(--accent-cyan, #5ecfdb);
    color: #0d0e0f;
    opacity: 0.9;
}
.ts-cal-day--range-start.ts-cal-day--today::after,
.ts-cal-day--range-end.ts-cal-day--today::after {
    background: #0d0e0f;
}

.ts-cal-footer {
    display: flex;
    justify-content: center;
    margin-top: 10px;
    padding-top: 10px;
    border-top: 1px solid var(--border-dim, rgba(255,255,255,0.06));
}
.ts-cal-today-btn {
    padding: 4px 14px;
    border: 1px solid var(--border-soft, rgba(255,255,255,0.12));
    border-radius: 4px;
    background: transparent;
    color: var(--text-muted, rgba(255,255,255,0.35));
    font-family: var(--font-ui, system-ui, sans-serif);
    font-size: 11.5px;
    cursor: pointer;
    transition: background 0.12s, color 0.12s;
}
.ts-cal-today-btn:hover {
    background: var(--bg-hover, #2e2f30);
    color: var(--text-bright, #f0f0f0);
}
    `;

    const MONTHS = [
        'January', 'February', 'March',    'April',
        'May',     'June',     'July',      'August',
        'September','October', 'November',  'December',
    ];

    const DAY_LABELS_SUN = ['Su','Mo','Tu','We','Th','Fr','Sa'];
    const DAY_LABELS_MON = ['Mo','Tu','We','Th','Fr','Sa','Su'];

    class PluginCalendar {

        constructor($el, opts) {
            return this.initialize($el, opts);
        }

        initialize($el, opts) {
            if ($el.data(instanceName)) {
                return this;
            }

            this.$el = $el;

            this
                .setData()
                .setOptions(opts)
                .injectStyles()
                .build()
                .events();

            return this;
        }

        setData() {
            PluginCalendar.instances++;
            this.$el.data(instanceName, this);
            return this;
        }

        setOptions(opts) {
            this.options = $.extend(true, {}, PluginCalendar.defaults, opts, {
                wrapper: this.$el,
            });
            return this;
        }

        injectStyles() {
            if (!document.getElementById(STYLE_ID)) {
                const s = document.createElement('style');
                s.id = STYLE_ID;
                s.textContent = CSS;
                document.head.appendChild(s);
            }
            return this;
        }

        build() {
            const self = this;
            const o    = self.options;

            const seed      = o.initialMonth ? self._parseDate(o.initialMonth) : new Date();
            self._viewDate  = new Date(seed.getFullYear(), seed.getMonth(), 1);
            self._selected  = self._normalizeSelected(o.selected, o.mode);
            self._hoverDate = null;
            self._rangeAnchor = null;

            self.$cal = $('<div class="ts-calendar"></div>');
            self.$el.empty().append(self.$cal);
            self._render();

            return this;
        }

        events() {
            const self = this;
            const o    = self.options;

            self.$cal.on('click.calendar', '.ts-cal-prev', function() {
                self._viewDate = new Date(
                    self._viewDate.getFullYear(),
                    self._viewDate.getMonth() - 1,
                    1
                );
                self._render();
                self._dispatch('ts.calendar.monthChange', {
                    month: self._viewDate.getMonth(),
                    year:  self._viewDate.getFullYear(),
                });
            });

            self.$cal.on('click.calendar', '.ts-cal-next', function() {
                self._viewDate = new Date(
                    self._viewDate.getFullYear(),
                    self._viewDate.getMonth() + 1,
                    1
                );
                self._render();
                self._dispatch('ts.calendar.monthChange', {
                    month: self._viewDate.getMonth(),
                    year:  self._viewDate.getFullYear(),
                });
            });

            self.$cal.on('click.calendar', '.ts-cal-today-btn', function() {
                self.goToToday();
            });

            self.$cal.on('click.calendar', '.ts-cal-day:not([disabled])', function() {
                const date = self._parseDate($(this).data('date'));
                if (!date) return;

                if (o.mode === 'single') {
                    self._selected = date;
                    self._render();
                    self._fireSelect(date, date);

                } else if (o.mode === 'multiple') {
                    if (!Array.isArray(self._selected)) self._selected = [];
                    const idx = self._selected.findIndex(d => self._sameDay(d, date));
                    if (idx >= 0) {
                        self._selected.splice(idx, 1);
                    } else {
                        self._selected.push(new Date(date));
                    }
                    const copy = self._selected.map(d => new Date(d));
                    self._render();
                    self._fireSelect(date, copy);

                } else if (o.mode === 'range') {
                    if (self._rangeAnchor === null) {
                        self._rangeAnchor = date;
                        self._selected    = { from: date, to: null };
                    } else {
                        let from = self._rangeAnchor;
                        let to   = date;
                        if (from > to) { [from, to] = [to, from]; }
                        self._selected    = { from, to };
                        self._rangeAnchor = null;
                        self._hoverDate   = null;
                        self._fireSelect(date, { from: new Date(from), to: new Date(to) });
                    }
                    self._render();
                }
            });

            if (o.mode === 'range') {
                self.$cal.on('mouseover.calendar', '.ts-cal-day:not([disabled])', function() {
                    if (self._rangeAnchor === null) return;
                    const date = self._parseDate($(this).data('date'));
                    if (!date || self._sameDay(date, self._hoverDate)) return;
                    self._hoverDate = date;
                    self._render();
                });

                self.$cal.on('mouseleave.calendar', function() {
                    if (self._rangeAnchor === null || !self._hoverDate) return;
                    self._hoverDate = null;
                    self._render();
                });
            }

            self.$cal.on('keydown.calendar', '.ts-cal-day', function(e) {
                const date = self._parseDate($(this).data('date'));
                if (!date) return;

                let moved = null;
                switch (e.key) {
                    case 'ArrowLeft':  moved = self._addDays(date, -1);   break;
                    case 'ArrowRight': moved = self._addDays(date,  1);   break;
                    case 'ArrowUp':    moved = self._addDays(date, -7);   break;
                    case 'ArrowDown':  moved = self._addDays(date,  7);   break;
                    case 'PageUp':     moved = self._addMonths(date, -1); break;
                    case 'PageDown':   moved = self._addMonths(date,  1); break;
                    case 'Home':       moved = new Date(date.getFullYear(), date.getMonth(), 1);  break;
                    case 'End':        moved = new Date(date.getFullYear(), date.getMonth() + 1, 0); break;
                    default: return;
                }

                e.preventDefault();
                if (!moved) return;

                if (
                    moved.getMonth()    !== self._viewDate.getMonth() ||
                    moved.getFullYear() !== self._viewDate.getFullYear()
                ) {
                    self._viewDate = new Date(moved.getFullYear(), moved.getMonth(), 1);
                    self._render();
                }

                const $target = self.$cal.find(`.ts-cal-day[data-date="${self._toISODate(moved)}"]`);
                if ($target.length) {
                    self.$cal.find('.ts-cal-day[tabindex="0"]').attr('tabindex', '-1');
                    $target.attr('tabindex', '0').focus();
                }
            });

            return this;
        }

        destroy() {
            PluginCalendar.instances--;
            if (PluginCalendar.instances <= 0) {
                PluginCalendar.instances = 0;
                const s = document.getElementById(STYLE_ID);
                if (s) s.remove();
            }
            this.$cal && this.$cal.off('.calendar');
            this.$el.off('.calendar').removeData(instanceName).empty();
            return this;
        }

        getValue() {
            return this._selected;
        }

        setValue(val) {
            this._selected    = this._normalizeSelected(val, this.options.mode);
            this._rangeAnchor = null;
            this._hoverDate   = null;
            this._render();
            return this;
        }

        goToMonth(year, month) {
            this._viewDate = new Date(year, month, 1);
            this._render();
            return this;
        }

        goToToday() {
            const n = new Date();
            this._viewDate = new Date(n.getFullYear(), n.getMonth(), 1);
            this._render();
            return this;
        }

        _normalizeSelected(val, mode) {
            if (!val) {
                if (mode === 'multiple') return [];
                if (mode === 'range')   return { from: null, to: null };
                return null;
            }
            if (mode === 'single') {
                return this._parseDate(val);
            }
            if (mode === 'multiple') {
                return (Array.isArray(val) ? val : [val])
                    .map(d => this._parseDate(d))
                    .filter(Boolean);
            }
            if (mode === 'range') {
                return {
                    from: val.from ? this._parseDate(val.from) : null,
                    to:   val.to   ? this._parseDate(val.to)   : null,
                };
            }
            return null;
        }

        _render() {
            const self = this;
            const o    = self.options;
            const vd   = self._viewDate;
            const dayLabels = o.weekStartsOn === 1 ? DAY_LABELS_MON : DAY_LABELS_SUN;
            const today     = new Date();

            /* Determine the roving-tabindex focus date */
            let focusDate = null;
            if (o.mode === 'single' && self._selected) {
                focusDate = self._selected;
            } else if (o.mode === 'multiple' && self._selected && self._selected.length) {
                focusDate = self._selected[0];
            } else if (o.mode === 'range' && self._selected && self._selected.from) {
                focusDate = self._selected.from;
            }

            const inView = d => d
                && d.getFullYear() === vd.getFullYear()
                && d.getMonth()    === vd.getMonth();

            if (!inView(focusDate)) {
                focusDate = inView(today)
                    ? today
                    : new Date(vd.getFullYear(), vd.getMonth(), 1);
            }

            const html = [];

            /* Header */
            html.push('<div class="ts-cal-header">');
            html.push('<button class="ts-cal-nav ts-cal-prev" aria-label="Previous month">&#8249;</button>');
            html.push(`<div class="ts-cal-caption" aria-live="polite">${MONTHS[vd.getMonth()]} ${vd.getFullYear()}</div>`);
            html.push('<button class="ts-cal-nav ts-cal-next" aria-label="Next month">&#8250;</button>');
            html.push('</div>');

            /* Grid */
            html.push(`<table class="ts-cal-table" role="grid" aria-label="${MONTHS[vd.getMonth()]} ${vd.getFullYear()}">`);
            html.push('<thead><tr class="ts-cal-head-row">');
            dayLabels.forEach(d => html.push(`<th class="ts-cal-head-cell" scope="col">${d}</th>`));
            html.push('</tr></thead><tbody>');

            const cells = self._buildDayGrid(vd, o.weekStartsOn || 0, o.fixedWeeks);
            let rowOpen = false;
            cells.forEach((cell, i) => {
                if (i % 7 === 0) {
                    if (rowOpen) html.push('</tr>');
                    html.push('<tr class="ts-cal-row">');
                    rowOpen = true;
                }
                html.push(self._renderCell(cell, focusDate));
            });
            if (rowOpen) html.push('</tr>');
            html.push('</tbody></table>');

            /* Footer */
            if (o.showFooter) {
                html.push('<div class="ts-cal-footer">');
                html.push('<button class="ts-cal-today-btn">Today</button>');
                html.push('</div>');
            }

            self.$cal.html(html.join(''));
        }

        _renderCell(cell, focusDate) {
            const self = this;
            const o    = self.options;

            const dateStr  = self._toISODate(cell.date);
            const dayClass = ['ts-cal-day'];
            const tdClass  = ['ts-cal-cell'];
            const attrs    = [
                `data-date="${dateStr}"`,
                `aria-label="${cell.date.toLocaleDateString(undefined, {
                    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                })}"`,
            ];

            if (cell.outside)  dayClass.push('ts-cal-day--outside');
            if (cell.today)    dayClass.push('ts-cal-day--today');
            if (cell.disabled) {
                dayClass.push('ts-cal-day--disabled');
                attrs.push('disabled', 'aria-disabled="true"');
            }

            let isSelected = false;

            if (o.mode === 'single') {
                isSelected = !!(self._selected && self._sameDay(cell.date, self._selected));

            } else if (o.mode === 'multiple') {
                isSelected = Array.isArray(self._selected)
                    && self._selected.some(d => self._sameDay(d, cell.date));

            } else if (o.mode === 'range') {
                let from = null;
                let to   = null;

                if (self._rangeAnchor) {
                    from = self._rangeAnchor;
                    to   = self._hoverDate || null;
                    if (from && to && from > to) { [from, to] = [to, from]; }
                } else if (self._selected) {
                    from = self._selected.from;
                    to   = self._selected.to;
                }

                const isStart = from && self._sameDay(cell.date, from);
                const isEnd   = to   && self._sameDay(cell.date, to);
                const isRange = from && to && cell.date > from && cell.date < to;

                if (isStart) {
                    isSelected = true;
                    dayClass.push('ts-cal-day--range-start');
                    tdClass.push('ts-cal-cell--range-start');
                }
                if (isEnd) {
                    isSelected = true;
                    dayClass.push('ts-cal-day--range-end');
                    tdClass.push('ts-cal-cell--range-end');
                }
                if (isRange) {
                    tdClass.push('ts-cal-cell--in-range');
                }
            }

            if (isSelected) {
                dayClass.push('ts-cal-day--selected');
                attrs.push('aria-selected="true"');
            }

            const isFocus = focusDate && self._sameDay(cell.date, focusDate);
            attrs.push(`tabindex="${isFocus ? '0' : '-1'}"`);

            return `<td class="${tdClass.join(' ')}" role="gridcell">`
                 + `<button class="${dayClass.join(' ')}" ${attrs.join(' ')}>`
                 + cell.date.getDate()
                 + '</button></td>';
        }

        _buildDayGrid(viewDate, weekStartsOn, fixedWeeks) {
            const self  = this;
            const o     = self.options;
            const year  = viewDate.getFullYear();
            const month = viewDate.getMonth();
            const today = new Date();

            const firstDay = new Date(year, month, 1);
            const lastDay  = new Date(year, month + 1, 0);
            const startDow = (firstDay.getDay() - weekStartsOn + 7) % 7;

            const cells = [];

            /* Padding from previous month */
            for (let i = startDow; i > 0; i--) {
                const d = new Date(year, month, 1 - i);
                cells.push({
                    date:     d,
                    outside:  true,
                    today:    false,
                    disabled: !o.showOutsideDays || self._isDisabled(d),
                });
            }

            /* Current month */
            for (let n = 1; n <= lastDay.getDate(); n++) {
                const d = new Date(year, month, n);
                cells.push({
                    date:     d,
                    outside:  false,
                    today:    self._sameDay(d, today),
                    disabled: self._isDisabled(d),
                });
            }

            /* Trailing days from next month */
            const rowCount = fixedWeeks ? 6 : Math.ceil(cells.length / 7);
            const total    = rowCount * 7;
            let nxt = 1;
            while (cells.length < total) {
                const d = new Date(year, month + 1, nxt++);
                cells.push({
                    date:     d,
                    outside:  true,
                    today:    false,
                    disabled: !o.showOutsideDays || self._isDisabled(d),
                });
            }

            return cells;
        }

        _isDisabled(date) {
            const o = this.options;
            if (o.minDate) {
                const min = this._parseDate(o.minDate);
                if (min && date < min) return true;
            }
            if (o.maxDate) {
                const max = this._parseDate(o.maxDate);
                if (max && date > max) return true;
            }
            if (typeof o.disabled === 'function') return !!o.disabled(date);
            if (Array.isArray(o.disabled)) {
                return o.disabled.some(d => this._sameDay(this._parseDate(d), date));
            }
            return false;
        }

        _sameDay(a, b) {
            if (!a || !b) return false;
            return a.getFullYear() === b.getFullYear()
                && a.getMonth()    === b.getMonth()
                && a.getDate()     === b.getDate();
        }

        _parseDate(d) {
            if (!d) return null;
            if (d instanceof Date) {
                return new Date(d.getFullYear(), d.getMonth(), d.getDate());
            }
            if (typeof d === 'string') {
                const p = d.split('-').map(Number);
                if (p.length === 3) return new Date(p[0], p[1] - 1, p[2]);
            }
            return null;
        }

        _toISODate(date) {
            if (!date) return '';
            const y = date.getFullYear();
            const m = String(date.getMonth() + 1).padStart(2, '0');
            const d = String(date.getDate()).padStart(2, '0');
            return `${y}-${m}-${d}`;
        }

        _addDays(date, n) {
            const d = new Date(date);
            d.setDate(d.getDate() + n);
            return d;
        }

        _addMonths(date, n) {
            const d = new Date(date);
            d.setMonth(d.getMonth() + n);
            return d;
        }

        _fireSelect(date, selected) {
            this._dispatch('ts.calendar.select', { date, selected });
            if (typeof this.options.onSelect === 'function') {
                this.options.onSelect(selected);
            }
        }

        _dispatch(eventName, detail) {
            this.$el[0].dispatchEvent(new CustomEvent(eventName, {
                bubbles:    true,
                cancelable: true,
                detail,
            }));
        }

    }

    PluginCalendar.instances = 0;

    PluginCalendar.defaults = {
        /* Selection mode: 'single' | 'multiple' | 'range' */
        mode:            'single',
        /* Pre-selected value. Shape matches mode:
             single:   Date | 'YYYY-MM-DD' | null
             multiple: Date[] | null
             range:    { from: Date|null, to: Date|null } | null */
        selected:        null,
        /* Month to open on. Defaults to the current month. */
        initialMonth:    null,
        /* Render days from the previous/next month in the first/last row */
        showOutsideDays: true,
        /* 0 = week starts Sunday, 1 = week starts Monday */
        weekStartsOn:    0,
        /* Lower bound for selectable dates (inclusive) */
        minDate:         null,
        /* Upper bound for selectable dates (inclusive) */
        maxDate:         null,
        /* Specific dates to disable. Accepts Date[], 'YYYY-MM-DD'[], or
           a function (date) => boolean */
        disabled:        [],
        /* Always render exactly 6 rows regardless of the month */
        fixedWeeks:      false,
        /* Show a "Today" button beneath the grid */
        showFooter:      false,
        /* Callback fired after a selection is committed.
           Receives the same value shape as `selected`. */
        onSelect:        null,
    };

    $.extend(themestrap, { PluginCalendar });

    $.fn.themestrapPluginCalendar = function(opts) {
        return this.map(function() {
            const $this = $(this);
            if ($this.data(instanceName)) {
                return $this.data(instanceName);
            } else {
                return new PluginCalendar($this, opts);
            }
        });
    };
})).apply(this, [window.themestrap, jQuery]);
