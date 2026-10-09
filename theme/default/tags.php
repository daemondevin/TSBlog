<?php defined('TS_ROOT') or exit; // Variables: $tags ?>
<h1 class="list-title">Tags</h1>
<?php if (!$tags): ?><p class="empty">No tags yet.</p><?php endif; ?>
<p class="tags cloud"><?php foreach ($tags as $t): ?><a href="<?= e(ts_url('tag/' . mb_strtolower($t['name']))) ?>"><?= e($t['name']) ?> <small><?= (int) $t['count'] ?></small></a><?php endforeach; ?></p>
