<?php defined('TS_ROOT') or exit; // Variables: $posts, $page, $pages, $base, $newer, $older, $heading, optional $search
require_once __DIR__ . '/functions.php';
if (isset($search)) {
    tsx_head($search === '' ? 'Search' : 'Search results', [['Home', ts_url()], [$search === '' ? 'Search' : 'Search', null]]);
} elseif (!empty($heading)) {
    tsx_head($heading, [['Home', ts_url()], ['Blog', ts_url()], [$heading, null]]);
} else {
    tsx_head('Blog', [['Home', ts_url()], ['Blog', null]]);
}
?>
<?php if (isset($search) || !empty($heading)): ?><h2 class="tsx-list-title"><?= e($heading ?? '') ?></h2><?php endif; ?>
<div class="blog-posts">
<?php if (!$posts): ?>
  <p class="tsx-empty"><?= isset($search) ? 'Nothing matched. Try fewer or different words.' : 'No posts yet.' ?></p>
<?php endif; ?>
<?php foreach ($posts as $p): [$day, $mon] = tsx_badge($p['date']); $url = ts_url($p['slug']); ?>
  <article class="post post-large format-<?= e($p['format'] ?? 'standard') ?>">
    <?= tsx_media($p, $url) ?>
    <div class="post-date"><span class="day"><?= e($day) ?></span><span class="month"><?= e($mon) ?></span></div>
    <div class="post-content">
      <h2><a href="<?= e($url) ?>"><?= e($p['title']) ?></a></h2>
      <p><?= e(rtrim($p['description'] ?: $p['excerpt'], " .\u{2026}")) ?> [...]</p>
      <?= tsx_meta($p, true) ?>
    </div>
  </article>
<?php endforeach; ?>
<?php if ($pages > 1): ?>
  <nav aria-label="Pagination">
    <ul class="pagination">
      <li class="page-item<?= $newer ? '' : ' disabled' ?>"><?php if ($newer): ?><a class="page-link" href="<?= e($newer) ?>" rel="prev" aria-label="Newer posts"><?= tsx_icon('left') ?></a><?php else: ?><span class="page-link"><?= tsx_icon('left') ?></span><?php endif; ?></li>
<?php foreach (tsx_pages((int) $page, (int) $pages) as $n): ?>
<?php if ($n === 0): ?>      <li class="page-item disabled"><span class="page-link">…</span></li>
<?php elseif ($n === (int) $page): ?>      <li class="page-item active"><span class="page-link" aria-current="page"><?= $n ?></span></li>
<?php else: ?>      <li class="page-item"><a class="page-link" href="<?= e(tsx_page_url($base ?? '', $n)) ?>"><?= $n ?></a></li>
<?php endif; endforeach; ?>
      <li class="page-item<?= $older ? '' : ' disabled' ?>"><?php if ($older): ?><a class="page-link" href="<?= e($older) ?>" rel="next" aria-label="Older posts"><?= tsx_icon('right') ?></a><?php else: ?><span class="page-link"><?= tsx_icon('right') ?></span><?php endif; ?></li>
    </ul>
  </nav>
<?php endif; ?>
</div>
