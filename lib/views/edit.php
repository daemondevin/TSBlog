<?php
defined('TS_ROOT') or exit();
// Variables: $post (array|null), $csrf
$isNew = $post === null;
$p = $post ?? ['slug' => '', 'title' => '', 'date' => date('Y-m-d H:i'), 'status' => 'draft', 'type' => 'post', 'tags' => [], 'description' => '', 'image' => '', 'body' => ''];
$cfgJson = json_encode([
    'csrf' => $csrf, 'save' => ts_url('admin/save'), 'delete' => ts_url('admin/delete'), 'upload' => ts_url('admin/upload'), 'render' => ts_url('admin/render'),
    'list' => ts_url('admin'), 'siteUrl' => ts_abs(), 'limit' => ts_upload_limit(), 'allowHtml' => (bool) ts_cfg('allow_html'), 'original' => $isNew ? '' : $p['slug'], 'status' => $p['status'],
    'body' => $p['body'], 'key' => 'tsblog-draft-' . ($isNew ? 'new' : $p['slug']),
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_AMP);
$A = ts_file('assets/admin');
?>
<script type="application/json" id="ts-config"><?= $cfgJson ?></script>

<form id="post-form" class="editor" autocomplete="off" novalidate>
  <header class="ed-bar">
    <a class="icon-btn" href="<?= e(ts_url('admin')) ?>" title="All posts" aria-label="Back to all posts"><i class="fas fa-arrow-left"></i></a>
    <span id="state" class="state" role="status" aria-live="polite"><?= $isNew ? 'New post' : e($p['status'] === 'draft' ? 'Draft' : 'Published') ?></span>
    <span class="grow"></span>
    <div class="seg" role="group" aria-label="Editor mode">
      <button type="button" data-mode="rich" title="Write with a toolbar">Simple</button>
      <button type="button" data-mode="markdown" class="on" title="Write in Markdown">Markdown</button>
    </div>
    <button type="button" class="icon-btn" id="btn-focus" title="Focus mode (Esc to leave)" aria-label="Focus mode"><i class="fas fa-expand"></i></button>
    <button type="button" class="icon-btn" id="btn-details" title="Post settings" aria-label="Post settings" aria-expanded="false"><i class="fas fa-sliders"></i></button>
    <button type="button" class="icon-btn" data-theme-toggle title="Toggle dark mode" aria-label="Toggle dark mode"><i class="fas fa-circle-half-stroke"></i></button>
    <button type="button" class="btn" id="btn-save"><?= $p['status'] === 'published' ? 'Update' : 'Save draft' ?></button>
    <button type="button" class="btn primary" id="btn-publish"><?= $p['status'] === 'published' ? 'Unpublish' : 'Publish' ?></button>
  </header>

  <div class="ed-main">
    <div class="paper">
      <label class="sr" for="f-title">Title</label>
      <textarea id="f-title" class="title" rows="1" placeholder="Title" maxlength="200"><?= e($p['title']) ?></textarea>
      <textarea id="f-body" class="manual" data-plugin-markdowneditor></textarea>
      <div id="f-rich" class="manual" hidden></div>
    </div>

    <aside id="details" class="details" hidden aria-label="Post settings">
      <h2>Post settings</h2>
      <label>Address
        <span class="slug"><i><?= e(preg_replace('#^https?://#', '', ts_abs())) ?>/</i><input id="f-slug" type="text" value="<?= e($p['slug']) ?>" placeholder="auto-from-title" spellcheck="false"></span>
      </label>
      <div class="field">
        <span class="lbl" id="date-lbl">Publish date</span>
        <input id="f-date" type="hidden" value="<?= e(date('Y-m-d\TH:i', strtotime($p['date']))) ?>">
        <div class="date-row">
          <button type="button" class="btn" id="date-toggle" aria-expanded="false" aria-controls="date-pop" aria-describedby="date-hint"><i class="fas fa-calendar-days"></i> <span id="date-label"></span></button>
          <input id="f-time" type="time" aria-label="Publish time" value="<?= e(date('H:i', strtotime($p['date']))) ?>">
        </div>
        <div id="date-pop" class="date-pop" hidden>
          <div id="f-cal" class="manual"></div>
          <div class="date-actions"><button type="button" class="link-btn" id="date-now">Now</button><button type="button" class="link-btn" id="date-close">Done</button></div>
        </div>
        <small class="muted" id="date-hint"></small>
      </div>
      <label>Type
        <select id="f-type">
          <option value="post"<?= $p['type'] === 'post' ? ' selected' : '' ?>>Post (appears in the feed)</option>
          <option value="page"<?= $p['type'] === 'page' ? ' selected' : '' ?>>Page (appears in the menu)</option>
        </select>
      </label>
      <label>Tags
        <input id="f-tags" type="text" class="manual" value="<?= e(implode(', ', $p['tags'])) ?>">
      </label>
      <label>Summary for search engines
        <textarea id="f-desc" rows="3" maxlength="320" placeholder="One or two sentences. Leave empty to use the opening paragraph."><?= e($p['description']) ?></textarea>
        <small class="muted"><span id="desc-count">0</span> / 160 characters recommended</small>
      </label>
      <div class="field">
        <span class="lbl">Cover image</span>
        <div id="cover-preview" class="cover-preview" hidden><img alt=""><button type="button" class="link-btn" id="cover-clear">Remove</button></div>
        <input id="f-image" type="text" value="<?= e($p['image']) ?>" placeholder="Image address" spellcheck="false">
        <button type="button" class="btn" id="cover-upload"><i class="fas fa-image"></i> Upload image</button>
      </div>
      <input type="file" id="file-input" accept="image/jpeg,image/png,image/gif,image/webp" hidden>
      <div class="danger" id="danger"<?= $isNew ? ' hidden' : '' ?>>
        <a class="btn" id="view-link" href="<?= e(ts_url($p['slug'])) ?>" target="_blank" rel="noopener"><i class="fas fa-eye"></i> View</a>
        <button type="button" class="btn warn" id="btn-delete"><i class="fas fa-trash"></i> Delete</button>
      </div>
    </aside>
  </div>
</form>

<div id="confirm" data-plugin-dialog class="manual" hidden>
  <div data-dialog-backdrop></div>
  <div data-dialog-panel class="dialog-sm">
    <h2 data-dialog-title>Delete this post?</h2>
    <p data-dialog-description>This removes it from your site for good. It cannot be undone.</p>
    <div class="dlg-btns">
      <button type="button" class="btn" data-dialog-close>Keep it</button>
      <button type="button" class="btn warn" id="confirm-yes">Delete</button>
    </div>
  </div>
</div>
<div id="toast" class="toast" role="status" aria-live="polite" hidden></div>

<script src="<?= e($A) ?>/jquery.min.js"></script>
<script src="<?= e($A) ?>/themestrap/namespace.js"></script>
<script src="<?= e($A) ?>/themestrap/themestrap.plugin.toolbar.js"></script>
<script src="<?= e($A) ?>/themestrap/themestrap.plugin.dialog.js"></script>
<script src="<?= e($A) ?>/themestrap/themestrap.plugin.tagsinput.js"></script>
<script src="<?= e($A) ?>/themestrap/themestrap.plugin.markdown.js"></script>
<script src="<?= e($A) ?>/themestrap/themestrap.plugin.richeditor.js"></script>
<script src="<?= e($A) ?>/themestrap/themestrap.plugin.calendar.js"></script>
<script src="<?= e($A) ?>/themestrap/themestrap.plugin.markdowneditor.js"></script>
<script src="<?= e($A) ?>/editor.js"></script>
