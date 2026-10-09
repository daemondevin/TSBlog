// TagsInput
(((themestrap = {}, $) => {
    const instanceName = '__tagsinput';
    const STYLE_ID     = 'ts-tagsinput-styles';
    let   instanceCount = 0;

    const INJECTED_CSS = `
        .ts-tagsinput {
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

            self.$container.append(self.$tagArea).append(self.$field);
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

        addTag(text, silent) {
            const self = this;
            if (!text || typeof text !== 'string') return this;

            const trimmed = text.trim();
            if (!trimmed) return this;

            if (self.options.validateEmail) {
                const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!re.test(trimmed)) {
                    self.$container.addClass('ts-ti-invalid');
                    setTimeout(() => self.$container.removeClass('ts-ti-invalid'), 700);
                    return this;
                }
            }

            if (self.tags.indexOf(trimmed) !== -1) return this;

            self.tags.push(trimmed);
            self._syncInput();

            const $tag = $(`<span class="ts-tag"></span>`)
                .text(trimmed)
                .append(' <button type="button" class="ts-tag-remove" aria-label="Remove">&times;</button>')
                .data('ts-tag', trimmed);

            self.$tagArea.append($tag);

            if (!silent) {
                self.$el[0].dispatchEvent(new CustomEvent('ts.tagsinput.add', {
                    detail: { tag: trimmed, tags: self.getTags() },
                    bubbles: true
                }));
            }

            return this;
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
        validateEmail: true
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
