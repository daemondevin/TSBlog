// Post editor controller: wires Themestrap plugins to the blog's save, upload and render endpoints.
(function ($) {
  'use strict';
  var cfg = JSON.parse(document.getElementById('ts-config').textContent);
  var $title = $('#f-title'), $body = $('#f-body'), $rich = $('#f-rich');
  var isNew = !cfg.original;
  var state = { mode: 'markdown', dirty: false, saving: false, status: cfg.status, original: cfg.original, rich: null };

  // Helpers

  function post(url, data) {
    var fd = data instanceof FormData ? data : (function () { var f = new FormData(); Object.keys(data).forEach(function (k) { f.append(k, data[k]); }); return f; })();
    fd.append('_csrf', cfg.csrf);
    return fetch(url, { method: 'POST', body: fd, credentials: 'same-origin', headers: { 'X-CSRF-Token': cfg.csrf } })
      .then(function (r) { return r.json().catch(function () { return { ok: false, errors: ['Unexpected response from the server.'] }; }); });
  }

  var toastTimer;
  function toast(msg, bad) {
    var t = document.getElementById('toast');
    t.textContent = msg; t.hidden = false; t.className = 'toast' + (bad ? ' bad' : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.hidden = true; }, bad ? 6000 : 2200);
  }

  function setState(text) { document.getElementById('state').textContent = text; }
  function markDirty() { if (!state.dirty) { state.dirty = true; setState('Unsaved changes'); } scheduleLocal(); }

  // Phone photos are often 5 MB or more. Shrink them here so uploads work on any server.
  function shrinkImage(file) {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type) || !window.createImageBitmap) return Promise.resolve(file);
    return createImageBitmap(file).then(function (bmp) {
      var w = bmp.width, h = bmp.height, scale = Math.min(1, 2000 / Math.max(w, h));
      if (file.size <= 1048576 && scale === 1) { if (bmp.close) bmp.close(); return file; }
      var c = document.createElement('canvas');
      c.width = Math.round(w * scale); c.height = Math.round(h * scale);
      c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
      if (bmp.close) bmp.close();
      function encode(type, q) {
        return new Promise(function (res) { c.toBlob(res, type, q); });
      }
      return encode(file.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.85).then(function (b) {
        // A large PNG photo is smaller as JPEG; keep PNG only when transparency may matter and it is small enough
        if (b && file.type === 'image/png' && b.size > Math.min(cfg.limit, 1572864)) return encode('image/jpeg', 0.85);
        return b;
      }).then(function (b) {
        if (!b || b.size >= file.size) return file;
        var ext = b.type === 'image/png' ? '.png' : '.jpg';
        return new File([b], file.name.replace(/\.\w+$/, '') + ext, { type: b.type });
      });
    }).catch(function () { return file; });
  }

  function uploadImage(file) {
    return shrinkImage(file).then(function (f) {
      if (f.size > cfg.limit) {
        var mb = (cfg.limit / 1048576).toFixed(1).replace(/\.0$/, '');
        var e = new Error('That picture is too big for this server (the most it accepts is ' + mb + ' MB).');
        toast(e.message, true); throw e;
      }
      var fd = new FormData(); fd.append('file', f);
      return post(cfg.upload, fd).then(function (r) {
        if (!r.ok) throw new Error((r.errors || ['Upload failed'])[0]);
        return r.url;
      });
    }).catch(function (e) { toast(e.message, true); throw e; });
  }

  function renderServer(md) { return post(cfg.render, { body: md }).then(function (r) { if (!r.ok) throw new Error('render'); return r.html; }); }

  // Plugins

  $body.val(cfg.body);
  var md = $body.themestrapPluginMarkdownEditor({
    view: 'write', minHeight: 'calc(100vh - 280px)', imageUpload: uploadImage,
    renderer: renderServer, previewDelay: 300, placeholder: 'Write your story. Markdown works here.'
  }) && $body.data('__pluginMarkdownEditor');

  // These mirror what the server keeps (TSStore::parseTags), so the chips show exactly what will be saved:
  // special characters dropped, spaces collapsed, "Web" and "web" the same tag, 20 at most
  var MAX_TAGS = 20;
  var tags = $('#f-tags').themestrapPluginTagsInput({
    placeholder: 'Type or paste tags', validateEmail: false, maxTags: MAX_TAGS, ignoreCase: true,
    normalize: function (t) { return t.replace(/["'<>,\/\\?#%]/g, '').replace(/\s+/g, ' ').trim(); }
  }) && $('#f-tags').data('__tagsinput');

  // Selects and the time picker (the dialogs are PluginDialog prompts, see prompts.js)
  $('#details [data-plugin-select]').each(function () {
    var $w = $(this); $w.themestrapPluginSelect();
    var $label = $w.closest('.field').find('.lbl').first(), trigger = $w.find('.ts-select-trigger')[0];
    if ($label.length && trigger && trigger.id) trigger.setAttribute('aria-labelledby', $label.attr('id') + ' ' + trigger.id);
  });

  // Auto growing title

  function fitTitle() { var t = $title[0]; t.style.height = 'auto'; t.style.height = t.scrollHeight + 'px'; }
  $title.on('input', function () { this.value = this.value.replace(/\n/g, ' '); fitTitle(); markDirty(); }).on('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); (state.mode === 'markdown' ? md.focus() : state.rich.focus()); }
  });
  fitTitle();

  // Mode switching: Markdown is the source of truth, rich text converts to and from it

  function currentMarkdown() { return state.mode === 'rich' ? state.rich.getMarkdown() : md.getValue(); }

  function ensureRich() {
    if (state.rich) return state.rich;
    $rich.themestrapPluginRichEditor({
      toolbar: 'blog', markdownShortcuts: true, statusBar: true, minHeight: 'calc(100vh - 300px)',
      placeholder: 'Write your story. Select text for formatting, or type Markdown.', imageUpload: uploadImage,
      pastePlainText: true, linkTarget: ''
    });
    state.rich = $rich.data('__pluginRichEditor');
    $rich[0].addEventListener('ts.richeditor.change', markDirty);
    $rich[0].addEventListener('ts.richeditor.save', function () { save(); });
    return state.rich;
  }

  function setMode(mode) {
    if (mode === state.mode) return;
    var src = currentMarkdown();
    $('[data-mode]').removeClass('on').filter('[data-mode="' + mode + '"]').addClass('on');
    if (mode === 'rich') {
      ensureRich();
      $('.ts-mdeditor').hide(); $rich.prop('hidden', false);
      state.mode = 'rich';
      renderServer(src).then(function (html) { state.rich.setContent(html); state.rich.focus(); })
        .catch(function () { state.rich.setMarkdown(src); });
    } else {
      md.setValue(src, true);
      $rich.prop('hidden', true); $('.ts-mdeditor').show();
      state.mode = 'markdown';
      md.focus();
    }
    if (!risky) { try { localStorage.setItem('tsblog-mode', mode); } catch (e) {} }
  }
  $('[data-mode]').on('click', function () { setMode(this.getAttribute('data-mode')); });

  // Dirty tracking and local safety copy

  var localTimer;
  function scheduleLocal() {
    clearTimeout(localTimer);
    localTimer = setTimeout(function () {
      try { localStorage.setItem(cfg.key, JSON.stringify({ t: Date.now(), title: $title.val(), body: currentMarkdown() })); } catch (e) {}
    }, 800);
  }
  $body[0].addEventListener('ts.markdowneditor.change', markDirty);
  $body[0].addEventListener('ts.markdowneditor.save', function () { save(); });
  $('#details').on('input change', 'input, textarea, select', markDirty);
  tags && $('#f-tags')[0].addEventListener('ts.tagsinput.add', markDirty);
  tags && $('#f-tags')[0].addEventListener('ts.tagsinput.remove', markDirty);
  // After pasting a list, say what was left out
  tags && $('#f-tags')[0].addEventListener('ts.tagsinput.paste', function (e) {
    var d = e.detail, dup = 0, over = 0;
    d.skipped.forEach(function (k) { if (k.reason === 'max') over++; else dup++; });
    if (!dup && !over) return;
    var parts = [];
    if (dup)  parts.push(dup + (dup === 1 ? ' was already there' : ' were already there'));
    if (over) parts.push(over + (over === 1 ? ' was left out' : ' were left out') + ' because a post can have ' + MAX_TAGS + ' tags');
    toast('Added ' + d.added.length + (d.added.length === 1 ? ' tag' : ' tags') + '. ' + parts.join(', ') + '.', !!over);
  });

  // Offer to restore a newer local copy (for example after a lost connection)
  try {
    var saved = JSON.parse(localStorage.getItem(cfg.key) || 'null');
    if (saved && (saved.body !== cfg.body || saved.title !== $title.val()) && saved.body && saved.t > Date.now() - 7 * 864e5) {
      var bar = $('<div class="restore" role="alert">A newer unsaved copy from this browser was found. <button type="button" class="link-btn" id="restore-yes">Restore it</button> <button type="button" class="link-btn" id="restore-no">Discard</button></div>').prependTo('.ed-main');
      bar.on('click', '#restore-yes', function () { $title.val(saved.title); fitTitle(); md.setValue(saved.body, true); markDirty(); bar.remove(); });
      bar.on('click', '#restore-no', function () { localStorage.removeItem(cfg.key); bar.remove(); });
    }
  } catch (e) {}

  // Publish date: PluginCalendar for the day, a time field for the hour
  var cal = null;
  (function () {
    var parts = $('#f-date').val().split('T')[0].split('-');
    var start = new Date(+parts[0], +parts[1] - 1, +parts[2]);
    $('#f-cal').themestrapPluginCalendar({ mode: 'single', selected: start, initialMonth: start, showFooter: true, fixedWeeks: true });
    cal = $('#f-cal').data('__pluginCalendar');

    function pad(n) { return ('0' + n).slice(-2); }
    function sync(fromUser) {
      var d = cal.getValue(), t = $('#f-time').val() || '09:00';
      if (!d) return;
      var iso = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + t;
      $('#f-date').val(iso);
      var when = new Date(d.getFullYear(), d.getMonth(), d.getDate(), +t.split(':')[0], +t.split(':')[1]);
      $('#date-label').text(when.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }));
      var future = when.getTime() > Date.now();
      $('#date-hint').text(future
        ? 'In the future, so a published post goes live on its own at this time.'
        : 'In the past or now, so a published post shows straight away.');
      if (fromUser) markDirty();
    }
    $('#f-time').themestrapPluginTimePicker({ minuteStep: 5, placeholder: 'Time', defaultTime: '09:00', block: true, icon: false });
    var tpicker = $('#f-time').data('__pluginTimePicker');
    sync(false);

    $('#f-cal')[0].addEventListener('ts.calendar.select', function () { sync(true); });
    $('#f-time')[0].addEventListener('ts.timepicker.change', function () { sync(true); });
    $('#date-now').on('click', function () {
      var n = new Date();
      cal.setValue(n); cal.goToToday();
      tpicker.setValue(pad(n.getHours()) + ':' + pad(n.getMinutes()), true);
      sync(true);
    });
    function pop(open) {
      $('#date-pop').prop('hidden', !open);
      $('#date-toggle').attr('aria-expanded', open ? 'true' : 'false');
    }
    $('#date-toggle').on('click', function () { pop($('#date-pop').prop('hidden')); });
    $('#date-close').on('click', function () { pop(false); $('#date-toggle').trigger('focus'); });
    $('#date-pop').on('keydown', function (e) { if (e.key === 'Escape') { e.stopPropagation(); pop(false); $('#date-toggle').trigger('focus'); } });
  })();

  // Settings panel, description counter, cover image

  $('#btn-details').on('click', function () {
    var open = $('#details').prop('hidden');
    $('#details').prop('hidden', !open); $(this).attr('aria-expanded', open);
    document.body.classList.toggle('details-open', open);
  });
  function descCount() { $('#desc-count').text($('#f-desc').val().length); }
  $('#f-desc').on('input', descCount); descCount();

  function showCover() {
    var v = $('#f-image').val().trim();
    $('#cover-preview').prop('hidden', !v).find('img').attr('src', v || '');
  }
  $('#f-image').on('input', showCover); showCover();
  $('#cover-clear').on('click', function () { $('#f-image').val(''); showCover(); markDirty(); });
  $('#cover-upload').on('click', function () { $('#file-input').trigger('click'); });
  $('#file-input').on('change', function () {
    var f = this.files[0]; this.value = '';
    if (f) uploadImage(f).then(function (url) { $('#f-image').val(url); showCover(); markDirty(); });
  });

  // Slug follows the title until the author edits it

  var slugTouched = !!cfg.original;
  $('#f-slug').on('input', function () { slugTouched = true; });
  $title.on('input', function () {
    if (slugTouched) return;
    $('#f-slug').val(this.value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80));
  });

  // Focus mode

  function focusMode(on) {
    document.body.classList.toggle('focus-mode', on);
    if (on) { $('#details').prop('hidden', true); document.body.classList.remove('details-open'); }
  }
  $('#btn-focus').on('click', function () { focusMode(!document.body.classList.contains('focus-mode')); });
  $(document).on('keydown', function (e) { if (e.key === 'Escape' && document.body.classList.contains('focus-mode')) focusMode(false); });

  // Save and publish

  function collect(status) {
    return {
      original: state.original, title: $title.val(), slug: $('#f-slug').val(), body: currentMarkdown(),
      date: $('#f-date').val().replace('T', ' '), type: $('#f-type').val(), status: status,
      tags: tags ? tags.getTags().join(',') : $('#f-tags').val(), description: $('#f-desc').val(), image: $('#f-image').val()
    };
  }

  function save(status) {
    if (state.saving) return;
    status = status || state.status;
    if (!$title.val().trim()) { toast('Add a title first.', true); $title.focus(); return; }
    state.saving = true; $('#btn-save, #btn-publish').prop('disabled', true); setState('Saving…');
    post(cfg.save, collect(status)).then(function (r) {
      if (!r.ok) { toast((r.errors || ['Could not save.']).join(' '), true); setState('Not saved'); return; }
      state.status = r.status; state.original = r.slug; state.dirty = false;
      $('#f-slug').val(r.slug);
      try { localStorage.removeItem(cfg.key); } catch (e) {}
      $('#btn-save').text(r.status === 'published' ? 'Update' : 'Save draft');
      $('#btn-publish').text(r.status === 'published' ? 'Unpublish' : 'Publish');
      $('#danger').prop('hidden', false); $('#view-link').attr('href', r.url);
      setState(r.status === 'published' ? 'Published' : 'Draft saved');
      toast(r.message);
      cfg.key = 'tsblog-draft-' + r.slug;
      if (isNew) { isNew = false; history.replaceState(null, '', r.edit); }
    }).catch(function () { toast('Could not reach the server. Your text is kept in this browser.', true); setState('Not saved'); })
      .then(function () { state.saving = false; $('#btn-save, #btn-publish').prop('disabled', false); });
  }
  $('#btn-save').on('click', function () { save(); });
  $('#btn-publish').on('click', function () { save(state.status === 'published' ? 'draft' : 'published'); });
  $(document).on('keydown', function (e) { if ((e.ctrlKey || e.metaKey) && String(e.key).toLowerCase() === 's') { e.preventDefault(); save(); } });
  window.addEventListener('beforeunload', function (e) { if (state.dirty) { e.preventDefault(); e.returnValue = ''; } });

  // Delete, and leaving with unsaved changes, both ask through PluginDialog

  $('#btn-delete').on('click', function () {
    window.tsPrompt.confirm({
      title: 'Delete this post?',
      message: 'This removes it from your site for good. It cannot be undone.',
      confirmLabel: 'Delete', cancelLabel: 'Keep it', danger: true
    }).then(function (yes) {
      if (!yes) return;
      post(cfg.delete, { slug: state.original }).then(function (r) {
        if (r.ok) { state.dirty = false; try { localStorage.removeItem(cfg.key); } catch (e) {} location.href = r.redirect; }
        else toast((r.errors || ['Could not delete.']).join(' '), true);
      });
    });
  });

  // A link clicked while there are unsaved changes: ask first (the browser's own warning still covers closing the tab)
  $(document).on('click', 'a[href]', function (e) {
    var a = this, href = a.getAttribute('href') || '';
    if (!state.dirty || e.isDefaultPrevented() || e.button || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
    if (a.target === '_blank' || a.hasAttribute('download') || /^(#|javascript:|mailto:|tel:)/i.test(href)) return;
    e.preventDefault();
    window.tsPrompt.confirm({
      title: 'Leave without saving?',
      message: 'You have changes that have not been saved. They will be lost if you leave.',
      confirmLabel: 'Leave without saving', cancelLabel: 'Keep editing', danger: true
    }).then(function (yes) { if (yes) { state.dirty = false; location.href = a.href; } });
  });

  // Rich text is the friendly default. Posts that contain raw HTML stay in Markdown so nothing is lost.
  var risky = cfg.allowHtml && /<[a-z!][^>]*>/i.test(cfg.body);
  var pref = null;
  try { pref = localStorage.getItem('tsblog-mode'); } catch (e) {}
  if (risky) toast('This post contains HTML, so it opens in Markdown mode to keep it intact.');
  else if (pref !== 'markdown') setMode('rich');
  if (!$title.val()) $title.focus(); else if (state.mode === 'markdown') md.focus();
  state.dirty = false;
})(jQuery);
