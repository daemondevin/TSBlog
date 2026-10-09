/**
 * Themestrap RichEditor
 * 
 * Lightweight contenteditable editor built on PluginToolbar (formatting controls)
 * and PluginDialog.
 *
 * Markup:
 *
 *   <div data-plugin-richeditor
 *        data-plugin-options='{"placeholder": "Write your message...", "minHeight": 220}'>
 *       <p>Optional seed content.</p>
 *   </div>
 *
 * Blog mode:
 *
 *   <div data-plugin-richeditor
 *        data-plugin-options='{"toolbar": "blog", "markdownShortcuts": true, "statusBar": true}'></div>
 *
 *   "toolbar": "blog" adds headings, quote, inline code, code block, divider and image.
 *   Typing Markdown shortcuts converts as you write: "## " heading, "- " list, "1. " numbered
 *   list, "> " quote, "```" code block, "---" divider, plus **bold**, *italic* and `code`.
 *   getMarkdown() / setMarkdown() let the editor read and write Markdown, so a post stays a
 *   plain .md file. Images can be pasted, dropped or picked when imageUpload is provided.
 *
 * Public API (via stored instance):
 *   const editor = $('#myEditor').data('__pluginRichEditor');
 *   editor.getMarkdown();    // Markdown string converted from the current content
 *   editor.setMarkdown(md);  // renders Markdown into the editor (PluginMarkdown or options.renderer)
 *   editor.getWordCount();
 *   editor.getContent();     // HTML string, '' when empty
 *   editor.getText();        // plain text
 *   editor.setContent(html); // replaces content (trusted HTML only, it is not sanitized)
 *   editor.isEmpty();
 *   editor.clear();
 *   editor.focus();
 *   editor.enable() / editor.disable();
 *   editor.destroy();        // restores the current content into the host element
 *
 * Events dispatched on the host element (native CustomEvent, bubbles):
 *   ts.richeditor.change   detail: { instance }
 *   ts.richeditor.focus    detail: { instance }
 *   ts.richeditor.blur     detail: { instance }
 *   ts.richeditor.save     detail: { instance }  Ctrl/Cmd+S pressed
 *   ts.richeditor.upload   detail: { instance, file, url }
 *   ts.richeditor.error    detail: { instance, error }
 *
 * CSS custom properties (all optional):
 *   --ts-re-bg, --ts-re-border, --ts-re-border-focus, --ts-re-radius, --ts-re-padding,
 *   --ts-re-toolbar-bg, --ts-re-text, --ts-re-placeholder, --ts-re-link,
 *   --ts-re-accent-contrast
 *
 * Init.js wiring:
 *   if ($.isFunction($.fn['themestrapPluginRichEditor']) && $('[data-plugin-richeditor]').length) {
 *       themestrap.fn.intObsInit('[data-plugin-richeditor]:not(.manual)', 'themestrapPluginRichEditor');
 *   }
 */
// Rich Editor
(((themestrap = {}, $) => {
    const instanceName = '__pluginRichEditor';
    const STYLE_ID     = 'ts-richeditor-styles';
    const EVENT_NS     = 'richeditor';

    let instanceCount = 0;
    let seq           = 0;

    const IS_MAC = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || '');
    const MOD    = IS_MAC ? '\u2318' : 'Ctrl+';

    // Theme tokens. Private --re-* properties resolve the public --ts-re-* overrides
    // against a per-theme fallback, so consumers can override on any ancestor.
    const LIGHT_TOKENS = `
        --re-bg:              var(--ts-re-bg, #ffffff);
        --re-border:          var(--ts-re-border, rgba(0,0,0,.14));
        --re-toolbar-bg:      var(--ts-re-toolbar-bg, rgba(0,0,0,.035));
        --re-text:            var(--ts-re-text, #1f2937);
        --re-placeholder:     var(--ts-re-placeholder, rgba(31,41,55,.42));
        --re-link:            var(--ts-re-link, #0b8a83);
        --re-accent:          var(--ts-re-border-focus, #00a89f);
    `;

    const DARK_TOKENS = `
        --re-bg:              var(--ts-re-bg, rgba(255,255,255,.02));
        --re-border:          var(--ts-re-border, rgba(255,255,255,.10));
        --re-toolbar-bg:      var(--ts-re-toolbar-bg, rgba(0,0,0,.20));
        --re-text:            var(--ts-re-text, #cdd8e6);
        --re-placeholder:     var(--ts-re-placeholder, rgba(205,216,230,.35));
        --re-link:            var(--ts-re-link, #00c7be);
        --re-accent:          var(--ts-re-border-focus, #00c7be);
    `;

    const INJECTED_CSS = `
        .ts-richeditor { ${LIGHT_TOKENS} }
        @media (prefers-color-scheme: dark) {
            .ts-richeditor { ${DARK_TOKENS} }
        }
        html.dark .ts-richeditor,
        [data-bs-theme="dark"] .ts-richeditor { ${DARK_TOKENS} }
        [data-bs-theme="light"] .ts-richeditor,
        html [data-bs-theme="light"] .ts-richeditor { ${LIGHT_TOKENS} }

        .ts-richeditor {
            display: flex;
            flex-direction: column;
            background: var(--re-bg);
            border: 1px solid var(--re-border);
            border-radius: var(--ts-re-radius, 6px);
            overflow: hidden;
            transition: border-color .15s, box-shadow .15s;
        }
        .ts-richeditor.ts-re-focused {
            border-color: var(--re-accent);
            box-shadow: 0 0 0 3px color-mix(in srgb, var(--re-accent) 18%, transparent);
        }
        .ts-richeditor.ts-re-disabled { opacity: .6; }
        .ts-richeditor.ts-re-disabled .ts-toolbar { pointer-events: none; }

        /* PluginToolbar shell variables are overridden so the toolbar merges
           flush into the top edge of the editor container. */
        .ts-richeditor .ts-toolbar {
            --ts-tb-bg:     var(--re-toolbar-bg);
            --ts-tb-border: transparent;
            --ts-tb-shadow: none;
            --ts-tb-radius: 0;
            width: 100%;
            max-width: 100%;
            flex-wrap: wrap;
            border-radius: 0;
            border-bottom: 1px solid var(--re-border);
        }

        .ts-re-content {
            flex: 1;
            padding: var(--ts-re-padding, 14px 16px);
            outline: none;
            color: var(--re-text);
            font-size: 14px;
            line-height: 1.7;
            font-family: inherit;
            overflow-y: auto;
            word-break: break-word;
        }
        /* Placeholder is floated with zero height so it never affects the caret line */
        .ts-re-content.ts-re-empty::before {
            content: attr(data-placeholder);
            color: var(--re-placeholder);
            pointer-events: none;
            float: left;
            height: 0;
        }
        .ts-re-content a            { color: var(--re-link); }
        .ts-re-content ul,
        .ts-re-content ol           { padding-left: 1.4em; margin: .4em 0; }
        .ts-re-content p            { margin: 0 0 .6em; }
        .ts-re-content p:last-child { margin-bottom: 0; }

        .ts-re-content h1,
        .ts-re-content h2,
        .ts-re-content h3          { line-height: 1.3; margin: 1.1em 0 .4em; }
        .ts-re-content h1          { font-size: 1.6em; }
        .ts-re-content h2          { font-size: 1.35em; }
        .ts-re-content h3          { font-size: 1.15em; }
        .ts-re-content h1:first-child,
        .ts-re-content h2:first-child,
        .ts-re-content h3:first-child { margin-top: 0; }
        .ts-re-content blockquote  { margin: 0 0 .8em; padding-left: 1em; border-left: 3px solid var(--re-accent); color: var(--re-placeholder); }
        .ts-re-content pre         { background: color-mix(in srgb, currentColor 8%, transparent); padding: 10px 12px; border-radius: 6px; overflow-x: auto; margin: 0 0 .8em; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: .9em; white-space: pre-wrap; }
        .ts-re-content code        { background: color-mix(in srgb, currentColor 10%, transparent); padding: .1em .35em; border-radius: 4px; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: .9em; }
        .ts-re-content pre code    { background: none; padding: 0; }
        .ts-re-content hr          { border: 0; border-top: 1px solid var(--re-border); margin: 1.2em 0; }
        .ts-re-content hr[data-more] { border-top: 1px dashed var(--re-accent); overflow: visible; height: 0; margin: 1.6em 0; }
        .ts-re-content hr[data-more]::after { content: 'Summary ends here'; position: relative; top: -.75em; display: table; margin: 0 auto; padding: 0 .6em; background: var(--re-bg); color: var(--re-accent); font-size: 11px; letter-spacing: .04em; text-transform: uppercase; }
        .ts-re-content img         { max-width: 100%; height: auto; border-radius: 4px; }
        .ts-re-content table       { border-collapse: collapse; margin-bottom: .8em; }
        .ts-re-content th,
        .ts-re-content td          { border: 1px solid var(--re-border); padding: 4px 10px; }
        .ts-re-status {
            display: flex;
            gap: 14px;
            padding: 6px 14px;
            border-top: 1px solid var(--re-border);
            background: var(--re-toolbar-bg);
            color: var(--re-placeholder);
            font-size: 12px;
        }
        .ts-re-status .ts-re-msg   { margin-left: auto; }
        .ts-richeditor.ts-re-dropping .ts-re-content { outline: 2px dashed var(--re-accent); outline-offset: -8px; }

        /* Link dialog. The dialog lives on <body>, so it is themed with currentColor
           and inherits its colors from PluginDialog's panel. */
        .ts-re-link-label {
            display: block;
            font-size: 11px;
            font-weight: 700;
            letter-spacing: .10em;
            text-transform: uppercase;
            opacity: .65;
            margin-bottom: 8px;
        }
        .ts-re-link-input {
            display: block;
            width: 100%;
            background: transparent;
            border: 1px solid color-mix(in srgb, currentColor 25%, transparent);
            border-radius: 5px;
            color: inherit;
            font-size: 14px;
            padding: 9px 12px;
            font-family: inherit;
            outline: none;
            transition: border-color .15s;
        }
        .ts-re-link-input:focus            { border-color: var(--ts-re-border-focus, #00a89f); }
        .ts-re-link-input[aria-invalid="true"] { border-color: #dc2626; }
        .ts-re-link-error {
            color: #dc2626;
            font-size: 12px;
            margin: 6px 0 0;
        }
        .ts-re-link-btns {
            display: flex;
            gap: 8px;
            justify-content: flex-end;
            margin-top: 16px;
        }
        .ts-re-dlg-remove { margin-right: auto; }
        .ts-re-dlg-cancel,
        .ts-re-dlg-remove,
        .ts-re-dlg-confirm {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 8px 16px;
            border-radius: 5px;
            border: none;
            font-size: 13px;
            font-family: inherit;
            font-weight: 500;
            cursor: pointer;
            transition: opacity .14s;
        }
        .ts-re-dlg-cancel,
        .ts-re-dlg-remove  { background: color-mix(in srgb, currentColor 10%, transparent); color: inherit; }
        .ts-re-dlg-confirm {
            background: var(--ts-re-border-focus, #00a89f);
            color: var(--ts-re-accent-contrast, #04211f);
            font-weight: 600;
        }
        .ts-re-dlg-cancel:hover,
        .ts-re-dlg-remove:hover  { opacity: .8; }
        .ts-re-dlg-confirm:hover { opacity: .87; }
        .ts-re-dlg-remove[hidden] { display: none; }
    `;

    // Command definitions: key -> execCommand name, icon, label, and optional shortcut letter
    const CMDS = {
        bold:        { cmd: 'bold',                icon: 'fas fa-bold',          label: 'Bold',             key: 'B' },
        italic:      { cmd: 'italic',              icon: 'fas fa-italic',        label: 'Italic',           key: 'I' },
        underline:   { cmd: 'underline',           icon: 'fas fa-underline',     label: 'Underline',        key: 'U' },
        strike:      { cmd: 'strikeThrough',       icon: 'fas fa-strikethrough', label: 'Strikethrough' },
        ul:          { cmd: 'insertUnorderedList', icon: 'fas fa-list-ul',       label: 'Bullet List' },
        ol:          { cmd: 'insertOrderedList',   icon: 'fas fa-list-ol',       label: 'Numbered List' },
        link:        { cmd: 'link',                icon: 'fas fa-link',          label: 'Insert Link',      key: 'K' },
        clearFormat: { cmd: 'removeFormat',        icon: 'fas fa-eraser',        label: 'Clear Formatting' },
        // Blog commands. 'inlineCode' is a custom toggle and the rest are one-shot actions.
        inlineCode:  { cmd: 'inlineCode',          icon: 'fas fa-code',          label: 'Inline Code' },
        h2:          { cmd: 'h2',                  icon: 'fas fa-heading',       label: 'Heading',          text: 'H2' },
        h3:          { cmd: 'h3',                  icon: 'fas fa-heading',       label: 'Subheading',       text: 'H3' },
        quote:       { cmd: 'quote',               icon: 'fas fa-quote-left',    label: 'Quote' },
        codeBlock:   { cmd: 'codeBlock',           icon: 'fas fa-file-code',     label: 'Code Block' },
        hr:          { cmd: 'insertHorizontalRule', icon: 'fas fa-minus',        label: 'Divider' },
        image:       { cmd: 'image',               icon: 'fas fa-image',         label: 'Insert Image' },
    };

    const INLINE_KEYS = ['bold', 'italic', 'underline', 'strike', 'inlineCode'];
    const LIST_KEYS   = ['ul', 'ol'];
    const BLOCK_KEYS  = ['h2', 'h3', 'quote', 'codeBlock', 'hr'];
    const ACTION_KEYS = ['link', 'image', 'clearFormat'];

    // Named toolbar presets. options.toolbar may be one of these names or an array of keys.
    const TOOLBARS = {
        basic: ['bold', 'italic', 'underline', 'strike', '|', 'ul', 'ol', '|', 'link', 'clearFormat'],
        blog:  ['bold', 'italic', 'strike', 'inlineCode', '|', 'h2', 'h3', 'quote', '|', 'ul', 'ol', '|',
                'codeBlock', 'hr', '|', 'link', 'image', 'clearFormat']
    };

    const escapeHtml = (str) => String(str).replace(/[&<>"']/g, (c) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));

    const toPx = (v) => (typeof v === 'number' ? `${v}px` : v);

    const titleFor = (def) => (def.key ? `${def.label} (${MOD}${def.key})` : def.label);

    // Returns a safe URL string, or '' when the input is rejected.
    // Bare addresses get https:// and bare emails get mailto:, anything with a
    // scheme outside the allowed list (javascript:, data:, ...) is refused.
    const normalizeUrl = (raw, protocols) => {
        let url = String(raw || '').replace(/[\u0000-\u001f\u007f\s]+/g, '');
        if (!url) return '';
        if (/^[\/#?]/.test(url)) return url;
        if (/^[^@:\/]+@[^@:\/]+\.[^@:\/]+$/.test(url)) return `mailto:${url}`;
        if (!/^[a-z][a-z0-9+.\-]*:/i.test(url)) url = `https://${url}`;
        const scheme = url.match(/^([a-z][a-z0-9+.\-]*):/i)[1].toLowerCase();
        return protocols.indexOf(scheme) !== -1 ? url : '';
    };

    // HTML to Markdown. Handles what the editor can produce plus common pasted markup.
    const mdEscape = (t) => t
        .replace(/\\/g, '\\\\')
        .replace(/([*`\[\]])/g, '\\$1')
        .replace(/(^|\s)_|_(?=\s|$)/g, (m) => m.replace('_', '\\_'));

    const htmlToMarkdown = (root) => {
        const inline = (node) => {
            let out = '';
            node.childNodes.forEach((n) => { out += inl(n); });
            return out;
        };
        const wrapI = (mark, n) => {
            const inner = inline(n);
            const m = inner.match(/^(\s*)([\s\S]*?)(\s*)$/);
            return m[2] ? `${m[1]}${mark}${m[2]}${mark}${m[3]}` : inner;
        };
        const inl = (n) => {
            if (n.nodeType === 3) return mdEscape(n.nodeValue.replace(/\u00a0/g, ' ').replace(/\s*\n\s*/g, ' '));
            if (n.nodeType !== 1) return '';
            const tag = n.tagName.toLowerCase();
            switch (tag) {
                case 'strong': case 'b': return wrapI('**', n);
                case 'em': case 'i':     return wrapI('*', n);
                case 'del': case 's': case 'strike': return wrapI('~~', n);
                case 'code': {
                    const t = n.textContent;
                    const fence = t.indexOf('`') !== -1 ? '``' : '`';
                    return t ? `${fence}${t}${fence}` : '';
                }
                case 'br':  return '  \n';
                case 'a': {
                    const href = n.getAttribute('href') || '';
                    const text = inline(n);
                    return href ? `[${text}](${href})` : text;
                }
                case 'img': {
                    const src = n.getAttribute('src') || '';
                    return src ? `![${(n.getAttribute('alt') || '').replace(/[\[\]]/g, '')}](${src})` : '';
                }
                case 'input': return n.checked ? '[x] ' : '[ ] ';
                default: return inline(n);
            }
        };
        const blockEsc = (t) => t.replace(/^(\s*)(#{1,6}\s|>|[-+]\s|\d+[.)]\s|={3,}|-{3,})/, '$1\\$2');

        const list = (el, depth) => {
            const ordered = el.tagName.toLowerCase() === 'ol';
            let i = parseInt(el.getAttribute('start') || '1', 10);
            let out = '';
            Array.prototype.forEach.call(el.children, (li) => {
                if (li.tagName.toLowerCase() !== 'li') return;
                const pad = '  '.repeat(depth);
                const mark = ordered ? `${i++}. ` : '- ';
                let text = '';
                let nested = '';
                li.childNodes.forEach((c) => {
                    const t = c.nodeType === 1 ? c.tagName.toLowerCase() : '';
                    if (t === 'ul' || t === 'ol') nested += list(c, depth + 1);
                    else if (t === 'p' || t === 'div') text += (text ? ' ' : '') + inline(c).trim();
                    else text += inl(c);
                });
                out += `${pad}${mark}${text.trim()}\n${nested}`;
            });
            return out;
        };

        const block = (n) => {
            if (n.nodeType === 3) {
                const t = n.nodeValue.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ');
                return t.trim() ? blockEsc(mdEscape(t.trim())) + '\n\n' : '';
            }
            if (n.nodeType !== 1) return '';
            const tag = n.tagName.toLowerCase();
            const h = tag.match(/^h([1-6])$/);
            if (h) return `${'#'.repeat(+h[1])} ${inline(n).trim()}\n\n`;
            switch (tag) {
                case 'p': case 'div': {
                    const kids = Array.prototype.slice.call(n.children);
                    // A div that wraps blocks is a container, not a paragraph
                    if (kids.some((k) => /^(p|div|ul|ol|h[1-6]|pre|blockquote|table|hr)$/i.test(k.tagName))) return children(n);
                    const t = inline(n).replace(/(  \n)+$/, '').trim();
                    return t ? blockEsc(t) + '\n\n' : '';
                }
                case 'ul': case 'ol': return list(n, 0) + '\n';
                case 'blockquote': {
                    const inner = children(n).trim().split('\n').map((l) => (l ? `> ${l}` : '>')).join('\n');
                    return inner + '\n\n';
                }
                case 'pre': {
                    const code = n.querySelector('code');
                    const lang = code ? ((code.className.match(/language-([\w+#.-]+)/) || [])[1] || '') : '';
                    const text = (code || n).textContent.replace(/\n$/, '');
                    const fence = text.indexOf('```') !== -1 ? '````' : '```';
                    return `${fence}${lang}\n${text}\n${fence}\n\n`;
                }
                case 'hr': return n.hasAttribute('data-more') ? '<!--more-->\n\n' : '---\n\n';
                case 'table': {
                    const rows = Array.prototype.map.call(n.querySelectorAll('tr'), (tr) =>
                        Array.prototype.map.call(tr.children, (c) => inline(c).trim().replace(/\|/g, '\\|').replace(/\n/g, ' ')));
                    if (!rows.length) return '';
                    const w = Math.max.apply(null, rows.map((r) => r.length));
                    const fix = (r) => `| ${r.concat(Array(w - r.length).fill('')).join(' | ')} |`;
                    return [fix(rows[0]), `| ${Array(w).fill('---').join(' | ')} |`].concat(rows.slice(1).map(fix)).join('\n') + '\n\n';
                }
                case 'img': return inl(n) + '\n\n';
                case 'script': case 'style': return '';
                default: return children(n);
            }
        };
        const children = (el) => {
            let out = '';
            let run = '';
            const flush = () => { if (run.trim()) out += blockEsc(run.trim()) + '\n\n'; run = ''; };
            el.childNodes.forEach((c) => {
                const t = c.nodeType === 1 ? c.tagName.toLowerCase() : '';
                const isInline = c.nodeType === 3 || /^(a|b|strong|i|em|s|del|strike|u|code|span|br|img|sub|sup|mark|small|input)$/.test(t);
                if (isInline) run += inl(c);
                else { flush(); out += block(c); }
            });
            flush();
            return out;
        };

        return children(root).replace(/\n{3,}/g, '\n\n').trim() + '\n';
    };

    class PluginRichEditor {
        constructor($el, opts) {
            return this.initialize($el, opts);
        }

        initialize($el, opts) {
            if ($el.data(instanceName)) {
                return this;
            }

            this.$el           = $el;
            this._uid          = ++seq;
            this._ns           = `${EVENT_NS}${this._uid}`;
            this._savedRange   = null;
            this._linkEl       = null;
            this._selectedText = '';
            this._failed       = false;

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
            this.options = $.extend(true, {}, PluginRichEditor.defaults, opts, {
                wrapper: this.$el
            });

            // $.extend(true) merges arrays index by index, so a short user array would be
            // padded with default entries. Arrays are replaced wholesale instead.
            if (opts && Object.prototype.hasOwnProperty.call(opts, 'toolbar')) {
                this.options.toolbar = typeof opts.toolbar === 'string' && TOOLBARS[opts.toolbar]
                    ? TOOLBARS[opts.toolbar].slice()
                    : opts.toolbar;
            }
            if (opts && typeof opts.imageUpload === 'function') this.options.imageUpload = opts.imageUpload;
            if (opts && typeof opts.renderer === 'function')    this.options.renderer = opts.renderer;
            if (opts && Array.isArray(opts.allowedProtocols)) {
                this.options.allowedProtocols = opts.allowedProtocols.slice();
            }

            return this;
        }

        build() {
            const self = this;
            const opts = self.options;
            const $el  = opts.wrapper;

            self._enabled = self._enabledKeys();

            // Dependencies are only required for the features that are switched on
            if ((self._enabled.size && !self._requires('themestrapPluginToolbar', 'PluginToolbar'))
                || ((self._enabled.has('link') || (self._enabled.has('image') && typeof opts.imageUpload !== 'function'))
                    && !self._requires('themestrapPluginDialog', 'PluginDialog'))) {
                self._failed = true;
                $el.removeData(instanceName);
                return this;
            }

            instanceCount++;
            if (!document.getElementById(STYLE_ID)) {
                const style       = document.createElement('style');
                style.id          = STYLE_ID;
                style.textContent = INJECTED_CSS;
                document.head.appendChild(style);
            }

            // Any markup already inside the host becomes the initial content
            const seed = $el.html().trim();
            $el.empty().addClass('ts-richeditor');

            if (self._enabled.size) {
                self.$toolbarEl = self._buildToolbarEl();
                $el.append(self.$toolbarEl);
                self.$toolbarEl.themestrapPluginToolbar($.extend({}, opts.toolbarOptions));
                self._toolbar = self.$toolbarEl.data('__pluginToolbar');
            }

            self.$editable = $('<div class="ts-re-content ts-re-empty" contenteditable="true" spellcheck="true" role="textbox" aria-multiline="true"></div>')
                .attr('aria-label', opts.ariaLabel);

            if (opts.minHeight)    self.$editable.css('min-height', toPx(opts.minHeight));
            if (opts.maxHeight)    self.$editable.css('max-height', toPx(opts.maxHeight));
            if (opts.placeholder) {
                self.$editable.attr({ 'data-placeholder': opts.placeholder, 'aria-placeholder': opts.placeholder });
            }
            if (seed) self.$editable.html(seed);
            $el.append(self.$editable);
            self._toggleEmpty();

            if (opts.statusBar) {
                self.$status = $('<div class="ts-re-status"><span class="ts-re-words"></span><span class="ts-re-time"></span><span class="ts-re-msg" role="status"></span></div>');
                $el.append(self.$status);
                self._updateStatus();
            }

            if (self._enabled.has('link') || (self._enabled.has('image') && typeof opts.imageUpload !== 'function')) {
                self._buildDialog();
            }

            if (opts.disabled) self.disable();

            return this;
        }

        // Verifies a dependency plugin is loaded, reporting through the framework when it is not
        _requires(method, label) {
            if (typeof $.fn[method] === 'function') return true;

            const file = `components/themestrap.plugin.${label.replace('Plugin', '').toLowerCase()}.js`;
            if (themestrap.fn && typeof themestrap.fn.showErrorMessage === 'function') {
                themestrap.fn.showErrorMessage(
                    'Failed to Load File',
                    `Failed to load: ${label} - Include the following file(s): (${file})`
                );
            } else {
                console.error(`PluginRichEditor: ${label} must be loaded first (${file}).`);
            }
            return false;
        }

        // Set of enabled command keys derived from options.toolbar
        _enabledKeys() {
            const t = this.options.toolbar;
            if (t === false) return new Set();
            if (t === true || !Array.isArray(t)) return new Set(Object.keys(CMDS));

            const keys = new Set();
            t.forEach((item) => {
                if (!item || item === '|') return;
                if (CMDS[item]) { keys.add(item); return; }
                // Accept raw execCommand names for backwards compatibility
                const byCmd = Object.keys(CMDS).find((k) => CMDS[k].cmd === item);
                if (byCmd) keys.add(byCmd);
            });
            return keys;
        }

        // PluginToolbar host element and its inner markup
        _buildToolbarEl() {
            const self    = this;
            const enabled = self._enabled;

            const inline  = INLINE_KEYS.filter((k) => enabled.has(k));
            const lists   = LIST_KEYS.filter((k) => enabled.has(k));
            const blocks  = BLOCK_KEYS.filter((k) => enabled.has(k));
            const actions = ACTION_KEYS.filter((k) => enabled.has(k));

            const buttons = (keys) => keys.map((k) => {
                const d = CMDS[k];
                return `
                    <button type="button" class="ts-tb-icon"
                            data-toolbar-button data-toolbar-value="${k}"
                            title="${titleFor(d)}" aria-label="${d.label}">
                        ${d.text ? `<span style="font-size:11px;font-weight:700">${d.text}</span>` : `<i class="${d.icon}" aria-hidden="true"></i>`}
                    </button>`;
            }).join('');

            const groups = [];
            if (inline.length) groups.push(self._toggleGroupHtml(inline, 'Inline formatting'));
            if (blocks.length) groups.push(buttons(blocks));
            if (lists.length)  groups.push(self._toggleGroupHtml(lists, 'List formatting'));
            if (actions.length) groups.push(buttons(actions));

            return $(`<div>${groups.join('<hr data-toolbar-separator>')}</div>`);
        }

        _toggleGroupHtml(keys, label) {
            const items = keys.map((k) => {
                const d = CMDS[k];
                return `
                    <button type="button" class="ts-tb-icon"
                            data-toolbar-toggle-item data-toolbar-value="${k}"
                            title="${titleFor(d)}" aria-label="${d.label}">
                        <i class="${d.icon}" aria-hidden="true"></i>
                    </button>`;
            }).join('');

            return `
                <div data-toolbar-toggle-group data-toolbar-type="multiple"
                     data-toolbar-group-label="${label}">${items}</div>`;
        }

        // Link dialog. PluginDialog owns the modal UX, focus trap, ARIA, and base CSS.
        _buildDialog() {
            const self = this;
            const id   = `ts-re-dlg-${self._uid}`;

            self.$dialog = $(`
                <div data-plugin-dialog id="${id}">
                    <div data-dialog-backdrop></div>
                    <div data-dialog-panel class="dialog-sm">
                        <h2 data-dialog-title>Insert Link</h2>
                        <p data-dialog-description>Paste or type a URL. Select text first to wrap it in the link.</p>
                        <label class="ts-re-link-label" for="${id}-url">URL</label>
                        <input type="text" id="${id}-url" class="ts-re-link-input" inputmode="url"
                               placeholder="https://" autocomplete="off" spellcheck="false">
                        <p class="ts-re-link-error" role="alert" hidden></p>
                        <div class="ts-re-link-btns">
                            <button type="button" class="ts-re-dlg-remove" hidden>Remove link</button>
                            <button type="button" class="ts-re-dlg-cancel" data-dialog-close>Cancel</button>
                            <button type="button" class="ts-re-dlg-confirm">
                                <i class="fas fa-link" aria-hidden="true"></i> <span>Insert</span>
                            </button>
                        </div>
                    </div>
                </div>
            `);

            $('body').append(self.$dialog);
            self.$dialog.themestrapPluginDialog($.extend({}, self.options.dialogOptions));
            self._dialog = self.$dialog.data('__pluginDialog');

            self.$linkInput  = self.$dialog.find('.ts-re-link-input');
            self.$linkError  = self.$dialog.find('.ts-re-link-error');
            self.$linkRemove = self.$dialog.find('.ts-re-dlg-remove');
            self.$linkTitle  = self.$dialog.find('[data-dialog-title]');
            self.$linkOk     = self.$dialog.find('.ts-re-dlg-confirm span');

            return this;
        }

        events() {
            const self = this;
            if (self._failed) return this;

            if (self.$toolbarEl) {
                // Save the selection and keep focus in the editable while the toolbar is
                // pressed. The click (and its toolbar:* event) still fires normally.
                self.$toolbarEl.on(`mousedown.${EVENT_NS}`, (e) => {
                    self._saveSelection();
                    e.preventDefault();
                });

                // PluginToolbar dispatches native CustomEvents, so plain listeners are used
                self.$toolbarEl[0].addEventListener('toolbar:toggle', (e) => {
                    self._execCmd(e.detail.value);
                });
                self.$toolbarEl[0].addEventListener('toolbar:button', (e) => {
                    if (e.detail.value === 'link') {
                        self._openLinkDialog();
                    } else if (e.detail.value === 'image') {
                        self._insertImage();
                    } else {
                        self._execCmd(e.detail.value);
                    }
                });
            }

            self.$editable
                .on(`focus.${EVENT_NS}`, () => {
                    self.options.wrapper.addClass('ts-re-focused');
                    // Paragraphs instead of bare <div>s so the p rules in the injected CSS apply
                    try { document.execCommand('defaultParagraphSeparator', false, 'p'); } catch (err) { /* unsupported */ }
                    self._dispatch('ts.richeditor.focus');
                    if (typeof self.options.onFocus === 'function') self.options.onFocus.call(self);
                })
                .on(`blur.${EVENT_NS}`, () => {
                    self._saveSelection();
                    self.options.wrapper.removeClass('ts-re-focused');
                    self._dispatch('ts.richeditor.blur');
                    if (typeof self.options.onBlur === 'function') self.options.onBlur.call(self);
                })
                .on(`keyup.${EVENT_NS} mouseup.${EVENT_NS}`, () => {
                    self._syncState();
                })
                .on(`input.${EVENT_NS}`, (e) => {
                    self._toggleEmpty();
                    self._syncState();
                    self._updateStatus();
                    if (self.options.markdownShortcuts) self._inlineShortcut(e.originalEvent);
                    self._dispatch('ts.richeditor.change');
                    if (typeof self.options.onChange === 'function') {
                        self.options.onChange.call(self, self.getContent());
                    }
                })
                .on(`keydown.${EVENT_NS}`, (e) => {
                    const mod = e.ctrlKey || e.metaKey;
                    if (mod && !e.altKey && !e.shiftKey && String(e.key).toLowerCase() === 's') {
                        e.preventDefault();
                        self._dispatch('ts.richeditor.save');
                        return;
                    }
                    if (self.options.markdownShortcuts && !mod && !e.altKey && !e.isComposing
                        && (e.key === ' ' || e.key === 'Enter') && self._blockShortcut(e)) {
                        e.preventDefault();
                        return;
                    }
                    if (mod && !e.altKey && !e.shiftKey && String(e.key).toLowerCase() === 'k'
                        && self._enabled.has('link')) {
                        e.preventDefault();
                        self._openLinkDialog();
                    }
                })
                .on(`paste.${EVENT_NS}`, (e) => {
                    const data = (e.originalEvent || e).clipboardData;
                    if (!data) return;
                    const files = Array.prototype.filter.call(data.files || [], (f) => /^image\//.test(f.type));
                    if (files.length && typeof self.options.imageUpload === 'function') {
                        e.preventDefault();
                        self._uploadFiles(files);
                        return;
                    }
                    if (!self.options.pastePlainText) return;
                    e.preventDefault();
                    const text = data.getData('text/plain');
                    // A bare URL pasted over a selection becomes a link
                    if (/^https?:\/\/\S+$/.test(text.trim()) && window.getSelection().toString()) {
                        document.execCommand('createLink', false, text.trim());
                        self._decorateLinks();
                    } else {
                        document.execCommand('insertText', false, text);
                    }
                })
                .on(`dragover.${EVENT_NS} dragenter.${EVENT_NS}`, (e) => {
                    const dt = e.originalEvent.dataTransfer;
                    if (typeof self.options.imageUpload !== 'function' || !dt
                        || !Array.prototype.some.call(dt.items || [], (i) => /^image\//.test(i.type))) return;
                    e.preventDefault();
                    self.options.wrapper.addClass('ts-re-dropping');
                })
                .on(`dragleave.${EVENT_NS} drop.${EVENT_NS}`, () => self.options.wrapper.removeClass('ts-re-dropping'))
                .on(`drop.${EVENT_NS}`, (e) => {
                    const dt = e.originalEvent.dataTransfer;
                    const files = dt ? Array.prototype.filter.call(dt.files || [], (f) => /^image\//.test(f.type)) : [];
                    if (!files.length || typeof self.options.imageUpload !== 'function') return;
                    e.preventDefault();
                    self._uploadFiles(files);
                });

            // selectionchange only fires on the document, never on an element
            $(document).on(`selectionchange.${self._ns}`, () => {
                if (document.activeElement === self.$editable[0]) self._syncState();
            });

            if (self.$dialog) self._dialogEvents();

            return this;
        }

        _dialogEvents() {
            const self = this;
            const $dlg = self.$dialog;

            $dlg.on(`dialog:open.${EVENT_NS}`, () => {
                const editing = !!self._linkEl;
                const image   = !!self._imageMode;
                self._setLinkError('');
                self.$linkInput.val(editing ? (self._linkEl.getAttribute('href') || '') : '');
                self.$linkRemove.prop('hidden', !editing);
                self.$linkTitle.text(image ? 'Insert Image' : (editing ? 'Edit Link' : 'Insert Link'));
                self.$dialog.find('[data-dialog-description]').text(image
                    ? 'Paste the address of an image.'
                    : 'Paste or type a URL. Select text first to wrap it in the link.');
                self.$linkOk.text(editing ? 'Update' : 'Insert');
                setTimeout(() => self.$linkInput.trigger('focus').trigger('select'), 60);
            });

            $dlg.on(`dialog:close.${EVENT_NS}`, () => { self._imageMode = false; });

            $dlg.on(`keydown.${EVENT_NS}`, '.ts-re-link-input', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    self._applyLink();
                }
            });

            $dlg.on(`input.${EVENT_NS}`, '.ts-re-link-input', () => self._setLinkError(''));
            $dlg.on(`click.${EVENT_NS}`, '.ts-re-dlg-confirm', () => self._applyLink());
            $dlg.on(`click.${EVENT_NS}`, '.ts-re-dlg-remove', () => self._removeLink());

            return this;
        }

        // Selection helpers

        _inEditable(range) {
            return !!range && this.$editable[0].contains(range.commonAncestorContainer);
        }

        // The live selection range when it sits inside the editable, otherwise the saved one
        _activeRange() {
            const sel = window.getSelection();
            if (sel && sel.rangeCount) {
                const range = sel.getRangeAt(0);
                if (this._inEditable(range)) return range.cloneRange();
            }
            return this._savedRange ? this._savedRange.cloneRange() : null;
        }

        _saveSelection() {
            const sel = window.getSelection();
            if (sel && sel.rangeCount) {
                const range = sel.getRangeAt(0);
                if (this._inEditable(range)) this._savedRange = range.cloneRange();
            }
            return this;
        }

        _restoreSelection() {
            if (!this._savedRange) return this;
            const sel = window.getSelection();
            if (sel) {
                sel.removeAllRanges();
                sel.addRange(this._savedRange);
            }
            return this;
        }

        _selectNode(node) {
            const range = document.createRange();
            range.selectNodeContents(node);
            this._savedRange = range;
            return this._restoreSelection();
        }

        // Format commands

        _execCmd(key) {
            const def = CMDS[key];
            if (!def) return this;

            this._restoreSelection();
            this.$editable.trigger('focus');
            switch (def.cmd) {
                case 'h2': case 'h3': this._toggleBlock(def.cmd); break;
                case 'quote':         this._toggleBlock('blockquote'); break;
                case 'codeBlock':     this._toggleBlock('pre'); break;
                case 'inlineCode':    this._toggleInlineCode(); break;
                default:              document.execCommand(def.cmd, false, null);
            }
            this._syncState();
            this._afterEdit();
            return this;
        }

        // Applies a block tag, or returns to a paragraph when it is already applied
        _toggleBlock(tag) {
            let current = '';
            try { current = String(document.queryCommandValue('formatBlock') || '').toLowerCase().replace(/[<>]/g, ''); } catch (err) { /* unsupported */ }
            document.execCommand('formatBlock', false, current === tag ? 'p' : tag);
            return this;
        }

        _toggleInlineCode() {
            const sel = window.getSelection();
            if (!sel || !sel.rangeCount) return this;
            const range = sel.getRangeAt(0);
            const node  = range.commonAncestorContainer;
            const el    = node.nodeType === 3 ? node.parentElement : node;
            const code  = el && el.closest ? el.closest('code') : null;

            if (code && this.$editable[0].contains(code) && code.parentElement.tagName !== 'PRE') {
                const text = document.createTextNode(code.textContent);
                code.replaceWith(text);
                const r = document.createRange();
                r.selectNodeContents(text);
                sel.removeAllRanges();
                sel.addRange(r);
            } else if (!range.collapsed) {
                document.execCommand('insertHTML', false, `<code>${escapeHtml(range.toString())}</code>`);
            }
            return this;
        }

        // Fires change after programmatic edits, which do not always raise an input event
        _afterEdit() {
            this._toggleEmpty();
            this._updateStatus();
            this._dispatch('ts.richeditor.change');
            if (typeof this.options.onChange === 'function') this.options.onChange.call(this, this.getContent());
            return this;
        }

        // Markdown typing shortcuts

        // Block shortcuts fire on Space ("## ") or Enter ("```", "---") at the start of a line
        _blockShortcut(e) {
            const sel = window.getSelection();
            if (!sel || !sel.rangeCount || !sel.isCollapsed) return false;
            const range = sel.getRangeAt(0);
            let block = range.startContainer;
            while (block && block !== this.$editable[0] && !(block.nodeType === 1 && /^(P|DIV)$/.test(block.tagName))) {
                block = block.parentNode;
            }
            if (!block || block === this.$editable[0]) {
                // Text typed directly in the editable root, with no wrapping paragraph yet
                if (range.startContainer.nodeType !== 3 || range.startContainer.parentNode !== this.$editable[0]) return false;
                block = null;
            }
            const text = block ? block.textContent : range.startContainer.nodeValue;
            const upTo = block ? this._textBefore(block, range) : text.slice(0, range.startOffset);
            const clear = () => {
                if (block) { block.innerHTML = '<br>'; }
                else { range.startContainer.nodeValue = text.slice(upTo.length); }
                const r = document.createRange();
                r.selectNodeContents(block || range.startContainer.parentNode);
                r.collapse(true);
                sel.removeAllRanges();
                sel.addRange(r);
            };

            if (e.key === ' ') {
                if (upTo !== text.slice(0, upTo.length) || text.trim() !== upTo.trim()) return false;
                let m;
                if ((m = upTo.match(/^(#{1,3})$/))) { clear(); document.execCommand('formatBlock', false, 'h' + m[1].length); }
                else if (upTo === '>')                { clear(); document.execCommand('formatBlock', false, 'blockquote'); }
                else if (/^[-*+]$/.test(upTo))        { clear(); document.execCommand('insertUnorderedList'); }
                else if (/^\d+[.)]$/.test(upTo))      { clear(); document.execCommand('insertOrderedList'); }
                else return false;
                this._afterEdit();
                return true;
            }

            if (e.key === 'Enter') {
                if (/^`{3}[\w+#.-]*$/.test(upTo) && text.trim() === upTo) { clear(); document.execCommand('formatBlock', false, 'pre'); this._afterEdit(); return true; }
                if (/^(-{3,}|\*{3,}|_{3,})$/.test(upTo) && text.trim() === upTo) {
                    clear();
                    document.execCommand('insertHorizontalRule');
                    this._afterEdit();
                    return true;
                }
            }
            return false;
        }

        _textBefore(block, range) {
            const r = document.createRange();
            r.selectNodeContents(block);
            r.setEnd(range.startContainer, range.startOffset);
            return r.toString();
        }

        // **bold**, *italic*, ~~strike~~ and `code` convert when the closing mark is typed
        _inlineShortcut(ev) {
            if (!ev || ev.inputType !== 'insertText' || !/^[*_`~]$/.test(ev.data || '')) return;
            const sel = window.getSelection();
            if (!sel || !sel.rangeCount || !sel.isCollapsed) return;
            const node = sel.anchorNode;
            if (!node || node.nodeType !== 3 || node.parentElement.closest('pre, code')) return;

            const before = node.nodeValue.slice(0, sel.anchorOffset);
            const rules = [
                [/\*\*([^*\s](?:[^*]*[^*\s])?)\*\*$/, 'bold', 2],
                [/~~([^~\s](?:[^~]*[^~\s])?)~~$/, 'strikeThrough', 2],
                [/(?:^|[^*\w])\*([^*\s](?:[^*]*[^*\s])?)\*$/, 'italic', 1],
                [/(?:^|[^`])`([^`]+)`$/, 'code', 1]
            ];
            for (let i = 0; i < rules.length; i++) {
                const m = before.match(rules[i][0]);
                if (!m) continue;
                const mark = rules[i][2];
                const inner = m[1];
                const end = sel.anchorOffset;
                const start = end - inner.length - mark * 2;
                const r = document.createRange();
                r.setStart(node, start);
                r.setEnd(node, end);
                sel.removeAllRanges();
                sel.addRange(r);
                if (rules[i][1] === 'code') document.execCommand('insertHTML', false, `<code>${escapeHtml(inner)}</code>&#8203;`);
                else {
                    document.execCommand('insertText', false, inner);
                    const back = document.createRange();
                    const n = sel.anchorNode;
                    back.setStart(n, sel.anchorOffset - inner.length);
                    back.setEnd(n, sel.anchorOffset);
                    sel.removeAllRanges();
                    sel.addRange(back);
                    document.execCommand(rules[i][1], false, null);
                    sel.collapseToEnd();
                    // Typing continues unformatted after the converted text
                    try { if (document.queryCommandState(rules[i][1])) document.execCommand(rules[i][1], false, null); } catch (err) { /* unsupported */ }
                }
                return;
            }
        }

        // Images

        _insertImage() {
            if (typeof this.options.imageUpload === 'function') {
                const self  = this;
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                input.multiple = true;
                input.addEventListener('change', () => self._uploadFiles(input.files));
                this._saveSelection();
                input.click();
                return this;
            }
            // Without an upload handler the link dialog asks for an image address
            this._imageMode = true;
            return this._openLinkDialog();
        }

        _uploadFiles(fileList) {
            const self = this;
            this._restoreSelection();
            Array.prototype.filter.call(fileList, (f) => /^image\//.test(f.type)).forEach((file) => {
                const alt = (file.name || 'image').replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim() || 'image';
                const id  = `ts-re-up-${++seq}`;
                self.$editable.trigger('focus');
                document.execCommand('insertHTML', false,
                    `<p><img data-ts-uploading="${id}" alt="${escapeHtml(alt)}" style="opacity:.4" src="data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw=="></p>`);
                self.setStatus('Uploading image\u2026');

                Promise.resolve()
                    .then(() => self.options.imageUpload(file))
                    .then((url) => {
                        const safe = normalizeUrl(url, ['http', 'https']);
                        const img  = self.$editable.find(`img[data-ts-uploading="${id}"]`)[0];
                        if (!safe) throw new Error('No image address returned');
                        if (img) { img.src = safe; img.removeAttribute('data-ts-uploading'); img.removeAttribute('style'); }
                        self.setStatus('Image added');
                        self._dispatch('ts.richeditor.upload', { file, url: safe });
                        self._afterEdit();
                    })
                    .catch((err) => {
                        self.$editable.find(`img[data-ts-uploading="${id}"]`).closest('p').remove();
                        self.setStatus('Upload failed');
                        self._dispatch('ts.richeditor.error', { error: err });
                        self._afterEdit();
                    });
            });
            return this;
        }

        // Link dialog flow

        _openLinkDialog() {
            const range = this._activeRange();
            if (!range || !this._dialog) return this;

            this._savedRange   = range;
            this._selectedText = range.toString().trim();

            const node = range.commonAncestorContainer;
            const el   = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
            const a    = el && typeof el.closest === 'function' ? el.closest('a') : null;
            this._linkEl = a && this.$editable[0].contains(a) ? a : null;

            if (this._imageMode) this._linkEl = null;
            this._dialog.open();
            return this;
        }

        _setLinkError(message) {
            this.$linkError.text(message).prop('hidden', !message);
            this.$linkInput.attr('aria-invalid', message ? 'true' : 'false');
            return this;
        }

        _applyLink() {
            const self = this;
            const raw  = self.$linkInput.val().trim();

            if (!raw) {
                if (self._linkEl) return self._removeLink();
                self._dialog.close();
                return this;
            }

            const url = normalizeUrl(raw, self._imageMode ? ['http', 'https'] : self.options.allowedProtocols);
            if (!url) {
                self._setLinkError('Enter a valid URL (' + self.options.allowedProtocols.join(', ') + ').');
                self.$linkInput.trigger('focus');
                return this;
            }

            self._restoreSelection();
            self.$editable.trigger('focus');

            if (self._imageMode) {
                self._imageMode = false;
                document.execCommand('insertHTML', false, `<img src="${escapeHtml(url)}" alt="">`);
                self._dialog.close();
                self._afterEdit();
                return this;
            }

            if (self._linkEl) {
                // Editing: retarget the whole existing link
                self._selectNode(self._linkEl);
                document.execCommand('createLink', false, url);
            } else if (self._selectedText) {
                document.execCommand('createLink', false, url);
            } else {
                document.execCommand('insertHTML', false,
                    `<a href="${escapeHtml(url)}">${escapeHtml(raw)}</a>`
                );
            }

            self._decorateLinks();
            self._dialog.close();
            self._afterEdit();
            return this;
        }

        _removeLink() {
            if (this._linkEl) {
                this._restoreSelection();
                this.$editable.trigger('focus');
                this._selectNode(this._linkEl);
                document.execCommand('unlink', false, null);
            }
            this._dialog.close();
            return this;
        }

        // Applies linkTarget and a safe rel to the anchors touched by the current selection
        _decorateLinks() {
            const target = this.options.linkTarget;
            const sel    = window.getSelection();
            if (!target || !sel || !sel.rangeCount) return this;

            this.$editable.find('a[href]').each(function() {
                if (!sel.containsNode(this, true)) return;
                this.setAttribute('target', target);
                this.setAttribute('rel', 'noopener noreferrer');
            });
            return this;
        }

        // State

        // Syncs PluginToolbar toggle items with the real formatting state. Only aria-pressed
        // and the toolbar class are written, so no commands are re-fired.
        _syncState() {
            if (!this.$toolbarEl) return this;

            this.$toolbarEl.find('[data-toolbar-toggle-item]').each(function() {
                const def = CMDS[this.getAttribute('data-toolbar-value')];
                if (!def) return;

                let active = false;
                if (def.cmd === 'inlineCode') {
                    const s = window.getSelection();
                    const n = s && s.anchorNode;
                    const el = n && (n.nodeType === 3 ? n.parentElement : n);
                    active = !!(el && el.closest && el.closest('code') && !el.closest('pre'));
                } else {
                    try { active = !!document.queryCommandState(def.cmd); } catch (err) { /* unsupported */ }
                }
                this.setAttribute('aria-pressed', active ? 'true' : 'false');
                this.classList.toggle('ts-toolbar__toggle-item--on', active);
            });
            return this;
        }

        _toggleEmpty() {
            this.$editable.toggleClass('ts-re-empty', this.isEmpty());
            return this;
        }

        _dispatch(name) {
            this.$el[0].dispatchEvent(new CustomEvent(name, {
                detail: { instance: this },
                bubbles: true
            }));
            return this;
        }

        // Public API

        isEmpty() {
            return this.$editable.text().trim() === ''
                && !this.$editable.find('img, hr, li').length;
        }

        getContent() {
            return this.isEmpty() ? '' : this.$editable.html();
        }

        getText() {
            return this.$editable.text();
        }

        getWordCount() {
            return (this.getText().match(/[\p{L}\p{N}']+/gu) || []).length;
        }

        // Converts the current content to Markdown
        getMarkdown() {
            return this.isEmpty() ? '' : htmlToMarkdown(this.$editable[0]);
        }

        // Renders Markdown into the editor. Uses options.renderer, else PluginMarkdown (sanitized).
        setMarkdown(md) {
            md = md || '';
            let html = '';
            if (typeof this.options.renderer === 'function') {
                html = this.options.renderer(md);
            } else if (typeof $.fn.themestrapPluginMarkdown === 'function') {
                const $host = $('<div></div>');
                $host.themestrapPluginMarkdown({ sanitize: true, highlight: false });
                const inst  = $host.data('__pluginMarkdown');
                inst.render(md);
                html = inst.getHtml();
                if (inst.destroy) inst.destroy();
            } else {
                html = `<p>${escapeHtml(md).replace(/\n{2,}/g, '</p><p>').replace(/\n/g, '<br>')}</p>`;
            }
            // Task list checkboxes are display-only in the editor and round-trip through Markdown
            return this.setContent(html);
        }

        _updateStatus() {
            if (!this.$status) return this;
            const words = this.getWordCount();
            this.$status.find('.ts-re-words').text(`${words} word${words === 1 ? '' : 's'}`);
            this.$status.find('.ts-re-time').text(`${Math.max(words ? 1 : 0, Math.ceil(words / 220))} min read`);
            return this;
        }

        setStatus(msg) {
            if (this.$status) this.$status.find('.ts-re-msg').text(msg || '');
            return this;
        }

        setContent(html) {
            this.$editable.html(html || '');
            this._toggleEmpty();
            this._updateStatus();
            return this;
        }

        clear() {
            return this.setContent('');
        }

        focus() {
            this.$editable.trigger('focus');
            return this;
        }

        enable() {
            this.$editable.attr('contenteditable', 'true').removeAttr('aria-disabled');
            this.options.wrapper.removeClass('ts-re-disabled');
            return this;
        }

        disable() {
            this.$editable.attr({ contenteditable: 'false', 'aria-disabled': 'true' });
            this.options.wrapper.removeClass('ts-re-focused').addClass('ts-re-disabled');
            return this;
        }

        destroy() {
            const self = this;
            if (self._failed) return this;

            $(document).off(`selectionchange.${self._ns}`);

            if (self._toolbar && typeof self._toolbar.destroy === 'function') {
                self._toolbar.destroy();
            }
            if (self.$toolbarEl) {
                self.$toolbarEl.off(`.${EVENT_NS}`).remove();
            }

            if (self._dialog && typeof self._dialog.destroy === 'function') {
                self._dialog.destroy();
            }
            if (self.$dialog) {
                self.$dialog.off(`.${EVENT_NS}`).remove();
            }

            // The current content is handed back to the host so a re-init keeps the user's work
            const html = self.getContent();
            self.$editable.off(`.${EVENT_NS}`).remove();
            if (self.$status) self.$status.remove();
            self.options.wrapper
                .removeClass('ts-richeditor ts-re-focused ts-re-disabled')
                .html(html)
                .removeData(instanceName);

            instanceCount--;
            if (instanceCount <= 0) {
                instanceCount = 0;
                const styleEl = document.getElementById(STYLE_ID);
                if (styleEl) styleEl.remove();
            }

            return this;
        }
    }

    PluginRichEditor.defaults = {
        placeholder:      'Write your message\u2026',
        ariaLabel:        'Rich text editor',
        minHeight:        '220px',
        maxHeight:        null,
        // Command keys. Legacy '|' separators are accepted but ignored, since grouping is automatic.
        // Set to false to render without a toolbar.
        toolbar:          ['bold', 'italic', 'underline', 'strike', '|', 'ul', 'ol', '|', 'link', 'clearFormat'],
        toolbarOptions:   { ariaLabel: 'Text formatting', size: 'sm', full: true },
        dialogOptions:    { animationIn: 'zoomIn', animationOut: 'zoomOut', closeOnBackdrop: true, scrollLock: false },
        linkTarget:       '_blank',    // '' leaves links without a target attribute
        allowedProtocols: ['http', 'https', 'mailto', 'tel'],
        pastePlainText:   true,        // strips formatting from pasted content
        markdownShortcuts: false,      // "## ", "- ", "> ", "```", "---", **bold**, *italic*, `code` convert as you type
        statusBar:        false,       // word count and reading time under the editor
        imageUpload:      null,        // function(file) returning a URL or a Promise of one; enables paste, drop and file picking
        renderer:         null,        // function(markdown) returning HTML, replaces PluginMarkdown in setMarkdown()
        disabled:         false,
        onChange:         null,        // function(html) {}
        onFocus:          null,        // function() {}
        onBlur:           null         // function() {}
    };

    PluginRichEditor.toolbars = TOOLBARS;

    $.extend(themestrap, { PluginRichEditor });

    $.fn.themestrapPluginRichEditor = function(opts) {
        return this.map(function() {
            const $this = $(this);

            if ($this.data(instanceName)) {
                return $this.data(instanceName);
            } else {
                return new PluginRichEditor($this, opts);
            }
        });
    };

})).apply(this, [window.themestrap, jQuery]);
