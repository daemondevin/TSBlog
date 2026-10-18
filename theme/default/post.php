<?php defined('TS_ROOT') or exit; // Variables: $post, $prev, $next, $live ?>
<?php if (ts_cfg('reading_progress')): ?>
<div class="progress-reading" role="progressbar" aria-label="Reading progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" data-reading-target=".prose"><div class="progress-bar"></div></div>
<?php endif; ?>
<article class="post">
  <?php if (!$live): ?><p class="notice">Preview: this <?= $post['status'] === 'draft' ? 'draft is' : 'post is scheduled and' ?> only visible to you. <a href="<?= e(ts_url('admin/edit/' . $post['slug'])) ?>">Edit</a></p><?php endif; ?>
  <header>
    <?php if ($post['type'] === 'post'): ?>
    <div class="meta"><time datetime="<?= e(date('c', strtotime($post['date']))) ?>"><?= e(ts_date($post['date'])) ?></time> · <?= (int) $post['minutes'] ?> min read<?php if (!empty($GLOBALS['ts_admin']) && $live): ?> · <a href="<?= e(ts_url('admin/edit/' . $post['slug'])) ?>">Edit</a><?php endif; ?></div>
    <?php endif; ?>
    <h1><?= e($post['title']) ?></h1>
    <?php if ($m = ts_media($post)): ?><?= TSMedia::html($m) ?>
    <?php elseif ($post['image'] !== ''): ?><img class="cover" src="<?= e($post['image']) ?>" alt=""><?php endif; ?>
  </header>
  <div class="prose"><?= $post['html'] ?></div>
  <?php if ($post['tags']): ?><p class="tags"><?php foreach ($post['tags'] as $t): ?><a href="<?= e(ts_url('tag/' . mb_strtolower($t))) ?>"><?= e($t) ?></a><?php endforeach; ?></p><?php endif; ?>
</article>
<?php if ($prev || $next): ?>
<nav class="pager post-nav" aria-label="More posts">
  <span><?php if ($prev): ?><small>Older</small><a href="<?= e(ts_url($prev['slug'])) ?>" rel="prev">&larr; <?= e($prev['title']) ?></a><?php endif; ?></span>
  <span class="r"><?php if ($next): ?><small>Newer</small><a href="<?= e(ts_url($next['slug'])) ?>" rel="next"><?= e($next['title']) ?> &rarr;</a><?php endif; ?></span>
</nav>
<?php endif; ?>
<?php if (ts_cfg('reading_progress')): ?><script src="<?= e(ts_asset('reading.js')) ?>" defer></script><?php endif; ?>
<?php if (ts_cfg('scroll_shadow')): ?>
<script src="<?= e(ts_asset('vendor/jquery.min.js')) ?>" defer></script>
<script src="<?= e(ts_asset('vendor/themestrap.plugin.scrollshadow.js')) ?>" defer></script>
<script src="<?= e(ts_asset('post.js')) ?>" defer></script>
<?php endif; ?>
