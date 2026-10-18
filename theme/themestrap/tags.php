<?php defined('TS_ROOT') or exit; // Variables: $tags
require_once __DIR__ . '/functions.php';
tsx_head('Tags', [['Home', ts_url()], ['Tags', null]]);
?>
<?php if (!$tags): ?><p class="tsx-empty">No tags yet.</p><?php endif; ?>
<p class="tsx-badges tsx-cloud"><?php foreach ($tags as $t): ?><a class="badge" href="<?= e(tsx_tag_url($t['name'])) ?>"><?= e($t['name']) ?> <small><?= (int) $t['count'] ?></small></a><?php endforeach; ?></p>
