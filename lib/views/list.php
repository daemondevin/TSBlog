<?php defined('TS_ROOT') or exit(); // Variables: $posts, optional $notice, $welcome ?>
<main class="list">
  <?php if (!empty($welcome)): ?>
  <div class="welcome" role="status">
    <strong>You are all set.</strong> Your blog is live at <a href="<?= e(ts_url()) ?>" target="_blank" rel="noopener"><?= e(preg_replace('#^https?://#', '', ts_abs())) ?></a>.
    Write your first post with the button below. Two sample items are included. Delete them whenever you like.
  </div>
  <?php endif; ?>
  <?php $up = ts_update_status(); ?>
  <div id="update-banner" class="welcome" role="status" data-endpoint="<?= e(ts_url('admin/update')) ?>" data-csrf="<?= e($csrf) ?>" data-settings="<?= e(ts_url('admin/settings')) ?>"
       data-auto="<?= ts_cfg('update_check') && $up['configured'] && $up['stale'] ? '1' : '0' ?>"<?= $up['available'] ? '' : ' hidden' ?>>
    <strong>Version <span id="update-version"><?= e($up['latest']) ?></span> is available.</strong>
    <a href="<?= e(ts_url('admin/settings')) ?>#updates">See what’s new and update</a>
  </div>
  <div class="list-head">
    <h1>Posts</h1>
    <a class="btn primary" href="<?= e(ts_url('admin/new')) ?>"><i class="fas fa-plus"></i> New post</a>
  </div>
  <?php if (!empty($notice)): ?><p class="alert"><?= e($notice) ?></p><?php endif; ?>
  <?php if ($posts): ?>
  <input class="filter" type="search" id="filter" placeholder="Filter posts" aria-label="Filter posts" autocomplete="off">
  <ul class="rows" id="rows">
    <?php foreach ($posts as $p):
        $future = $p['status'] === 'published' && strtotime($p['date']) > time();
        $state = $p['status'] === 'draft' ? ['draft', 'Draft'] : ($future ? ['sched', 'Scheduled'] : ['live', 'Published']); ?>
    <li data-text="<?= e(mb_strtolower($p['title'] . ' ' . implode(' ', $p['tags']))) ?>">
      <a class="row-main" href="<?= e(ts_url('admin/edit/' . $p['slug'])) ?>">
        <strong><?= e($p['title']) ?></strong>
        <span class="muted"><?= e(ts_date($p['date'], 'M j, Y')) ?> · <?= (int) $p['words'] ?> words<?= $p['tags'] ? ' · ' . e(implode(', ', $p['tags'])) : '' ?></span>
      </a>
      <?php if ($p['type'] === 'page'): ?><span class="pill">Page</span><?php endif; ?>
      <span class="pill <?= $state[0] ?>"><?= $state[1] ?></span>
      <a class="icon-btn" href="<?= e(ts_url($p['slug'])) ?>" target="_blank" rel="noopener" title="View" aria-label="View <?= e($p['title']) ?>"><i class="fas fa-eye"></i></a>
    </li>
    <?php endforeach; ?>
  </ul>
  <?php else: ?>
  <div class="empty-state"><p>No posts yet.</p><a class="btn primary" href="<?= e(ts_url('admin/new')) ?>">Write your first post</a></div>
  <?php endif; ?>
</main>
<script src="<?= e(ts_file_v('assets/admin/list.js')) ?>"></script>
<script src="<?= e(ts_file_v('assets/admin/update.js')) ?>"></script>
