<?php
defined('TS_ROOT') or exit;
// Self updater.
//
// Flow: read a small manifest (latest.json) over HTTPS, download the zip it names, and only then install it:
//   1. the zip's SHA-256 must match the manifest
//   2. an Ed25519 signature over "tsblog|version|sha256" must verify against the key that is already installed
//   3. every entry must be a plain file inside an allowed folder, with a hash that matches release.json
//   4. every PHP file must parse
// Files that will change are copied to data/backups first. Any failure while writing rolls everything back.
// content/, uploads/, data/, config.php and custom themes are never touched.

const TS_UPDATE_TTL       = 43200;      // seconds between automatic checks
const TS_UPDATE_MAX_ZIP   = 52428800;   // 50 MB
const TS_UPDATE_MAX_FILE  = 20971520;   // 20 MB
const TS_UPDATE_MAX_FILES = 3000;

// Uses PHP's sodium extension when it exists, otherwise the bundled pure PHP implementation (a little slower)
function ts_update_sodium(): bool
{
    static $ok = null;
    if ($ok !== null) return $ok;
    if (!function_exists('sodium_crypto_sign_verify_detached')) {
        $f = TS_ROOT . '/lib/vendor/sodium_compat/autoload.php';
        if (is_file($f)) {
            try { require_once $f; } catch (Throwable $e) { ts_log('Could not load the signature fallback: ' . $e->getMessage()); }
        }
    }
    return $ok = function_exists('sodium_crypto_sign_verify_detached') && defined('SODIUM_CRYPTO_SIGN_PUBLICKEYBYTES');
}

// People paste all sorts of things here, so the address is made tolerant:
//   https://github.com/OWNER/REPO                       the repository page (its newest release is used)
//   https://example.com/updates                         a folder (latest.json inside it is used)
//   https://example.com/updates/latest.json             the manifest itself
function ts_update_normalize_url(string $u): string
{
    $u = trim($u);
    if ($u === '') return '';
    if (preg_match('#^https://(?:www\.)?github\.com/([A-Za-z0-9_.-]+)/([A-Za-z0-9_.-]+?)(?:\.git)?(?:/releases(?:/latest)?)?/?$#', $u, $m)) {
        return "https://github.com/{$m[1]}/{$m[2]}/releases/latest/download/latest.json";
    }
    $p = parse_url($u);
    if ($p && !preg_match('/\.json$/i', (string) ($p['path'] ?? ''))) {
        $u = rtrim((string) preg_replace('/[?#].*$/', '', $u), '/') . '/latest.json';
    }
    return $u;
}

function ts_update_url(): string
{
    return ts_update_normalize_url(trim((string) ts_cfg('update_url', '')) ?: TS_UPDATE_URL);
}

function ts_update_key(): string
{
    return trim((string) ts_cfg('update_public_key', '')) ?: TS_UPDATE_KEY;
}

function ts_update_url_ok(string $u): bool
{
    $p = parse_url($u);
    if (!$p || empty($p['host']) || empty($p['scheme'])) return false;
    if ($p['scheme'] === 'https') return true;
    // Plain http is only for testing against this computer, and only when config.php says so
    return $p['scheme'] === 'http' && ts_cfg('update_allow_insecure') && in_array($p['host'], ['127.0.0.1', 'localhost', '::1', '[::1]'], true);
}

// Paths an update may create, replace or delete. Everything else belongs to the site owner.
function ts_update_allowed(string $rel): bool
{
    if ($rel === '' || $rel[0] === '/' || strpos($rel, "\0") !== false || strpos($rel, '\\') !== false) return false;
    if (preg_match('#(^|/)\.\.?(/|$)#', $rel)) return false;
    // Never accept anything that looks like a key or a secret, wherever it hides
    if (preg_match('#(\.(key|pem|pfx|p12)$)|((^|/)\.env)|((^|/)dist/)|(^|/)release\.key#i', $rel)) return false;
    if (in_array($rel, ['index.php', 'config.sample.php', 'README.md', 'release.json'], true)) return true;
    foreach (['lib/', 'assets/', 'tools/', 'docs/', 'theme/default/'] as $p) {
        if (strpos($rel, $p) === 0 && substr($rel, -1) !== '/') return true;
    }
    return false;
}

// Folders the update must be able to write to, listed when they are not
function ts_update_unwritable(): array
{
    $bad = [];
    foreach (['', 'lib', 'theme/default', 'assets/admin'] as $d) {
        $dir = TS_ROOT . ($d === '' ? '' : '/' . $d);
        $t = $dir . '/.write-test-' . bin2hex(random_bytes(2));
        if (!is_dir($dir) || @file_put_contents($t, 'x') === false) $bad[] = $d === '' ? 'the blog folder itself' : $d; else @unlink($t);
    }
    return $bad;
}

// Why this copy cannot install updates by itself, in plain words (empty list means it can)
function ts_update_problems(): array
{
    $p = [];
    if (ts_update_url() === '') $p[] = 'This copy has no update address. Add one under Settings → Advanced.';
    elseif (!ts_update_url_ok(ts_update_url())) $p[] = 'The update address must start with https://.';
    if (ts_update_key() === '') $p[] = 'This copy has no update signing key, so it cannot check that an update is genuine.';
    if (!ts_update_sodium()) $p[] = 'The blog cannot check update signatures here: this server has no “sodium” PHP extension and the bundled replacement (lib/vendor/sodium_compat) is missing. Upload the lib folder again.';
    if (!class_exists('ZipArchive')) $p[] = 'This server lacks the “zip” PHP extension used to unpack updates.';
    if (!function_exists('curl_init') && !ini_get('allow_url_fopen')) $p[] = 'This server cannot download files (neither cURL nor allow_url_fopen is available).';
    if ($bad = ts_update_unwritable()) $p[] = 'The blog cannot write to: ' . implode(', ', $bad) . '. Set those folders’ permissions to 755 (or 775/777) to allow updates.';
    return $p;
}

function ts_update_http_error(int $code, string $curlError): string
{
    if ($code === 0 && $curlError !== '') return 'Could not reach the update server: ' . $curlError . '. If this mentions a certificate, your host may need its CA certificates updated.';
    if ($code === 404) return 'Nothing was found at the update address (404). Check the address, and that the release is published (not a draft) and includes latest.json.';
    if ($code === 403 || $code === 429) return "The update server refused the request ($code). It may be rate limiting; try again in a few minutes.";
    if ($code >= 500) return "The update server had a problem ($code). Try again later.";
    return $curlError !== '' ? 'Could not reach the update server: ' . $curlError : "The update server answered with an error ($code).";
}

function ts_update_fetch(string $url, int $max, ?string $toFile = null): string
{
    if (!ts_update_url_ok($url)) throw new RuntimeException('Updates are only downloaded over a secure (https) connection.');
    $ua = 'ThemestrapBlog/' . TS_VERSION;
    $insecure = strpos($url, 'http://') === 0;

    if (function_exists('curl_init')) {
        $fh = $toFile ? fopen($toFile, 'wb') : null;
        $buf = ''; $got = 0;
        $protocols = $insecure ? (CURLPROTO_HTTPS | CURLPROTO_HTTP) : CURLPROTO_HTTPS;
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_FOLLOWLOCATION => true, CURLOPT_MAXREDIRS => 5, CURLOPT_CONNECTTIMEOUT => 10, CURLOPT_TIMEOUT => 120,
            CURLOPT_USERAGENT => $ua, CURLOPT_SSL_VERIFYPEER => true, CURLOPT_SSL_VERIFYHOST => 2,
            CURLOPT_PROTOCOLS => $protocols, CURLOPT_REDIR_PROTOCOLS => $protocols,
            CURLOPT_WRITEFUNCTION => function ($c, $d) use (&$buf, &$got, $fh, $max) {
                $got += strlen($d);
                if ($got > $max) return 0;
                if ($fh) fwrite($fh, $d); else $buf .= $d;
                return strlen($d);
            },
        ]);
        curl_exec($ch);
        $code = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
        $err = curl_error($ch);
        curl_close($ch);
        if ($fh) fclose($fh);
        if ($got > $max) throw new RuntimeException('The update file is larger than expected, so it was not used.');
        if ($code !== 200) throw new RuntimeException(ts_update_http_error($code, $err));
        return $buf;
    }

    $ctx = stream_context_create(['http' => ['timeout' => 120, 'follow_location' => 1, 'max_redirects' => 5, 'ignore_errors' => true, 'header' => "User-Agent: $ua\r\n"],
        'ssl' => ['verify_peer' => true, 'verify_peer_name' => true]]);
    $in = @fopen($url, 'rb', false, $ctx);
    if (!$in) throw new RuntimeException('Could not reach the update server.');
    $status = 0;
    foreach ($http_response_header ?? [] as $h) if (preg_match('#^HTTP/\S+ (\d+)#', $h, $m)) $status = (int) $m[1];
    if ($status !== 200) { fclose($in); throw new RuntimeException(ts_update_http_error($status, '')); }
    $out = $toFile ? fopen($toFile, 'wb') : null; $buf = ''; $got = 0;
    while (!feof($in)) {
        $d = fread($in, 65536);
        if ($d === false) break;
        $got += strlen($d);
        if ($got > $max) { fclose($in); if ($out) fclose($out); throw new RuntimeException('The update file is larger than expected, so it was not used.'); }
        if ($out) fwrite($out, $d); else $buf .= $d;
    }
    fclose($in);
    if ($out) fclose($out);
    return $buf;
}

function ts_update_manifest_check($m)
{
    if (!is_array($m)) return 'The update information could not be read.';
    foreach (['version', 'zip', 'sha256', 'signature'] as $k) if (empty($m[$k]) || !is_string($m[$k])) return "The update information is missing “{$k}”.";
    if (!preg_match('/^\d+\.\d+\.\d+(-[0-9A-Za-z.]+)?$/', $m['version'])) return 'The update has an unusual version number.';
    if (!preg_match('/^[a-f0-9]{64}$/', $m['sha256'])) return 'The update checksum is not valid.';
    if (!ts_update_url_ok($m['zip'])) return 'The update download address must be https://.';
    if (parse_url($m['zip'], PHP_URL_HOST) !== parse_url(ts_update_url(), PHP_URL_HOST)) return 'The update must be hosted on the same site as its update address.';
    return null;
}

// Cached status, no network. Used on every admin page.
function ts_update_status(): array
{
    $u = ts_data_read('state')['update'] ?? [];
    // What was learned about a different address does not apply to this one
    if (($u['url'] ?? '') !== ts_update_url()) $u = [];
    $m = $u['manifest'] ?? null;
    return [
        'configured' => ts_update_url() !== '', 'url' => ts_update_url(), 'current' => TS_VERSION,
        'latest' => $m['version'] ?? '', 'available' => $m && version_compare($m['version'], TS_VERSION, '>'),
        'notes' => (string) ($m['notes'] ?? ''), 'released' => (string) ($m['released'] ?? ''),
        'checked_at' => (int) ($u['checked_at'] ?? 0), 'error' => (string) ($u['error'] ?? ''),
        // A failed check is retried after ten minutes, a good one after twelve hours
        'stale' => !isset($u['checked_at']) || time() - (int) $u['checked_at'] > (($u['error'] ?? '') !== '' ? 600 : TS_UPDATE_TTL),
    ];
}

function ts_update_check(bool $force = false): array
{
    $st = ts_update_status();
    if (!$st['configured']) return $st;
    if (!$force && !$st['stale']) return $st;
    try {
        $raw = ts_update_fetch(ts_update_url(), 262144);
        $m = json_decode($raw, true);
        if (!is_array($m)) throw new RuntimeException('That address did not return update information. It should be the address of latest.json, or of the GitHub repository that publishes it.');
        if ($err = ts_update_manifest_check($m)) throw new RuntimeException($err);
        $clean = array_intersect_key($m, array_flip(['version', 'zip', 'sha256', 'signature', 'size', 'min_php', 'notes', 'released']));
        $clean['notes'] = mb_substr((string) ($clean['notes'] ?? ''), 0, 4000);
        ts_state_set(['update' => ['checked_at' => time(), 'manifest' => $clean, 'error' => '', 'url' => ts_update_url()]]);
    } catch (Throwable $e) {
        $prev = ts_data_read('state')['update'] ?? [];
        $same = ($prev['url'] ?? '') === ts_update_url();
        ts_state_set(['update' => ['checked_at' => time(), 'manifest' => $same ? ($prev['manifest'] ?? null) : null, 'error' => $e->getMessage(), 'url' => ts_update_url()]]);
    }
    return ts_update_status();
}

// Locking, so two updates cannot run together and visitors see a short pause instead of half a site
function ts_update_lock_file(): string { return ts_cfg('paths')['data'] . '/updating.lock'; }

function ts_update_locked(): bool
{
    $f = ts_update_lock_file();
    return is_file($f) && time() - (int) @filemtime($f) < 300;
}

function ts_update_lock(): bool
{
    $f = ts_update_lock_file();
    if (is_file($f) && time() - (int) @filemtime($f) >= 300) @unlink($f);
    $h = @fopen($f, 'x');
    if (!$h) return false;
    fwrite($h, (string) time());
    fclose($h);
    return true;
}

function ts_update_unlock(): void { @unlink(ts_update_lock_file()); }

function ts_update_backup_root(): string { return ts_cfg('paths')['data'] . '/backups'; }

function ts_update_write(string $abs, string $data): void
{
    $dir = dirname($abs);
    if (!is_dir($dir) && !@mkdir($dir, 0755, true)) throw new RuntimeException('Could not create the folder ' . substr($dir, strlen(TS_ROOT) + 1) . '.');
    $tmp = $abs . '.tsnew';
    if (@file_put_contents($tmp, $data, LOCK_EX) === false) throw new RuntimeException('Could not write ' . substr($abs, strlen(TS_ROOT) + 1) . '.');
    if (!@rename($tmp, $abs)) { @unlink($tmp); throw new RuntimeException('Could not replace ' . substr($abs, strlen(TS_ROOT) + 1) . '.'); }
}

function ts_update_rmtree(string $dir): void
{
    foreach (scandir($dir) ?: [] as $n) {
        if ($n === '.' || $n === '..') continue;
        $p = $dir . '/' . $n;
        is_dir($p) ? ts_update_rmtree($p) : @unlink($p);
    }
    @rmdir($dir);
}

function ts_update_prune(int $keep = 2): void
{
    $dirs = glob(ts_update_backup_root() . '/*', GLOB_ONLYDIR) ?: [];
    rsort($dirs);
    foreach (array_slice($dirs, $keep) as $d) ts_update_rmtree($d);
}

function ts_update_installed_files(): ?array
{
    $f = TS_ROOT . '/release.json';
    $j = is_file($f) ? json_decode((string) file_get_contents($f), true) : null;
    return is_array($j) && isset($j['files']) && is_array($j['files']) ? $j['files'] : null;
}

// Puts the files saved in a backup back, and removes files the update added
function ts_update_rollback(string $dir): void
{
    $meta = json_decode((string) @file_get_contents($dir . '/meta.json'), true) ?: [];
    foreach ($meta['saved'] ?? [] as $rel) {
        if (ts_update_allowed($rel) && is_file($dir . '/files/' . $rel)) ts_update_write(TS_ROOT . '/' . $rel, (string) file_get_contents($dir . '/files/' . $rel));
    }
    foreach ($meta['added'] ?? [] as $rel) {
        if (ts_update_allowed($rel) && is_file(TS_ROOT . '/' . $rel)) @unlink(TS_ROOT . '/' . $rel);
    }
}

function ts_update_finish(): void
{
    if (function_exists('opcache_reset')) @opcache_reset();
    @unlink(ts_cfg('paths')['data'] . '/index.cache.php');
}

function ts_update_install(): array
{
    @set_time_limit(300);
    @ignore_user_abort(true);
    if ($p = ts_update_problems()) return ['ok' => false, 'message' => $p[0]];

    $st = ts_update_check(true);
    if ($st['error']) return ['ok' => false, 'message' => $st['error']];
    if (!$st['available']) return ['ok' => false, 'message' => 'You already have the latest version (' . TS_VERSION . ').'];
    $m = ts_data_read('state')['update']['manifest'];
    if (!empty($m['min_php']) && version_compare(PHP_VERSION, $m['min_php'], '<')) return ['ok' => false, 'message' => "Version {$m['version']} needs PHP {$m['min_php']} or newer, and this server runs PHP " . PHP_VERSION . '.'];

    if (!ts_update_lock()) return ['ok' => false, 'message' => 'Another update is already running. Please wait a minute and try again.'];
    $tmpZip = ts_cfg('paths')['data'] . '/update-' . bin2hex(random_bytes(4)) . '.zip';
    $backup = null;
    try {
        // 1 download and authenticate
        $max = min(TS_UPDATE_MAX_ZIP, max(1024, (int) ($m['size'] ?? TS_UPDATE_MAX_ZIP)) + 4096);
        ts_update_fetch($m['zip'], $max, $tmpZip);
        if (!is_file($tmpZip) || hash_file('sha256', $tmpZip) !== $m['sha256']) throw new RuntimeException('The downloaded update does not match its checksum, so it was not installed. Nothing was changed.');
        $key = base64_decode(ts_update_key(), true);
        $sig = base64_decode($m['signature'], true);
        if (!$key || strlen($key) !== SODIUM_CRYPTO_SIGN_PUBLICKEYBYTES || !$sig || !sodium_crypto_sign_verify_detached($sig, 'tsblog|' . $m['version'] . '|' . $m['sha256'], $key)) {
            throw new RuntimeException('The update’s signature is not valid, so it was not installed. Nothing was changed.');
        }

        // 2 read and validate every entry before touching anything
        $zip = new ZipArchive();
        if ($zip->open($tmpZip) !== true) throw new RuntimeException('The update file could not be opened.');
        if ($zip->numFiles < 1 || $zip->numFiles > TS_UPDATE_MAX_FILES) throw new RuntimeException('The update contains an unexpected number of files.');
        $files = []; $total = 0; $release = null;
        for ($i = 0; $i < $zip->numFiles; $i++) {
            $s = $zip->statIndex($i);
            $name = (string) $s['name'];
            if (substr($name, -1) === '/') continue;
            if (strpos($name, 'tsblog/') !== 0) throw new RuntimeException('The update has an unexpected layout.');
            $rel = substr($name, 7);
            if (!ts_update_allowed($rel)) throw new RuntimeException("The update tried to change “{$rel}”, which updates are never allowed to touch. Nothing was changed.");
            $opsys = 0; $attr = 0;
            if ($zip->getExternalAttributesIndex($i, $opsys, $attr) && $opsys === ZipArchive::OPSYS_UNIX && (($attr >> 16) & 0170000) === 0120000) throw new RuntimeException("The update contains a link (“{$rel}”), which is not allowed.");
            if ($s['size'] > TS_UPDATE_MAX_FILE) throw new RuntimeException("“{$rel}” is unexpectedly large.");
            $total += $s['size'];
            if ($total > TS_UPDATE_MAX_ZIP * 2) throw new RuntimeException('The update unpacks to an unexpected size.');
            $data = $zip->getFromIndex($i);
            if ($data === false) throw new RuntimeException("Could not read “{$rel}” from the update.");
            $files[$rel] = $data;
        }
        $zip->close();
        if (!isset($files['release.json'])) throw new RuntimeException('The update has no file list.');
        $release = json_decode($files['release.json'], true);
        if (!is_array($release) || ($release['version'] ?? '') !== $m['version'] || !isset($release['files']) || !is_array($release['files'])) throw new RuntimeException('The update’s file list does not match its version.');
        foreach ($files as $rel => $data) {
            if ($rel === 'release.json') continue;
            if (!isset($release['files'][$rel]) || !hash_equals($release['files'][$rel], hash('sha256', $data))) throw new RuntimeException("“{$rel}” does not match the update’s file list.");
        }
        foreach ($release['files'] as $rel => $h) if (!isset($files[$rel])) throw new RuntimeException("“{$rel}” is listed but missing from the update.");
        foreach ($files as $rel => $data) {
            if (substr($rel, -4) !== '.php') continue;
            try { token_get_all($data, TOKEN_PARSE); }
            catch (ParseError $e) { throw new RuntimeException("“{$rel}” has a programming error (line {$e->getLine()}), so the update was not installed. Nothing was changed."); }
        }

        // 3 plan, then back up what will change
        $old = ts_update_installed_files();
        $replace = []; $add = []; $remove = [];
        foreach ($files as $rel => $data) {
            $abs = TS_ROOT . '/' . $rel;
            if (!is_file($abs)) $add[] = $rel;
            elseif (!hash_equals(hash_file('sha256', $abs), hash('sha256', $data))) $replace[] = $rel;
        }
        foreach ($old ? array_keys($old) : [] as $rel) {
            if (!isset($files[$rel]) && ts_update_allowed($rel) && is_file(TS_ROOT . '/' . $rel)) $remove[] = $rel;
        }
        $id = date('YmdHis') . '-' . TS_VERSION . '-to-' . $m['version'];
        $backup = ts_update_backup_root() . '/' . $id;
        $saved = array_merge($replace, $remove);
        foreach ($saved as $rel) {
            $dest = $backup . '/files/' . $rel;
            if (!is_dir(dirname($dest)) && !@mkdir(dirname($dest), 0755, true)) throw new RuntimeException('Could not make a backup first (the “data” folder is not writable), so nothing was changed.');
            if (!@copy(TS_ROOT . '/' . $rel, $dest)) throw new RuntimeException('Could not back up “' . $rel . '” first, so nothing was changed.');
        }
        if (!is_dir($backup)) @mkdir($backup, 0755, true);
        file_put_contents($backup . '/meta.json', json_encode(['from' => TS_VERSION, 'to' => $m['version'], 'time' => time(), 'saved' => $saved, 'added' => $add]));

        // 4 apply; any failure puts everything back
        try {
            foreach (array_merge($add, $replace) as $rel) ts_update_write(TS_ROOT . '/' . $rel, $files[$rel]);
            foreach ($remove as $rel) @unlink(TS_ROOT . '/' . $rel);
            foreach ($files as $rel => $data) {
                if (!is_file(TS_ROOT . '/' . $rel) || !hash_equals(hash('sha256', $data), hash_file('sha256', TS_ROOT . '/' . $rel))) throw new RuntimeException("“{$rel}” could not be written correctly.");
            }
        } catch (Throwable $e) {
            try { ts_update_rollback($backup); } catch (Throwable $e2) { ts_log('Rollback problem: ' . $e2->getMessage()); }
            throw new RuntimeException($e->getMessage() . ' The previous version was put back.');
        }

        ts_update_finish();
        ts_state_set(['update' => ['checked_at' => time(), 'manifest' => null, 'error' => '', 'url' => ts_update_url()]]);
        ts_update_prune(2);
        ts_log("Updated from " . TS_VERSION . " to {$m['version']}");
        return ['ok' => true, 'message' => "Updated to version {$m['version']}.", 'from' => TS_VERSION, 'to' => $m['version'], 'changed' => count($add) + count($replace) + count($remove)];
    } catch (Throwable $e) {
        ts_log('Update failed: ' . $e->getMessage());
        return ['ok' => false, 'message' => $e->getMessage()];
    } finally {
        @unlink($tmpZip);
        ts_update_unlock();
    }
}

function ts_update_backups(): array
{
    $out = [];
    foreach (glob(ts_update_backup_root() . '/*', GLOB_ONLYDIR) ?: [] as $d) {
        $m = json_decode((string) @file_get_contents($d . '/meta.json'), true);
        if (is_array($m)) $out[] = $m + ['dir' => $d];
    }
    usort($out, fn($a, $b) => $b['time'] <=> $a['time']);
    return $out;
}

function ts_update_restore(): array
{
    @set_time_limit(120);
    $list = ts_update_backups();
    if (!$list) return ['ok' => false, 'message' => 'There is no earlier version to go back to.'];
    if ($bad = ts_update_unwritable()) return ['ok' => false, 'message' => 'The blog cannot write to: ' . implode(', ', $bad) . '.'];
    if (!ts_update_lock()) return ['ok' => false, 'message' => 'An update is running. Please wait a minute and try again.'];
    try {
        $b = $list[0];
        ts_update_rollback($b['dir']);
        ts_update_rmtree($b['dir']);
        ts_update_finish();
        ts_state_set(['update' => ['checked_at' => 0, 'manifest' => null, 'error' => '']]);
        ts_log('Went back to version ' . $b['from']);
        return ['ok' => true, 'message' => 'Went back to version ' . $b['from'] . '.', 'to' => $b['from']];
    } catch (Throwable $e) {
        ts_log('Restore failed: ' . $e->getMessage());
        return ['ok' => false, 'message' => $e->getMessage()];
    } finally {
        ts_update_unlock();
    }
}
