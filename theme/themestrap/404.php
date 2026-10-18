<?php defined('TS_ROOT') or exit;
require_once __DIR__ . '/functions.php';
tsx_head('Page not found', [['Home', ts_url()], ['Not found', null]]);
?>
<p class="tsx-empty">That address does not exist. <a href="<?= e(ts_url()) ?>">Back to the home page</a> or try the search.</p>
