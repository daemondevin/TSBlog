<?php defined('TS_ROOT') or exit; // Variables: $posts, $page, $pages, $newer, $older, $heading, optional $search ?>
<?php if (!empty($heading)): ?><h1 class="list-title"><?= e($heading) ?></h1><?php endif; ?>
<?php if (isset($search)): ?>
<form class="search-big" action="<?= e(ts_url('search')) ?>" role="search"><?= ts_route_field('search') ?>
  <input type="search" name="q" value="<?= e($search) ?>" placeholder="Search posts" aria-label="Search posts" autofocus>
</form>
<?php endif; ?>
<?php if (!$posts): ?>
  <p class="empty"><?= isset($search) ? 'Nothing matched. Try fewer or different words.' : 'No posts yet.' ?></p>
<?php endif; ?>
<?php foreach ($posts as $p): ?>
<article class="entry">
  <div class="meta"><time datetime="<?= e(date('c', strtotime($p['date']))) ?>"><?= e(ts_date($p['date'])) ?></time> · <?= (int) $p['minutes'] ?> min read</div>
  <h2><a href="<?= e(ts_url($p['slug'])) ?>"><?= e($p['title']) ?></a></h2>
  <p><?= e($p['description'] ?: $p['excerpt']) ?></p>
  <?php if ($p['tags']): ?><p class="tags"><?php foreach ($p['tags'] as $t): ?><a href="<?= e(ts_url('tag/' . mb_strtolower($t))) ?>"><?= e($t) ?></a><?php endforeach; ?></p><?php endif; ?>
</article>
<?php endforeach; ?>
<?php if ($newer || $older): ?>
<nav class="pager" aria-label="Pagination">
  <span><?php if ($newer): ?><a href="<?= e($newer) ?>" rel="prev">&larr; Newer</a><?php endif; ?></span>
  <span class="count">Page <?= (int) $page ?> of <?= (int) $pages ?></span>
  <span><?php if ($older): ?><a href="<?= e($older) ?>" rel="next">Older &rarr;</a><?php endif; ?></span>
</nav>
<?php endif; ?>
