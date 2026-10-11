<?php
defined('TS_ROOT') or exit;
// Front controller: routes every public page.


require __DIR__ . '/app.php';

function ts_friendly_error(string $title, string $message, int $code = 500): void
{
    if (!headers_sent()) { http_response_code($code); header('Content-Type: text/html; charset=utf-8'); }
    echo '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' . htmlspecialchars($title) . '</title>'
        . '<body style="font:16px/1.6 system-ui,sans-serif;max-width:38rem;margin:4rem auto;padding:0 1rem;color:#1f2937">'
        . '<h1 style="font-size:1.5rem">' . htmlspecialchars($title) . '</h1><p>' . $message . '</p>';
}

$cfg = null;
$store = null;
try {
    $cfg = ts_boot(TS_ROOT);
    if (empty($cfg['debug'])) {
        ini_set('display_errors', '0');
    }
    set_exception_handler(function ($e) use (&$cfg) {
        ts_log(get_class($e) . ': ' . $e->getMessage() . ' in ' . basename($e->getFile()) . ':' . $e->getLine());
        ts_friendly_error('Something went wrong', htmlspecialchars(!empty($cfg['debug']) ? $e->getMessage() : 'The blog hit a problem and saved the details. If you are the owner, sign in and open <strong>Settings</strong> to see what happened.'));
    });
    register_shutdown_function(function () {
        $err = error_get_last();
        if ($err && in_array($err['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR], true)) {
            ts_log('Fatal: ' . $err['message'] . ' in ' . basename($err['file']) . ':' . $err['line']);
            if (!headers_sent()) ts_friendly_error('Something went wrong', 'The blog hit a problem and saved the details. If you are the owner, sign in and open <strong>Settings</strong> to see what happened.');
        }
    });
    $store = TSStore::open($cfg);
} catch (Throwable $e) {
    @ts_log($e->getMessage());
    ts_friendly_error('The blog could not start', htmlspecialchars($e->getMessage()));
    exit;
}

// Work out which page was asked for, whether it came as /my-post or index.php?r=my-post
$viaQuery = isset($_GET['r']) && is_string($_GET['r']);
$uri = (string) parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
if ($viaQuery) {
    $path = '/' . trim($_GET['r'], '/');
} else {
    $path = rawurldecode($uri);
    if ($cfg['base'] !== '' && strpos($path, $cfg['base']) === 0) $path = substr($path, strlen($cfg['base']));
    if (preg_match('#^/index\.php$#', $path)) $path = '/';
    $path = '/' . trim($path, '/');
    if ($path !== '/' && substr($uri, -1) === '/' && strpos($path, '/admin') !== 0) {
        ts_redirect(ts_url(ltrim($path, '/')), 301);
    }
    // A clean address reached this file, so the server sends unknown paths here: pretty links work
    if ($path !== '/' && ($cfg['state']['pretty'] ?? null) !== true) {
        ts_state_set(['pretty' => true]);
    }
}
$seg = $path === '/' ? [] : explode('/', trim($path, '/'));
$first = $seg[0] ?? '';

// An update is being installed: a short pause beats a half updated page
if (ts_update_locked()) {
    header('Retry-After: 10');
    if (ts_wants_json()) ts_json(['ok' => false, 'message' => 'An update is running right now. Please wait a minute and try again.'], 503);
    ts_friendly_error('Updating…', 'This site is being updated and will be back in a few seconds. Please reload in a moment.', 503);
    exit;
}

if ($path === '/ts-probe') {
    header('Cache-Control: no-store');
    header('Content-Type: text/plain');
    echo 'tsblog-probe';
    exit;
}

// Admin
if ($first === 'admin') {
    require __DIR__ . '/admin.php';
    ts_headers(true);
    ts_admin($store, array_slice($seg, 1));
    exit;
}

ts_headers();
$admin = ts_is_admin();
$GLOBALS['ts_admin'] = $admin;
$GLOBALS['ts_nav_pages'] = $store->published('page');

$perPage = max(1, (int) $cfg['posts_per_page']);
$pageNum = static fn($v) => max(1, (int) $v);

function ts_list_page(array $all, int $n, int $per, string $base): array
{
    $total = max(1, (int) ceil(count($all) / $per));
    if ($n > $total) ts_not_found();
    $b = trim($base, '/');
    $first = $b === '' ? '' : $b;
    return [
        'posts' => array_slice($all, ($n - 1) * $per, $per),
        'page' => $n, 'pages' => $total,
        'newer' => $n > 1 ? ($n === 2 ? ts_url($first) : ts_url($b . '/page/' . ($n - 1))) : null,
        'older' => $n < $total ? ts_url(($b === '' ? '' : $b . '/') . 'page/' . ($n + 1)) : null,
    ];
}

function ts_not_found(): void
{
    ts_send(ts_page('404', [], ['title' => 'Not found', 'noindex' => true]), 'text/html; charset=utf-8', 404, false);
    exit;
}

// Home and pagination
if ($seg === [] || ($first === 'page' && count($seg) === 2 && ctype_digit($seg[1]))) {
    $n = $seg === [] ? 1 : $pageNum($seg[1]);
    $v = ts_list_page($store->published(), $n, $perPage, '');
    ts_send(ts_page('home', $v + ['heading' => null], [
        'title' => $cfg['title'] . ($cfg['tagline'] ? ' · ' . $cfg['tagline'] : ''),
        'canonical' => $n > 1 ? ts_abs('page/' . $v['page']) : ts_abs(),
    ]));
    exit;
}

// Tags
if ($first === 'tags' && count($seg) === 1) {
    ts_send(ts_page('tags', ['tags' => $store->tags()], ['title' => 'Tags · ' . $cfg['title'], 'canonical' => ts_abs('tags')]));
    exit;
}
if ($first === 'tag' && isset($seg[1])) {
    $tag = $seg[1];
    $n = (count($seg) === 4 && $seg[2] === 'page') ? $pageNum($seg[3]) : 1;
    $all = $store->byTag($tag);
    if (!$all) ts_not_found();
    $name = $tag;
    foreach ($all[0]['tags'] as $t) if (mb_strtolower($t) === mb_strtolower($tag)) $name = $t;
    $route = 'tag/' . mb_strtolower($tag);
    $v = ts_list_page($all, $n, $perPage, $route);
    ts_send(ts_page('home', $v + ['heading' => 'Tagged “' . $name . '”'], [
        'title' => $name . ' · ' . $cfg['title'], 'canonical' => ts_abs($route),
        'description' => 'Posts tagged ' . $name . ' on ' . $cfg['title'] . '.',
    ]));
    exit;
}

// Search
if ($first === 'search' && count($seg) === 1) {
    $q = trim((string) ($_GET['q'] ?? ''));
    $found = $q !== '' ? $store->search($q) : [];
    ts_send(ts_page('home', [
        'posts' => array_slice($found, 0, 50), 'page' => 1, 'pages' => 1, 'newer' => null, 'older' => null,
        'heading' => $q === '' ? 'Search' : count($found) . ' result' . (count($found) === 1 ? '' : 's') . ' for “' . $q . '”',
        'search' => $q,
    ], ['title' => 'Search · ' . $cfg['title'], 'noindex' => true]), 'text/html; charset=utf-8', 200, false);
    exit;
}

// Feed, sitemap, robots
if ($path === '/feed.xml') {
    $posts = array_slice($store->published(), 0, (int) $cfg['feed_items']);
    foreach ($posts as &$p) $p['html'] = ts_render($store->get($p['slug'])['body'] ?? '');
    unset($p);
    ts_send(ts_feed($posts), 'application/rss+xml; charset=utf-8');
    exit;
}
if ($path === '/sitemap.xml') {
    ts_send(ts_sitemap($store->published(), $store->published('page'), $store->tags()), 'application/xml; charset=utf-8');
    exit;
}
if ($path === '/robots.txt') {
    ts_send("User-agent: *\nDisallow: " . $cfg['base'] . "/admin\nDisallow: " . $cfg['base'] . "/search\n\nSitemap: " . ts_abs('sitemap.xml') . "\n", 'text/plain; charset=utf-8');
    exit;
}

// Single post or page
if (count($seg) === 1 && TSStore::validSlug($first)) {
    $post = $store->get($first);
    $live = $post && $post['status'] === 'published' && strtotime($post['date']) <= time();
    if (!$post || (!$live && !$admin)) ts_not_found();

    $post['html'] = ts_render($post['body']);
    $post['words'] = TSMarkdown::wordCount($post['body']);
    $post['minutes'] = max(1, (int) ceil($post['words'] / 220));
    $desc = $post['description'] !== '' ? $post['description'] : TSMarkdown::excerpt($post['body'], 160);

    $prev = $next = null;
    if ($post['type'] === 'post' && $live) {
        $all = $store->published();
        foreach ($all as $k => $p) {
            if ($p['slug'] === $post['slug']) { $next = $all[$k - 1] ?? null; $prev = $all[$k + 1] ?? null; break; }
        }
    }
    $img = $post['image'] !== '' ? ts_absolute_path($post['image']) : '';
    $ld = [
        '@context' => 'https://schema.org', '@type' => $post['type'] === 'post' ? 'BlogPosting' : 'WebPage',
        'headline' => $post['title'], 'description' => $desc, 'url' => ts_abs($post['slug']),
        'datePublished' => date('c', strtotime($post['date'])), 'dateModified' => date('c', strtotime($post['updated'] ?: $post['date'])),
        'author' => ['@type' => 'Person', 'name' => $cfg['author'] ?: $cfg['title']],
        'publisher' => ['@type' => 'Organization', 'name' => $cfg['title']],
    ];
    if ($img) $ld['image'] = $img;
    if (!empty($cfg['scroll_shadow'])) ts_headers(false, true);
    ts_send(ts_page('post', ['post' => $post, 'prev' => $prev, 'next' => $next, 'live' => $live], [
        'title' => $post['title'] . ' · ' . $cfg['title'], 'description' => $desc, 'canonical' => ts_abs($post['slug']),
        'image' => $img, 'type' => $post['type'] === 'post' ? 'article' : 'website', 'noindex' => !$live,
        'published' => $post['date'], 'modified' => $post['updated'], 'tags' => $post['tags'], 'jsonld' => $ld,
    ]), 'text/html; charset=utf-8', 200, !$admin);
    exit;
}

ts_not_found();
