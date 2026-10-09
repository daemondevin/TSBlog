<?php
defined('TS_ROOT') or exit;
// Admin controller. Single author, one password, no user table.

function ts_admin_view(string $name, array $vars = [], string $title = 'Admin', int $status = 200): void
{
    $vars['csrf'] = ts_csrf();
    $content = ts_view(__DIR__ . '/views/' . $name . '.php', $vars);
    ts_send(ts_view(__DIR__ . '/views/layout.php', ['content' => $content, 'title' => $title, 'vars' => $vars, 'bare' => $vars['bare'] ?? false]),
        'text/html; charset=utf-8', $status, false);
}

// Answers a sign in or setup problem: JSON for the script-enhanced form, a normal page otherwise
function ts_auth_fail(string $mode, string $message, array $errors = [], int $status = 422, array $extra = []): void
{
    if (ts_wants_json()) {
        ts_json(['ok' => false, 'message' => $message, 'errors' => (object) $errors] + (isset($extra['retryAfter']) ? ['retryAfter' => $extra['retryAfter']] : []), $status);
    }
    $fails = array_values(array_filter(ts_health(), fn($h) => $h['level'] === 'fail'));
    ts_admin_view('login', ['mode' => $mode, 'error' => $message, 'bare' => true, 'fails' => $fails] + $extra, $mode === 'setup' ? 'Set up your blog' : 'Sign in', $status);
    exit;
}

function ts_auth_ok(): void
{
    if (ts_wants_json()) ts_json(['ok' => true, 'redirect' => ts_url('admin')]);
    ts_redirect(ts_url('admin'));
}

function ts_admin_login_view(string $mode, string $error = '', array $extra = []): void
{
    $fails = array_values(array_filter(ts_health(), fn($h) => $h['level'] === 'fail'));
    ts_admin_view('login', ['mode' => $mode, 'error' => $error, 'bare' => true, 'fails' => $fails] + $extra, $mode === 'setup' ? 'Set up your blog' : 'Sign in');
}

function ts_admin(TSStore $store, array $seg): void
{
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    $action = $seg[0] ?? '';
    header('X-Robots-Tag: noindex');

    // First run: three questions and you are in
    if (ts_password_hash() === '') {
        ts_session(true);
        if ($method === 'POST' && $action === 'setup') {
            $pw = (string) ($_POST['password'] ?? '');
            $title = trim((string) ($_POST['title'] ?? '')) ?: 'My Blog';
            $author = trim((string) ($_POST['author'] ?? ''));
            $keep = ['title' => $title, 'author' => $author];
            if (!ts_csrf_ok()) ts_auth_fail('setup', 'Your session expired. Please reload the page and try again.', [], 403, $keep);
            if (strlen($pw) < 8) ts_auth_fail('setup', 'Please use at least 8 characters for your password.', ['password' => 'Please use at least 8 characters.'], 422, $keep);
            if ($pw !== (string) ($_POST['confirm'] ?? '')) ts_auth_fail('setup', 'The two passwords do not match.', ['confirm' => 'The two passwords do not match.'], 422, $keep);

            $tz = (string) ($_POST['timezone'] ?? '');
            $settings = ['title' => mb_substr($title, 0, 80), 'author' => mb_substr($author, 0, 80)];
            if (in_array($tz, DateTimeZone::listIdentifiers(), true)) $settings['timezone'] = $tz;
            $state = [];
            if (($_POST['pretty'] ?? '') === '1') $state['pretty'] = true;
            if (($_POST['exposed'] ?? '') === '1') $state['exposed'] = true;
            if (($_POST['exposed'] ?? '') === '0') $state['exposed'] = false;
            if (!ts_data_write('settings', $settings + ts_data_read('settings')) || !ts_set_password($pw) || !ts_data_write('state', $state + ts_data_read('state'))) {
                ts_auth_fail('setup', 'The blog could not save your settings. See the red box for how to fix the folder.', [], 500, $keep);
            }
            $cur = $GLOBALS['ts_cfg'];
            $cur['state'] = ts_data_read('state');
            $newGuard = ts_effective_guard($cur);
            if (($cur['store'] ?? 'files') === 'files' && $newGuard !== !empty($cur['guard'])) {
                (new TSFileStore($cur['paths']['content'], $cur['paths']['data'], $newGuard))->reformat();
            }
            session_regenerate_id(true);
            $_SESSION['admin'] = true;
            $_SESSION['welcome'] = true;
            // The links may have changed mode with the new state, so build the address from scratch
            $GLOBALS['ts_cfg']['pretty'] = !empty($state['pretty']) && ($GLOBALS['ts_cfg']['pretty_urls'] ?? 'auto') !== 'off';
            ts_auth_ok();
        }
        ts_admin_login_view('setup');
        return;
    }

    // Sign in
    if ($action === 'login' && $method === 'POST') {
        ts_session(true);
        if (!ts_csrf_ok()) ts_auth_fail('login', 'Your session expired. Please reload the page and try again.', [], 403);
        if (!ts_throttle()) {
            $wait = ts_throttle_wait();
            ts_auth_fail('login', 'Too many attempts. Please wait a few minutes and try again.', [], 429, ['retryAfter' => $wait]);
        }
        if (password_verify((string) ($_POST['password'] ?? ''), ts_password_hash())) {
            ts_throttle('reset');
            session_regenerate_id(true);
            $_SESSION['admin'] = true;
            ts_auth_ok();
        }
        ts_throttle('fail');
        $wait = ts_throttle_wait();
        ts_auth_fail('login', 'That password is not right.', [], 401, $wait > 0 ? ['retryAfter' => $wait] : []);
    }

    if (!ts_is_admin()) {
        ts_admin_login_view('login');
        return;
    }

    if ($method === 'POST') {
        if (!ts_csrf_ok()) {
            if ($action === 'settings' || $action === 'password') ts_redirect(ts_url('admin/settings', ['expired' => 1]));
            ts_json(['ok' => false, 'errors' => ['Your session expired. Reload the page and sign in again.']], 403);
        }
        switch ($action) {
            case 'logout':
                $_SESSION = [];
                session_destroy();
                if (ts_wants_json()) ts_json(['ok' => true, 'redirect' => ts_url('admin')]);
                ts_redirect(ts_url('admin'));
            case 'save':     ts_admin_save($store); return;
            case 'delete':   ts_admin_delete($store); return;
            case 'upload':   ts_admin_upload(); return;
            case 'settings': ts_admin_settings_save(); return;
            case 'password': ts_admin_password(); return;
            case 'probe':    ts_admin_probe(); return;
            case 'render':
                $b = preg_replace('/^[ \t]*<!--more-->[ \t]*$/m', "\n\n@@TSMORE@@\n\n", (string) ($_POST['body'] ?? ''));
                ts_json(['ok' => true, 'html' => str_replace('<p>@@TSMORE@@</p>', '<hr data-more="1">', ts_render($b))]);
        }
        ts_json(['ok' => false, 'errors' => ['Unknown action.']], 404);
    }

    if ($action === '') {
        $welcome = !empty($_SESSION['welcome']);
        unset($_SESSION['welcome']);
        ts_admin_view('list', ['posts' => $store->all(), 'welcome' => $welcome], 'Posts');
    } elseif ($action === 'new') {
        ts_admin_view('edit', ['post' => null, 'bare' => true], 'New post');
    } elseif ($action === 'edit' && isset($seg[1]) && ($post = $store->get($seg[1]))) {
        ts_admin_view('edit', ['post' => $post, 'bare' => true], 'Edit · ' . $post['title']);
    } elseif ($action === 'settings') {
        ts_admin_view('settings', ['errors' => [], 'values' => []], 'Settings');
    } elseif ($action === 'backup') {
        ts_admin_backup();
    } else {
        ts_admin_view('list', ['posts' => $store->all(), 'notice' => 'That post does not exist.', 'welcome' => false], 'Posts', 404);
    }
}

function ts_admin_save(TSStore $store): void
{
    $old = trim((string) ($_POST['original'] ?? '')) ?: null;
    if ($old !== null && !$store->get($old)) $old = null;
    [$post, $errors] = $store->prepare($_POST, $old);
    if ($errors) ts_json(['ok' => false, 'errors' => $errors], 422);
    if ($old) {
        $prev = $store->get($old);
        $post['updated'] = date('Y-m-d H:i');
        if (empty($_POST['date']) && $prev) $post['date'] = $prev['date'];
    }
    try {
        $store->save($post, $old);
    } catch (Throwable $e) {
        ts_log($e->getMessage());
        ts_json(['ok' => false, 'errors' => [$e->getMessage()]], 500);
    }
    ts_json([
        'ok' => true, 'slug' => $post['slug'], 'status' => $post['status'], 'date' => $post['date'],
        'updated' => $post['updated'], 'url' => ts_url($post['slug']), 'edit' => ts_url('admin/edit/' . $post['slug']),
        'message' => $post['status'] === 'published' ? 'Published' : 'Draft saved',
    ]);
}

function ts_admin_delete(TSStore $store): void
{
    $slug = (string) ($_POST['slug'] ?? '');
    if (!$store->remove($slug)) ts_json(['ok' => false, 'errors' => ['Could not delete that post.']], 404);
    ts_json(['ok' => true, 'redirect' => ts_url('admin')]);
}

function ts_admin_upload(): void
{
    $f = $_FILES['file'] ?? null;
    $max = ts_upload_limit();
    $mb = rtrim(rtrim(number_format($max / 1048576, 1), '0'), '.');
    if (!$f || ($f['error'] ?? 1) !== UPLOAD_ERR_OK) ts_json(['ok' => false, 'errors' => ["That image is too big for this server. The most it accepts is {$mb} MB."]], 400);
    if ($f['size'] > $max) ts_json(['ok' => false, 'errors' => ["That image is too big. The most this server accepts is {$mb} MB."]], 413);

    $info = @getimagesize($f['tmp_name']);
    $types = [IMAGETYPE_JPEG => 'jpg', IMAGETYPE_PNG => 'png', IMAGETYPE_GIF => 'gif', IMAGETYPE_WEBP => 'webp'];
    if (!$info || !isset($types[$info[2]])) ts_json(['ok' => false, 'errors' => ['Please use a JPG, PNG, GIF or WebP picture.']], 415);

    $dir = ts_cfg('paths')['uploads'] . '/' . date('Y/m');
    if (!is_dir($dir) && !@mkdir($dir, 0775, true)) ts_json(['ok' => false, 'errors' => ['The blog cannot save pictures because the “uploads” folder is not writable. Set that folder’s permissions to 755 (or 775/777) in your hosting file manager.']], 500);

    $base = TSStore::slugify(pathinfo((string) $f['name'], PATHINFO_FILENAME)) ?: 'image';
    $name = substr($base, 0, 40) . '-' . bin2hex(random_bytes(3)) . '.' . $types[$info[2]];
    if (!move_uploaded_file($f['tmp_name'], $dir . '/' . $name)) ts_json(['ok' => false, 'errors' => ['Could not save the picture.']], 500);

    ts_json(['ok' => true, 'url' => ts_file('uploads/' . date('Y/m') . '/' . $name), 'width' => $info[0], 'height' => $info[1]]);
}

// Settings

function ts_settings_clean(array $in, array $cfg): array
{
    $locked = $cfg['locked'] ?? [];
    $out = []; $err = [];
    $text = function ($k, $max, $label, $required = false) use ($in, $locked, &$out, &$err) {
        if (in_array($k, $locked, true) || !isset($in[$k])) return;
        $v = trim(preg_replace('/\s+/', ' ', (string) $in[$k]));
        if ($required && $v === '') { $err[] = "{$label} cannot be empty."; return; }
        $out[$k] = mb_substr($v, 0, $max);
    };
    $text('title', 80, 'The blog name', true);
    $text('tagline', 120, 'Tagline'); $text('description', 300, 'Description'); $text('author', 80, 'Author'); $text('footer', 200, 'Footer');

    $int = function ($k, $min, $max, $label) use ($in, $locked, &$out, &$err) {
        if (in_array($k, $locked, true) || !isset($in[$k])) return;
        $v = (int) $in[$k];
        if ($v < $min || $v > $max) { $err[] = "{$label} must be between {$min} and {$max}."; return; }
        $out[$k] = $v;
    };
    $int('posts_per_page', 1, 50, 'Posts per page'); $int('feed_items', 1, 100, 'Feed items');

    $pick = function ($k, array $allowed, $label) use ($in, $locked, &$out, &$err) {
        if (in_array($k, $locked, true) || !isset($in[$k])) return;
        if (!in_array($in[$k], $allowed, true)) { $err[] = "{$label} has an option that is not allowed."; return; }
        $out[$k] = $in[$k];
    };
    $pick('pretty_urls', ['auto', 'on', 'off'], 'Links');
    $pick('post_files', ['auto', 'plain', 'protected'], 'Post files');
    $pick('store', ['files', 'sqlite'], 'Storage');
    $pick('date_format', array_keys(ts_date_formats()), 'Date format');
    $pick('timezone', DateTimeZone::listIdentifiers(), 'Time zone');
    $themes = array_map('basename', glob(TS_ROOT . '/theme/*', GLOB_ONLYDIR) ?: []);
    $pick('theme', $themes, 'Theme');

    if (!in_array('language', $locked, true) && isset($in['language'])) {
        $l = trim((string) $in['language']);
        if (preg_match('/^[a-z]{2,3}(-[A-Za-z0-9]{2,8})?$/', $l)) $out['language'] = $l; else $err[] = 'The language code should look like en, fr or pt-BR.';
    }
    if (!in_array('url', $locked, true) && isset($in['url'])) {
        $u = rtrim(trim((string) $in['url']), '/');
        if ($u === '' || preg_match('#^https?://[^\s/]+(/[^\s]*)?$#', $u)) $out['url'] = $u; else $err[] = 'The site address must start with http:// or https://.';
    }
    foreach (['allow_html', 'reading_progress', 'scroll_shadow'] as $flag) {
        if (!in_array($flag, $locked, true) && isset($in['_form'])) $out[$flag] = !empty($in[$flag]);
    }
    return [$out, $err];
}

function ts_date_formats(): array
{
    $now = strtotime('2026-10-03');
    $o = [];
    foreach (['M j, Y', 'F j, Y', 'j F Y', 'Y-m-d', 'd/m/Y', 'm/d/Y'] as $f) $o[$f] = date($f, $now);
    return $o;
}

function ts_admin_settings_save(): void
{
    $cfg = $GLOBALS['ts_cfg'];
    [$clean, $errors] = ts_settings_clean($_POST, $cfg);

    if (!$errors && isset($clean['store']) && $clean['store'] !== $cfg['store']) {
        try {
            $state = ts_data_read('state');
            if (empty($state['sqlite_file'])) { $state['sqlite_file'] = 'blog-' . bin2hex(random_bytes(8)) . '.db'; ts_data_write('state', $state); }
            $newCfg = array_merge($cfg, $clean, ['sqlite_file' => $state['sqlite_file'], 'guard' => ts_effective_guard(array_merge($cfg, $clean))]);
            $from = TSStore::open($cfg);
            $to = TSStore::open($newCfg);
            foreach ($from->all() as $row) { if ($p = $from->get($row['slug'])) $to->save($p); }
        } catch (Throwable $e) {
            $errors[] = 'Could not switch storage: ' . $e->getMessage();
        }
    }
    if ($errors) { ts_admin_view('settings', ['errors' => $errors, 'values' => $_POST], 'Settings', 422); return; }

    if (!ts_data_write('settings', $clean + ts_data_read('settings'))) {
        ts_admin_view('settings', ['errors' => ['The blog could not save your settings because the “data” folder is not writable. Set its permissions to 755 (or 775/777).'], 'values' => $_POST], 'Settings', 500);
        return;
    }
    $merged = array_merge($cfg, $clean);
    $newGuard = ts_effective_guard($merged);
    if (($merged['store'] ?? 'files') === 'files' && $newGuard !== !empty($cfg['guard'])) {
        (new TSFileStore($cfg['paths']['content'], $cfg['paths']['data'], $newGuard))->reformat();
    }
    ts_redirect(ts_url('admin/settings', ['saved' => 1]));
}

function ts_admin_password(): void
{
    $cfg = $GLOBALS['ts_cfg'];
    $errors = [];
    if (in_array('admin_password_hash', $cfg['locked'], true)) $errors[] = 'Your password is set in config.php, so change it there.';
    elseif (!password_verify((string) ($_POST['current'] ?? ''), ts_password_hash())) $errors[] = 'Your current password is not right.';
    elseif (strlen((string) ($_POST['new'] ?? '')) < 8) $errors[] = 'Please use at least 8 characters for the new password.';
    elseif (($_POST['new'] ?? '') !== ($_POST['confirm'] ?? '')) $errors[] = 'The two new passwords do not match.';
    if ($errors) { ts_admin_view('settings', ['errors' => $errors, 'values' => [], 'pwError' => true], 'Settings', 422); return; }
    ts_set_password((string) $_POST['new']);
    ts_redirect(ts_url('admin/settings', ['saved' => 'password']));
}

// Results of the browser side checks (pretty links work? are private folders private?)
function ts_admin_probe(): void
{
    $cfg = $GLOBALS['ts_cfg'];
    $state = ['pretty' => ($_POST['pretty'] ?? '') === '1'];
    if (($_POST['exposed'] ?? '') === '1') $state['exposed'] = true;
    elseif (($_POST['exposed'] ?? '') === '0') $state['exposed'] = false;
    ts_state_set($state);
    $new = $GLOBALS['ts_cfg'];
    if (($cfg['store'] ?? 'files') === 'files' && ts_effective_guard($new) !== !empty($cfg['guard'])) {
        (new TSFileStore($cfg['paths']['content'], $cfg['paths']['data'], ts_effective_guard($new)))->reformat();
    }
    ts_json(['ok' => true, 'pretty' => $state['pretty'], 'exposed' => $state['exposed'] ?? null]);
}

function ts_admin_backup(): void
{
    if (!class_exists('ZipArchive')) {
        ts_admin_view('settings', ['errors' => ['This server cannot make zip files. To back up, copy the “content”, “uploads” and “data” folders with your FTP program.'], 'values' => []], 'Settings', 501);
        return;
    }
    $p = ts_cfg('paths');
    $tmp = tempnam(sys_get_temp_dir(), 'tsb');
    $zip = new ZipArchive();
    $zip->open($tmp, ZipArchive::OVERWRITE);
    $add = function ($dir, $prefix) use ($zip, &$add) {
        foreach (scandir($dir) ?: [] as $n) {
            if ($n === '.' || $n === '..' || $n === '.htaccess' || $n === 'index.html' || $n === 'ts-probe.txt' || substr($n, -4) === '.tmp') continue;
            $full = $dir . '/' . $n;
            if (is_dir($full)) $add($full, $prefix . $n . '/'); else $zip->addFile($full, $prefix . $n);
        }
    };
    if (is_dir($p['content'])) $add($p['content'], 'content/');
    if (is_dir($p['uploads'])) $add($p['uploads'], 'uploads/');
    foreach (['settings.php', 'admin.php', 'state.php'] as $f) if (is_file($p['data'] . '/' . $f)) $zip->addFile($p['data'] . '/' . $f, 'data/' . $f);
    foreach (glob($p['data'] . '/blog-*.db') ?: [] as $f) $zip->addFile($f, 'data/' . basename($f));
    $zip->close();
    header('Content-Type: application/zip');
    header('Content-Disposition: attachment; filename="blog-backup-' . date('Y-m-d') . '.zip"');
    header('Content-Length: ' . filesize($tmp));
    header('Cache-Control: no-store');
    readfile($tmp);
    @unlink($tmp);
    exit;
}
