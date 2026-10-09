<?php
// Themestrap Blog. Every request that is not a real file lands here.
// This file is kept simple on purpose so even an old PHP can show a helpful message.

if (version_compare(PHP_VERSION, '8.1.0', '<')) {
    header('Content-Type: text/html; charset=utf-8');
    http_response_code(500);
    echo '<!doctype html><meta charset="utf-8"><title>PHP is too old</title>'
        . '<body style="font:16px/1.6 system-ui,sans-serif;max-width:36rem;margin:4rem auto;padding:0 1rem">'
        . '<h1>One quick change is needed</h1><p>This blog needs PHP 8.1 or newer, and this server is running PHP ' . PHP_VERSION . '.</p>'
        . '<p>Almost every host has a setting for this. Look for <strong>“PHP version”</strong> or <strong>“Select PHP version”</strong> '
        . 'in your hosting control panel, choose 8.1 or higher, then reload this page.</p>';
    exit;
}

define('TS_ROOT', __DIR__);

// php -S dev server: let it serve real files (images, css, js) itself
if (PHP_SAPI === 'cli-server') {
    $ts_file = __DIR__ . rawurldecode((string) parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH));
    if (is_file($ts_file) && !preg_match('/\.php$/i', $ts_file) && !preg_match('#/(data|content|tools|lib)/#', $ts_file)) {
        return false;
    }
}

require __DIR__ . '/lib/front.php';
