<?php
defined('TS_ROOT') or exit;
// Shared helpers. Functions are prefixed ts_ to avoid collisions.

require_once __DIR__ . '/compat.php';
require_once __DIR__ . '/markdown.php';
require_once __DIR__ . '/media.php';
require_once __DIR__ . '/comments.php';
require_once __DIR__ . '/analytics.php';
require_once __DIR__ . '/store.php';
require_once __DIR__ . '/settings.php';
require_once __DIR__ . '/version.php';
require_once __DIR__ . '/update.php';

function e($s): string { return htmlspecialchars((string) $s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'); }

// URLs
//
// Two link styles, chosen automatically (see Settings, Links):
//   pretty   /my-post, /tag/design          needs the server to send unknown paths to index.php
//   plain    /index.php?r=my-post           works on every PHP host
// ts_url() builds links to pages of the blog. ts_file() builds links to real files (images, css, js).

function ts_query(array $q): string
{
    $parts = [];
    foreach ($q as $k => $v) {
        $parts[] = $k === 'r' ? 'r=' . str_replace('%2F', '/', rawurlencode((string) $v)) : rawurlencode((string) $k) . '=' . rawurlencode((string) $v);
    }
    return implode('&', $parts);
}

function ts_url(string $route = '', array $q = []): string
{
    $route = trim($route, '/');
    $base = ts_cfg('base');
    if (ts_cfg('pretty')) {
        $path = $route === '' ? '' : implode('/', array_map('rawurlencode', explode('/', $route)));
        return $base . '/' . $path . ($q ? '?' . ts_query($q) : '');
    }
    if ($route === '' && !$q) return $base . '/';
    return $base . '/index.php?' . ts_query(($route !== '' ? ['r' => $route] : []) + $q);
}

// For forms that submit with GET: in plain link mode the page address lives in a hidden field
function ts_route_field(string $route): string
{
    return ts_cfg('pretty') ? '' : '<input type="hidden" name="r" value="' . e($route) . '">';
}

function ts_abs(string $route = '', array $q = []): string
{
    return ts_cfg('url') . substr(ts_url($route, $q), strlen(ts_cfg('base')));
}

function ts_file(string $path): string { return ts_cfg('base') . '/' . ltrim($path, '/'); }
// A file under the blog folder, with its modification time as ?v=, so a file that changed (an update, a re-upload)
// is never served from the browser's cache next to a page that expects the new version
function ts_file_v(string $path): string
{
    $abs = TS_ROOT . '/' . ltrim($path, '/');
    return ts_file($path) . (is_file($abs) ? '?v=' . (int) filemtime($abs) : '');
}
function ts_file_abs(string $path): string { return ts_cfg('url') . '/' . ltrim($path, '/'); }
function ts_origin(): string { return preg_replace('#^(https?://[^/]+).*$#', '$1', ts_cfg('url')); }

function ts_date(string $d, ?string $fmt = null): string { return date($fmt ?: ts_cfg('date_format'), strtotime($d)); }

function ts_render(string $md, string $alerts = 'plugin'): string { return TSMarkdown::render($md, (bool) ts_cfg('allow_html'), $alerts); }

function ts_asset(string $file): string
{
    $p = ts_cfg('paths')['theme'] . '/' . $file;
    return ts_file('theme/' . ts_cfg('theme') . '/' . $file) . (is_file($p) ? '?v=' . filemtime($p) : '');
}

// HTTP

// $inlineStyles: Themestrap plugins add their CSS through a <style> element, which needs 'unsafe-inline' for styles
function ts_headers(bool $admin = false, bool $inlineStyles = false): void
{
    header('X-Content-Type-Options: nosniff');
    header('Referrer-Policy: strict-origin-when-cross-origin');
    header('X-Frame-Options: SAMEORIGIN');
    $style = $admin || $inlineStyles ? "'self' 'unsafe-inline'" : "'self'";
    // Players from the supported list are always allowed (entry formats). Any https frame needs raw HTML enabled.
    $frames = $admin ? '' : (ts_cfg('allow_html') ? " frame-src https:;" : ' frame-src ' . implode(' ', TSMedia::FRAME_HOSTS) . ';') . " media-src 'self' https:;";
    header("Content-Security-Policy: default-src 'self'; img-src 'self' https: data:; style-src $style; script-src 'self';$frames base-uri 'self'; form-action 'self'; frame-ancestors 'self'");
}

function ts_send(string $body, string $type = 'text/html; charset=utf-8', int $status = 200, bool $cache = true): void
{
    http_response_code($status);
    header('Content-Type: ' . $type);
    if ($cache && $status === 200 && ($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'GET') {
        $etag = '"' . md5($body) . '"';
        header('ETag: ' . $etag);
        header('Cache-Control: public, max-age=0, must-revalidate');
        if (($_SERVER['HTTP_IF_NONE_MATCH'] ?? '') === $etag) { http_response_code(304); return; }
    } else {
        header('Cache-Control: no-store');
    }
    echo $body;
}

function ts_redirect(string $to, int $code = 302): void
{
    header('Location: ' . $to, true, $code);
    exit;
}

function ts_json($data, int $status = 200): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

// Auth and CSRF. A session is only started when needed, so public pages stay cookie free.

function ts_session(bool $force = false): bool
{
    if (session_status() === PHP_SESSION_ACTIVE) return true;
    if (!$force && !isset($_COOKIE['tsblog'])) return false;
    $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https';
    session_name('tsblog');
    session_set_cookie_params(['lifetime' => 0, 'path' => ts_cfg('base') . '/', 'secure' => $https, 'httponly' => true, 'samesite' => 'Lax']);
    // Keep sessions in our own folder when possible; otherwise let PHP use its default
    $dir = ts_cfg('paths')['data'] . '/sessions';
    if (!is_dir($dir)) @mkdir($dir, 0770, true);
    if (is_dir($dir) && is_writable($dir)) {
        session_save_path($dir);
        if (!is_file($dir . '/index.html')) @file_put_contents($dir . '/index.html', '');
    }
    return @session_start();
}

function ts_is_admin(): bool
{
    return ts_session() && !empty($_SESSION['admin']);
}

function ts_csrf(): string
{
    ts_session(true);
    return $_SESSION['csrf'] ??= bin2hex(random_bytes(16));
}

function ts_csrf_ok(): bool
{
    $t = $_POST['_csrf'] ?? $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    return ts_session() && !empty($_SESSION['csrf']) && is_string($t) && hash_equals($_SESSION['csrf'], $t);
}

function ts_password_hash(): string
{
    if (ts_cfg('admin_password_hash')) return (string) ts_cfg('admin_password_hash');
    return (string) (ts_data_read('admin')['hash'] ?? '');
}

function ts_set_password(string $pw): bool
{
    return ts_data_write('admin', ['hash' => password_hash($pw, PASSWORD_DEFAULT)]);
}

// Failed sign in throttle: 5 misses in 15 minutes locks the address for 10 minutes
function ts_throttle(string $action = 'check'): bool
{
    $ip = $_SERVER['REMOTE_ADDR'] ?? '0';
    $all = ts_data_read('login');
    $now = time();
    foreach ($all as $k => $v) if (($v['t'] ?? 0) < $now - 900 && ($v['lock'] ?? 0) < $now) unset($all[$k]);
    $row = $all[$ip] ?? ['n' => 0, 't' => $now, 'lock' => 0];
    if ($action === 'fail') {
        $row['n']++; $row['t'] = $now;
        if ($row['n'] >= 5) { $row['lock'] = $now + 600; $row['n'] = 0; }
        $all[$ip] = $row;
        ts_data_write('login', $all);
    } elseif ($action === 'reset') {
        unset($all[$ip]);
        ts_data_write('login', $all);
    }
    return $row['lock'] <= $now; // true means allowed
}

// Seconds until the current visitor may try signing in again (0 when not locked)
function ts_throttle_wait(): int
{
    $row = ts_data_read('login')[$_SERVER['REMOTE_ADDR'] ?? '0'] ?? null;
    return $row ? max(0, (int) ($row['lock'] ?? 0) - time()) : 0;
}

// True when the browser asked for JSON (PluginAuth and the editor do)
function ts_wants_json(): bool
{
    return ($_SERVER['HTTP_X_REQUESTED_WITH'] ?? '') === 'XMLHttpRequest' || stripos($_SERVER['HTTP_ACCEPT'] ?? '', 'application/json') !== false;
}

// Views

function ts_view(string $file, array $vars = []): string
{
    extract($vars, EXTR_SKIP);
    ob_start();
    require $file;
    return ob_get_clean();
}

// Theme page: renders theme/<name>/<tpl>.php inside layout.php
function ts_page(string $tpl, array $vars, array $meta = []): string
{
    $theme = ts_cfg('paths')['theme'];
    $meta += ['title' => '', 'description' => ts_cfg('description'), 'canonical' => '', 'image' => '', 'type' => 'website',
        'noindex' => false, 'published' => '', 'modified' => '', 'tags' => [], 'jsonld' => null];
    $content = ts_view($theme . '/' . $tpl . '.php', $vars);
    $html = ts_view($theme . '/layout.php', ['content' => $content, 'meta' => $meta, 'pages' => $GLOBALS['ts_nav_pages'] ?? []]);
    // Analytics: count this page view, and add the click counting script just before the end of the page
    TSAnalytics::view($tpl, (string) ($GLOBALS['ts_path'] ?? '/'));
    if (($tag = ts_analytics_tag()) !== '') {
        $at = strripos($html, '</body>');
        $html = $at === false ? $html . $tag : substr($html, 0, $at) . $tag . "\n" . substr($html, $at);
    }
    return $html;
}

// Turns a site relative path stored in a post (like /blog/uploads/a.jpg) into a full address
function ts_absolute_path(string $p): string
{
    return preg_match('#^https?://#i', $p) ? $p : ts_origin() . '/' . ltrim($p, '/');
}

// Feed and sitemap

function ts_absolutize(string $html): string
{
    return preg_replace('#(href|src)="/(?!/)#', '$1="' . ts_origin() . '/', $html);
}

function ts_feed(array $posts): string
{
    $x = fn($s) => htmlspecialchars((string) $s, ENT_XML1 | ENT_QUOTES, 'UTF-8');
    $last = $posts ? $posts[0]['date'] : date('Y-m-d H:i');
    $o = '<?xml version="1.0" encoding="UTF-8"?>' . "\n"
        . '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">' . "\n<channel>\n"
        . '<title>' . $x(ts_cfg('title')) . "</title>\n<link>" . $x(ts_abs()) . "</link>\n"
        . '<description>' . $x(ts_cfg('description') ?: ts_cfg('tagline') ?: ts_cfg('title')) . "</description>\n"
        . '<language>' . $x(ts_cfg('language')) . "</language>\n"
        . '<lastBuildDate>' . date(DATE_RSS, strtotime($last)) . "</lastBuildDate>\n"
        . '<atom:link href="' . $x(ts_abs('feed.xml')) . '" rel="self" type="application/rss+xml"/>' . "\n"
        . "<generator>Themestrap Blog</generator>\n";
    foreach (array_slice($posts, 0, (int) ts_cfg('feed_items')) as $p) {
        $link = ts_abs($p['slug']);
        $o .= "<item>\n<title>" . $x($p['title']) . "</title>\n<link>" . $x($link) . "</link>\n"
            . '<guid isPermaLink="true">' . $x($link) . "</guid>\n"
            . '<pubDate>' . date(DATE_RSS, strtotime($p['date'])) . "</pubDate>\n";
        foreach ($p['tags'] as $t) $o .= '<category>' . $x($t) . "</category>\n";
        $o .= '<description>' . $x($p['description'] ?: $p['excerpt']) . "</description>\n"
            . '<content:encoded><![CDATA[' . str_replace(']]>', ']]]]><![CDATA[>', ts_absolutize($p['html'])) . "]]></content:encoded>\n</item>\n";
    }
    return $o . "</channel>\n</rss>\n";
}

function ts_sitemap(array $posts, array $pages, array $tags): string
{
    $x = fn($s) => htmlspecialchars($s, ENT_XML1 | ENT_QUOTES, 'UTF-8');
    $o = '<?xml version="1.0" encoding="UTF-8"?>' . "\n" . '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n";
    $u = function ($loc, $mod = null) use (&$o, $x) {
        $o .= '<url><loc>' . $x($loc) . '</loc>' . ($mod ? '<lastmod>' . date('c', strtotime($mod)) . '</lastmod>' : '') . "</url>\n";
    };
    $u(ts_abs(), $posts ? $posts[0]['date'] : null);
    foreach (array_merge($posts, $pages) as $p) $u(ts_abs($p['slug']), $p['updated'] ?: $p['date']);
    foreach ($tags as $t) $u(ts_abs('tag/' . mb_strtolower($t['name'])));
    return $o . "</urlset>\n";
}
