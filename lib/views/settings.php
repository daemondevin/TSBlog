<?php
defined('TS_ROOT') or exit();
// Variables: $errors, $values (posted values on error), optional $pwError, $csrf
$cfg = $GLOBALS['ts_cfg'];
$locked = $cfg['locked'];
$v = fn($k) => array_key_exists($k, $values) ? $values[$k] : $cfg[$k];
$lock = fn($k) => in_array($k, $locked, true);
$attr = fn($k) => $lock($k) ? ' disabled' : '';
$note = fn($k) => $lock($k) ? '<small class="muted">Set in config.php</small>' : '';
$health = ts_health();
$bad = count(array_filter($health, fn($h) => $h['level'] !== 'ok'));
$sqliteOk = class_exists('PDO') && in_array('sqlite', PDO::getAvailableDrivers(), true);
$probe = json_encode(['pretty' => ts_cfg('base') . '/ts-probe', 'exposed' => ts_file('content/ts-probe.txt'), 'post' => ts_url('admin/probe'), 'csrf' => $csrf], JSON_UNESCAPED_SLASHES);
?>
<main class="list settings">
  <div class="list-head"><h1>Settings</h1><a class="btn" href="<?= e(ts_url('admin')) ?>">Back to posts</a></div>

  <?php if (!empty($_GET['saved'])): ?><p class="ok-note" role="status"><?= $_GET['saved'] === 'password' ? 'Your password was changed.' : 'Saved.' ?></p><?php endif; ?>
  <?php if (!empty($_GET['expired'])): ?><p class="alert">Your session expired, so nothing was saved. Please try again.</p><?php endif; ?>
  <?php foreach ($errors as $err): ?><p class="alert" role="alert"><?= e($err) ?></p><?php endforeach; ?>

  <form method="post" action="<?= e(ts_url('admin/settings')) ?>" class="card-block">
    <input type="hidden" name="_csrf" value="<?= e($csrf) ?>">
    <input type="hidden" name="_form" value="1">

    <h2>Your blog</h2>
    <label>Blog name<input type="text" name="title" maxlength="80" value="<?= e($v('title')) ?>"<?= $attr('title') ?>><?= $note('title') ?></label>
    <label>Tagline <span class="muted">(a few words under the name)</span><input type="text" name="tagline" maxlength="120" value="<?= e($v('tagline')) ?>"<?= $attr('tagline') ?>><?= $note('tagline') ?></label>
    <label>Description <span class="muted">(shown in search results)</span><textarea name="description" rows="2" maxlength="300"<?= $attr('description') ?>><?= e($v('description')) ?></textarea><?= $note('description') ?></label>
    <label>Your name<input type="text" name="author" maxlength="80" value="<?= e($v('author')) ?>"<?= $attr('author') ?>><?= $note('author') ?></label>

    <h2>Reading</h2>
    <div class="grid2">
      <label>Posts per page<input type="number" name="posts_per_page" min="1" max="50" value="<?= (int) $v('posts_per_page') ?>"<?= $attr('posts_per_page') ?>><?= $note('posts_per_page') ?></label>
      <label>Date style
        <select name="date_format"<?= $attr('date_format') ?>>
          <?php foreach (ts_date_formats() as $f => $label): ?><option value="<?= e($f) ?>"<?= $v('date_format') === $f ? ' selected' : '' ?>><?= e($label) ?></option><?php endforeach; ?>
        </select><?= $note('date_format') ?>
      </label>
      <label>Time zone <span class="muted">(decides when scheduled posts go live)</span>
        <select name="timezone"<?= $attr('timezone') ?>>
          <?php foreach (DateTimeZone::listIdentifiers() as $tz): ?><option<?= $v('timezone') === $tz ? ' selected' : '' ?>><?= e($tz) ?></option><?php endforeach; ?>
        </select><?= $note('timezone') ?>
      </label>
      <label>Language code<input type="text" name="language" maxlength="12" value="<?= e($v('language')) ?>" list="langs"<?= $attr('language') ?>><?= $note('language') ?>
        <datalist id="langs"><?php foreach (['en', 'es', 'fr', 'de', 'it', 'pt', 'nl', 'sv', 'pl', 'ja', 'zh', 'ko', 'ar', 'he'] as $l): ?><option value="<?= $l ?>"><?php endforeach; ?></datalist>
      </label>
    </div>

    <label class="check"><input type="checkbox" name="reading_progress" value="1"<?= $v('reading_progress') ? ' checked' : '' ?><?= $attr('reading_progress') ?>> Show a reading progress bar on posts
      <small class="muted">A thin bar at the top that fills as the reader works through the post.</small><?= $note('reading_progress') ?></label>
    <label class="check"><input type="checkbox" name="scroll_shadow" value="1"<?= $v('scroll_shadow') ? ' checked' : '' ?><?= $attr('scroll_shadow') ?>> Show a “keep reading” fade on posts
      <small class="muted">A soft fade at the bottom of the screen while there is more to read, and edge shadows on wide code and tables. Adds about 110 KB to post pages (jQuery and one plugin). Turn it off for the lightest possible pages.</small><?= $note('scroll_shadow') ?></label>

    <details<?= array_intersect(['pretty_urls', 'store', 'post_files', 'theme', 'allow_html', 'url', 'footer', 'feed_items'], array_keys($values)) ? ' open' : '' ?>>
      <summary>Advanced options</summary>

      <label>Footer line<input type="text" name="footer" maxlength="200" value="<?= e($v('footer')) ?>"<?= $attr('footer') ?>><?= $note('footer') ?></label>

      <label>Page links
        <select name="pretty_urls"<?= $attr('pretty_urls') ?>>
          <option value="auto"<?= $v('pretty_urls') === 'auto' ? ' selected' : '' ?>>Automatic (recommended)</option>
          <option value="on"<?= $v('pretty_urls') === 'on' ? ' selected' : '' ?>>Always pretty: /my-post</option>
          <option value="off"<?= $v('pretty_urls') === 'off' ? ' selected' : '' ?>>Always plain: index.php?r=my-post</option>
        </select>
        <small class="muted">Right now: <strong><?= $cfg['pretty'] ? 'pretty' : 'plain' ?></strong> links. If you pick “Always pretty” and links stop working, open <code>index.php?r=admin/settings</code> on your site and switch back to Automatic.</small><?= $note('pretty_urls') ?>
      </label>

      <label>Where posts are kept
        <select name="store"<?= $attr('store') ?>>
          <option value="files"<?= $v('store') === 'files' ? ' selected' : '' ?>>Files (one per post, easy to back up)</option>
          <option value="sqlite"<?= $v('store') === 'sqlite' ? ' selected' : '' ?><?= $sqliteOk ? '' : ' disabled' ?>>SQLite (one file)<?= $sqliteOk ? '' : ' — not available on this server' ?></option>
        </select>
        <small class="muted">Switching copies your posts across automatically.</small><?= $note('store') ?>
      </label>

      <label>Post file format
        <select name="post_files"<?= $attr('post_files') ?>>
          <option value="auto"<?= $v('post_files') === 'auto' ? ' selected' : '' ?>>Automatic (recommended)</option>
          <option value="plain"<?= $v('post_files') === 'plain' ? ' selected' : '' ?>>Plain .md files</option>
          <option value="protected"<?= $v('post_files') === 'protected' ? ' selected' : '' ?>>Protected .md.php files</option>
        </select>
        <small class="muted">Protected files can never be downloaded by visitors, even on servers that ignore privacy rules. Plain files are nicer for editing by hand or using git. Automatic picks the right one for your server.</small><?= $note('post_files') ?>
      </label>

      <label>Theme
        <select name="theme"<?= $attr('theme') ?>>
          <?php foreach (glob(TS_ROOT . '/theme/*', GLOB_ONLYDIR) ?: [] as $d): $n = basename($d); ?><option<?= $v('theme') === $n ? ' selected' : '' ?>><?= e($n) ?></option><?php endforeach; ?>
        </select><?= $note('theme') ?>
      </label>

      <label>Posts in the RSS feed<input type="number" name="feed_items" min="1" max="100" value="<?= (int) $v('feed_items') ?>"<?= $attr('feed_items') ?>><?= $note('feed_items') ?></label>

      <label>Site address <span class="muted">(leave empty to detect automatically)</span><input type="text" name="url" value="<?= e($v('url')) ?>" placeholder="https://example.com"<?= $attr('url') ?>><?= $note('url') ?></label>

      <label class="check"><input type="checkbox" name="allow_html" value="1"<?= $v('allow_html') ? ' checked' : '' ?><?= $attr('allow_html') ?>> Allow HTML inside posts (needed for video embeds)
        <small class="muted">Only turn this on if you are the only person who can sign in.</small><?= $note('allow_html') ?></label>
    </details>

    <button class="btn primary" type="submit">Save settings</button>
  </form>

  <section class="card-block">
    <h2>Password</h2>
    <?php if ($lock('admin_password_hash')): ?>
      <p class="muted">Your password is set in config.php, so change it there.</p>
    <?php else: ?>
    <form method="post" action="<?= e(ts_url('admin/password')) ?>">
      <input type="hidden" name="_csrf" value="<?= e($csrf) ?>">
      <div class="grid2">
        <label>Current password<input type="password" name="current" autocomplete="current-password" required></label>
        <span></span>
        <label>New password<input type="password" name="new" minlength="8" autocomplete="new-password" required></label>
        <label>New password again<input type="password" name="confirm" minlength="8" autocomplete="new-password" required></label>
      </div>
      <button class="btn" type="submit">Change password</button>
    </form>
    <?php endif; ?>
  </section>

  <section class="card-block">
    <h2>Backup</h2>
    <p class="muted">Downloads a zip of your posts, pictures and settings. Keep it somewhere safe. To restore, upload its folders back to your site.</p>
    <a class="btn" href="<?= e(ts_url('admin/backup')) ?>"><i class="fas fa-download"></i> Download a backup</a>
  </section>

  <section class="card-block">
    <h2>Health <span class="pill <?= $bad ? 'sched' : 'live' ?>"><?= $bad ? $bad . ' to look at' : 'All good' ?></span></h2>
    <ul class="health">
      <?php foreach ($health as $h): ?>
      <li class="<?= e($h['level']) ?>"><i class="fas <?= $h['level'] === 'ok' ? 'fa-circle-check' : ($h['level'] === 'warn' ? 'fa-triangle-exclamation' : 'fa-circle-xmark') ?>"></i>
        <div><strong><?= e($h['label']) ?></strong><br><span class="muted"><?= e($h['detail']) ?></span></div></li>
      <?php endforeach; ?>
    </ul>
    <button class="btn" type="button" id="recheck" data-probe="<?= e($probe) ?>">Test my server again</button> <span id="recheck-msg" class="muted"></span>
  </section>
</main>
<script src="<?= e(ts_file('assets/admin/probe.js')) ?>"></script>
<script src="<?= e(ts_file('assets/admin/settings.js')) ?>"></script>
