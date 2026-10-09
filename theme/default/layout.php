<?php defined('TS_ROOT') or exit;
// Variables: $content, $meta, $pages
$title = $meta['title'] !== '' ? $meta['title'] : ts_cfg('title');
$canon = $meta['canonical'];
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
<header class="site-head">
  <div class="wrap head-row">
    <a class="brand" href="<?= e(ts_url()) ?>"><?= e(ts_cfg('title')) ?></a>
    <nav class="nav" aria-label="Main">
      <a href="<?= e(ts_url()) ?>">Home</a>
      <a href="<?= e(ts_url('tags')) ?>">Tags</a>
      <?php foreach ($pages as $pg): ?><a href="<?= e(ts_url($pg['slug'])) ?>"><?= e($pg['title']) ?></a><?php endforeach; ?>
    </nav>
    <form class="search" action="<?= e(ts_url('search')) ?>" role="search"><?= ts_route_field('search') ?>
      <input type="search" name="q" placeholder="Search" aria-label="Search" value="<?= e($_GET['q'] ?? '') ?>">
    </form>
    <button class="mode" type="button" data-theme-toggle aria-label="Toggle dark mode" title="Toggle dark mode">
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>
    </button>
  </div>
</header>
<main id="main" class="wrap"><?= $content ?></main>
<footer class="site-foot">
  <div class="wrap foot-row">
    <span>&copy; <?= date('Y') ?> <?= e(ts_cfg('author') ?: ts_cfg('title')) ?><?= ts_cfg('footer') ? ' · ' . e(ts_cfg('footer')) : '' ?></span>
    <span><a href="<?= e(ts_url('feed.xml')) ?>">RSS</a> · <a href="<?= e(ts_url('sitemap.xml')) ?>">Sitemap</a></span>
  </div>
</footer>
</body>
</html>
