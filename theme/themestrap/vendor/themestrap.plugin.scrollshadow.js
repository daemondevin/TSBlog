/**
 * Themestrap ScrollShadow
 *
 * Edge shadows that show there is more to see. Two scopes:
 *
 *   scope: 'element' (default)  masks the edges of a scrollable container, as before.
 *   scope: 'page'               for content that scrolls with the page, such as a blog post.
 *                               Draws a fixed fade at the viewport edge (and an optional hint pill)
 *                               while the element is on screen and more of it lies beyond that edge,
 *                               and removes it once the element's end is in view.
 *
 *   $('.post-body').themestrapPluginScrollShadow({
 *       scope: 'page', edges: ['bottom'], size: '96px', hint: 'Keep reading'
 *   });
 *
 * Page scope options: edges (['top', 'bottom']), fade (CSS colour of the page background, or set
 * --ts-ss-fade on :root), hint (text for a pill that scrolls down when clicked).
 * The element also receives .ts-ss--top / .ts-ss--bottom so CSS can react.
 */
// Scroll Shadow
(((themestrap = {}, $) => {

    const instanceName = '__pluginScrollShadow';

    // Injected stylesheet — runs once per page, keyed to the plugin stylesheet ID
    const STYLE_ID = 'ts-scroll-shadow-styles';
    let instanceCount = 0;
    let seq = 0;
    // CSS_TEXT is injected lazily by injectStyles() on first build (see below),
    // so loading this script never adds CSS to pages that don't use the plugin.
    const CSS_TEXT = `
/* Themestrap — PluginScrollShadow */
.ts-scroll-shadow {
    --ts-ss-size:    40px;
    --ts-ss-color:   black;   /* mask fades toward transparent  */
    position: relative;
    overflow: auto;
    /* Mask compositing shorthand — overridden by state classes  */
    -webkit-mask-image: none;
    mask-image:         none;
    -webkit-mask-size: 100% 100%;
    mask-size: 100% 100%;
    -webkit-mask-repeat: no-repeat;
    mask-repeat: no-repeat;
}

/* top edge only visible - fade bottom */
.ts-scroll-shadow[data-orientation="vertical"].ts-ss--bottom,
.ts-scroll-shadow:not([data-orientation]).ts-ss--bottom {
    -webkit-mask-image:
        linear-gradient(to bottom,
            var(--ts-ss-color) calc(100% - var(--ts-ss-size)),
            transparent 100%
        );
    mask-image:
        linear-gradient(to bottom,
            var(--ts-ss-color) calc(100% - var(--ts-ss-size)),
            transparent 100%
        );
}

/* bottom edge only visible - fade top */
.ts-scroll-shadow[data-orientation="vertical"].ts-ss--top,
.ts-scroll-shadow:not([data-orientation]).ts-ss--top {
    -webkit-mask-image:
        linear-gradient(to top,
            var(--ts-ss-color) calc(100% - var(--ts-ss-size)),
            transparent 100%
        );
    mask-image:
        linear-gradient(to top,
            var(--ts-ss-color) calc(100% - var(--ts-ss-size)),
            transparent 100%
        );
}

/* both top and bottom overflow - fade both ends */
.ts-scroll-shadow[data-orientation="vertical"].ts-ss--top.ts-ss--bottom,
.ts-scroll-shadow:not([data-orientation]).ts-ss--top.ts-ss--bottom {
    -webkit-mask-image:
        linear-gradient(to bottom,
            transparent 0%,
            var(--ts-ss-color) var(--ts-ss-size),
            var(--ts-ss-color) calc(100% - var(--ts-ss-size)),
            transparent 100%
        );
    mask-image:
        linear-gradient(to bottom,
            transparent 0%,
            var(--ts-ss-color) var(--ts-ss-size),
            var(--ts-ss-color) calc(100% - var(--ts-ss-size)),
            transparent 100%
        );
}

.ts-scroll-shadow[data-orientation="horizontal"].ts-ss--right {
    -webkit-mask-image:
        linear-gradient(to right,
            var(--ts-ss-color) calc(100% - var(--ts-ss-size)),
            transparent 100%
        );
    mask-image:
        linear-gradient(to right,
            var(--ts-ss-color) calc(100% - var(--ts-ss-size)),
            transparent 100%
        );
}

.ts-scroll-shadow[data-orientation="horizontal"].ts-ss--left {
    -webkit-mask-image:
        linear-gradient(to left,
            var(--ts-ss-color) calc(100% - var(--ts-ss-size)),
            transparent 100%
        );
    mask-image:
        linear-gradient(to left,
            var(--ts-ss-color) calc(100% - var(--ts-ss-size)),
            transparent 100%
        );
}

.ts-scroll-shadow[data-orientation="horizontal"].ts-ss--left.ts-ss--right {
    -webkit-mask-image:
        linear-gradient(to right,
            transparent 0%,
            var(--ts-ss-color) var(--ts-ss-size),
            var(--ts-ss-color) calc(100% - var(--ts-ss-size)),
            transparent 100%
        );
    mask-image:
        linear-gradient(to right,
            transparent 0%,
            var(--ts-ss-color) var(--ts-ss-size),
            var(--ts-ss-color) calc(100% - var(--ts-ss-size)),
            transparent 100%
        );
}

/* Vertical faces only — reuse vertical rules above for :not([data-orientation]) */
.ts-scroll-shadow[data-orientation="both"].ts-ss--bottom:not(.ts-ss--top):not(.ts-ss--left):not(.ts-ss--right) {
    -webkit-mask-image:
        linear-gradient(to bottom,
            var(--ts-ss-color) calc(100% - var(--ts-ss-size)),
            transparent 100%
        );
    mask-image:
        linear-gradient(to bottom,
            var(--ts-ss-color) calc(100% - var(--ts-ss-size)),
            transparent 100%
        );
}
.ts-scroll-shadow[data-orientation="both"].ts-ss--top:not(.ts-ss--bottom):not(.ts-ss--left):not(.ts-ss--right) {
    -webkit-mask-image:
        linear-gradient(to top,
            var(--ts-ss-color) calc(100% - var(--ts-ss-size)),
            transparent 100%
        );
    mask-image:
        linear-gradient(to top,
            var(--ts-ss-color) calc(100% - var(--ts-ss-size)),
            transparent 100%
        );
}
.ts-scroll-shadow[data-orientation="both"].ts-ss--top.ts-ss--bottom:not(.ts-ss--left):not(.ts-ss--right) {
    -webkit-mask-image:
        linear-gradient(to bottom,
            transparent 0%,
            var(--ts-ss-color) var(--ts-ss-size),
            var(--ts-ss-color) calc(100% - var(--ts-ss-size)),
            transparent 100%
        );
    mask-image:
        linear-gradient(to bottom,
            transparent 0%,
            var(--ts-ss-color) var(--ts-ss-size),
            var(--ts-ss-color) calc(100% - var(--ts-ss-size)),
            transparent 100%
        );
}

/* When BOTH axes are in play — compose with a two-gradient mask */
.ts-scroll-shadow[data-orientation="both"].ts-ss--top.ts-ss--bottom.ts-ss--left.ts-ss--right {
    -webkit-mask-image:
        linear-gradient(to bottom,
            transparent 0%, var(--ts-ss-color) var(--ts-ss-size),
            var(--ts-ss-color) calc(100% - var(--ts-ss-size)), transparent 100%
        ),
        linear-gradient(to right,
            transparent 0%, var(--ts-ss-color) var(--ts-ss-size),
            var(--ts-ss-color) calc(100% - var(--ts-ss-size)), transparent 100%
        );
    mask-image:
        linear-gradient(to bottom,
            transparent 0%, var(--ts-ss-color) var(--ts-ss-size),
            var(--ts-ss-color) calc(100% - var(--ts-ss-size)), transparent 100%
        ),
        linear-gradient(to right,
            transparent 0%, var(--ts-ss-color) var(--ts-ss-size),
            var(--ts-ss-color) calc(100% - var(--ts-ss-size)), transparent 100%
        );
    -webkit-mask-composite: destination-in;
    mask-composite: intersect;
    -webkit-mask-size: 100% 100%, 100% 100%;
    mask-size: 100% 100%, 100% 100%;
}

/* Partial two-axis variants */
.ts-scroll-shadow[data-orientation="both"].ts-ss--bottom.ts-ss--left.ts-ss--right:not(.ts-ss--top) {
    -webkit-mask-image:
        linear-gradient(to bottom, var(--ts-ss-color) calc(100% - var(--ts-ss-size)), transparent 100%),
        linear-gradient(to right, transparent 0%, var(--ts-ss-color) var(--ts-ss-size), var(--ts-ss-color) calc(100% - var(--ts-ss-size)), transparent 100%);
    mask-image:
        linear-gradient(to bottom, var(--ts-ss-color) calc(100% - var(--ts-ss-size)), transparent 100%),
        linear-gradient(to right, transparent 0%, var(--ts-ss-color) var(--ts-ss-size), var(--ts-ss-color) calc(100% - var(--ts-ss-size)), transparent 100%);
    -webkit-mask-composite: destination-in;
    mask-composite: intersect;
    -webkit-mask-size: 100% 100%, 100% 100%;
    mask-size: 100% 100%, 100% 100%;
}
.ts-scroll-shadow[data-orientation="both"].ts-ss--top.ts-ss--left.ts-ss--right:not(.ts-ss--bottom) {
    -webkit-mask-image:
        linear-gradient(to top, var(--ts-ss-color) calc(100% - var(--ts-ss-size)), transparent 100%),
        linear-gradient(to right, transparent 0%, var(--ts-ss-color) var(--ts-ss-size), var(--ts-ss-color) calc(100% - var(--ts-ss-size)), transparent 100%);
    mask-image:
        linear-gradient(to top, var(--ts-ss-color) calc(100% - var(--ts-ss-size)), transparent 100%),
        linear-gradient(to right, transparent 0%, var(--ts-ss-color) var(--ts-ss-size), var(--ts-ss-color) calc(100% - var(--ts-ss-size)), transparent 100%);
    -webkit-mask-composite: destination-in;
    mask-composite: intersect;
    -webkit-mask-size: 100% 100%, 100% 100%;
    mask-size: 100% 100%, 100% 100%;
}

/* Page scope: fixed fades at the viewport edge */
.ts-ss-page {
    position: fixed;
    left: 0;
    right: 0;
    height: var(--ts-ss-size, 40px);
    pointer-events: none;
    z-index: 40;
    opacity: 0;
    transition: opacity .25s ease;
}
.ts-ss-page.is-on { opacity: 1; }
.ts-ss-page--bottom { bottom: 0; background: linear-gradient(to top,    var(--ts-ss-fade, Canvas) 15%, transparent); }
.ts-ss-page--top    { top: 0;    background: linear-gradient(to bottom, var(--ts-ss-fade, Canvas) 15%, transparent); }
.ts-ss-hint {
    position: absolute;
    left: 50%;
    bottom: 14px;
    transform: translateX(-50%);
    pointer-events: auto;
    padding: 5px 14px;
    border: 0;
    border-radius: 999px;
    background: var(--ts-ss-hint-bg, rgba(20, 20, 20, .78));
    color: var(--ts-ss-hint-fg, #fff);
    font: 600 12px/1.4 system-ui, sans-serif;
    letter-spacing: .02em;
    cursor: pointer;
    box-shadow: 0 2px 10px rgba(0, 0, 0, .25);
}
.ts-ss-page:not(.is-on) .ts-ss-hint { pointer-events: none; }
@media (prefers-reduced-motion: reduce) { .ts-ss-page { transition: none; } }
`;

    // Inject the stylesheet only when the plugin is actually used (called
    // from build()), so loading the script never adds CSS to unused pages.
    function injectStyles() {
        if (document.getElementById(STYLE_ID)) return;
        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = CSS_TEXT;
        (document.head || document.documentElement).appendChild(style);
    }

    class PluginScrollShadow {

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
                .build()
                .events();

            return this;
        }

        setData() {
            this.$el.data(instanceName, this);
            return this;
        }

        setOptions(opts) {
            this.options = $.extend(true, {}, PluginScrollShadow.defaults, opts, {
                wrapper: this.$el
            });
            // Arrays are replaced, never merged index by index
            if (opts && Array.isArray(opts.edges)) this.options.edges = opts.edges.slice();
            return this;
        }

        build() {
            // Inject component CSS lazily - only when an instance is built.
            injectStyles();
            const self    = this;
            const $el     = self.$el;
            const options = self.options;

            instanceCount++;
            self._uid = ++seq;

            if (options.scope === 'page') {
                return self._buildPage();
            }

            // Apply base class + orientation attribute
            $el.addClass('ts-scroll-shadow');

            if (options.orientation) {
                $el.attr('data-orientation', options.orientation);
            }

            // Apply CSS custom properties from options
            if (options.size !== PluginScrollShadow.defaults.size) {
                $el.css('--ts-ss-size', options.size);
            }
            if (options.color !== PluginScrollShadow.defaults.color) {
                $el.css('--ts-ss-color', options.color);
            }

            if (!options.isEnabled) {
                return this;
            }

            // Build a ResizeObserver to recalculate when the container resizes
            if (typeof ResizeObserver !== 'undefined') {
                self._resizeObserver = new ResizeObserver(() => {
                    self._updateShadows();
                });
                self._resizeObserver.observe($el[0]);
            }

            // Initial calculation
            self._updateShadows();

            return this;
        }

        // Page scope: overlays on <body>, driven by window scroll and resize
        _buildPage() {
            const self = this;
            const o    = self.options;
            const edges = Array.isArray(o.edges) && o.edges.length ? o.edges : ['top', 'bottom'];

            self._overlays = {};
            edges.forEach((edge) => {
                if (edge !== 'top' && edge !== 'bottom') return;
                const el = document.createElement('div');
                el.className = 'ts-ss-page ts-ss-page--' + edge;
                el.setAttribute('aria-hidden', 'true');
                el.style.setProperty('--ts-ss-size', o.size);
                if (o.fade) el.style.setProperty('--ts-ss-fade', o.fade);
                if (edge === 'bottom' && o.hint) {
                    const b = document.createElement('button');
                    b.type = 'button';
                    b.className = 'ts-ss-hint';
                    b.tabIndex = -1;
                    b.textContent = o.hint;
                    b.addEventListener('click', () => {
                        const calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
                        window.scrollBy({ top: Math.round(window.innerHeight * 0.8), behavior: calm ? 'auto' : 'smooth' });
                    });
                    el.appendChild(b);
                }
                document.body.appendChild(el);
                self._overlays[edge] = el;
            });

            self._raf = 0;
            self._onPageScroll = () => {
                if (self._raf) return;
                self._raf = requestAnimationFrame(() => { self._raf = 0; self._updateShadows(); });
            };
            window.addEventListener('scroll', self._onPageScroll, { passive: true });
            window.addEventListener('resize', self._onPageScroll, { passive: true });
            if (typeof ResizeObserver !== 'undefined') {
                self._resizeObserver = new ResizeObserver(self._onPageScroll);
                self._resizeObserver.observe(self.$el[0]);
            }
            self._updateShadows();
            return self;
        }

        events() {
            const self = this;

            if (self.options.scope === 'page') return this;

            self.$el.on('scroll.scrollshadow', () => {
                self._updateShadows();
            });

            return this;
        }

        /**
         * Measures the element's scroll state and toggles the four shadow
         * edge classes accordingly.
         *
         * State classes added to the wrapper element:
         *   .ts-ss--top     — content above the visible area
         *   .ts-ss--bottom  — content below the visible area
         *   .ts-ss--left    — content to the left
         *   .ts-ss--right   — content to the right
         */
        _updateShadows() {
            const self    = this;
            const el      = self.$el[0];
            const options = self.options;
            const offset  = options.offset;

            if (options.scope === 'page') {
                const r  = el.getBoundingClientRect();
                const vh = window.innerHeight || document.documentElement.clientHeight;
                const on = options.isEnabled;
                // Only while the element is actually on screen: it has more above, or more below
                const top    = on && r.top < -offset && r.bottom > 0;
                const bottom = on && r.bottom > vh + offset && r.top < vh;
                self.$el.toggleClass('ts-ss--top', top).toggleClass('ts-ss--bottom', bottom);
                if (self._overlays.top)    self._overlays.top.classList.toggle('is-on', top);
                if (self._overlays.bottom) self._overlays.bottom.classList.toggle('is-on', bottom);
                return;
            }

            if (!options.isEnabled) {
                self.$el.removeClass('ts-ss--top ts-ss--bottom ts-ss--left ts-ss--right');
                return;
            }

            const scrollTop   = el.scrollTop;
            const scrollLeft  = el.scrollLeft;
            const scrollableY = el.scrollHeight - el.clientHeight;
            const scrollableX = el.scrollWidth  - el.clientWidth;

            const orientation = options.orientation;
            const trackV = orientation === 'vertical' || orientation === 'both' || !orientation;
            const trackH = orientation === 'horizontal' || orientation === 'both';

            self.$el
                .toggleClass('ts-ss--top',    trackV && scrollTop > offset)
                .toggleClass('ts-ss--bottom',  trackV && scrollTop < scrollableY - offset)
                .toggleClass('ts-ss--left',    trackH && scrollLeft > offset)
                .toggleClass('ts-ss--right',   trackH && scrollLeft < scrollableX - offset);
        }

        /**
         * Force a shadow recalculation — useful when the container's content
         * changes programmatically.
         */
        update() {
            this._updateShadows();
            return this;
        }

        /**
         * Enable or disable shadows without destroying the plugin instance.
         * @param {boolean} state
         */
        setEnabled(state) {
            this.options.isEnabled = !!state;
            this._updateShadows();
            return this;
        }

        destroy() {
            const self = this;

            if (self.options.scope === 'page') {
                window.removeEventListener('scroll', self._onPageScroll);
                window.removeEventListener('resize', self._onPageScroll);
                if (self._raf) cancelAnimationFrame(self._raf);
                Object.keys(self._overlays || {}).forEach((k) => self._overlays[k].remove());
                self._overlays = {};
                self.$el.removeClass('ts-ss--top ts-ss--bottom');
            }

            self.$el.off('.scrollshadow');

            if (self._resizeObserver) {
                self._resizeObserver.disconnect();
                self._resizeObserver = null;
            }

            self.$el
                .removeClass('ts-scroll-shadow ts-ss--top ts-ss--bottom ts-ss--left ts-ss--right')
                .removeAttr('data-orientation')
                .css({
                    '--ts-ss-size':  '',
                    '--ts-ss-color': ''
                })
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

    PluginScrollShadow.defaults = {
        /**
         * Scroll axis to track.
         * 'vertical'   — top / bottom shadows (default)
         * 'horizontal' — left / right shadows
         * 'both'       — all four edges
         */
        orientation: 'vertical',

        /**
         * Shadow feather size. Maps to --ts-ss-size CSS custom property.
         * Accepts any CSS length string: '40px', '3rem', '10%', etc.
         */
        size: '40px',

        /**
         * Mask color. The gradient fades from this value to transparent.
         * Use a named color or any valid CSS <color>. 'black' is the
         * correct value for mask-image use — do NOT pass rgba() here
         * unless you want a semi-transparent mask at the centre.
         * Maps to --ts-ss-color CSS custom property.
         */
        color: 'black',

        /**
         * Pixel threshold before shadows appear. Adds a small "dead zone"
         * so a 1px rounding error doesn't falsely trigger a shadow.
         */
        offset: 2,

        /**
         * Set to false to disable all shadow rendering while keeping the
         * plugin instance alive. Useful for toggling based on viewport size.
         */
        isEnabled: true,

        /**
         * 'element' masks a scrollable container (default).
         * 'page' draws fixed fades at the viewport edge for content that scrolls with the page.
         */
        scope: 'element',

        /** Page scope: which viewport edges get a fade. */
        edges: ['top', 'bottom'],

        /** Page scope: colour of the page background the fade dissolves into. Defaults to --ts-ss-fade. */
        fade: null,

        /** Page scope: text of a "keep reading" pill on the bottom fade. Empty for none. */
        hint: ''
    };

    $.extend(themestrap, { PluginScrollShadow });

    $.fn.themestrapPluginScrollShadow = function(opts) {
        return this.map(function() {
            const $this = $(this);
            if ($this.data(instanceName)) {
                return $this.data(instanceName);
            } else {
                return new PluginScrollShadow($this, opts);
            }
        });
    };

})).apply(this, [window.themestrap, jQuery]);
