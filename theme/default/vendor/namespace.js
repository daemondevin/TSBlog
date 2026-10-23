// Minimal Themestrap namespace for pages that load plugin files directly.
// The full framework (themestrap.js) can replace this file without changes to the plugins.
window.themestrap = window.themestrap || {};
window.themestrap.fn = window.themestrap.fn || {
    getOptions: function (o) {
        if (!o) return {};
        if (typeof o === 'object') return o;
        try { return JSON.parse(String(o).replace(/'/g, '"')); } catch (e) { return {}; }
    },
    showErrorMessage: function (title, msg) { console.error(title + ': ' + msg); }
};
