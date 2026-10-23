<?php
defined('TS_ROOT') or exit;
// Settings, state and private data files.
//
// Three layers, later ones win:
//   1. built in defaults
//   2. data/settings.php   written by the Settings screen in the admin
//   3. config.php          optional, for advanced users. Anything set here is locked in the admin
//
// Private files are stored as PHP files that begin with a guard line. If a web server hands one out
// instead of running it, the visitor gets an empty 404 page, never the contents.

const TS_GUARD = "<?php http_response_code(404); exit; ?>\n";

function ts_defaults(): array
{
    return [
        'title' => 'My Blog', 'tagline' => '', 'description' => '', 'author' => '', 'language' => 'en',
        'timezone' => 'UTC', 'url' => '', 'store' => 'files', 'posts_per_page' => 8, 'date_format' => 'M j, Y',
        'feed_items' => 20, 'footer' => '', 'allow_html' => false, 'theme' => 'default',
        'reading_progress' => true,  // progress bar at the top of post pages
        'scroll_shadow' => true,     // "keep reading" fade on post pages (loads jQuery and one plugin on post pages)
        'analytics' => 'off',        // off | on: page views and link clicks, shown in the admin
        'analytics_ip' => 'full',    // full | masked | none: what is kept of a visitor's IP address
        'analytics_days' => 90,      // how long records are kept
        'comments' => 'off',         // off | moderate | open | closed
        'pretty_urls' => 'auto',     // auto | on | off
        'post_files' => 'auto',      // auto | plain | protected
        'admin_password_hash' => '', 'debug' => false,
        'update_url' => '',            // where to look for new versions (a latest.json address). Empty uses the built in one
        'update_check' => true,        // look for updates automatically when you open the admin
        'update_public_key' => '',     // advanced, config.php only: overrides the built in signing key
        'update_allow_insecure' => false, // advanced, config.php only: allow http://localhost for testing
    ];
}

// Private data files

function ts_data_dir(): string { return $GLOBALS['ts_data_dir'] ?? (TS_ROOT . '/data'); }

function ts_strip_guard(string $raw): string
{
    return strpos($raw, '<?php') === 0 ? (string) substr($raw, (int) strpos($raw, "\n") + 1) : $raw;
}

function ts_data_read(string $name): array
{
    $f = ts_data_dir() . '/' . $name . '.php';
    if (!is_file($f)) return [];
    $j = json_decode(ts_strip_guard((string) @file_get_contents($f)), true);
    return is_array($j) ? $j : [];
}

function ts_data_write(string $name, array $data): bool
{
    $f = ts_data_dir() . '/' . $name . '.php';
    $tmp = $f . '.' . bin2hex(random_bytes(3)) . '.tmp';
    if (@file_put_contents($tmp, TS_GUARD . json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), LOCK_EX) === false) return false;
    @chmod($tmp, 0600);
    if (!@rename($tmp, $f)) { @unlink($tmp); return false; }
    return true;
}

function ts_state_set(array $kv): bool
{
    $s = $kv + ts_data_read('state');
    $GLOBALS['ts_cfg']['state'] = $s;
    return ts_data_write('state', $s);
}

function ts_log(string $msg): void
{
    $f = ts_data_dir() . '/log.php';
    $lines = is_file($f) ? explode("\n", ts_strip_guard((string) @file_get_contents($f))) : [];
    $lines = array_slice(array_filter($lines, 'strlen'), -99);
    $lines[] = date('Y-m-d H:i:s') . ' ' . str_replace("\n", ' ', $msg);
    @file_put_contents($f, TS_GUARD . implode("\n", $lines) . "\n", LOCK_EX);
}

function ts_log_lines(int $n = 5): array
{
    $f = ts_data_dir() . '/log.php';
    if (!is_file($f)) return [];
    return array_slice(array_filter(explode("\n", ts_strip_guard((string) @file_get_contents($f))), 'strlen'), -$n);
}

// Folders: created on demand, with files that keep them private and unlisted on any server

function ts_prepare_dirs(string $root, string $data, string $content): void
{
    $deny = "<IfModule mod_authz_core.c>\nRequire all denied\n</IfModule>\n<IfModule !mod_authz_core.c>\nOrder deny,allow\nDeny from all\n</IfModule>\n";
    $noexec = "<FilesMatch \"\\.(php|phtml|phar|php[0-9])\$\">\n" . $deny . "</FilesMatch>\n";
    foreach ([[$data, $deny], [$content, $deny], [$root . '/uploads', $noexec]] as [$dir, $rules]) {
        if (!is_dir($dir)) @mkdir($dir, 0775, true);
        if (!is_dir($dir)) continue;
        if (!is_file($dir . '/index.html')) @file_put_contents($dir . '/index.html', '');
        if (!is_file($dir . '/.htaccess')) @file_put_contents($dir . '/.htaccess', $rules);
    }
    if (!is_dir($content . '/posts')) @mkdir($content . '/posts', 0775, true);
    if (is_dir($content) && !is_file($content . '/ts-probe.txt')) @file_put_contents($content . '/ts-probe.txt', 'tsblog-private-probe');
}

function ts_effective_guard(array $cfg): bool
{
    $m = $cfg['post_files'] ?? 'auto';
    return $m === 'protected' || ($m === 'auto' && (($cfg['state']['exposed'] ?? null) !== false));
}

function ts_boot(string $root): array
{
    require_once __DIR__ . '/compat.php';
    $file = [];
    if (is_file($root . '/config.php')) {
        $f = (static function ($__file) { return require $__file; })($root . '/config.php');
        if (is_array($f)) $file = $f;
    }
    $data = rtrim(str_replace('\\', '/', (string) ($file['data_dir'] ?? $root . '/data')), '/');
    $content = rtrim(str_replace('\\', '/', (string) ($file['content_dir'] ?? $root . '/content')), '/');
    $GLOBALS['ts_data_dir'] = $data;
    ts_prepare_dirs($root, $data, $content);

    $cfg = $file + ts_data_read('settings') + ts_defaults();
    $cfg['locked'] = array_keys($file);
    $cfg['state'] = ts_data_read('state');
    mb_internal_encoding('UTF-8');

    if (!in_array($cfg['timezone'], DateTimeZone::listIdentifiers(), true)) $cfg['timezone'] = 'UTC';
    date_default_timezone_set($cfg['timezone']);

    $theme = basename((string) $cfg['theme']);
    if (!is_file($root . '/theme/' . $theme . '/layout.php')) $theme = 'default';
    $cfg['theme'] = $theme;
    $cfg['paths'] = ['root' => $root, 'data' => $data, 'content' => $content, 'uploads' => $root . '/uploads', 'theme' => $root . '/theme/' . $theme];

    $base = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '/')), '/');
    $cfg['base'] = $base;
    if ($cfg['url'] === '') {
        $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https';
        $cfg['url'] = ($https ? 'https://' : 'http://') . ($_SERVER['HTTP_HOST'] ?? 'localhost') . $base;
    }
    $cfg['url'] = rtrim($cfg['url'], '/');

    $mode = $cfg['pretty_urls'];
    $cfg['pretty'] = $mode === 'on' || $mode === true || (($mode === 'auto') && (($cfg['state']['pretty'] ?? null) === true));
    $cfg['guard'] = ts_effective_guard($cfg);

    if ($cfg['store'] === 'sqlite') {
        if (empty($cfg['state']['sqlite_file'])) {
            $name = 'blog-' . bin2hex(random_bytes(8)) . '.db';
            $cfg['state']['sqlite_file'] = $name;
            ts_data_write('state', $cfg['state']);
        }
        $cfg['sqlite_file'] = $cfg['state']['sqlite_file'];
    }
    return $GLOBALS['ts_cfg'] = $cfg;
}

function ts_cfg(string $k, $d = null) { return $GLOBALS['ts_cfg'][$k] ?? $d; }

// The largest upload this server accepts, in bytes (capped at 8 MB by the blog itself)
function ts_upload_limit(): int
{
    $n = static function ($v) {
        $v = trim((string) $v); $u = strtolower(substr($v, -1)); $x = (float) $v;
        return (int) ($u === 'g' ? $x * 1073741824 : ($u === 'm' ? $x * 1048576 : ($u === 'k' ? $x * 1024 : $x)));
    };
    $a = $n(ini_get('upload_max_filesize')) ?: PHP_INT_MAX;
    $b = $n(ini_get('post_max_size')) ?: PHP_INT_MAX;
    return max(262144, min($a, $b, 8 * 1048576));
}

// Plain language health report: list of ['level' => ok|warn|fail, 'label', 'detail']
function ts_health(): array
{
    $p = ts_cfg('paths');
    $out = [];
    $add = static function ($level, $label, $detail) use (&$out) { $out[] = compact('level', 'label', 'detail'); };
    $fixTip = 'In your hosting file manager (or FTP program), right-click the folder, choose Permissions, and set it to 755. If it still fails, try 775, then 777.';

    $add(version_compare(PHP_VERSION, '8.1.0', '>=') ? 'ok' : 'fail', 'PHP version ' . PHP_VERSION,
        version_compare(PHP_VERSION, '8.1.0', '>=') ? 'Good.' : 'This blog needs PHP 8.1 or newer. Your hosting control panel has a "PHP version" setting.');

    foreach ([['data', $p['data'], 'private settings and passwords'], ['content/posts', $p['content'] . '/posts', 'your posts'], ['uploads', $p['uploads'], 'your images']] as [$name, $dir, $what]) {
        $test = $dir . '/.write-test-' . bin2hex(random_bytes(2));
        $ok = is_dir($dir) && @file_put_contents($test, 'x') !== false;
        if ($ok) @unlink($test);
        $add($ok ? 'ok' : 'fail', "The “{$name}” folder",
            $ok ? 'The blog can save here. Good.' : "The blog cannot save {$what} here. {$fixTip}");
    }

    $lim = ts_upload_limit();
    $add($lim >= 2097152 ? 'ok' : 'warn', 'Largest image upload: ' . round($lim / 1048576, 1) . ' MB',
        $lim >= 2097152 ? 'Good.' : 'This is small, but photos are shrunk automatically in your browser before they upload, so it will still work.');

    $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
    $secure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https';
    $local = (bool) preg_match('/^(localhost|127\.|\[::1\])/', $host);
    $add($secure || $local ? 'ok' : 'warn', $secure ? 'Secure connection (HTTPS)' : 'Your connection is not secure (HTTP)',
        $secure || $local ? 'Good.' : 'Your password travels unprotected. Most hosts offer a free certificate: look for "SSL" or "Let\'s Encrypt" in your hosting control panel, then visit this page again with https:// at the start.');

    $s = ts_cfg('state', []);
    $add(ts_cfg('pretty') ? 'ok' : 'warn', ts_cfg('pretty') ? 'Pretty links are on' : 'Pretty links are off',
        ts_cfg('pretty') ? 'Addresses look like /my-post.' : 'Addresses look like /index.php?r=my-post. Everything works, they are just longer. Open Settings → Links to try turning pretty links on.');

    $exposed = $s['exposed'] ?? null;
    $add($exposed === false ? 'ok' : ($exposed === true ? 'ok' : 'warn'), 'Private files',
        $exposed === false ? 'Your server keeps private folders private.' : ($exposed === true ? 'Your server shows folder contents to visitors, so posts are stored in a protected format automatically.' : 'Posts are stored in a protected format to be safe.'));

    if (function_exists('ts_update_problems') && ts_update_url() !== '' && ($p = ts_update_problems())) {
        $add('warn', 'Updates', $p[0]);
    }

    $errs = ts_log_lines(3);
    if ($errs) $add('warn', 'Recent errors were recorded', implode(' | ', $errs));
    return $out;
}
