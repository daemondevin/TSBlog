<?php
// Copies every post between stores. Run from the command line in the blog folder:
//   php tools/migrate.php files sqlite
//   php tools/migrate.php sqlite files
// You normally do not need this: the Settings screen in the admin switches storage for you.

if (PHP_SAPI !== 'cli') { http_response_code(403); exit; }
define('TS_ROOT', dirname(__DIR__));
require TS_ROOT . '/lib/app.php';

[$self, $from, $to] = $argv + [null, null, null];
if (!in_array($from, ['files', 'sqlite'], true) || !in_array($to, ['files', 'sqlite'], true) || $from === $to) {
    fwrite(STDERR, "Usage: php tools/migrate.php files|sqlite files|sqlite\n");
    exit(1);
}

$cfg = ts_boot(TS_ROOT);
$state = ts_data_read('state');
if (empty($state['sqlite_file'])) { $state['sqlite_file'] = 'blog-' . bin2hex(random_bytes(8)) . '.db'; ts_data_write('state', $state); }
$cfg['sqlite_file'] = $state['sqlite_file'];

$src = TSStore::open(array_merge($cfg, ['store' => $from]));
$dst = TSStore::open(array_merge($cfg, ['store' => $to]));
$n = 0;
foreach ($src->all() as $row) {
    if ($post = $src->get($row['slug'])) { $dst->save($post); $n++; }
}
echo "Copied $n post(s) from $from to $to.\nNow choose “$to” under Settings → Advanced.\n";
