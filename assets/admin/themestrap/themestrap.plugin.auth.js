/**
 * Themestrap Auth
 *
 * Progressive-enhancement layer for authentication forms, independent of any backend.
 * It adds inline validation, password show/hide, a strength meter, a Caps Lock hint, busy
 * and lockout states, inline or toast feedback, and optional AJAX submission. The network
 * layer is a pluggable adapter, so the same form can talk to MODX, a PHP session, Laravel,
 * Django, a JWT REST API, Firebase, an OAuth provider, or anything else.
 *
 * Without JavaScript the form still submits natively, so the page keeps working.
 *
 * Markup (unchanged from earlier versions):
 *
 *   <form data-plugin-auth
 *         data-auth-action="login"
 *         data-plugin-options='{"adapter": "json", "redirect": "/dashboard"}'
 *         method="post" action="/login">
 *
 *     <div data-auth-message></div>                       <!-- optional inline status area -->
 *
 *     <div data-auth-field="username">
 *       <label for="u">Username</label>
 *       <input id="u" name="username" required data-auth-error>
 *       <div data-auth-feedback></div>
 *     </div>
 *
 *     <div data-auth-field="password">
 *       <label for="p">Password</label>
 *       <input id="p" name="password" type="password" required minlength="8"
 *              data-auth-strength data-auth-error>
 *       <button type="button" data-auth-toggle-password>Show</button>
 *       <div data-auth-strength-meter></div>
 *       <span data-auth-capslock class="d-none">Caps Lock is on</span>
 *       <div data-auth-feedback></div>
 *     </div>
 *
 *     <button type="submit" data-auth-submit>
 *       <span data-auth-submit-label>Sign in</span>
 *       <span data-auth-spinner class="d-none"></span>
 *     </button>
 *   </form>
 *
 * Optional extras:
 *   data-auth-step="credentials|otp|..."   a section shown for one step of a multi-step flow
 *   data-auth-provider="github"            a button that starts an OAuth or social sign-in
 *   data-auth-match="#password"            field must equal another field
 *   data-auth-validate="name"              run options.validators[name]
 *   data-auth-redirect, data-auth-success-msg, data-auth-error-msg   per-form overrides
 *
 * Adapters (options.adapter):
 *   'form'  (default)  native browser submit
 *   'json'             fetch, response understood in many common shapes
 *   'modx'             alias of 'json' with form-encoded bodies (Login and FormIt style)
 *   'rest'             alias of 'json' with JSON bodies
 *   object             { submit(ctx) => Promise<result> } for any other system
 *   function           shorthand for { submit: fn }
 *   ajax: true is shorthand for adapter 'json'.
 *
 * A result is { ok, message, errors, redirect, token, challenge, retryAfter, data }.
 *
 * Public API (via stored instance):
 *   const auth = $('#form').data('__pluginAuth');
 *   auth.validate();             // true | false
 *   auth.submit();               // validate and send, same as pressing the button
 *   auth.setBusy(true|false);
 *   auth.setMessage(text, 'error' | 'success' | 'info');
 *   auth.clearMessage();
 *   auth.setErrors({ field: 'message' });
 *   auth.showStep('otp');        // reveal a [data-auth-step] section
 *   auth.getToken(); auth.setToken(t); auth.clearToken();
 *   auth.reset();
 *   auth.destroy();
 *
 *   themestrap.PluginAuth.registerAdapter(name, adapter);
 *   themestrap.PluginAuth.getToken(key, store);
 *   themestrap.PluginAuth.authHeaders(tokenOptions);   // { Authorization: 'Bearer …' } for your own calls
 *
 * Events. Earlier jQuery events are kept, and every event is also a native CustomEvent
 * (bubbling, dispatched on the form) named ts.auth.*:
 *   auth:validate  / ts.auth.validate    (instance, isValid)
 *   auth:submit    / ts.auth.submit      (instance, data)
 *   auth:success   / ts.auth.success     (instance, result)
 *   auth:error     / ts.auth.error       (instance, result)
 *   auth:challenge / ts.auth.challenge   (instance, step)
 *   auth:token     / ts.auth.token       (instance, token)
 *   ts.auth.redirect                     cancelable, detail.url
 *
 * CSS custom properties (all optional): --ts-au-invalid, --ts-au-valid, --ts-au-muted,
 * --ts-au-warn-bg, --ts-au-warn-text, --ts-au-info-bg, --ts-au-info-text
 *
 * Init.js wiring (DOM ready, auth forms must work without scrolling):
 *   if (typeof $.fn['themestrapPluginAuth'] === 'function' && $('[data-plugin-auth]').length) {
 *       $(() => {
 *           $('[data-plugin-auth]:not(.manual)').each(function () {
 *               const $this = $(this);
 *               const opts = themestrap.fn.getOptions($this.data('plugin-options')) || undefined;
 *               $this.themestrapPluginAuth(opts);
 *           });
 *       });
 *   }
 */
// Auth
(((themestrap = {}, $) => {
    const instanceName = '__pluginAuth';
    const STYLE_ID     = 'ts-auth-styles';
    const EVENT_NS     = 'auth';

    let instanceCount = 0;

    const LIGHT_TOKENS = `
        --au-invalid:   var(--ts-au-invalid, #dc3545);
        --au-valid:     var(--ts-au-valid, #198754);
        --au-muted:     var(--ts-au-muted, #6c757d);
        --au-track:     var(--ts-au-track, #e9ecef);
        --au-warn-bg:   var(--ts-au-warn-bg, #fff3cd);
        --au-warn-text: var(--ts-au-warn-text, #664d03);
        --au-info-bg:   var(--ts-au-info-bg, #e7f1ff);
        --au-info-text: var(--ts-au-info-text, #0a3c7d);
    `;
    const DARK_TOKENS = `
        --au-invalid:   var(--ts-au-invalid, #f87171);
        --au-valid:     var(--ts-au-valid, #4ade80);
        --au-muted:     var(--ts-au-muted, #9fb3c8);
        --au-track:     var(--ts-au-track, rgba(255,255,255,.12));
        --au-warn-bg:   var(--ts-au-warn-bg, rgba(251,191,36,.15));
        --au-warn-text: var(--ts-au-warn-text, #fbbf24);
        --au-info-bg:   var(--ts-au-info-bg, rgba(96,165,250,.15));
        --au-info-text: var(--ts-au-info-text, #93c5fd);
    `;

    // Rules use :where() where Bootstrap supplies the same thing, so the framework always wins
    // and the form still looks right when Bootstrap is not on the page.
    const CSS_TEXT = `
        .auth-form { ${LIGHT_TOKENS} }
        @media (prefers-color-scheme: dark) {
            .auth-form { ${DARK_TOKENS} }
        }
        html.dark .auth-form,
        [data-bs-theme="dark"] .auth-form { ${DARK_TOKENS} }
        [data-bs-theme="light"] .auth-form { ${LIGHT_TOKENS} }

        :where(.auth-form) .d-none { display: none !important; }
        .auth-form [hidden] { display: none !important; }
        .auth-form [data-auth-feedback]:empty { display: none; }
        .auth-form [data-auth-feedback]:not(:empty) { display: block; margin-top: .25rem; font-size: .85rem; color: var(--au-invalid); }
        :where(.auth-form) .is-invalid { border-color: var(--au-invalid); }
        :where(.auth-form) .is-valid   { border-color: var(--au-valid); }
        :where(.auth-form) .spinner-border {
            display: inline-block; width: 1em; height: 1em; vertical-align: -.125em;
            border: .15em solid currentColor; border-right-color: transparent; border-radius: 50%;
            animation: ts-auth-spin .6s linear infinite;
        }
        @keyframes ts-auth-spin { to { transform: rotate(360deg); } }
        @media (prefers-reduced-motion: reduce) { :where(.auth-form) .spinner-border { animation-duration: 2s; } }

        .auth-message { margin: 0 0 1rem; padding: .6rem .85rem; border-radius: 8px; font-size: .9rem; border: 1px solid transparent; }
        .auth-message:empty { display: none; }
        .auth-message--error   { background: color-mix(in srgb, var(--au-invalid) 12%, transparent); border-color: var(--au-invalid); }
        .auth-message--success { background: color-mix(in srgb, var(--au-valid) 12%, transparent);   border-color: var(--au-valid); }
        .auth-message--info    { background: var(--au-info-bg); color: var(--au-info-text); border-color: transparent; }

        .auth-strength { display: flex; align-items: center; gap: 4px; margin-top: 6px; height: 22px; }
        .auth-strength .auth-strength-bar { flex: 1; height: 4px; border-radius: 2px; background: var(--au-track); transition: background-color .2s ease; }
        .auth-strength[data-score="0"] .auth-strength-bar--on,
        .auth-strength[data-score="1"] .auth-strength-bar--on { background: #dc3545; }
        .auth-strength[data-score="2"] .auth-strength-bar--on { background: #f0ad00; }
        .auth-strength[data-score="3"] .auth-strength-bar--on { background: #0dcaf0; }
        .auth-strength[data-score="4"] .auth-strength-bar--on { background: #198754; }
        .auth-strength .auth-strength-label { margin-left: 8px; font-size: 11px; font-weight: 600; letter-spacing: .04em; text-transform: uppercase; color: var(--au-muted); min-width: 64px; }

        .auth-capslock { display: inline-block; margin-top: 6px; padding: 2px 8px; border-radius: 10px; background: var(--au-warn-bg); color: var(--au-warn-text); font-size: 11px; font-weight: 600; letter-spacing: .03em; }
        .auth-capslock::before { content: "\\21EA "; margin-right: 4px; }

        .auth-profile-card { display: flex; align-items: center; gap: 12px; padding: 12px 14px; border: 1px solid var(--au-track); border-radius: 8px; margin-bottom: 1rem; }
        @media (prefers-reduced-motion: reduce) { .auth-strength .auth-strength-bar { transition: none; } }
    `;

    function injectStyles() {
        if (document.getElementById(STYLE_ID)) return;
        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = CSS_TEXT;
        (document.head || document.documentElement).appendChild(style);
    }

    // Helpers

    const STRENGTH_LABELS  = ['Too weak', 'Weak', 'Fair', 'Good', 'Strong'];
    const STRENGTH_CLASSES = ['bg-danger', 'bg-danger', 'bg-warning', 'bg-info', 'bg-success'];
    const EMAIL_RX         = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    function scorePassword(pw) {
        if (!pw) return 0;
        let score = 0;
        if (pw.length >= 8)  score++;
        if (pw.length >= 12) score++;
        if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
        if (/\d/.test(pw))   score++;
        if (/[^A-Za-z0-9]/.test(pw)) score++;
        return Math.min(score, 4);
    }

    const isObj  = (v) => v && typeof v === 'object' && !Array.isArray(v);
    const truthy = (v) => v === true || v === 1 || v === '1' || String(v).toLowerCase() === 'true';

    function getPath(obj, path) {
        if (!obj || path == null) return undefined;
        return String(path).split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
    }

    function firstOf(obj, paths) {
        for (let i = 0; i < paths.length; i++) {
            const v = getPath(obj, paths[i]);
            if (v !== undefined && v !== null && v !== '') return v;
        }
        return undefined;
    }

    function readCookie(name) {
        const m = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '=([^;]*)'));
        return m ? decodeURIComponent(m[1]) : '';
    }

    function storeFor(kind) {
        try {
            if (kind === 'local')   return window.localStorage;
            if (kind === 'session') return window.sessionStorage;
        } catch (e) { /* storage blocked */ }
        return null;
    }

    const memoryTokens = {};

    // Redirects stay on this site unless the page opts in, so a forged response cannot send users away.
    function safeRedirect(url, allowExternal) {
        if (!url) return '';
        try {
            const u = new URL(url, window.location.href);
            if (!/^https?:$/.test(u.protocol)) return '';
            if (!allowExternal && u.origin !== window.location.origin) return '';
            return u.href;
        } catch (e) {
            return '';
        }
    }

    // Turns any common server reply into { ok, message, errors, redirect, token, challenge, retryAfter, data }
    function defaultNormalize(body, res, opts) {
        const b   = isObj(body) ? body : {};
        const map = opts.response || {};
        const pick = (key, paths) => (map[key] !== undefined
            ? (typeof map[key] === 'function' ? map[key](body, res) : getPath(b, map[key]))
            : firstOf(b, paths));

        let ok = !!res.ok;
        ['success', 'ok', 'authenticated'].forEach((k) => {
            if (k in b) ok = ok && truthy(b[k]);
        });
        if (typeof b.status === 'string' && /^(error|fail|failed|failure)$/i.test(b.status)) ok = false;
        if (typeof b.error === 'string' && b.error) ok = false;
        if (map.success !== undefined) {
            const s = typeof map.success === 'function' ? map.success(body, res) : getPath(b, map.success);
            ok = !!res.ok && truthy(s);
        }

        let message = pick('message', ['message', 'msg', 'detail', 'error_description', 'error', 'title']);
        if (message && typeof message !== 'string') message = '';

        // Field errors: { errors: { field: 'msg' | ['msg'] } }, [{ field, message }], or DRF style { field: ['msg'] }
        let errors = pick('errors', ['errors', 'fieldErrors', 'field_errors']);
        const out = {};
        if (isObj(errors)) {
            Object.keys(errors).forEach((k) => {
                const v = errors[k];
                out[k] = Array.isArray(v) ? String(v[0]) : (isObj(v) ? String(v.message || '') : String(v));
            });
        } else if (Array.isArray(errors)) {
            errors.forEach((e) => {
                const f = e && (e.field || e.name || e.path || e.param);
                if (f) out[f] = String(e.message || e.msg || '');
            });
        } else if (!res.ok && !map.errors) {
            Object.keys(b).forEach((k) => {
                if (Array.isArray(b[k]) && b[k].length && typeof b[k][0] === 'string') out[k] = b[k][0];
            });
        }

        let challenge = pick('challenge', ['challenge', 'next_step', 'nextStep', 'requires']);
        if (!challenge && (truthy(b.mfa_required) || truthy(b.mfa) || truthy(b.requires_otp) || truthy(b.otp_required))) challenge = 'otp';
        if (challenge && typeof challenge !== 'string') challenge = 'otp';

        let retry = pick('retryAfter', ['retryAfter', 'retry_after']);
        const header = res.headers && typeof res.headers.get === 'function' ? res.headers.get('Retry-After') : '';
        if ((retry === undefined || retry === '') && header) retry = header;

        const token = pick('token', ['token', 'access_token', 'accessToken', 'jwt', 'data.token', 'data.access_token']);
        const redirect = pick('redirect', ['redirect', 'redirectUrl', 'redirect_url', 'redirect_to', 'next', 'location'])
            || (res.headers && typeof res.headers.get === 'function' ? res.headers.get('Location') : '');

        return {
            ok, message: message || '', errors: out, redirect: redirect || '', token: token ? String(token) : '',
            challenge: challenge || '', retryAfter: Math.max(0, parseInt(retry, 10) || 0), data: body
        };
    }

    // Built in adapters

    function jsonTransport(ctx) {
        const o = ctx.options;
        const headers = $.extend({ 'X-Requested-With': 'XMLHttpRequest', 'Accept': 'application/json' }, o.headers);
        let body;

        if (o.encoding === 'json') {
            headers['Content-Type'] = 'application/json';
            body = JSON.stringify(ctx.data);
        } else {
            const p = new URLSearchParams();
            Object.keys(ctx.data).forEach((k) => {
                const v = ctx.data[k];
                (Array.isArray(v) ? v : [v]).forEach((x) => p.append(k, x == null ? '' : x));
            });
            body = p.toString();
            headers['Content-Type'] = 'application/x-www-form-urlencoded;charset=UTF-8';
        }

        if (ctx.csrf && ctx.csrf.value && ctx.csrf.header) headers[ctx.csrf.header] = ctx.csrf.value;
        const bearer = ctx.instance._bearer();
        if (bearer) headers[bearer.name] = bearer.value;

        const method = ctx.method === 'GET' ? 'GET' : ctx.method;
        let url = ctx.url;
        const init = { method, headers, credentials: o.credentials };
        if (method === 'GET') {
            url += (url.indexOf('?') === -1 ? '?' : '&') + body;
            delete headers['Content-Type'];
        } else {
            init.body = body;
        }

        const useFetch = typeof window.fetch === 'function';
        const finish = (res, text) => {
            let parsed = null;
            let isJson = true;
            if (text) {
                try { parsed = JSON.parse(text); } catch (e) { isJson = false; }
            }
            if (!isJson && res.status !== 204) {
                return { ok: false, message: o.unexpectedResponseMessage, errors: {}, redirect: '', token: '', challenge: '', retryAfter: 0, data: text };
            }
            const normalize = typeof o.normalize === 'function' ? o.normalize : defaultNormalize;
            const result = normalize(parsed, res, o, ctx);
            return result;
        };

        if (useFetch) {
            let timer = null;
            if (typeof AbortController === 'function' && o.timeout) {
                const ac = new AbortController();
                init.signal = ac.signal;
                timer = setTimeout(() => ac.abort(), o.timeout);
            }
            return window.fetch(url, init)
                .then((res) => res.text().then((text) => { clearTimeout(timer); return finish(res, text); }))
                .catch((err) => { clearTimeout(timer); throw err; });
        }

        return new Promise((resolve, reject) => {
            $.ajax({ url, method, headers, data: init.body, processData: false, contentType: headers['Content-Type'], dataType: 'text', timeout: o.timeout })
                .done((text, st, xhr) => resolve(finish({ ok: true, status: xhr.status, headers: { get: (n) => xhr.getResponseHeader(n) } }, text)))
                .fail((xhr) => {
                    if (!xhr.status) return reject(new Error('network'));
                    resolve(finish({ ok: false, status: xhr.status, headers: { get: (n) => xhr.getResponseHeader(n) } }, xhr.responseText));
                });
        });
    }

    const ADAPTERS = {
        form: { native: true },
        json: { submit: jsonTransport },
        modx: { encoding: 'form', submit: jsonTransport },
        rest: { encoding: 'json', submit: jsonTransport }
    };

    class PluginAuth {
        constructor($el, opts) {
            return this.initialize($el, opts);
        }

        initialize($el, opts) {
            if ($el.data(instanceName)) {
                return this;
            }

            this.$el    = $el;
            this.action = ($el.data('auth-action') || 'login').toString().toLowerCase();
            this.busy   = false;
            this._uid   = 'auth-' + Math.random().toString(36).slice(2, 8);

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
            this.options = $.extend(true, {}, PluginAuth.defaults, opts, {
                wrapper: this.$el
            });
            // Functions and adapter objects are kept as given, not cloned
            if (opts) {
                ['normalize', 'beforeSubmit', 'transform'].forEach((k) => { if (typeof opts[k] === 'function') this.options[k] = opts[k]; });
                if (opts.adapter && typeof opts.adapter !== 'string') this.options.adapter = opts.adapter;
                if (opts.validators) this.options.validators = opts.validators;
                if (opts.providers)  this.options.providers  = opts.providers;
                if (opts.response)   this.options.response   = opts.response;
            }
            this.adapter = this._resolveAdapter();
            if (this.adapter.encoding && !(opts && opts.encoding)) this.options.encoding = this.adapter.encoding;
            return this;
        }

        _resolveAdapter() {
            let a = this.options.adapter;
            if (a == null || a === '') a = this.options.ajax ? 'json' : 'form';
            if (typeof a === 'function') return { submit: a };
            if (isObj(a)) return a;
            return ADAPTERS[a] || ADAPTERS.form;
        }

        build() {
            const self = this;
            const $el  = self.$el;

            instanceCount++;
            injectStyles();

            self.$fields  = $el.find('[data-auth-field]');
            self.$inputs  = $el.find('[data-auth-error]');
            self.$submit  = $el.find('[data-auth-submit]').first();
            self.$label   = self.$submit.find('[data-auth-submit-label]').first();
            self.$spinner = self.$submit.find('[data-auth-spinner]').first();

            if (self.$label.length) {
                self.originalLabel = self.$label.text();
            }

            $el.addClass('auth-form auth-form-' + self.action);
            if ($el.is('form')) $el.attr('novalidate', 'novalidate');

            // Link each input to its feedback text so screen readers announce the error
            self.$inputs.each(function () {
                const $i = $(this);
                const $fb = $i.closest('[data-auth-field]').find('[data-auth-feedback]').first();
                if ($fb.length) {
                    if (!$fb.attr('id')) $fb.attr('id', self._uid + '-fb-' + ($i.attr('name') || Math.random().toString(36).slice(2, 6)));
                    $i.attr('aria-describedby', $fb.attr('id'));
                }
            });

            // Hide every step except the first
            const $steps = $el.find('[data-auth-step]');
            if ($steps.length) {
                self._step = $steps.first().data('auth-step');
                $steps.each(function (i) { if (i > 0) this.setAttribute('hidden', ''); });
            }

            return this;
        }

        events() {
            const self = this;
            const $el  = self.$el;
            const ns   = '.' + self._uid;

            // A button or link marked as the logout action
            if (!$el.is('form')) {
                $el.on('click' + ns, (e) => {
                    if (self.action !== 'logout') return;
                    e.preventDefault();
                    self.submit();
                });
            }

            $el.on('submit' + ns, function (e) {
                if (self._nativeSubmit) { self._nativeSubmit = false; return; }

                if (!self.validate()) {
                    e.preventDefault();
                    e.stopImmediatePropagation();
                    self._message(self.options.errorMessage || $el.data('auth-error-msg') || 'Please correct the highlighted fields.', 'error');
                    return false;
                }

                e.preventDefault();
                const original = e.originalEvent || e;
                self._submitter = original && original.submitter ? original.submitter : null;
                self._dispatchSubmit();
                return false;
            });

            // Live validation on blur / change
            self.$inputs.on('blur' + ns + ' change' + ns, function () {
                self._validateField($(this));
            });

            // Re-validate on input once a field has been marked invalid
            self.$inputs.on('input' + ns, function () {
                const $i = $(this);
                if ($i.hasClass(self.options.classes.invalid)) {
                    self._validateField($i);
                }
            });

            // Password strength meter
            $el.find('[data-auth-strength]').on('input' + ns, function () {
                self._updateStrength($(this));
            });

            // Password toggle
            $el.on('click' + ns, '[data-auth-toggle-password]', function (e) {
                e.preventDefault();
                self._togglePassword($(this));
            });

            // Social and OAuth buttons
            $el.on('click' + ns, '[data-auth-provider]', function (e) {
                e.preventDefault();
                self.provider($(this).data('auth-provider'));
            });

            // Caps Lock warning
            $el.find('input[type="password"]').on('keyup' + ns, function (e) {
                const caps = e.originalEvent && typeof e.originalEvent.getModifierState === 'function'
                    ? e.originalEvent.getModifierState('CapsLock')
                    : false;
                $(this).closest('[data-auth-field]').find('[data-auth-capslock]').toggleClass(self.options.classes.hidden, !caps);
            });

            return this;
        }

        // Public API

        validate() {
            const self = this;
            let valid = true;
            let first = null;

            self.$inputs.each(function () {
                if (!self._active($(this))) return;
                if (!self._validateField($(this))) {
                    valid = false;
                    if (!first) first = this;
                }
            });

            if (first && typeof first.focus === 'function') first.focus();
            self._emit('validate', [self, valid], { instance: self, valid });
            return valid;
        }

        // Validates and sends, exactly like pressing the submit button
        submit() {
            if (!this.validate()) {
                this._message(this.options.errorMessage || 'Please correct the highlighted fields.', 'error');
                return this;
            }
            this._submitter = null;
            this._dispatchSubmit();
            return this;
        }

        reset() {
            const self = this;
            self.$inputs
                .removeClass(self.options.classes.invalid + ' ' + self.options.classes.valid)
                .removeAttr('aria-invalid')
                .closest('[data-auth-field]')
                .find('[data-auth-feedback]').text('');
            self.clearMessage();
            return self;
        }

        setBusy(busy) {
            const self = this;
            self.busy = !!busy;

            if (!self.$submit.length) return self;

            self.$submit.prop('disabled', self.busy);
            self.$submit.attr('aria-busy', self.busy ? 'true' : 'false');

            if (self.$spinner.length) {
                self.$spinner.toggleClass(self.options.classes.hidden, !self.busy);
            }
            if (self.$label.length) {
                self.$label.text(self.busy ? (self.options.busyLabel || 'Working...') : self.originalLabel);
            }
            return self;
        }

        setMessage(text, type) {
            this._message(text, type || 'info', true);
            return this;
        }

        clearMessage() {
            const $m = this._messageEl(false);
            if ($m && $m.length) $m.text('').removeClass('auth-message--error auth-message--success auth-message--info').removeAttr('role');
            return this;
        }

        setErrors(map) {
            const self = this;
            Object.keys(map || {}).forEach((name) => {
                const $i = self.$el.find('[name="' + name + '"]').first();
                if (!$i.length) return;
                const $fb = $i.closest('[data-auth-field]').find('[data-auth-feedback]').first();
                $i.removeClass(self.options.classes.valid).addClass(self.options.classes.invalid).attr('aria-invalid', 'true');
                if ($fb.length) $fb.text(map[name]);
            });
            return self;
        }

        // Reveals one [data-auth-step] section and hides the others
        showStep(name) {
            const self = this;
            const $steps = self.$el.find('[data-auth-step]');
            // An unknown name changes nothing, so a server asking for a step the page lacks cannot hide the form
            if (!$steps.filter(function () { return $(this).data('auth-step') === name; }).length) return self;
            $steps.each(function () {
                if ($(this).data('auth-step') === name) this.removeAttribute('hidden');
                else this.setAttribute('hidden', '');
            });
            self._step = name;
            const $first = $steps.filter(function () { return $(this).data('auth-step') === name; }).find('input, select, textarea').not('[type=hidden]').first();
            if ($first.length) $first.trigger('focus');
            return self;
        }

        getStep() { return this._step || ''; }

        // Tokens, for APIs that answer a sign in with a token instead of a cookie
        getToken() { return PluginAuth.getToken(this.options.token.key, this.options.token.store); }

        setToken(token) {
            const t = this.options.token;
            const kind = t.store;
            if (!kind) return this;
            if (kind === 'memory') {
                memoryTokens[t.key] = token;
            } else {
                const s = storeFor(kind);
                if (s) { try { s.setItem(t.key, token); } catch (e) { /* quota or blocked */ } }
            }
            this._emit('token', [this, token], { instance: this, token });
            return this;
        }

        clearToken() {
            const t = this.options.token;
            delete memoryTokens[t.key];
            ['local', 'session'].forEach((k) => { const s = storeFor(k); if (s) { try { s.removeItem(t.key); } catch (e) { /* blocked */ } } });
            return this;
        }

        _bearer() {
            const t = this.options.token;
            if (!t || !t.store || !t.header) return null;
            const v = this.getToken();
            return v ? { name: t.header, value: (t.scheme ? t.scheme + ' ' : '') + v } : null;
        }

        // Starts an OAuth or social sign in configured under options.providers
        provider(name) {
            const self = this;
            const p = self.options.providers[name];
            if (!p || !p.url) return self;

            if (p.mode !== 'popup') {
                window.location.href = p.url;
                return self;
            }

            const w = p.width || 480, h = p.height || 640;
            const left = Math.max(0, (window.screenX || 0) + ((window.outerWidth || w) - w) / 2);
            const top  = Math.max(0, (window.screenY || 0) + ((window.outerHeight || h) - h) / 2);
            const win = window.open(p.url, 'ts-auth-' + name, 'width=' + w + ',height=' + h + ',left=' + left + ',top=' + top);
            if (!win) {
                self._message(self.options.popupBlockedMessage, 'error');
                return self;
            }
            self.setBusy(true);

            const origin = p.origin || window.location.origin;
            const onMessage = (e) => {
                if (e.origin !== origin) return;
                const d = e.data || {};
                if (d.type !== 'ts-auth') return;
                window.removeEventListener('message', onMessage);
                clearInterval(poll);
                self.setBusy(false);
                const result = { ok: !!d.ok, message: d.message || '', errors: {}, redirect: d.redirect || '', token: d.token || '', challenge: '', retryAfter: 0, data: d };
                self._handleResult(result);
            };
            const poll = setInterval(() => {
                if (win.closed) {
                    clearInterval(poll);
                    window.removeEventListener('message', onMessage);
                    self.setBusy(false);
                }
            }, 500);
            window.addEventListener('message', onMessage);
            return self;
        }

        destroy() {
            const self = this;
            const ns   = '.' + self._uid;

            clearInterval(self._lockTimer);
            self.$el.off(ns);
            self.$inputs.off(ns);
            self.$el.find('[data-auth-strength]').off(ns);
            self.$el.find('input[type="password"]').off(ns);
            self.$el.removeClass('auth-form auth-form-' + self.action);
            self.$el.removeData(instanceName);

            instanceCount--;
            if (instanceCount <= 0) {
                instanceCount = 0;
                const styleEl = document.getElementById(STYLE_ID);
                if (styleEl) styleEl.remove();
            }
            return self;
        }

        // Internals

        _active($input) {
            return !$input.closest('[data-auth-step][hidden]').length;
        }

        _emit(name, jqArgs, detail) {
            this.$el.trigger('auth:' + name, jqArgs);
            const el = this.$el[0];
            if (el && typeof el.dispatchEvent === 'function') {
                el.dispatchEvent(new CustomEvent('ts.' + EVENT_NS + '.' + name, { detail: detail || {}, bubbles: true }));
            }
        }

        _messageEl(create) {
            const self = this;
            let $m = self.$el.find(self.options.messageTarget).first();
            if (!$m.length && create) {
                $m = $('<div class="auth-message" data-auth-message></div>').prependTo(self.$el);
            }
            return $m;
        }

        _hasToasts() {
            return !!(themestrap && themestrap.PluginToast && typeof themestrap.PluginToast.show === 'function');
        }

        _message(text, type, force) {
            if (!text) return;
            const self = this;
            const inline = force || !self._hasToasts() || self.$el.find(self.options.messageTarget).length;

            if (inline) {
                const $m = self._messageEl(true);
                $m.removeClass('auth-message--error auth-message--success auth-message--info')
                    .addClass('auth-message auth-message--' + type)
                    .attr('role', type === 'error' ? 'alert' : 'status')
                    .text(text);
            }
            if (!force && self.options.toasts && self._hasToasts()) {
                themestrap.PluginToast.show({
                    title: type === 'success' ? self.options.toastSuccessTitle : (type === 'info' ? '' : self.options.toastErrorTitle),
                    body:  text,
                    type:  type === 'success' ? 'success' : (type === 'info' ? 'info' : 'danger')
                });
            }
        }

        _validateField($input) {
            const self     = this;
            const o        = self.options;
            const $field   = $input.closest('[data-auth-field]');
            const $fb      = $field.find('[data-auth-feedback]').first();
            const val      = ($input.val() || '').toString();
            const type     = ($input.attr('type') || 'text').toLowerCase();
            const required = $input.prop('required');

            let error = '';

            if (required && !val.trim()) {
                error = o.messages.required;
            }
            else if (val && type === 'email' && !EMAIL_RX.test(val)) {
                error = o.messages.email;
            }
            else if (val && $input.attr('minlength')) {
                const min = parseInt($input.attr('minlength'), 10);
                if (val.length < min) error = o.messages.minlength.replace('%s', min);
            }
            else if (val && $input.attr('pattern')) {
                try {
                    if (!new RegExp('^(?:' + $input.attr('pattern') + ')$').test(val)) error = o.messages.pattern;
                } catch (e) { /* malformed pattern, skip */ }
            }
            if (!error && val && $input.data('auth-match')) {
                const $other = self.$el.find($input.data('auth-match'));
                if ($other.length && val !== ($other.val() || '').toString()) error = o.messages.match;
            }
            if (!error && val && $input.data('auth-validate')) {
                const fn = o.validators && o.validators[$input.data('auth-validate')];
                if (typeof fn === 'function') {
                    const r = fn(val, $input, self);
                    if (typeof r === 'string' && r) error = r;
                    else if (r === false) error = o.messages.pattern;
                }
            }

            const c = o.classes;
            if (error) {
                $input.removeClass(c.valid).addClass(c.invalid).attr('aria-invalid', 'true');
                if ($fb.length) $fb.text(error);
                return false;
            }

            $input.removeClass(c.invalid).removeAttr('aria-invalid');
            if (val.trim()) $input.addClass(c.valid);
            if ($fb.length) $fb.text('');
            return true;
        }

        _updateStrength($input) {
            const val    = ($input.val() || '').toString();
            const score  = scorePassword(val);
            const $field = $input.closest('[data-auth-field]');
            const $meter = $field.find('[data-auth-strength-meter]').first();

            if (!$meter.length) return;

            if (!$meter.children().length) {
                const bars = [0, 1, 2, 3, 4].map(() => '<span class="auth-strength-bar"></span>').join('');
                $meter.addClass('auth-strength').html(bars + '<span class="auth-strength-label"></span>');
            }

            $meter.attr('data-score', val.length ? score : '');
            $meter.children('.auth-strength-bar').each(function (i) {
                const on = i <= score && val.length > 0;
                $(this)
                    .removeClass('bg-danger bg-warning bg-info bg-success')
                    .toggleClass(STRENGTH_CLASSES[score], on)
                    .toggleClass('auth-strength-bar--on', on);
            });
            $meter.children('.auth-strength-label').text(val.length ? STRENGTH_LABELS[score] : '');
        }

        _togglePassword($btn) {
            const $field = $btn.closest('[data-auth-field]');
            const $pw    = $field.find('input').filter(function () {
                const t = ($(this).attr('type') || '').toLowerCase();
                return t === 'password' || t === 'text';
            }).filter('[data-auth-strength], [name*="password"]').first();

            if (!$pw.length) return;

            const isHidden = $pw.attr('type') === 'password';
            $pw.attr('type', isHidden ? 'text' : 'password');
            $btn.text(isHidden ? (this.options.hidePasswordLabel || 'Hide') : (this.options.showPasswordLabel || 'Show'));
            $btn.attr('aria-pressed', isHidden ? 'true' : 'false');
        }

        _collect() {
            const self = this;
            const data = {};
            self.$el.find('input, select, textarea').each(function () {
                const $i = $(this);
                const name = $i.attr('name');
                if (!name) return;
                const type = ($i.attr('type') || '').toLowerCase();
                if ((type === 'checkbox' || type === 'radio') && !$i.prop('checked')) return;
                if (type === 'file') return;
                data[name] = $i.val();
            });
            // The pressed button counts, as it does in a native submit
            const s = self._submitter;
            if (s && s.name && !(s.name in data)) data[s.name] = s.value;
            return data;
        }

        _csrf() {
            const c = this.options.csrf;
            if (c === false) return null;
            const cfg = isObj(c) ? c : {};
            let value = typeof cfg.token === 'function' ? cfg.token() : cfg.token;
            let header = cfg.header || '';

            if (!value) {
                const fieldSel = cfg.field
                    ? 'input[name="' + cfg.field + '"]'
                    : 'input[name="_csrf"], input[name="csrf_token"], input[name="csrfmiddlewaretoken"], input[name="authenticity_token"], input[name="_token"], input[name="__RequestVerificationToken"]';
                const $f = this.$el.find(fieldSel).first();
                if ($f.length) value = $f.val();
            }
            if (!value) {
                const $m = $('meta[name="csrf-token"], meta[name="csrf"], meta[name="_csrf"]').first();
                if ($m.length) value = $m.attr('content');
            }
            if (!value) {
                const cookie = readCookie(cfg.cookie || 'XSRF-TOKEN');
                if (cookie) { value = cookie; header = header || 'X-XSRF-TOKEN'; }
            }
            if (!value) return null;
            return { value, header: header || 'X-CSRF-Token' };
        }

        _endpoint() {
            const o = this.options;
            const $el = this.$el;
            return o.endpoints[this.action] || o.url || ($el.is('form') ? $el.attr('action') : '') || $el.data('auth-url') || window.location.href;
        }

        _method() {
            const o = this.options;
            return (o.method || (this.$el.is('form') ? this.$el.attr('method') : '') || 'POST').toUpperCase();
        }

        // Runs beforeSubmit, then either lets the browser post the form or sends through the adapter
        _dispatchSubmit() {
            const self = this;
            const o    = self.options;
            let data   = self._collect();

            self._emit('submit', [self, data], { instance: self, data });
            self.clearMessage();

            const go = (final) => {
                if (final === false) return;
                data = final || data;
                if (!self.adapter || self.adapter.native || typeof self.adapter.submit !== 'function') {
                    self._nativePost();
                    return;
                }
                self._send(data);
            };

            if (typeof o.beforeSubmit === 'function') {
                self.setBusy(true);
                Promise.resolve()
                    .then(() => o.beforeSubmit.call(self, data, { action: self.action, instance: self }))
                    .then((r) => { if (r === false) self.setBusy(false); go(r); })
                    .catch(() => { self.setBusy(false); self._message(o.networkErrorMessage, 'error'); });
                return;
            }
            go();
        }

        _nativePost() {
            const self = this;
            const form = self.$el[0];
            if (!self.$el.is('form')) return;
            self.setBusy(true);
            self._nativeSubmit = true;
            const s = self._submitter;
            if (typeof form.requestSubmit === 'function') {
                try { form.requestSubmit(s || undefined); return; } catch (e) { /* fall through */ }
            }
            // Older browsers: carry the pressed button's name and value across
            if (s && s.name) {
                const h = document.createElement('input');
                h.type = 'hidden'; h.name = s.name; h.value = s.value;
                form.appendChild(h);
            }
            self._nativeSubmit = false;
            form.submit();
        }

        _send(data) {
            const self = this;
            const o    = self.options;
            const payload = typeof o.transform === 'function' ? (o.transform(data, { action: self.action }) || data) : data;
            const ctx = {
                action: self.action, data: payload, url: self._endpoint(), method: self._method(),
                form: self.$el.is('form') ? self.$el[0] : null, options: o, instance: self,
                csrf: self._csrf(), submitter: self._submitter
            };

            self.setBusy(true);
            Promise.resolve()
                .then(() => self.adapter.submit(ctx))
                .then((result) => {
                    const r = $.extend({ ok: false, message: '', errors: {}, redirect: '', token: '', challenge: '', retryAfter: 0 }, result);
                    self._handleResult(r);
                })
                .catch((err) => {
                    const detail = { network: true, error: err };
                    self._message(o.networkErrorMessage, 'error');
                    self._emit('error', [self, detail], { instance: self, result: detail });
                    self.setBusy(false);
                });
        }

        _handleResult(r) {
            const self = this;
            const o    = self.options;
            const $el  = self.$el;

            if (r.challenge) {
                self.setBusy(false);
                self.showStep(r.challenge);
                if (r.message) self._message(r.message, 'info');
                self._emit('challenge', [self, r.challenge], { instance: self, step: r.challenge, result: r });
                return;
            }

            if (r.ok) {
                if (r.token) { self.setToken(r.token); }
                const msg = r.message || $el.data('auth-success-msg') || o.successMessage;
                if (msg) self._message(msg, 'success');
                self._emit('success', [self, r], { instance: self, result: r });

                if (self.action === 'logout') self.clearToken();

                const target = safeRedirect(r.redirect || $el.data('auth-redirect') || o.redirect, o.allowExternalRedirect);
                if (target) {
                    const ev = new CustomEvent('ts.' + EVENT_NS + '.redirect', { detail: { url: target, instance: self }, bubbles: true, cancelable: true });
                    const proceed = $el[0].dispatchEvent(ev);
                    if (proceed) setTimeout(() => { window.location.href = target; }, o.redirectDelay);
                    else self.setBusy(false);
                } else {
                    self.setBusy(false);
                }
                return;
            }

            // Failure: paint field errors, then the message
            if (r.errors && Object.keys(r.errors).length) self.setErrors(r.errors);
            self._message(r.message || $el.data('auth-error-msg') || o.errorMessage, 'error');
            self._emit('error', [self, r], { instance: self, result: r });
            self.setBusy(false);
            if (r.retryAfter > 0) self._lockFor(r.retryAfter);
        }

        // Disables the submit button with a countdown, for rate limits and lockouts
        _lockFor(seconds) {
            const self = this;
            if (!self.$submit.length) return;
            clearInterval(self._lockTimer);
            let left = seconds;
            const fmt = (n) => Math.floor(n / 60) + ':' + ('0' + (n % 60)).slice(-2);
            const paint = () => {
                self.$submit.prop('disabled', true);
                if (self.$label.length) self.$label.text(self.options.lockedLabel.replace('%s', fmt(left)));
            };
            paint();
            self._lockTimer = setInterval(() => {
                left--;
                if (left <= 0) {
                    clearInterval(self._lockTimer);
                    self.$submit.prop('disabled', false);
                    if (self.$label.length) self.$label.text(self.originalLabel);
                    self.clearMessage();
                } else {
                    paint();
                }
            }, 1000);
        }
    }

    PluginAuth.defaults = {
        // Transport
        ajax:                false,           // shorthand for adapter: 'json'
        adapter:             null,            // 'form' | 'json' | 'modx' | 'rest' | { submit(ctx) } | function(ctx)
        url:                 '',              // overrides the form action
        endpoints:           {},              // { login: '/api/login', register: '/api/register', ... }
        method:              '',              // overrides the form method
        encoding:            'form',          // 'form' or 'json' request bodies
        headers:             {},              // extra request headers
        credentials:         'same-origin',   // fetch credentials mode
        timeout:             20000,           // ms before a request is aborted, 0 to disable
        csrf:                'auto',          // 'auto' | false | { header, field, token, cookie }

        // Understanding replies
        response:            {},              // { success, message, errors, redirect, token, challenge, retryAfter } as path or function
        normalize:           null,            // function(body, res, options, ctx) returning a result, replaces the default

        // Flow
        beforeSubmit:        null,            // function(data, ctx) returning data, false to cancel, or a Promise of either
        transform:           null,            // function(data, ctx) returning the data to send
        redirect:            '',              // where to go after success
        redirectDelay:       600,             // ms
        allowExternalRedirect: false,         // allow redirects to other sites

        // Tokens for APIs that sign in with a token instead of a cookie
        token: {
            store:  false,                    // false | 'memory' | 'session' | 'local'
            key:    'ts_auth_token',
            header: 'Authorization',
            scheme: 'Bearer'
        },

        // OAuth and social providers: { github: { url, mode: 'redirect' | 'popup', origin, width, height } }
        providers:           {},

        // Feedback
        toasts:              true,            // PluginToast on success and error, when that plugin is loaded
        messageTarget:       '[data-auth-message]',
        toastSuccessTitle:   'Success',
        toastErrorTitle:     'Sorry',
        successMessage:      '',
        errorMessage:        'Please check the form for errors.',
        networkErrorMessage: 'Could not reach the server. Please try again.',
        unexpectedResponseMessage: 'The server sent a reply this form could not understand.',
        popupBlockedMessage: 'The sign in window was blocked. Please allow pop-ups and try again.',

        // UI labels
        busyLabel:           'Working...',
        lockedLabel:         'Try again in %s',
        showPasswordLabel:   'Show',
        hidePasswordLabel:   'Hide',

        // Class names, for frameworks other than Bootstrap
        classes: { invalid: 'is-invalid', valid: 'is-valid', hidden: 'd-none' },

        // Validation
        validators:          {},              // { name: function(value, $input, instance) returning '' or an error }
        messages: {
            required:  'This field is required.',
            email:     'Please enter a valid email address.',
            minlength: 'Must be at least %s characters.',
            pattern:   'Invalid format.',
            match:     'Values do not match.'
        }
    };

    PluginAuth.adapters = ADAPTERS;

    // Add or replace a named adapter: themestrap.PluginAuth.registerAdapter('firebase', { submit(ctx) {} })
    PluginAuth.registerAdapter = function (name, adapter) {
        ADAPTERS[name] = typeof adapter === 'function' ? { submit: adapter } : adapter;
        return PluginAuth;
    };

    PluginAuth.getToken = function (key, store) {
        key = key || PluginAuth.defaults.token.key;
        if (store === 'memory') return memoryTokens[key] || '';
        const kinds = store ? [store] : ['session', 'local'];
        for (let i = 0; i < kinds.length; i++) {
            const s = storeFor(kinds[i]);
            if (s) { try { const v = s.getItem(key); if (v) return v; } catch (e) { /* blocked */ } }
        }
        return memoryTokens[key] || '';
    };

    // Headers for your own API calls once signed in: fetch(url, { headers: PluginAuth.authHeaders() })
    PluginAuth.authHeaders = function (tokenOptions) {
        const t = $.extend({}, PluginAuth.defaults.token, tokenOptions);
        const v = PluginAuth.getToken(t.key, t.store || undefined);
        const h = {};
        if (v) h[t.header] = (t.scheme ? t.scheme + ' ' : '') + v;
        return h;
    };

    $.extend(themestrap, { PluginAuth });

    $.fn.themestrapPluginAuth = function (opts) {
        return this.map(function () {
            const $this = $(this);
            if ($this.data(instanceName)) {
                return $this.data(instanceName);
            }
            return new PluginAuth($this, opts);
        });
    };

})).apply(this, [window.themestrap, jQuery]);
