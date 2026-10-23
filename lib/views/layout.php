<?php defined('TS_ROOT') or exit(); // Variables: $content, $title, $bare ?>
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title><?= e($title) ?> · <?= e(ts_cfg('title')) ?></title>
<script src="<?= e(ts_file_v('assets/admin/admin-theme.js')) ?>"></script>
<link rel="stylesheet" href="<?= e(ts_file_v('assets/admin/fa/fa.css')) ?>">
<link rel="stylesheet" href="<?= e(ts_file_v('assets/admin/admin.css')) ?>">
</head>
<body class="<?= $bare ? 'bare' : 'chrome' ?>">
<?php if (!$bare): ?>
<header class="topbar">
  <a class="brand" href="<?= e(ts_url('admin')) ?>"><?= e(ts_cfg('title')) ?> <span>admin</span></a>
  <nav>
    <a href="<?= e(ts_url()) ?>" target="_blank" rel="noopener">View site <i class="fas fa-arrow-up-right-from-square"></i></a>
    <?php if (TSComments::enabled() || TSComments::pending()): $pc = TSComments::pending(); ?><a href="<?= e(ts_url('admin/comments')) ?>">Comments<?php if ($pc): ?> <span class="badge" id="pending-badge"><?= $pc ?></span><?php endif; ?></a><?php endif; ?>
    <a href="<?= e(ts_url('admin/settings')) ?>">Settings</a>
    <button type="button" class="icon-btn" data-theme-toggle aria-label="Toggle dark mode" title="Toggle dark mode"><i class="fas fa-circle-half-stroke"></i></button>
    <form method="post" action="<?= e(ts_url('admin/logout')) ?>"><input type="hidden" name="_csrf" value="<?= e(ts_csrf()) ?>"><button class="link-btn" type="submit">Sign out</button></form>
  </nav>
</header>
<?php endif; ?>
<?= $content ?>
</body>
</html>
