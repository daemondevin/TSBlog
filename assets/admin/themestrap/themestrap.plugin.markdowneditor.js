/**
 * Themestrap MarkdownEditor
 *
 * A distraction-free Markdown writing surface that enhances a plain <textarea>.
 * The textarea stays the source of truth (so normal form posts keep working), and
 * gains a PluginToolbar, smart list/quote continuation, image paste and drop upload,
 * a live preview rendered by PluginMarkdown, and a focus-friendly fullscreen mode.
 *
 * Markup:
 *
 *   <textarea name="body" data-plugin-markdowneditor
 *             data-plugin-options='{"view": "split", "minHeight": 420}'>
 *   # Hello
 *   </textarea>
 *
 * Public API (via stored instance):
 *   const ed = $('#body').data('__pluginMarkdownEditor');
 *   ed.getValue();                 // Markdown string
 *   ed.setValue(md, silent);       // replace content, silent skips the change event
 *   ed.getHtml();                  // rendered preview HTML
 *   ed.insert(text);               // insert at the caret (replaces the selection)
 *   ed.wrap(before, after, hint);  // toggle an inline wrapper around the selection
 *   ed.command('bold');            // run any toolbar command by key
 *   ed.setView('write|split|preview');
 *   ed.fullscreen(true|false);
 *   ed.setStatus('Saved');         // short message in the status bar
 *   ed.focus(); ed.enable(); ed.disable(); ed.destroy();
 *
 * Events (native CustomEvent dispatched on the textarea, bubbles):
 *   ts.markdowneditor.change   detail: { instance, value }
 *   ts.markdowneditor.save     detail: { instance }      Ctrl/Cmd+S pressed
 *   ts.markdowneditor.view     detail: { instance, view }
 *   ts.markdowneditor.upload   detail: { instance, file, url }
 *   ts.markdowneditor.error    detail: { instance, error }
 *   ts.markdowneditor.focus / ts.markdowneditor.blur
 *
 * CSS custom properties (all optional):
 *   --ts-me-bg, --ts-me-border, --ts-me-border-focus, --ts-me-radius, --ts-me-text,
 *   --ts-me-muted, --ts-me-toolbar-bg, --ts-me-font, --ts-me-font-size,
 *   --ts-me-line-height, --ts-me-padding, --ts-me-preview-bg, --ts-me-code-bg, --ts-me-link
 *
 * The renderer option may return HTML or a Promise of HTML, which lets the preview use the
 * same server-side renderer as the published site.
 *
 * Init.js wiring:
 *   if ($.isFunction($.fn['themestrapPluginMarkdownEditor']) && $('[data-plugin-markdowneditor]').length) {
 *       themestrap.fn.intObsInit('[data-plugin-markdowneditor]:not(.manual)', 'themestrapPluginMarkdownEditor');
 *   }
 */
// Markdown Editor
(((themestrap = {}, $) => {
    const instanceName = '__pluginMarkdownEditor';
    const STYLE_ID     = 'ts-markdowneditor-styles';
    const EVENT_NS     = 'markdowneditor';

    let instanceCount = 0;
    let seq           = 0;

    const IS_MAC = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || '');
    const MOD    = IS_MAC ? '\u2318' : 'Ctrl+';

    const LIGHT_TOKENS = `
        --me-bg:          var(--ts-me-bg, #ffffff);
        --me-border:      var(--ts-me-border, rgba(0,0,0,.14));
        --me-toolbar-bg:  var(--ts-me-toolbar-bg, rgba(0,0,0,.035));
        --me-text:        var(--ts-me-text, #1f2937);
        --me-muted:       var(--ts-me-muted, rgba(31,41,55,.55));
        --me-preview-bg:  var(--ts-me-preview-bg, rgba(0,0,0,.02));
        --me-code-bg:     var(--ts-me-code-bg, rgba(0,0,0,.06));
        --me-link:        var(--ts-me-link, #0b8a83);
        --me-accent:      var(--ts-me-border-focus, #00a89f);
    `;

    const DARK_TOKENS = `
        --me-bg:          var(--ts-me-bg, rgba(255,255,255,.02));
        --me-border:      var(--ts-me-border, rgba(255,255,255,.10));
        --me-toolbar-bg:  var(--ts-me-toolbar-bg, rgba(0,0,0,.20));
        --me-text:        var(--ts-me-text, #cdd8e6);
        --me-muted:       var(--ts-me-muted, rgba(205,216,230,.55));
        --me-preview-bg:  var(--ts-me-preview-bg, rgba(255,255,255,.03));
        --me-code-bg:     var(--ts-me-code-bg, rgba(255,255,255,.08));
        --me-link:        var(--ts-me-link, #00c7be);
        --me-accent:      var(--ts-me-border-focus, #00c7be);
    `;

    const INJECTED_CSS = `
        .ts-mdeditor { ${LIGHT_TOKENS} }
        @media (prefers-color-scheme: dark) {
            .ts-mdeditor { ${DARK_TOKENS} }
        }
        html.dark .ts-mdeditor,
        [data-bs-theme="dark"] .ts-mdeditor { ${DARK_TOKENS} }
        [data-bs-theme="light"] .ts-mdeditor,
        html [data-bs-theme="light"] .ts-mdeditor { ${LIGHT_TOKENS} }

        .ts-mdeditor {
            display: flex;
            flex-direction: column;
            background: var(--me-bg);
            border: 1px solid var(--me-border);
            border-radius: var(--ts-me-radius, 6px);
            overflow: hidden;
            transition: border-color .15s, box-shadow .15s;
        }
        .ts-mdeditor.ts-me-focused {
            border-color: var(--me-accent);
            box-shadow: 0 0 0 3px color-mix(in srgb, var(--me-accent) 18%, transparent);
        }
        .ts-mdeditor.ts-me-disabled { opacity: .6; }
        .ts-mdeditor.ts-me-disabled .ts-toolbar { pointer-events: none; }

        .ts-mdeditor .ts-toolbar {
            --ts-tb-bg:     var(--me-toolbar-bg);
            --ts-tb-border: transparent;
            --ts-tb-shadow: none;
            --ts-tb-radius: 0;
            width: 100%;
            max-width: 100%;
            flex-wrap: wrap;
            border-radius: 0;
            border-bottom: 1px solid var(--me-border);
        }
        .ts-mdeditor .ts-toolbar [data-toolbar-toggle-item][aria-pressed="true"] {
            --ts-tb-on-bg: var(--me-accent);
        }
        .ts-me-spacer { flex: 1 1 auto; }

        .ts-me-panes { display: flex; flex: 1; min-height: 0; }
        .ts-me-write,
        .ts-me-preview { flex: 1 1 0; min-width: 0; position: relative; }
        .ts-me-view-write   .ts-me-preview { display: none; }
        .ts-me-view-preview .ts-me-write   { display: none; }
        .ts-me-view-split   .ts-me-write   { border-right: 1px solid var(--me-border); }
        .ts-me-view-split .ts-me-panes,
        .ts-me-view-preview .ts-me-panes { height: var(--ts-me-height, 420px); }
        .ts-me-view-split .ts-me-write,
        .ts-me-view-split .ts-me-preview,
        .ts-me-view-preview .ts-me-preview { overflow-y: auto; }

        .ts-me-input {
            display: block;
            width: 100%;
            height: 100%;
            min-height: var(--ts-me-height, 420px);
            margin: 0;
            padding: var(--ts-me-padding, 16px 18px);
            border: 0;
            outline: 0;
            resize: none;
            background: transparent;
            color: var(--me-text);
            font-family: var(--ts-me-font, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace);
            font-size: var(--ts-me-font-size, 15px);
            line-height: var(--ts-me-line-height, 1.7);
            tab-size: 4;
            box-sizing: border-box;
        }
        .ts-me-input::placeholder { color: var(--me-muted); opacity: .8; }
        .ts-me-view-write .ts-me-input { overflow: hidden; }
        .ts-me-view-split .ts-me-input { min-height: 100%; }

        .ts-me-preview {
            padding: var(--ts-me-padding, 16px 18px);
            background: var(--me-preview-bg);
            color: var(--me-text);
            font-size: 15px;
            line-height: 1.7;
            word-break: break-word;
        }
        .ts-me-preview-body > :first-child { margin-top: 0; }
        .ts-me-preview-body > :last-child  { margin-bottom: 0; }
        .ts-me-preview a { color: var(--me-link); }
        .ts-me-preview img { max-width: 100%; height: auto; border-radius: 4px; }
        .ts-me-preview blockquote { margin: 0 0 1em; padding-left: 1em; border-left: 3px solid var(--me-accent); color: var(--me-muted); }
        .ts-me-preview pre { background: var(--me-code-bg); padding: 12px 14px; border-radius: 6px; overflow-x: auto; }
        .ts-me-preview code { background: var(--me-code-bg); padding: .1em .35em; border-radius: 4px; font-size: .9em; }
        .ts-me-preview pre code { background: none; padding: 0; }
        .ts-me-preview table { border-collapse: collapse; margin-bottom: 1em; }
        .ts-me-preview th, .ts-me-preview td { border: 1px solid var(--me-border); padding: 4px 10px; }
        .ts-me-preview hr { border: 0; border-top: 1px solid var(--me-border); }
        .ts-me-preview-empty { color: var(--me-muted); font-style: italic; }

        .ts-me-status {
            display: flex;
            gap: 14px;
            align-items: center;
            padding: 6px 14px;
            border-top: 1px solid var(--me-border);
            background: var(--me-toolbar-bg);
            color: var(--me-muted);
            font-size: 12px;
        }
        .ts-me-msg { margin-left: auto; }
        .ts-me-dropping .ts-me-write::after {
            content: 'Drop image to upload';
            position: absolute;
            inset: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 2px dashed var(--me-accent);
            border-radius: 8px;
            background: color-mix(in srgb, var(--me-bg) 88%, transparent);
            color: var(--me-accent);
            font-weight: 600;
            pointer-events: none;
        }

        .ts-mdeditor.ts-me-fullscreen {
            position: fixed;
            inset: 0;
            z-index: 1040;
            border-radius: 0;
            border: 0;
            --ts-me-height: calc(100vh - 100px);
        }
        .ts-mdeditor.ts-me-fullscreen .ts-me-panes { height: auto; }
        .ts-mdeditor.ts-me-fullscreen.ts-me-view-write .ts-me-write { overflow-y: auto; }
        .ts-mdeditor.ts-me-fullscreen.ts-me-view-write .ts-me-input { overflow: auto; }
        body.ts-me-lock { overflow: hidden; }
    `;

    // Toolbar commands. type: wrap | line | block | action
    const CMDS = {
        bold:      { icon: 'fas fa-bold',          label: 'Bold',          key: 'B' },
        italic:    { icon: 'fas fa-italic',        label: 'Italic',        key: 'I' },
        strike:    { icon: 'fas fa-strikethrough', label: 'Strikethrough' },
        code:      { icon: 'fas fa-code',          label: 'Inline code' },
        h2:        { icon: 'fas fa-heading',       label: 'Heading',       text: 'H2' },
        h3:        { icon: 'fas fa-heading',       label: 'Subheading',    text: 'H3' },
        quote:     { icon: 'fas fa-quote-left',    label: 'Quote' },
        ul:        { icon: 'fas fa-list-ul',       label: 'Bullet list' },
        ol:        { icon: 'fas fa-list-ol',       label: 'Numbered list' },
        task:      { icon: 'fas fa-list-check',    label: 'Task list' },
        link:      { icon: 'fas fa-link',          label: 'Link',          key: 'K' },
        image:     { icon: 'fas fa-image',         label: 'Image' },
        codeblock: { icon: 'fas fa-file-code',     label: 'Code block' },
        hr:        { icon: 'fas fa-minus',         label: 'Divider' },
        table:     { icon: 'fas fa-table',         label: 'Table' }
    };

    const VIEWS = {
        write:   { icon: 'fas fa-pen',            label: 'Write' },
        split:   { icon: 'fas fa-table-columns',  label: 'Write and preview' },
        preview: { icon: 'fas fa-eye',            label: 'Preview' }
    };

    const titleFor = (d) => (d.key ? `${d.label} (${MOD}${d.key})` : d.label);
    const toPx     = (v) => (typeof v === 'number' ? `${v}px` : v);

    class PluginMarkdownEditor {
        constructor($el, opts) {
            return this.initialize($el, opts);
        }

        initialize($el, opts) {
            if ($el.data(instanceName)) {
                return this;
            }

            this.$el     = $el;
            this._uid    = ++seq;
            this._ns     = `${EVENT_NS}${this._uid}`;
            this._view   = 'write';
            this._failed = false;
            this._timer  = null;

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
            this.options = $.extend(true, {}, PluginMarkdownEditor.defaults, opts, {
                wrapper: this.$el
            });
            // Arrays are replaced wholesale, not merged index by index
            if (opts && Array.isArray(opts.toolbar)) this.options.toolbar = opts.toolbar.slice();
            if (opts && typeof opts.imageUpload === 'function') this.options.imageUpload = opts.imageUpload;
            if (opts && typeof opts.renderer === 'function')    this.options.renderer = opts.renderer;
            return this;
        }

        build() {
            const self = this;
            const opts = self.options;

            if (!self.$el.is('textarea')) {
                console.error('PluginMarkdownEditor: the host element must be a <textarea>.');
                self._failed = true;
                self.$el.removeData(instanceName);
                return this;
            }
            if (opts.toolbar !== false && typeof $.fn.themestrapPluginToolbar !== 'function') {
                if (themestrap.fn && typeof themestrap.fn.showErrorMessage === 'function') {
                    themestrap.fn.showErrorMessage('Failed to Load File',
                        'Failed to load: PluginToolbar - Include the following file(s): (components/themestrap.plugin.toolbar.js)');
                } else {
                    console.error('PluginMarkdownEditor: PluginToolbar must be loaded first.');
                }
                self._failed = true;
                self.$el.removeData(instanceName);
                return this;
            }

            instanceCount++;
            if (!document.getElementById(STYLE_ID)) {
                const style       = document.createElement('style');
                style.id          = STYLE_ID;
                style.textContent = INJECTED_CSS;
                document.head.appendChild(style);
            }

            self.$ta    = self.$el;
            self.$wrap  = $('<div class="ts-mdeditor"></div>');
            self.$panes = $('<div class="ts-me-panes"></div>');
            self.$write = $('<div class="ts-me-write"></div>');

            // The textarea keeps its place in the DOM tree, inside the new wrapper
            self.$wrap.insertBefore(self.$ta);
            self.$ta.addClass('ts-me-input').attr({ spellcheck: 'true' });
            if (opts.placeholder) self.$ta.attr('placeholder', opts.placeholder);
            if (opts.ariaLabel && !self.$ta.attr('aria-label')) self.$ta.attr('aria-label', opts.ariaLabel);
            self.$write.append(self.$ta);
            self.$panes.append(self.$write);

            if (opts.minHeight) self.$wrap[0].style.setProperty('--ts-me-height', toPx(opts.minHeight));

            if (opts.preview) {
                self.$preview = $('<div class="ts-me-preview" tabindex="-1"><div class="ts-me-preview-body"></div></div>');
                self.$previewBody = self.$preview.find('.ts-me-preview-body');
                self.$panes.append(self.$preview);
                if (!opts.renderer && typeof $.fn.themestrapPluginMarkdown === 'function') {
                    // A detached host: PluginMarkdown renders into it and the HTML is copied across
                    self.$mdHost = $('<div></div>');
                    self.$mdHost.themestrapPluginMarkdown({
                        sanitize: opts.sanitize, breaks: opts.breaks, highlight: false
                    });
                    self._md = $(self.$mdHost[0]).data('__pluginMarkdown');
                }
            }

            if (opts.toolbar !== false) {
                self.$toolbarEl = self._buildToolbarEl();
                self.$wrap.append(self.$toolbarEl);
                self.$toolbarEl.themestrapPluginToolbar($.extend({}, opts.toolbarOptions));
            }

            self.$wrap.append(self.$panes);

            if (opts.statusBar) {
                self.$status = $('<div class="ts-me-status"><span class="ts-me-words"></span><span class="ts-me-time"></span><span class="ts-me-msg" role="status"></span></div>');
                self.$wrap.append(self.$status);
            }

            self.setView(opts.view, true);
            self._updateStatus();
            self._autoGrow();
            if (opts.disabled) self.disable();

            return this;
        }

        _buildToolbarEl() {
            const self = this;
            const t    = self.options.toolbar;
            const keys = (t === true || !Array.isArray(t)) ? PluginMarkdownEditor.defaults.toolbar : t;
            const parts = [];
            let group = [];

            const flush = () => { if (group.length) { parts.push(group.join('')); group = []; } };

            keys.forEach((k) => {
                if (k === '|')      { flush(); return; }
                if (k === 'views')  { flush(); parts.push(self._viewsHtml()); return; }
                if (k === 'spacer') { flush(); parts.push('<span class="ts-me-spacer"></span>'); return; }
                if (k === 'fullscreen') {
                    flush();
                    parts.push(`<button type="button" class="ts-tb-icon" data-toolbar-button data-toolbar-value="fullscreen"
                        title="Fullscreen (Esc to leave)" aria-label="Fullscreen"><i class="fas fa-expand" aria-hidden="true"></i></button>`);
                    return;
                }
                const d = CMDS[k];
                if (!d) return;
                group.push(`<button type="button" class="ts-tb-icon" data-toolbar-button data-toolbar-value="${k}"
                    title="${titleFor(d)}" aria-label="${d.label}">
                    ${d.text ? `<span class="ts-me-ico-text">${d.text}</span>` : `<i class="${d.icon}" aria-hidden="true"></i>`}
                </button>`);
            });
            flush();

            return $(`<div>${parts.join('<hr data-toolbar-separator>')}</div>`);
        }

        _viewsHtml() {
            const items = Object.keys(VIEWS).map((k) => {
                const d = VIEWS[k];
                return `<button type="button" class="ts-tb-icon" data-toolbar-toggle-item data-toolbar-value="${k}"
                    title="${d.label}" aria-label="${d.label}"><i class="${d.icon}" aria-hidden="true"></i></button>`;
            }).join('');
            return `<div data-toolbar-toggle-group data-toolbar-type="single" data-toolbar-group-label="Editor view">${items}</div>`;
        }

        events() {
            const self = this;
            if (self._failed) return this;

            if (self.$toolbarEl) {
                // Keep the caret and selection in the textarea while toolbar buttons are pressed
                self.$toolbarEl.on(`mousedown.${EVENT_NS}`, (e) => e.preventDefault());
                self.$toolbarEl[0].addEventListener('toolbar:button', (e) => {
                    if (e.detail.value === 'fullscreen') self.fullscreen(!self._full);
                    else self.command(e.detail.value);
                });
                self.$toolbarEl[0].addEventListener('toolbar:toggle', (e) => {
                    if (VIEWS[e.detail.value]) self.setView(e.detail.value);
                });
            }

            self.$ta
                .on(`focus.${EVENT_NS}`, () => {
                    self.$wrap.addClass('ts-me-focused');
                    self._dispatch('ts.markdowneditor.focus');
                })
                .on(`blur.${EVENT_NS}`, () => {
                    self.$wrap.removeClass('ts-me-focused');
                    self._dispatch('ts.markdowneditor.blur');
                })
                .on(`input.${EVENT_NS}`, () => {
                    self._autoGrow();
                    self._updateStatus();
                    self._queuePreview();
                    self._dispatch('ts.markdowneditor.change', { value: self.getValue() });
                    if (typeof self.options.onChange === 'function') self.options.onChange.call(self, self.getValue());
                })
                .on(`keydown.${EVENT_NS}`, (e) => self._onKeydown(e))
                .on(`paste.${EVENT_NS}`, (e) => self._onPaste(e))
                .on(`scroll.${EVENT_NS}`, () => self._syncScroll('write'));

            if (self.$preview) {
                self.$preview.on(`scroll.${EVENT_NS}`, () => self._syncScroll('preview'));
            }

            // Drag and drop images onto the writing surface
            self.$write
                .on(`dragover.${EVENT_NS} dragenter.${EVENT_NS}`, (e) => {
                    if (!self._hasImageFiles(e.originalEvent.dataTransfer)) return;
                    e.preventDefault();
                    self.$wrap.addClass('ts-me-dropping');
                })
                .on(`dragleave.${EVENT_NS} drop.${EVENT_NS}`, (e) => {
                    if (e.type === 'dragleave' && self.$write[0].contains(e.originalEvent.relatedTarget)) return;
                    self.$wrap.removeClass('ts-me-dropping');
                })
                .on(`drop.${EVENT_NS}`, (e) => {
                    const dt = e.originalEvent.dataTransfer;
                    if (!self._hasImageFiles(dt)) return;
                    e.preventDefault();
                    self._uploadFiles(dt.files);
                });

            $(document).on(`keydown.${self._ns}`, (e) => {
                if (e.key === 'Escape' && self._full) self.fullscreen(false);
            });

            return this;
        }

        // Selection and text helpers

        _sel() {
            const ta = this.$ta[0];
            return { s: ta.selectionStart, e: ta.selectionEnd, v: ta.value };
        }

        // Replaces [start, end) with text through the browser edit stack when possible, so undo keeps working
        _replace(start, end, text, selStart, selEnd) {
            const ta = this.$ta[0];
            ta.focus();
            ta.setSelectionRange(start, end);
            let ok = false;
            try { ok = document.execCommand('insertText', false, text); } catch (err) { ok = false; }
            if (!ok || ta.value.slice(start, start + text.length) !== text) {
                ta.setRangeText(text, start, end, 'end');
                ta.dispatchEvent(new Event('input', { bubbles: true }));
            }
            const a = selStart === undefined ? start + text.length : selStart;
            const b = selEnd   === undefined ? a : selEnd;
            ta.setSelectionRange(a, b);
            return this;
        }

        _lineRange(s, e) {
            const v = this.$ta[0].value;
            const start = v.lastIndexOf('\n', s - 1) + 1;
            let end = v.indexOf('\n', e);
            if (end === -1) end = v.length;
            // A selection that ends right after a newline should not pull in the next line
            if (e > s && v[e - 1] === '\n') end = e - 1;
            return { start, end };
        }

        // Public editing API

        insert(text) {
            const { s, e } = this._sel();
            return this._replace(s, e, text);
        }

        wrap(before, after, hint) {
            after = after === undefined ? before : after;
            const { s, e, v } = this._sel();
            const sel = v.slice(s, e);
            const bl = before.length, al = after.length;

            // Already wrapped outside the selection: unwrap
            if (s >= bl && v.slice(s - bl, s) === before && v.slice(e, e + al) === after) {
                return this._replace(s - bl, e + al, sel, s - bl, s - bl + sel.length);
            }
            // Selection includes the wrappers: unwrap
            if (sel.length >= bl + al && sel.startsWith(before) && sel.endsWith(after)) {
                const inner = sel.slice(bl, sel.length - al);
                return this._replace(s, e, inner, s, s + inner.length);
            }
            const inner = sel || hint || '';
            return this._replace(s, e, before + inner + after, s + bl, s + bl + inner.length);
        }

        // Applies a transform to every line in the selection
        _lines(fn) {
            const { s, e, v } = this._sel();
            const { start, end } = this._lineRange(s, e);
            const lines = v.slice(start, end).split('\n');
            const out = fn(lines).join('\n');
            return this._replace(start, end, out, start, start + out.length);
        }

        _toggleLinePrefix(re, makePrefix, stripOthers) {
            return this._lines((lines) => {
                const filled = lines.filter((l) => l.trim() !== '');
                const all    = filled.length && filled.every((l) => re.test(l));
                let n = 0;
                return lines.map((l) => {
                    if (l.trim() === '') return l;
                    if (all) return l.replace(re, '');
                    n++;
                    const base = stripOthers ? l.replace(stripOthers, '') : l.replace(re, '');
                    return makePrefix(n) + base;
                });
            });
        }

        command(name) {
            const self = this;
            const { s, e, v } = self._sel();
            switch (name) {
                case 'bold':      return self.wrap('**', '**', 'bold text');
                case 'italic':    return self.wrap('*', '*', 'italic text');
                case 'strike':    return self.wrap('~~', '~~', 'text');
                case 'code':
                    return v.slice(s, e).indexOf('\n') !== -1 ? self.command('codeblock') : self.wrap('`', '`', 'code');
                case 'h2':
                case 'h3': {
                    const pre = name === 'h2' ? '## ' : '### ';
                    return self._lines((lines) => lines.map((l) => {
                        if (l.indexOf(pre) === 0) return l.slice(pre.length);
                        return pre + l.replace(/^#{1,6}\s+/, '');
                    }));
                }
                case 'quote': return self._toggleLinePrefix(/^>\s?/, () => '> ');
                case 'ul':    return self._toggleLinePrefix(/^(\s*)[-*+]\s+(\[[ xX]\]\s+)?/, () => '- ', /^(\s*)([-*+]|\d+[.)])\s+(\[[ xX]\]\s+)?/);
                case 'ol':    return self._toggleLinePrefix(/^(\s*)\d+[.)]\s+/, (n) => `${n}. `, /^(\s*)([-*+]|\d+[.)])\s+(\[[ xX]\]\s+)?/);
                case 'task':  return self._toggleLinePrefix(/^(\s*)[-*+]\s+\[[ xX]\]\s+/, () => '- [ ] ', /^(\s*)([-*+]|\d+[.)])\s+(\[[ xX]\]\s+)?/);
                case 'link': {
                    const sel = v.slice(s, e);
                    if (/^https?:\/\/\S+$/.test(sel)) {
                        return self._replace(s, e, `[link](${sel})`, s + 1, s + 5);
                    }
                    const text = sel || 'link text';
                    const url  = 'https://';
                    const at   = s + text.length + 3;
                    return self._replace(s, e, `[${text}](${url})`, at, at + url.length);
                }
                case 'image': {
                    if (typeof self.options.imageUpload === 'function') return self._pickImage();
                    const alt = v.slice(s, e) || 'alt text';
                    const url = 'https://';
                    const at  = s + alt.length + 4;
                    return self._replace(s, e, `![${alt}](${url})`, at, at + url.length);
                }
                case 'codeblock': {
                    const sel   = v.slice(s, e);
                    const lead  = s > 0 && v[s - 1] !== '\n' ? '\n' : '';
                    const block = `${lead}\`\`\`\n${sel}\n\`\`\`\n`;
                    const a     = s + lead.length + 4;
                    return self._replace(s, e, block, a, a + sel.length);
                }
                case 'hr': {
                    const lead = s > 0 && v[s - 1] !== '\n' ? '\n\n' : (s > 0 ? '\n' : '');
                    return self._replace(s, e, `${lead}---\n\n`);
                }
                case 'table': {
                    const lead = s > 0 && v[s - 1] !== '\n' ? '\n\n' : (s > 0 ? '\n' : '');
                    const tpl  = '| Column | Column |\n| --- | --- |\n| Cell | Cell |\n';
                    return self._replace(s, e, lead + tpl, s + lead.length + 2, s + lead.length + 8);
                }
            }
            return self;
        }

        // Keyboard

        _onKeydown(e) {
            const self = this;
            const mod  = e.ctrlKey || e.metaKey;
            const k    = String(e.key).toLowerCase();

            if (mod && !e.altKey) {
                if (!e.shiftKey && k === 'b') { e.preventDefault(); self.command('bold');   return; }
                if (!e.shiftKey && k === 'i') { e.preventDefault(); self.command('italic'); return; }
                if (!e.shiftKey && k === 'k') { e.preventDefault(); self.command('link');   return; }
                if (!e.shiftKey && k === 's') {
                    e.preventDefault();
                    self._dispatch('ts.markdowneditor.save');
                    return;
                }
            }

            if (e.key === 'Enter' && !mod && !e.shiftKey && !e.altKey && !e.isComposing) {
                if (self._continueBlock()) e.preventDefault();
                return;
            }

            if (e.key === 'Tab' && !mod && !e.altKey) {
                if (self._indent(e.shiftKey)) e.preventDefault();
            }
        }

        // Continues lists and quotes on Enter. Returns true when it handled the key.
        _continueBlock() {
            const { s, e, v } = this._sel();
            if (s !== e) return false;
            const lineStart = v.lastIndexOf('\n', s - 1) + 1;
            const lineEnd   = (v.indexOf('\n', s) === -1) ? v.length : v.indexOf('\n', s);
            const line      = v.slice(lineStart, lineEnd);

            const m = line.match(/^(\s*)(?:([-*+])|(\d+)([.)]))\s+(\[[ xX]\]\s+)?/) || line.match(/^(\s*)(>)\s?/);
            if (!m) return false;
            const marker = m[0];
            // Caret must be after the marker, otherwise this is a plain line break
            if (s - lineStart < marker.length) return false;

            // An empty item ends the list or quote
            if (line.slice(marker.length).trim() === '') {
                this._replace(lineStart, lineEnd, '', lineStart, lineStart);
                return true;
            }

            let next;
            if (m[2] === '>')       next = `${m[1]}> `;
            else if (m[3] !== undefined) next = `${m[1]}${parseInt(m[3], 10) + 1}${m[4]} `;
            else                    next = `${m[1]}${m[2]} `;
            if (m[5]) next += '[ ] ';

            this._replace(s, s, `\n${next}`);
            return true;
        }

        _indent(outdent) {
            const { s, e, v } = this._sel();
            const pad = ' '.repeat(this.options.tabSize);
            const { start, end } = this._lineRange(s, e);
            const block = v.slice(start, end);
            const listy = /^(\s*)([-*+]|\d+[.)])\s/.test(block.split('\n')[0]);
            // Only capture Tab inside lists or multi-line selections, so keyboard focus is never trapped
            if (!listy && block.indexOf('\n') === -1) return false;

            const out = block.split('\n').map((l) => {
                if (!outdent) return l.trim() === '' ? l : pad + l;
                return l.indexOf(pad) === 0 ? l.slice(pad.length) : l.replace(/^ {1,3}/, '');
            }).join('\n');
            const delta = out.length - block.length;
            this._replace(start, end, out, s === start ? start : Math.max(start, s + (out.indexOf('\n') === -1 ? delta : 0)), e + delta);
            return true;
        }

        // Paste: images upload, a URL pasted over a selection becomes a link
        _onPaste(e) {
            const self = this;
            const cd   = (e.originalEvent || e).clipboardData;
            if (!cd) return;

            const files = Array.prototype.filter.call(cd.files || [], (f) => /^image\//.test(f.type));
            if (files.length && typeof self.options.imageUpload === 'function') {
                e.preventDefault();
                self._uploadFiles(files);
                return;
            }

            const text = (cd.getData('text/plain') || '').trim();
            const { s, e: end, v } = self._sel();
            if (s !== end && /^https?:\/\/\S+$/.test(text)) {
                e.preventDefault();
                const label = v.slice(s, end);
                self._replace(s, end, `[${label}](${text})`);
            }
        }

        // Images

        _hasImageFiles(dt) {
            return !!dt && typeof this.options.imageUpload === 'function'
                && Array.prototype.some.call(dt.items || dt.files || [], (i) => /^image\//.test(i.type));
        }

        _pickImage() {
            const self  = this;
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.multiple = true;
            input.addEventListener('change', () => self._uploadFiles(input.files));
            input.click();
            return self;
        }

        _uploadFiles(fileList) {
            const self = this;
            Array.prototype.filter.call(fileList, (f) => /^image\//.test(f.type)).forEach((file) => {
                const alt  = (file.name || 'image').replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim() || 'image';
                const mark = `![Uploading ${alt}\u2026]()`;
                const { s, e, v } = self._sel();
                const lead = s > 0 && v[s - 1] !== '\n' ? '\n\n' : '';
                self._replace(s, e, `${lead}${mark}\n`);
                self.setStatus('Uploading image\u2026');

                Promise.resolve()
                    .then(() => self.options.imageUpload(file))
                    .then((url) => {
                        if (!url) throw new Error('No image address returned');
                        self._swap(mark, `![${alt}](${url})`);
                        self.setStatus('Image added');
                        self._dispatch('ts.markdowneditor.upload', { file, url });
                    })
                    .catch((err) => {
                        self._swap(`${mark}\n`, '');
                        self._swap(mark, '');
                        self.setStatus('Upload failed');
                        self._dispatch('ts.markdowneditor.error', { error: err });
                    });
            });
            return self;
        }

        // Replaces the first occurrence of a marker string without disturbing the caret much
        _swap(find, repl) {
            const ta  = this.$ta[0];
            const i   = ta.value.indexOf(find);
            if (i === -1) return this;
            const hadFocus = document.activeElement === ta;
            const s = ta.selectionStart, e = ta.selectionEnd;
            const delta = repl.length - find.length;
            ta.setSelectionRange(i, i + find.length);
            let ok = false;
            try { ok = document.execCommand('insertText', false, repl); } catch (err) { ok = false; }
            if (!ok) {
                ta.setRangeText(repl, i, i + find.length, 'end');
                ta.dispatchEvent(new Event('input', { bubbles: true }));
            }
            const shift = (p) => (p > i ? p + delta : p);
            ta.setSelectionRange(shift(s), shift(e));
            if (!hadFocus) ta.blur();
            return this;
        }

        // View, preview and layout

        setView(view, silent) {
            if (!VIEWS[view]) return this;
            if (view !== 'write' && !this.$preview) view = 'write';
            this._view = view;
            this.$wrap
                .removeClass('ts-me-view-write ts-me-view-split ts-me-view-preview')
                .addClass(`ts-me-view-${view}`);

            if (this.$toolbarEl) {
                this.$toolbarEl.find('[data-toolbar-toggle-item]').each(function() {
                    const on = this.getAttribute('data-toolbar-value') === view;
                    this.setAttribute('aria-pressed', on ? 'true' : 'false');
                    this.classList.toggle('ts-toolbar__toggle-item--on', on);
                });
            }
            if (view !== 'write') this._renderPreview();
            this._autoGrow();
            if (!silent) this._dispatch('ts.markdowneditor.view', { view });
            return this;
        }

        getView() { return this._view; }

        fullscreen(on) {
            on = !!on;
            if (on === !!this._full) return this;
            this._full = on;
            this.$wrap.toggleClass('ts-me-fullscreen', on);
            $('body').toggleClass('ts-me-lock', on);
            this._autoGrow();
            if (on) this.$ta.trigger('focus');
            return this;
        }

        _autoGrow() {
            const ta = this.$ta[0];
            if (!this.options.autoGrow) return this;
            if (this._view !== 'write' || this._full) { ta.style.height = ''; return this; }
            ta.style.height = 'auto';
            ta.style.height = `${Math.max(ta.scrollHeight, 0)}px`;
            return this;
        }

        _queuePreview() {
            if (this._view === 'write' || !this.$preview) return this;
            clearTimeout(this._timer);
            this._timer = setTimeout(() => this._renderPreview(), this.options.previewDelay);
            return this;
        }

        _renderPreview() {
            if (!this.$preview) return this;
            const md = this.getValue();
            let html = '';
            if (md.trim() === '') {
                this.$previewBody.html('<p class="ts-me-preview-empty">Nothing to preview yet.</p>');
                return this;
            }
            if (typeof this.options.renderer === 'function') {
                const out = this.options.renderer(md);
                if (out && typeof out.then === 'function') {
                    // Asynchronous renderers (a server round trip): only the latest result is applied
                    const token = this._rtoken = (this._rtoken || 0) + 1;
                    out.then((h) => { if (token === this._rtoken) this.$previewBody.html(h); })
                       .catch(() => { if (token === this._rtoken) this.$previewBody.html(this._fallbackHtml(md)); });
                    return this;
                }
                html = out;
            } else if (this._md) {
                this._md.render(md);
                html = this._md.getHtml();
            } else {
                html = this._fallbackHtml(md);
            }
            this.$previewBody.html(html);
            return this;
        }

        _fallbackHtml(md) {
            return $('<div></div>').text(md).html().replace(/\n/g, '<br>');
        }

        _syncScroll(from) {
            if (!this.options.syncScroll || this._view !== 'split' || this._syncing) return this;
            const a = from === 'write' ? this.$write[0] : this.$preview[0];
            const b = from === 'write' ? this.$preview[0] : this.$write[0];
            // In split view the write pane scrolls (not the textarea itself)
            const src = from === 'write' ? this.$write[0] : a;
            const max = src.scrollHeight - src.clientHeight;
            if (max <= 0) return this;
            this._syncing = true;
            b.scrollTop = (src.scrollTop / max) * (b.scrollHeight - b.clientHeight);
            requestAnimationFrame(() => { this._syncing = false; });
            return this;
        }

        _updateStatus() {
            if (!this.$status) return this;
            const text  = this.getValue().replace(/```[\s\S]*?```/g, ' ').replace(/[#>*_`~\[\]()!|-]+/g, ' ');
            const words = (text.match(/[\p{L}\p{N}']+/gu) || []).length;
            this.$status.find('.ts-me-words').text(`${words} word${words === 1 ? '' : 's'}`);
            this.$status.find('.ts-me-time').text(`${Math.max(words ? 1 : 0, Math.ceil(words / 220))} min read`);
            return this;
        }

        setStatus(msg) {
            if (this.$status) this.$status.find('.ts-me-msg').text(msg || '');
            return this;
        }

        _dispatch(name, extra) {
            this.$ta[0].dispatchEvent(new CustomEvent(name, {
                detail: $.extend({ instance: this }, extra),
                bubbles: true
            }));
            return this;
        }

        // Public API

        getValue() { return this.$ta.val(); }

        setValue(md, silent) {
            this.$ta.val(md || '');
            this._autoGrow();
            this._updateStatus();
            if (this._view !== 'write') this._renderPreview();
            if (!silent) this._dispatch('ts.markdowneditor.change', { value: this.getValue() });
            return this;
        }

        getHtml() {
            if (typeof this.options.renderer === 'function') return this.options.renderer(this.getValue());
            if (this._md) { this._md.render(this.getValue()); return this._md.getHtml(); }
            return '';
        }

        focus() {
            this.$ta.trigger('focus');
            return this;
        }

        enable() {
            this.$ta.prop('disabled', false);
            this.$wrap.removeClass('ts-me-disabled');
            return this;
        }

        disable() {
            this.$ta.prop('disabled', true);
            this.$wrap.removeClass('ts-me-focused').addClass('ts-me-disabled');
            return this;
        }

        destroy() {
            const self = this;
            if (self._failed) return this;

            clearTimeout(self._timer);
            $(document).off(`keydown.${self._ns}`);
            self.fullscreen(false);

            if (self.$toolbarEl) {
                const tb = self.$toolbarEl.data('__pluginToolbar');
                if (tb && typeof tb.destroy === 'function') tb.destroy();
                self.$toolbarEl.off(`.${EVENT_NS}`);
            }
            if (self._md && typeof self._md.destroy === 'function') self._md.destroy();

            self.$ta.off(`.${EVENT_NS}`).removeClass('ts-me-input').css('height', '');
            self.$write.off(`.${EVENT_NS}`);
            self.$ta.insertBefore(self.$wrap);
            self.$wrap.remove();
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

    PluginMarkdownEditor.defaults = {
        placeholder:   'Write in Markdown\u2026',
        ariaLabel:     'Markdown editor',
        view:          'write',          // 'write' | 'split' | 'preview'
        minHeight:     420,              // number (px) or CSS length; height of split and preview panes
        // Toolbar keys. '|' separates groups, 'views' adds the view switcher,
        // 'spacer' pushes what follows to the right. Set to false for no toolbar.
        toolbar:       ['bold', 'italic', 'strike', 'code', '|', 'h2', 'h3', 'quote', '|', 'ul', 'ol', 'task', '|',
                        'link', 'image', 'codeblock', 'hr', 'table', 'spacer', 'views', 'fullscreen'],
        toolbarOptions: { ariaLabel: 'Markdown formatting', size: 'sm', full: true },
        preview:       true,             // false removes the preview pane and view switcher
        renderer:      null,             // function(markdown) returning HTML or a Promise of HTML, replaces PluginMarkdown
        sanitize:      true,             // forwarded to PluginMarkdown
        breaks:        false,            // forwarded to PluginMarkdown
        previewDelay:  150,              // ms debounce before the preview refreshes
        syncScroll:    true,             // keep write and preview aligned in split view
        autoGrow:      true,             // write view grows with the text like a document
        tabSize:       2,                // spaces used to indent list items
        statusBar:     true,             // word count and reading time
        imageUpload:   null,             // function(file) {} returning a URL or a Promise of one
        disabled:      false,
        onChange:      null              // function(markdown) {}
    };

    $.extend(themestrap, { PluginMarkdownEditor });

    $.fn.themestrapPluginMarkdownEditor = function(opts) {
        return this.map(function() {
            const $this = $(this);

            if ($this.data(instanceName)) {
                return $this.data(instanceName);
            } else {
                return new PluginMarkdownEditor($this, opts);
            }
        });
    };

})).apply(this, [window.themestrap, jQuery]);
