<?php defined('TS_ROOT') or exit(); // Variables: $items, $titles, $csrf
$filter = in_array($_GET['show'] ?? '', ['pending', 'approved', 'spam'], true) ? $_GET['show'] : 'all';
$count = ['all' => count($items), 'pending' => 0, 'approved' => 0, 'spam' => 0];
foreach ($items as $it) $count[$it['status']]++;
?>
<main class="list">
  <div class="list-head"><h1>Comments</h1></div>
  <?php if (!TSComments::enabled()): ?><p class="alert">Comments are turned off, so visitors cannot see or write any. Turn them on under <a href="<?= e(ts_url('admin/settings')) ?>">Settings</a>.</p><?php endif; ?>
  <nav class="tabs" aria-label="Filter comments">
    <?php foreach (['all' => 'All', 'pending' => 'Waiting', 'approved' => 'Approved', 'spam' => 'Spam'] as $k => $label): ?>
      <a href="<?= e(ts_url('admin/comments', $k === 'all' ? [] : ['show' => $k])) ?>"<?= $filter === $k ? ' class="on" aria-current="page"' : '' ?>><?= e($label) ?> <span class="muted"><?= $count[$k] ?></span></a>
    <?php endforeach; ?>
  </nav>
  <?php $shown = array_values(array_filter($items, fn($it) => $filter === 'all' || $it['status'] === $filter)); ?>
  <?php if ($shown): ?>
  <ul class="rows comments" id="comment-rows" data-endpoint="<?= e(ts_url('admin/comment')) ?>" data-csrf="<?= e($csrf) ?>">
    <?php foreach ($shown as $it): ?>
    <li class="crow" data-id="<?= (int) $it['id'] ?>" data-status="<?= e($it['status']) ?>">
      <div class="cmain">
        <div class="chead">
          <strong><?= e($it['name']) ?></strong>
          <?php if ($it['email'] !== ''): ?><a class="muted" href="mailto:<?= e($it['email']) ?>"><?= e($it['email']) ?></a><?php endif; ?>
          <span class="muted"><?= e(ts_date($it['date'], 'M j, Y H:i')) ?> on <a href="<?= e(ts_url($it['slug']) . '#comment-' . (int) $it['id']) ?>" target="_blank" rel="noopener"><?= e($titles[$it['slug']] ?? $it['slug']) ?></a></span>
          <span class="pill <?= $it['status'] === 'approved' ? 'live' : ($it['status'] === 'pending' ? 'sched' : 'draft') ?>"><?= $it['status'] === 'pending' ? 'Waiting' : ucfirst($it['status']) ?></span>
        </div>
        <div class="cbody"><?= e($it['body']) ?></div>
      </div>
      <div class="cact">
        <?php if ($it['status'] !== 'approved'): ?><button type="button" class="btn" data-do="approve">Approve</button><?php endif; ?>
        <?php if ($it['status'] !== 'spam'): ?><button type="button" class="btn" data-do="spam">Spam</button><?php endif; ?>
        <button type="button" class="btn warn" data-do="delete">Delete</button>
      </div>
    </li>
    <?php endforeach; ?>
  </ul>
  <?php else: ?>
  <div class="empty-state"><p>No comments here.</p></div>
  <?php endif; ?>
</main>
<div id="toast" class="toast" role="status" aria-live="polite" hidden></div>
<script src="<?= e(ts_file_v('assets/admin/jquery.min.js')) ?>"></script>
<script src="<?= e(ts_file_v('assets/admin/themestrap/namespace.js')) ?>"></script>
<script src="<?= e(ts_file_v('assets/admin/themestrap/themestrap.plugin.dialog.js')) ?>"></script>
<script src="<?= e(ts_file_v('assets/admin/prompts.js')) ?>"></script>
<script src="<?= e(ts_file_v('assets/admin/comments.js')) ?>"></script>
