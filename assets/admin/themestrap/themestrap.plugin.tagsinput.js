/**
 * Themestrap TagsInput
 *
 * Turns a text input into a field of removable tags. The source input keeps the tags as "a, b, c".
 *
 * Adding tags:
 *   - Type a tag and press Enter, Tab, comma or semicolon.
 *   - Paste a list: "a, b, c", one tag per line, a column copied from a spreadsheet. Every item becomes its
 *     own tag. A single pasted word is just inserted as text, so you can still edit it before pressing Enter.
 *   - Text that arrives any other way (drag and drop, a phone keyboard, dictation) is split the same way.
 *
 * Options: separators, splitOnSpace, maxTags, ignoreCase, normalize (see PluginTagsInput.defaults).
 * Events:  ts.tagsinput.add, ts.tagsinput.remove, ts.tagsinput.paste (detail: { added, skipped, tags }).
 */
// TagsInput
(((themestrap = {}, $) => {
    const instanceName = '__tagsinput';
    const STYLE_ID     = 'ts-tagsinput-styles';
    let   instanceCount = 0;

    const INJECTED_CSS = `
        .ts-tagsinput {
            position: relative;
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: 5px;
            padding: 6px 8px;
            background: var(--ts-ti-bg, rgba(255,255,255,0.03));
            border: 1px solid var(--ts-ti-border, rgba(255,255,255,0.10));
            border-radius: var(--ts-ti-radius, 5px);
            cursor: text;
            min-height: 40px;
            transition: border-color 0.15s;
        }
        .ts-tagsinput:hover {
            border-color: var(--ts-ti-border-hover, rgba(255,255,255,0.20));
        }
        .ts-tagsinput.ts-ti-focused {
            border-color: var(--ts-ti-border-focus, #00c7be);
            outline: none;
        }
        .ts-tagsinput.ts-ti-invalid {
            border-color: var(--ts-ti-border-invalid, #e74c3c);
            animation: ts-ti-shake 0.35s ease;
        }
        @keyframes ts-ti-shake {
            0%,100% { transform: translateX(0); }
            25%      { transform: translateX(-4px); }
            75%      { transform: translateX(4px); }
        }
        .ts-tagsinput-source {
            display: none !important;
        }
        .ts-ti-live {
            position: absolute;
            width: 1px;
            height: 1px;
            overflow: hidden;
            clip: rect(0 0 0 0);
            white-space: nowrap;
        }
        .ts-tagsinput-tags {
            display: contents;
        }
        .ts-tag {
            display: inline-flex;
            align-items: center;
            gap: 5px;
            padding: 2px 8px 2px 10px;
            background: var(--ts-ti-tag-bg, rgba(0,199,190,0.15));
            color: var(--ts-ti-tag-text, #00c7be);
            border: 1px solid var(--ts-ti-tag-border, rgba(0,199,190,0.30));
            border-radius: var(--ts-ti-tag-radius, 20px);
            font-size: 12px;
            font-weight: 500;
            line-height: 1.4;
            white-space: nowrap;
            max-width: 240px;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .ts-tag-remove {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 14px;
            height: 14px;
            background: none;
            border: none;
            border-radius: 50%;
            color: inherit;
            opacity: 0.6;
            padding: 0;
            cursor: pointer;
            font-size: 14px;
            line-height: 1;
            flex-shrink: 0;
            transition: opacity 0.12s, background 0.12s;
        }
        .ts-tag-remove:hover {
            opacity: 1;
            background: rgba(0,199,190,0.20);
        }
        .ts-tagsinput-field {
            flex: 1;
            min-width: 120px;
            background: none;
            border: none;
            outline: none;
            color: var(--ts-ti-text, inherit);
            font-size: 13.5px;
            padding: 2px 4px;
            font-family: inherit;
        }
        .ts-tagsinput-field::placeholder {
            color: var(--ts-ti-placeholder, rgba(205,216,230,0.40));
        }
    `;

    class PluginTagsInput {
        constructor($el, opts) {
            return this.initialize($el, opts);
        }

        initialize($el, opts) {
            if ($el.data(instanceName)) { return this; }

            this.$el = $el;

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
            this.options = $.extend(true, {}, PluginTagsInput.defaults, opts, {
                wrapper: this.$el
            });

            // What ends a tag when text is pasted, dropped or inserted. A comma always does, because the source
            // input stores the tags comma separated.
            const o     = this.options;
            const chars = (',' + String(o.separators || '') + '\r').split('').filter((c, i, a) => a.indexOf(c) === i);
            const esc   = chars.map(c => c === '\n' ? '\\n' : c === '\r' ? '\\r' : c === '\t' ? '\\t' : c.replace(/[\\\]\^-]/g, '\\$&')).join('');
            const space = o.splitOnSpace === 'auto' ? !!o.validateEmail : !!o.splitOnSpace;
            this._sepRe = new RegExp('[' + esc + (space ? '\\s' : '') + ']+');
            this._hasSep = new RegExp('[' + esc + (space ? '\\s' : '') + ']');
            return this;
        }

        build() {
            const self = this;

            instanceCount++;
            if (!document.getElementById(STYLE_ID)) {
                const style = document.createElement('style');
                style.id = STYLE_ID;
                style.textContent = INJECTED_CSS;
                document.head.appendChild(style);
            }

            self.tags         = [];
            self.initialValue = self.options.wrapper.val();

            self.$container = $('<div class="ts-tagsinput" role="group" aria-label="Email addresses"></div>');
            self.$tagArea   = $('<span class="ts-tagsinput-tags"></span>');
            self.$field     = $('<input type="text" class="ts-tagsinput-field" autocomplete="off" aria-label="Add address" />');

            if (self.options.placeholder) {
                self.$field.attr('placeholder', self.options.placeholder);
            }

            self.$live = $('<span class="ts-ti-live" role="status" aria-live="polite"></span>');
            self.$container.append(self.$tagArea).append(self.$field).append(self.$live);
            self.options.wrapper.addClass('ts-tagsinput-source').after(self.$container);

            if (self.initialValue) {
                self.initialValue.split(',').forEach(v => {
                    const tag = v.trim();
                    if (tag) self.addTag(tag, true);
                });
            }

            return this;
        }

        events() {
            const self = this;

            self.$field
                .on('focus.tagsinput', () => self.$container.addClass('ts-ti-focused'))
                .on('blur.tagsinput', function() {
                    self.$container.removeClass('ts-ti-focused');
                    const val = $(this).val().trim();
                    if (val) { self.addTag(val); $(this).val(''); }
                })
                .on('paste.tagsinput', function(e) {
                    const cd     = (e.originalEvent || e).clipboardData || window.clipboardData;
                    const pasted = cd ? cd.getData('text') : '';
                    // One entry: let the browser paste it as text so it can still be edited
                    if (!pasted || !self._hasSep.test(pasted.trim())) return;

                    e.preventDefault();
                    const el  = this;
                    const val = el.value;
                    const a   = typeof el.selectionStart === 'number' ? el.selectionStart : val.length;
                    const b   = typeof el.selectionEnd   === 'number' ? el.selectionEnd   : a;
                    el.value  = '';
                    const result = self.addTags(val.slice(0, a) + pasted + val.slice(b));
                    self._announce(result);
                    self.$el[0].dispatchEvent(new CustomEvent('ts.tagsinput.paste', {
                        detail: { added: result.added, skipped: result.skipped, tags: self.getTags() },
                        bubbles: true
                    }));
                })
                .on('input.tagsinput', function(e) {
                    // Text that did not come from the keyboard shortcuts or a paste (drop, phone keyboards, dictation)
                    if ((e.originalEvent || e).isComposing || !self._hasSep.test(this.value)) return;
                    const parts = this.value.split(self._sepRe);
                    this.value  = parts.pop();                  // what is still being typed stays in the field
                    if (parts.length) self.addTags(parts.join(','));
                })
                .on('keydown.tagsinput', function(e) {
                    const val = $(this).val().trim();

                    if ((e.key === 'Enter' || e.key === ',' || e.key === ';' || e.key === 'Tab') && val) {
                        e.preventDefault();
                        self.addTag(val);
                        $(this).val('');
                        return;
                    }

                    if (e.key === 'Backspace' && !$(this).val() && self.tags.length) {
                        self.removeTag(self.tags[self.tags.length - 1]);
                    }
                });

            self.$container
                .on('click.tagsinput', function(e) {
                    if (!$(e.target).is('.ts-tag-remove')) {
                        self.$field.trigger('focus');
                    }
                })
                .on('click.tagsinput', '.ts-tag-remove', function(e) {
                    e.stopPropagation();
                    const tag = $(this).closest('.ts-tag').data('ts-tag');
                    self.removeTag(tag);
                });

            return this;
        }

        // Cleans one entry: trimmed, then through the normalize option
        _clean(text) {
            let t = String(text == null ? '' : text).trim();
            if (typeof this.options.normalize === 'function') t = String(this.options.normalize(t) == null ? '' : this.options.normalize(t)).trim();
            return t;
        }

        _has(tag) {
            if (!this.options.ignoreCase) return this.tags.indexOf(tag) !== -1;
            const low = tag.toLowerCase();
            return this.tags.some(t => t.toLowerCase() === low);
        }

        _shake() {
            const self = this;
            self.$container.addClass('ts-ti-invalid');
            setTimeout(() => self.$container.removeClass('ts-ti-invalid'), 700);
        }

        // Adds one entry and says what happened: 'added', 'invalid', 'duplicate', 'max' or 'empty'
        _addOne(text) {
            const self = this;
            const tag  = self._clean(text);
            if (!tag) return { status: 'empty', tag };

            if (self.options.validateEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(tag)) return { status: 'invalid', tag };
            if (self._has(tag)) return { status: 'duplicate', tag };
            if (self.options.maxTags > 0 && self.tags.length >= self.options.maxTags) return { status: 'max', tag };

            self.tags.push(tag);
            self._syncInput();

            const $tag = $(`<span class="ts-tag"></span>`)
                .text(tag)
                .append(' <button type="button" class="ts-tag-remove" aria-label="Remove">&times;</button>')
                .data('ts-tag', tag);
            self.$tagArea.append($tag);
            return { status: 'added', tag };
        }

        addTag(text, silent) {
            const self = this;
            if (!text || typeof text !== 'string') return this;

            // "a, b" is two tags, not one tag with a comma in it
            if (self._hasSep.test(text.trim())) {
                self.addTags(text, silent);
                return this;
            }

            const r = self._addOne(text);
            if (r.status === 'invalid' || r.status === 'max') self._shake();
            if (r.status === 'added' && !silent) {
                self.$el[0].dispatchEvent(new CustomEvent('ts.tagsinput.add', {
                    detail: { tag: r.tag, tags: self.getTags() },
                    bubbles: true
                }));
            }
            return this;
        }

        // Splits text into entries and adds each one. Returns { added: [tags], skipped: [{ tag, reason }] }.
        addTags(text, silent) {
            const self    = this;
            const added   = [];
            const skipped = [];
            if (typeof text !== 'string') return { added, skipped };

            text.split(self._sepRe).forEach(part => {
                const r = self._addOne(part);
                if (r.status === 'added') {
                    added.push(r.tag);
                    if (!silent) {
                        self.$el[0].dispatchEvent(new CustomEvent('ts.tagsinput.add', {
                            detail: { tag: r.tag, tags: self.getTags() },
                            bubbles: true
                        }));
                    }
                } else if (r.status !== 'empty') {
                    skipped.push({ tag: r.tag, reason: r.status });
                }
            });

            if (skipped.some(k => k.reason === 'invalid' || k.reason === 'max')) self._shake();
            return { added, skipped };
        }

        // A short note for screen readers after a batch
        _announce(result) {
            const m = this.options.messages;
            let text = result.added.length ? m.added.replace('%n', result.added.length) : '';
            if (result.skipped.length) text += (text ? ', ' : '') + m.skipped.replace('%n', result.skipped.length);
            this.$live.text(text);
        }

        removeTag(text) {
            const self = this;
            const idx = self.tags.indexOf(text);
            if (idx === -1) return this;

            self.tags.splice(idx, 1);
            self._syncInput();

            self.$tagArea.find('.ts-tag').filter(function() {
                return $(this).data('ts-tag') === text;
            }).first().remove();

            self.$el[0].dispatchEvent(new CustomEvent('ts.tagsinput.remove', {
                detail: { tag: text, tags: self.getTags() },
                bubbles: true
            }));

            return this;
        }

        getTags()        { return this.tags.slice(); }
        clearTags()      { this.tags = []; this.$tagArea.empty(); this._syncInput(); return this; }
        _syncInput()     { this.options.wrapper.val(this.tags.join(', ')); }

        destroy() {
            const self = this;
            self.$field.off('.tagsinput');
            self.$container.off('.tagsinput').remove();
            self.options.wrapper.removeClass('ts-tagsinput-source').removeData(instanceName);

            instanceCount--;
            if (instanceCount <= 0) {
                const styleEl = document.getElementById(STYLE_ID);
                if (styleEl) styleEl.remove();
            }

            return this;
        }
    }

    PluginTagsInput.defaults = {
        placeholder:   'Add address...',
        validateEmail: true,
        separators:    ',;\n\t',    // what ends a tag when text is pasted or dropped. A comma always does. '' for commas only
        splitOnSpace:  'auto',        // also split on whitespace. 'auto' follows validateEmail: addresses never contain spaces, keywords often do
        maxTags:       0,             // 0 for no limit. Extra tags are skipped (reason 'max') and the field shakes
        ignoreCase:    false,         // treat "Web" and "web" as the same tag
        normalize:     null,          // function (text) { return text; } runs on every entry before it is checked
        messages:      { added: '%n added', skipped: '%n skipped' }   // spoken to screen readers after a paste
    };

    $.extend(themestrap, { PluginTagsInput });

    $.fn.themestrapPluginTagsInput = function(opts) {
        return this.map(function() {
            const $this = $(this);
            if ($this.data(instanceName)) {
                return $this.data(instanceName);
            } else {
                return new PluginTagsInput($this, opts);
            }
        });
    };
})).apply(this, [window.themestrap, jQuery]);
