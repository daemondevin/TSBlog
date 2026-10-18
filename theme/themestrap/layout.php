<?php defined('TS_ROOT') or exit;
// Variables: $content, $meta, $pages
require_once __DIR__ . '/functions.php';
$title = $meta['title'] !== '' ? $meta['title'] : ts_cfg('title');
$canon = $meta['canonical'];
$head = $GLOBALS['tsx_head'] ?? ['h1' => ts_cfg('title'), 'crumbs' => [['Home', ts_url()]], 'sidebar' => true];
$store = $GLOBALS['ts_store'] ?? null;
$recent = $store ? array_slice($store->published(), 0, 5) : [];
$updated = $store ? $store->published() : [];
usort($updated, fn($a, $b) => strcmp($b['updated'] ?: $b['date'], $a['updated'] ?: $a['date']));
$updated = array_slice($updated, 0, 5);
$allTags = $store ? $store->tags() : [];
$here = rtrim((string) parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH), '/');
?><!doctype html>
<html lang="<?= e(ts_cfg('language')) ?>">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title><?= e($title) ?></title>
<meta name="description" content="<?= e($meta['description']) ?>">
<?php if ($meta['noindex']): ?><meta name="robots" content="noindex,follow">
<?php endif; ?>
<?php if ($canon): ?><link rel="canonical" href="<?= e($canon) ?>">
<?php endif; ?>
<link rel="alternate" type="application/rss+xml" title="<?= e(ts_cfg('title')) ?>" href="<?= e(ts_url('feed.xml')) ?>">
<meta property="og:site_name" content="<?= e(ts_cfg('title')) ?>">
<meta property="og:type" content="<?= e($meta['type']) ?>">
<meta property="og:title" content="<?= e($meta['title'] ?: ts_cfg('title')) ?>">
<meta property="og:description" content="<?= e($meta['description']) ?>">
<?php if ($canon): ?><meta property="og:url" content="<?= e($canon) ?>">
<?php endif; ?>
<?php if ($meta['image']): ?><meta property="og:image" content="<?= e($meta['image']) ?>">
<?php endif; ?>
<meta name="twitter:card" content="<?= $meta['image'] ? 'summary_large_image' : 'summary' ?>">
<?php if ($meta['type'] === 'article'): ?><meta property="article:published_time" content="<?= e(date('c', strtotime($meta['published']))) ?>">
<meta property="article:modified_time" content="<?= e(date('c', strtotime($meta['modified'] ?: $meta['published']))) ?>">
<?php foreach ($meta['tags'] as $t): ?><meta property="article:tag" content="<?= e($t) ?>">
<?php endforeach; endif; ?>
<script src="<?= e(ts_asset('theme.js')) ?>"></script>
<link rel="stylesheet" href="<?= e(ts_asset('style.css')) ?>">
<?php if ($meta['jsonld']): ?><script type="application/ld+json"><?= json_encode($meta['jsonld'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG) ?></script>
<?php endif; ?>
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<header id="header" class="tsx-header">
  <div class="tsx-container tsx-header-row">
    <a class="tsx-logo" href="<?= e(ts_url()) ?>"><span class="tsx-mark" aria-hidden="true"><?= e(mb_strtoupper(mb_substr(ts_cfg('title'), 0, 1))) ?></span><span class="tsx-logo-text"><?= e(ts_cfg('title')) ?></span></a>
    <nav id="tsx-nav" class="tsx-nav" aria-label="Main">
      <ul>
        <li<?= $here === rtrim(parse_url(ts_url(), PHP_URL_PATH) ?: '', '/') ? ' class="here"' : '' ?>><a href="<?= e(ts_url()) ?>">Home</a></li>
        <li<?= $here === rtrim((string) parse_url(ts_url('tags'), PHP_URL_PATH), '/') ? ' class="here"' : '' ?>><a href="<?= e(ts_url('tags')) ?>">Tags</a></li>
<?php foreach ($pages as $pg): ?>
        <li<?= $here === rtrim((string) parse_url(ts_url($pg['slug']), PHP_URL_PATH), '/') ? ' class="here"' : '' ?>><a href="<?= e(ts_url($pg['slug'])) ?>"><?= e($pg['title']) ?></a></li>
<?php endforeach; ?>
<?php if (!empty($GLOBALS['ts_admin'])): ?>
        <li><a href="<?= e(ts_url('admin')) ?>">Dashboard</a></li>
<?php endif; ?>
      </ul>
    </nav>
    <div class="tsx-tools">
      <button class="tsx-icon-btn" type="button" data-theme-toggle aria-label="Toggle dark mode" title="Toggle dark mode"><span class="tsx-when-light"><?= tsx_icon('moon') ?></span><span class="tsx-when-dark"><?= tsx_icon('sun') ?></span></button>
      <button class="tsx-icon-btn tsx-burger" type="button" data-nav-toggle aria-controls="tsx-nav" aria-expanded="false" aria-label="Menu"><?= tsx_icon('bars') ?></button>
    </div>
  </div>
</header>

<section class="page-header">
  <div class="tsx-container">
    <ul class="breadcrumb">
<?php foreach ($head['crumbs'] as $i => [$label, $url]): ?>
      <?php if ($url !== null): ?><li><a href="<?= e($url) ?>"><?= e($label) ?></a></li><?php else: ?><li class="active" aria-current="page"><?= e($label) ?></li><?php endif; ?>

<?php endforeach; ?>
    </ul>
    <h1><?= e($head['h1']) ?></h1>
  </div>
</section>

<div class="tsx-container tsx-grid<?= $head['sidebar'] ? '' : ' tsx-grid-full' ?>">
  <main id="main" class="tsx-main"><?= $content ?></main>
<?php if ($head['sidebar']): ?>
  <aside class="sidebar" aria-label="Sidebar">
    <form class="tsx-search" action="<?= e(ts_url('search')) ?>" role="search"><?= ts_route_field('search') ?>
      <input type="search" name="q" placeholder="Search..." aria-label="Search" value="<?= e($_GET['q'] ?? '') ?>">
      <button type="submit" aria-label="Search"><?= tsx_icon('search') ?></button>
    </form>

<?php if ($allTags): ?>
    <h5>Categories</h5>
    <ul class="nav-list">
<?php foreach (array_slice($allTags, 0, 8) as $t): ?>
      <li><a href="<?= e(tsx_tag_url($t['name'])) ?>"><?= e($t['name']) ?> <span>(<?= (int) $t['count'] ?>)</span></a></li>
<?php endforeach; ?>
    </ul>
<?php endif; ?>

<?php if ($recent): ?>
    <div class="tsx-tabs" data-tabs>
      <div class="tsx-tablist" role="tablist">
        <button type="button" role="tab" id="tab-recent" aria-controls="pane-recent" aria-selected="true">Recent</button>
        <button type="button" role="tab" id="tab-updated" aria-controls="pane-updated" aria-selected="false" tabindex="-1">Updated</button>
      </div>
<?php foreach (['recent' => $recent, 'updated' => $updated] as $k => $list): ?>
      <ul class="simple-post-list" role="tabpanel" id="pane-<?= $k ?>" aria-labelledby="tab-<?= $k ?>"<?= $k === 'recent' ? '' : ' hidden' ?>>
<?php foreach ($list as $p): ?>
        <li>
          <a class="post-image" href="<?= e(ts_url($p['slug'])) ?>" tabindex="-1" aria-hidden="true"><?= tsx_thumb($p) ?></a>
          <div class="post-info"><a href="<?= e(ts_url($p['slug'])) ?>"><?= e($p['title']) ?></a><div class="post-meta"><?= e(ts_date($k === 'recent' ? $p['date'] : ($p['updated'] ?: $p['date']))) ?></div></div>
        </li>
<?php endforeach; ?>
      </ul>
<?php endforeach; ?>
    </div>
<?php endif; ?>

<?php if ($allTags): ?>
    <h5>Tags</h5>
    <p class="tsx-badges"><?php foreach ($allTags as $t): ?><a class="badge" href="<?= e(tsx_tag_url($t['name'])) ?>"><?= e($t['name']) ?></a><?php endforeach; ?></p>
<?php endif; ?>
  </aside>
<?php endif; ?>
</div>

<footer id="footer" class="tsx-footer">
  <div class="tsx-container tsx-foot-cols">
    <div class="tsx-foot-about">
      <a class="tsx-logo" href="<?= e(ts_url()) ?>"><span class="tsx-mark" aria-hidden="true"><?= e(mb_strtoupper(mb_substr(ts_cfg('title'), 0, 1))) ?></span><span class="tsx-logo-text"><?= e(ts_cfg('title')) ?></span></a>
<?php if (ts_cfg('tagline') !== '' || ts_cfg('description') !== ''): ?>
      <p><?= e(ts_cfg('description') !== '' ? ts_cfg('description') : ts_cfg('tagline')) ?></p>
<?php endif; ?>
    </div>
    <div>
      <h5>Pages</h5>
      <ul>
        <li><a href="<?= e(ts_url()) ?>">Home</a></li>
        <li><a href="<?= e(ts_url('tags')) ?>">Tags</a></li>
<?php foreach ($pages as $pg): ?>
        <li><a href="<?= e(ts_url($pg['slug'])) ?>"><?= e($pg['title']) ?></a></li>
<?php endforeach; ?>
      </ul>
    </div>
<?php if ($allTags): ?>
    <div>
      <h5>Popular tags</h5>
      <ul>
<?php foreach (array_slice($allTags, 0, 5) as $t): ?>
        <li><a href="<?= e(tsx_tag_url($t['name'])) ?>"><?= e($t['name']) ?></a></li>
<?php endforeach; ?>
      </ul>
    </div>
<?php endif; ?>
    <div>
      <h5>Follow</h5>
      <p><a class="tsx-rss" href="<?= e(ts_url('feed.xml')) ?>"><?= tsx_icon('rss') ?> Subscribe by RSS</a></p>
    </div>
  </div>
  <div class="tsx-copy">
    <div class="tsx-container tsx-copy-row">
      <span>&copy; <?= date('Y') ?> <?= e(ts_cfg('author') ?: ts_cfg('title')) ?><?= ts_cfg('footer') ? ' · ' . e(ts_cfg('footer')) : '' ?></span>
      <span><a href="<?= e(ts_url('feed.xml')) ?>">RSS</a> · <a href="<?= e(ts_url('sitemap.xml')) ?>">Sitemap</a></span>
    </div>
  </div>
</footer>
</body>
</html>
