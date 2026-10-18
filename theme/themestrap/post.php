<?php defined('TS_ROOT') or exit; // Variables: $post, $prev, $next, $live
require_once __DIR__ . '/functions.php';
$isPost = $post['type'] === 'post';
tsx_head($post['title'], $isPost ? [['Home', ts_url()], ['Blog', ts_url()], [$post['title'], null]] : [['Home', ts_url()], [$post['title'], null]], $isPost);
[$day, $mon] = tsx_badge($post['date']);
?>
<?php if (ts_cfg('reading_progress')): ?>
<div class="progress-reading" role="progressbar" aria-label="Reading progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" data-reading-target=".prose"><div class="progress-bar"></div></div>
<?php endif; ?>
<div class="blog-posts">
  <article class="post post-large<?= $isPost ? '' : ' post-page' ?> format-<?= e($post['format'] ?? 'standard') ?>">
    <?php if (!$live): ?><p class="tsx-notice">Preview: this <?= $post['status'] === 'draft' ? 'draft is' : 'post is scheduled and' ?> only visible to you. <a href="<?= e(ts_url('admin/edit/' . $post['slug'])) ?>">Edit</a></p><?php endif; ?>
    <?= tsx_media($post) ?>
<?php if ($isPost): ?>
    <div class="post-date"><span class="day"><?= e($day) ?></span><span class="month"><?= e($mon) ?></span></div>
<?php endif; ?>
    <div class="post-content">
      <div class="prose"><?= $post['html'] ?></div>
<?php if ($isPost): ?>
      <?= tsx_meta($post) ?>
<?php if (!empty($GLOBALS['ts_admin']) && $live): ?><p class="tsx-edit"><a href="<?= e(ts_url('admin/edit/' . $post['slug'])) ?>">Edit this post</a></p><?php endif; ?>
<?php endif; ?>
    </div>
  </article>
<?php if ($prev || $next): ?>
  <nav class="tsx-postnav" aria-label="More posts">
    <span><?php if ($prev): ?><small>Older</small><a href="<?= e(ts_url($prev['slug'])) ?>" rel="prev"><?= e($prev['title']) ?></a><?php endif; ?></span>
    <span class="r"><?php if ($next): ?><small>Newer</small><a href="<?= e(ts_url($next['slug'])) ?>" rel="next"><?= e($next['title']) ?></a><?php endif; ?></span>
  </nav>
<?php endif; ?>
</div>
<?php if (ts_cfg('reading_progress')): ?><script src="<?= e(ts_asset('reading.js')) ?>" defer></script><?php endif; ?>
<?php if (ts_cfg('scroll_shadow')): ?>
<script src="<?= e(ts_asset('vendor/jquery.min.js')) ?>" defer></script>
<script src="<?= e(ts_asset('vendor/themestrap.plugin.scrollshadow.js')) ?>" defer></script>
<script src="<?= e(ts_asset('post.js')) ?>" defer></script>
<?php endif; ?>
