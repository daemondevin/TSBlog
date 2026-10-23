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
      <label>Posts per page<input type="number" name="posts_per_page" min="1" max="50" data-plugin-numberinput data-plugin-options='{"unit":"posts"}' value="<?= (int) $v('posts_per_page') ?>"<?= $attr('posts_per_page') ?>><?= $note('posts_per_page') ?></label>
      <div class="field"><span class="lbl" id="lbl-date_format">Date style</span>
        <div data-plugin-select class="manual"><select name="date_format"<?= $attr('date_format') ?>>
          <?php foreach (ts_date_formats() as $f => $label): ?><option value="<?= e($f) ?>"<?= $v('date_format') === $f ? ' selected' : '' ?>><?= e($label) ?></option><?php endforeach; ?>
        </select></div><?= $note('date_format') ?>
      </div>
      <div class="field"><span class="lbl" id="lbl-timezone">Time zone <span class="muted">(decides when scheduled posts go live)</span></span>
        <div data-plugin-select class="manual"><select name="timezone"<?= $attr('timezone') ?>>
          <?php
          $zones = [];
          foreach (DateTimeZone::listIdentifiers() as $tz) { $parts = explode('/', $tz, 2); $zones[count($parts) > 1 ? $parts[0] : 'Other'][] = [$tz, count($parts) > 1 ? $parts[1] : $tz]; }
          foreach ($zones as $region => $list): ?><optgroup label="<?= e($region) ?>"><?php foreach ($list as [$tz, $name]): ?><option value="<?= e($tz) ?>"<?= $v('timezone') === $tz ? ' selected' : '' ?>><?= e(str_replace('_', ' ', $name)) ?></option><?php endforeach; ?></optgroup><?php endforeach; ?>
        </select></div><?= $note('timezone') ?>
      </div>
      <label>Language code<input type="text" name="language" maxlength="12" value="<?= e($v('language')) ?>" list="langs"<?= $attr('language') ?>><?= $note('language') ?>
        <datalist id="langs"><?php foreach (['en', 'es', 'fr', 'de', 'it', 'pt', 'nl', 'sv', 'pl', 'ja', 'zh', 'ko', 'ar', 'he'] as $l): ?><option value="<?= $l ?>"><?php endforeach; ?></datalist>
      </label>
    </div>

    <div class="field"><span class="lbl" id="lbl-comments">Comments <span class="muted">(readers can reply to your posts)</span></span>
      <div data-plugin-select class="manual"><select name="comments"<?= $attr('comments') ?>>
        <?php foreach (['off' => 'Off', 'moderate' => 'On, I approve each comment first', 'open' => 'On, show comments right away', 'closed' => 'Closed (keep existing comments, accept no new ones)'] as $k => $label): ?><option value="<?= $k ?>"<?= $v('comments') === $k ? ' selected' : '' ?>><?= e($label) ?></option><?php endforeach; ?>
      </select></div><?= $note('comments') ?>
    </div>

    <h2 id="analytics">Analytics</h2>
    <div class="grid2">
      <div class="field"><span class="lbl" id="lbl-analytics">Count visits and clicks <span class="muted">(see them under Analytics)</span></span>
        <div data-plugin-select class="manual"><select name="analytics"<?= $attr('analytics') ?>>
          <?php foreach (['off' => 'Off', 'on' => 'On'] as $k => $label): ?><option value="<?= $k ?>"<?= $v('analytics') === $k ? ' selected' : '' ?>><?= e($label) ?></option><?php endforeach; ?>
        </select></div><?= $note('analytics') ?>
      </div>
      <div class="field"><span class="lbl" id="lbl-analytics_ip">Visitor IP addresses</span>
        <div data-plugin-select class="manual"><select name="analytics_ip"<?= $attr('analytics_ip') ?>>
          <?php foreach (['full' => 'Keep the full address', 'masked' => 'Keep a shortened address (last part removed)', 'none' => 'Do not keep addresses'] as $k => $label): ?><option value="<?= $k ?>"<?= $v('analytics_ip') === $k ? ' selected' : '' ?>><?= e($label) ?></option><?php endforeach; ?>
        </select></div><?= $note('analytics_ip') ?>
      </div>
      <label>Keep records for<input type="number" name="analytics_days" min="7" max="730" data-plugin-numberinput data-plugin-options='{"unit":"days"}' value="<?= (int) $v('analytics_days') ?>"<?= $attr('analytics_days') ?>><?= $note('analytics_days') ?></label>
    </div>
    <p class="muted">An IP address can identify a person, and some countries treat it as personal data. If your visitors are in the EU or UK, choose a shortened address or none, and say so in your privacy page.</p>

    <label class="check"><input type="checkbox" name="reading_progress" value="1"<?= $v('reading_progress') ? ' checked' : '' ?><?= $attr('reading_progress') ?>> Show a reading progress bar on posts
      <small class="muted">A thin bar at the top that fills as the reader works through the post.</small><?= $note('reading_progress') ?></label>
    <label class="check"><input type="checkbox" name="scroll_shadow" value="1"<?= $v('scroll_shadow') ? ' checked' : '' ?><?= $attr('scroll_shadow') ?>> Show a “keep reading” fade on posts
      <small class="muted">A soft fade at the bottom of the screen while there is more to read, and edge shadows on wide code and tables. Adds about 110 KB to post pages (jQuery and one plugin). Turn it off for the lightest possible pages.</small><?= $note('scroll_shadow') ?></label>

    <details<?= array_intersect(['pretty_urls', 'store', 'post_files', 'theme', 'allow_html', 'url', 'footer', 'feed_items'], array_keys($values)) ? ' open' : '' ?>>
      <summary>Advanced options</summary>

      <label>Footer line<input type="text" name="footer" maxlength="200" value="<?= e($v('footer')) ?>"<?= $attr('footer') ?>><?= $note('footer') ?></label>

      <div class="field"><span class="lbl" id="lbl-pretty_urls">Page links</span>
        <div data-plugin-select class="manual"><select name="pretty_urls"<?= $attr('pretty_urls') ?>>
          <option value="auto"<?= $v('pretty_urls') === 'auto' ? ' selected' : '' ?>>Automatic (recommended)</option>
          <option value="on"<?= $v('pretty_urls') === 'on' ? ' selected' : '' ?>>Always pretty: /my-post</option>
          <option value="off"<?= $v('pretty_urls') === 'off' ? ' selected' : '' ?>>Always plain: index.php?r=my-post</option>
        </select></div>
        <small class="muted">Right now: <strong><?= $cfg['pretty'] ? 'pretty' : 'plain' ?></strong> links. If you pick “Always pretty” and links stop working, open <code>index.php?r=admin/settings</code> on your site and switch back to Automatic.</small><?= $note('pretty_urls') ?>
      </div>

      <div class="field"><span class="lbl" id="lbl-store">Where posts are kept</span>
        <div data-plugin-select class="manual"><select name="store"<?= $attr('store') ?>>
          <option value="files"<?= $v('store') === 'files' ? ' selected' : '' ?>>Files (one per post, easy to back up)</option>
          <option value="sqlite"<?= $v('store') === 'sqlite' ? ' selected' : '' ?><?= $sqliteOk ? '' : ' disabled' ?>>SQLite (one file)<?= $sqliteOk ? '' : ' — not available on this server' ?></option>
        </select></div>
        <small class="muted">Switching copies your posts across automatically.</small><?= $note('store') ?>
      </div>

      <div class="field"><span class="lbl" id="lbl-post_files">Post file format</span>
        <div data-plugin-select class="manual"><select name="post_files"<?= $attr('post_files') ?>>
          <option value="auto"<?= $v('post_files') === 'auto' ? ' selected' : '' ?>>Automatic (recommended)</option>
          <option value="plain"<?= $v('post_files') === 'plain' ? ' selected' : '' ?>>Plain .md files</option>
          <option value="protected"<?= $v('post_files') === 'protected' ? ' selected' : '' ?>>Protected .md.php files</option>
        </select></div>
        <small class="muted">Protected files can never be downloaded by visitors, even on servers that ignore privacy rules. Plain files are nicer for editing by hand or using git. Automatic picks the right one for your server.</small><?= $note('post_files') ?>
      </div>

      <div class="field"><span class="lbl" id="lbl-theme">Theme</span>
        <div data-plugin-select class="manual"><select name="theme"<?= $attr('theme') ?>>
          <?php foreach (glob(TS_ROOT . '/theme/*', GLOB_ONLYDIR) ?: [] as $d): $n = basename($d); ?><option value="<?= e($n) ?>"<?= $v('theme') === $n ? ' selected' : '' ?>><?= e($n) ?></option><?php endforeach; ?>
        </select></div><?= $note('theme') ?>
      </div>

      <label>Posts in the RSS feed<input type="number" name="feed_items" min="1" max="100" data-plugin-numberinput data-plugin-options='{"unit":"posts"}' value="<?= (int) $v('feed_items') ?>"<?= $attr('feed_items') ?>><?= $note('feed_items') ?></label>

      <label>Site address <span class="muted">(leave empty to detect automatically)</span><input type="text" name="url" value="<?= e($v('url')) ?>" placeholder="https://example.com"<?= $attr('url') ?>><?= $note('url') ?></label>

      <label>Update address <span class="muted">(leave empty to use the built in one)</span><input type="text" name="update_url" value="<?= e($v('update_url')) ?>" placeholder="https://github.com/OWNER/REPO"<?= $attr('update_url') ?>>
        <small class="muted">A GitHub repository address (https://github.com/OWNER/REPO), a folder, or the address of latest.json all work.</small><?= $note('update_url') ?></label>

      <label class="check"><input type="checkbox" name="update_check" value="1"<?= $v('update_check') ? ' checked' : '' ?><?= $attr('update_check') ?>> Look for updates automatically when I open the admin
        <small class="muted">Contacts the update address about once a day. It sends nothing about your site except the blog's version number.</small><?= $note('update_check') ?></label>

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

  <?php $up = ts_update_status(); $problems = ts_update_problems(); $backups = ts_update_backups(); ?>
  <section class="card-block" id="updates" data-endpoint="<?= e(ts_url('admin/update')) ?>" data-csrf="<?= e($csrf) ?>">
    <h2>Updates <span class="pill <?= $up['available'] ? 'sched' : 'live' ?>" id="update-pill"><?= $up['available'] ? 'Version ' . e($up['latest']) . ' available' : 'Up to date' ?></span></h2>
    <p>You have <strong>Themestrap Blog <?= e(TS_VERSION) ?></strong>.<?php if ($up['configured']): ?> <span class="muted">Looking at <code id="update-url"><?= e($up['url']) ?></code></span><?php endif; ?></p>
    <?php if (!$up['configured']): ?>
      <p class="muted">This copy has no update address. Add one under Advanced options above (or build releases with <code>tools/build-release.php</code>), then updating works from here.</p>
    <?php else: ?>
      <p class="muted" id="update-status"><?php
        if ($up['error']) echo e('The last check failed: ' . $up['error']);
        elseif ($up['checked_at']) echo e('Last checked ' . date('M j, g:i a', $up['checked_at']) . '. ' . ($up['available'] ? 'A new version is available.' : 'Nothing newer is available.'));
        else echo 'Not checked yet.'; ?></p>
      <pre class="notes" id="update-notes"<?= $up['available'] && $up['notes'] ? '' : ' hidden' ?>><?= e($up['notes']) ?></pre>
      <?php if ($up['trusted_key']): ?><p class="muted">This blog trusts signing key <code id="update-trusted"><?= e($up['trusted_key']) ?></code>.</p><?php endif; ?>
      <div class="alert" role="alert" id="update-keywarn"<?= $up['key_mismatch'] ? '' : ' hidden' ?>><strong>This release cannot be installed automatically.</strong>
        <p>It was signed with key <code id="update-releasekey"><?= e($up['release_key']) ?></code>, but this blog trusts key <code><?= e($up['trusted_key']) ?></code>. Blogs only accept releases signed with the key they already trust. The publisher should rebuild the release with the original key, or change keys with <code>--rotate-to</code>. You can also update by hand once (see <a href="<?= e(ts_url('admin/settings')) ?>">docs/updates.md</a>).</p></div>
      <?php if ($problems): ?><div class="alert" role="alert"><strong>Automatic updating is not available here.</strong><?php foreach ($problems as $p): ?><p><?= e($p) ?></p><?php endforeach; ?></div><?php endif; ?>
      <div class="btn-row">
        <button type="button" class="btn" id="update-check">Check for updates</button>
        <button type="button" class="btn primary" id="update-install"<?= $up['available'] && !$problems && !$up['key_mismatch'] ? '' : ' hidden' ?>>Install version <span id="update-install-version"><?= e($up['latest']) ?></span></button>
        <?php if ($backups): ?><button type="button" class="btn" id="update-restore">Go back to <?= e($backups[0]['from']) ?></button><?php endif; ?>
      </div>
      <p class="muted" id="update-msg" role="status"></p>
      <small class="muted">Updates are signed and checked before anything changes. Your posts, pictures, settings, <code>config.php</code> and custom themes are never touched, and the files that change are backed up first.</small>
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
<script src="<?= e(ts_file_v('assets/admin/jquery.min.js')) ?>"></script>
<script src="<?= e(ts_file_v('assets/admin/themestrap/namespace.js')) ?>"></script>
<script src="<?= e(ts_file_v('assets/admin/themestrap/themestrap.plugin.dialog.js')) ?>"></script>
<script src="<?= e(ts_file_v('assets/admin/themestrap/themestrap.plugin.select.js')) ?>"></script>
<script src="<?= e(ts_file_v('assets/admin/themestrap/themestrap.plugin.numberinput.js')) ?>"></script>
<script src="<?= e(ts_file_v('assets/admin/prompts.js')) ?>"></script>
<script src="<?= e(ts_file_v('assets/admin/settings-ui.js')) ?>"></script>
<script src="<?= e(ts_file_v('assets/admin/probe.js')) ?>"></script>
<script src="<?= e(ts_file_v('assets/admin/settings.js')) ?>"></script>
<script src="<?= e(ts_file_v('assets/admin/update.js')) ?>"></script>
