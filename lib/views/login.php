<?php defined('TS_ROOT') or exit(); // Variables: $mode (login|setup), $error, $csrf, $fails, optional $title, $author ?>
<main class="auth">
  <?php $setup = $mode === 'setup'; ?>
  <form class="card" id="auth-form" method="post" autocomplete="on"
        action="<?= e(ts_url('admin/' . ($setup ? 'setup' : 'login'))) ?>"
        data-plugin-auth data-auth-action="<?= $setup ? 'register' : 'login' ?>"
        <?php if ($setup): ?>data-probe="<?= e(json_encode(['pretty' => ts_cfg('base') . '/ts-probe', 'exposed' => ts_file('content/ts-probe.txt')], JSON_UNESCAPED_SLASHES)) ?>"<?php endif; ?>>
    <h1><?= $setup ? 'Welcome! Let’s set up your blog.' : 'Sign in' ?></h1>
    <p class="muted"><?= $setup ? 'Three quick questions. You can change everything later in Settings.' : e(ts_cfg('title')) . ' admin' ?></p>

    <?php if ($setup && !empty($fails)): ?>
      <div class="alert" role="alert">
        <strong>One thing needs fixing first.</strong>
        <?php foreach ($fails as $f): ?><p><?= e($f['label']) ?>: <?= e($f['detail']) ?></p><?php endforeach; ?>
        <p><a href="">Check again</a></p>
      </div>
    <?php endif; ?>

    <div data-auth-message class="auth-message<?= $error ? ' auth-message--error' : '' ?>"<?= $error ? ' role="alert"' : '' ?>><?= e($error) ?></div>
    <input type="hidden" name="_csrf" value="<?= e($csrf) ?>">

    <?php if ($setup): ?>
    <div data-auth-field="title">
      <label for="f-name">What is your blog called?</label>
      <input id="f-name" type="text" name="title" required autofocus maxlength="80" data-auth-error value="<?= e($title ?? '') ?>" placeholder="My Blog">
      <div data-auth-feedback></div>
    </div>
    <div data-auth-field="author">
      <label for="f-author">Your name <span class="muted">(shown on posts, optional)</span></label>
      <input id="f-author" type="text" name="author" maxlength="80" autocomplete="name" value="<?= e($author ?? '') ?>">
    </div>
    <div data-auth-field="password">
      <label for="f-pw">Choose a password</label>
      <div class="pw-row">
        <input id="f-pw" type="password" name="password" required minlength="8" autocomplete="new-password" data-auth-strength data-auth-error>
        <button type="button" class="btn" data-auth-toggle-password>Show</button>
      </div>
      <div data-auth-strength-meter></div>
      <span data-auth-capslock class="d-none">Caps Lock is on</span>
      <small class="muted">At least 8 characters. There is no username.</small>
      <div data-auth-feedback></div>
    </div>
    <div data-auth-field="confirm">
      <label for="f-pw2">Type it again</label>
      <input id="f-pw2" type="password" name="confirm" required minlength="8" autocomplete="new-password" data-auth-match="#f-pw" data-auth-error>
      <div data-auth-feedback></div>
    </div>
    <?php else: ?>
    <div data-auth-field="password">
      <label for="f-pw">Password</label>
      <div class="pw-row">
        <input id="f-pw" type="password" name="password" required autofocus autocomplete="current-password" data-auth-error>
        <button type="button" class="btn" data-auth-toggle-password>Show</button>
      </div>
      <span data-auth-capslock class="d-none">Caps Lock is on</span>
      <div data-auth-feedback></div>
    </div>
    <?php endif; ?>

    <button class="btn primary" type="submit" data-auth-submit>
      <span data-auth-submit-label><?= $setup ? 'Create my blog' : 'Sign in' ?></span>
      <span data-auth-spinner class="spinner-border d-none" role="status" aria-hidden="true"></span>
    </button>
  </form>
</main>
<script src="<?= e(ts_file('assets/admin/jquery.min.js')) ?>"></script>
<script src="<?= e(ts_file('assets/admin/themestrap/namespace.js')) ?>"></script>
<script src="<?= e(ts_file('assets/admin/themestrap/themestrap.plugin.auth.js')) ?>"></script>
<script src="<?= e(ts_file('assets/admin/probe.js')) ?>"></script>
<script src="<?= e(ts_file('assets/admin/auth-init.js')) ?>"></script>
