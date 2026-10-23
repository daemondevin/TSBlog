<?php
// Builds signed release packages for the blog's self updater. Command line only.
//
//   php tools/build-release.php --keygen [--key PATH]
//       Makes a signing key pair once. By default the secret key is written OUTSIDE the blog folder, to
//       ~/.tsblog/release.key (%USERPROFILE%\.tsblog\release.key on Windows). Keep it private and backed up.
//       The public key is printed and saved next to it as release.key.pub.
//       The tool refuses to use a key stored inside a folder that gets published.
//
//   php tools/build-release.php --show-key [--key PATH]
//       Prints the public key and its fingerprint (the same fingerprint the blog's Updates card shows).
//
//   php tools/build-release.php --version 1.0.1 --url https://example.com/blog-updates --key release.key
//   php tools/build-release.php --version 1.0.1 --github OWNER/REPO --key release.key     (for a GitHub release)
//
//   Changing keys: sign with the OLD key and bake in the NEW one, so blogs that trust the old key accept it:
//   php tools/build-release.php --version 1.1.0 --url … --key OLD.key --rotate-to NEW.key
//       [--notes "What changed"] [--notes-file CHANGES.txt] [--min-php 8.1.0] [--out dist]
//       Writes to dist/:
//         tsblog-1.0.1.zip          the update package (what the updater downloads)
//   --bridge  leaves theme/themestrap/ out of the UPDATE package (the fresh install still has it). Use it for the
//             first release after a blog's updater learns about a new folder: older updaters reject files in folders
//             they do not know. Publish the bridge first, then a normal release that includes the new folder.
//         tsblog-1.0.1-install.zip  a fresh install, with the address and key already built in
//         latest.json               the manifest. Upload all three files to --url
//
// Needs the zip PHP extension. The sodium extension is used when present; otherwise lib/vendor/sodium_compat is.

if (PHP_SAPI !== 'cli') { http_response_code(403); exit; }

$root = dirname(__DIR__);
$opt = getopt('', ['keygen', 'show-key', 'rotate-to:', 'allow-new-key', 'github:', 'version:', 'url:', 'key:', 'notes:', 'notes-file:', 'min-php:', 'out:', 'bridge']);
$fail = function (string $m) { fwrite(STDERR, "Error: $m\n"); exit(1); };

$home = getenv('USERPROFILE') ?: (getenv('HOME') ?: '');
$defaultKey = ($home !== '' ? $home . DIRECTORY_SEPARATOR . '.tsblog' . DIRECTORY_SEPARATOR : '') . 'release.key';

// Folders whose contents are published in every update. A secret must never be anywhere in these.
$published = ['lib', 'assets', 'tools', 'docs', 'theme/default', 'theme/themestrap'];
$keyGuard = function (string $keyPath) use ($root, $published, $fail, $defaultKey) {
    $dir = realpath(dirname($keyPath));
    if ($dir === false) return;
    $full = $dir . DIRECTORY_SEPARATOR . basename($keyPath);
    $rootReal = realpath($root);
    foreach ($published as $d) {
        $pub = realpath("$root/$d");
        if ($pub !== false && strpos($full . DIRECTORY_SEPARATOR, $pub . DIRECTORY_SEPARATOR) === 0) {
            $fail("The key file ($full) is inside $d/, which is published to every blog. Keep it outside the blog folder, for example at $defaultKey");
        }
    }
    if ($rootReal !== false && strpos($full, $rootReal . DIRECTORY_SEPARATOR) === 0) {
        fwrite(STDERR, "Warning: the key file is inside the blog folder. It is not published, but it could be committed to git. Prefer $defaultKey\n");
    }
};

// Without the sodium extension, the bundled pure PHP version is used (slower, same result)
if (!function_exists('sodium_crypto_sign_keypair')) {
    $fallback = $root . '/lib/vendor/sodium_compat/autoload.php';
    if (!is_file($fallback)) $fail('The sodium PHP extension is required, and lib/vendor/sodium_compat is missing.');
    require $fallback;
}
if (!class_exists('ZipArchive')) $fail('The zip PHP extension is required.');

if (isset($opt['keygen'])) {
    $path = $opt['key'] ?? $defaultKey;
    if (!is_dir(dirname($path)) && !@mkdir(dirname($path), 0700, true)) $fail('Could not create the folder ' . dirname($path));
    $keyGuard($path);
    if (file_exists($path)) $fail("$path already exists. Move it away first; overwriting it would lock you out of publishing.");
    $pair = sodium_crypto_sign_keypair();
    file_put_contents($path, base64_encode(sodium_crypto_sign_secretkey($pair)) . "\n");
    @chmod($path, 0600);
    $pub = base64_encode(sodium_crypto_sign_publickey($pair));
    file_put_contents($path . '.pub', $pub . "\n");
    echo "Secret key written to $path (keep it private and make a backup).\nPublic key: $pub\n";
    echo "Fingerprint: " . substr(hash('sha256', sodium_crypto_sign_publickey($pair)), 0, 16) . "\n";
    exit(0);
}

// A short fingerprint of a public key. The blog's Updates card shows the same one for the key it trusts.
$keyId = fn(string $rawPublic) => substr(hash('sha256', $rawPublic), 0, 16);
// Accepts a secret key file or a .pub file and returns the raw public key
$loadPublic = function (string $path) use ($fail) {
    if (!is_file($path)) $fail("Key file $path not found.");
    $raw = base64_decode(trim((string) file_get_contents($path)), true);
    if ($raw !== false && strlen($raw) === SODIUM_CRYPTO_SIGN_SECRETKEYBYTES) return sodium_crypto_sign_publickey_from_secretkey($raw);
    if ($raw !== false && strlen($raw) === SODIUM_CRYPTO_SIGN_PUBLICKEYBYTES) return $raw;
    $fail("$path is not a valid key file.");
};

if (isset($opt['show-key'])) {
    $kf = $opt['key'] ?? $defaultKey;
    $pub = $loadPublic($kf);
    echo "Key file:    $kf\nPublic key:  " . base64_encode($pub) . "\nFingerprint: " . $keyId($pub) . "\n";
    exit(0);
}

$version = $opt['version'] ?? $fail('Give --version, for example --version 1.0.1');
if (isset($opt['github'])) {
    if (!preg_match('#^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$#', $opt['github'])) $fail('--github should look like OWNER/REPO');
    $opt['url'] = "https://github.com/{$opt['github']}/releases/latest/download";
}
$url = rtrim($opt['url'] ?? $fail('Give --url (the https folder you will upload the files to) or --github OWNER/REPO.'), '/');
$url = preg_replace('#/latest\.json$#', '', $url);
$keyFile = $opt['key'] ?? $defaultKey;
$out = rtrim($opt['out'] ?? 'dist', '/');
if (!preg_match('/^\d+\.\d+\.\d+(-[0-9A-Za-z.]+)?$/', $version)) $fail('The version should look like 1.2.3.');
if (!preg_match('#^https?://#', $url)) $fail('--url must start with https://');
if (!is_file($keyFile)) $fail("Key file $keyFile not found. Make one with --keygen.");
$keyGuard($keyFile);
$secret = base64_decode(trim((string) file_get_contents($keyFile)), true);
if ($secret === false || strlen($secret) !== SODIUM_CRYPTO_SIGN_SECRETKEYBYTES) $fail('That is not a valid secret key file.');
$signerPublic = sodium_crypto_sign_publickey_from_secretkey($secret);
$signerId = $keyId($signerPublic);
// The key blogs will trust after installing this release: normally the signing key, or the new one when rotating
$bakePublic = isset($opt['rotate-to']) ? $loadPublic($opt['rotate-to']) : $signerPublic;
$public = base64_encode($bakePublic);

// Remember which key each update address is signed with, so a different key cannot be used by accident.
// (A blog only accepts releases signed with the key it already trusts, so a changed key breaks every blog.)
$histFile = $home !== '' ? dirname($defaultKey) . DIRECTORY_SEPARATOR . 'history.json' : null;
$history = $histFile && is_file($histFile) ? (json_decode((string) file_get_contents($histFile), true) ?: []) : [];
$trusted = $history[$url]['trusts'] ?? null;
if ($trusted !== null && $trusted !== $signerId && !isset($opt['allow-new-key'])) {
    $fail("This update address ($url) was last published with key $trusted, but you are signing with key $signerId.\n"
        . "Blogs trust key $trusted, so they would reject this release (\"The update's signature is not valid\").\n"
        . "  - Use the original key:       --key PATH-TO-THE-KEY-WITH-FINGERPRINT-$trusted\n"
        . "  - Change keys properly:       --key OLD.key --rotate-to NEW.key   (signed with the old key, carries the new one)\n"
        . "  - Start over (blogs must then be updated by hand once):  --allow-new-key");
}
$notes = isset($opt['notes-file']) ? trim((string) file_get_contents($opt['notes-file'])) : (string) ($opt['notes'] ?? '');
if (!is_dir($out) && !mkdir($out, 0775, true)) $fail("Could not create $out");

// What goes in an update. Never content, uploads, data, config.php, .htaccess, .user.ini or other themes.
function files_under(string $root, array $dirs, array $top, array &$suspect, array $skipReal): array
{
    $list = [];
    foreach ($top as $f) if (is_file("$root/$f")) $list[] = $f;
    foreach ($dirs as $d) {
        if (!is_dir("$root/$d")) continue;
        $it = new RecursiveIteratorIterator(new RecursiveDirectoryIterator("$root/$d", FilesystemIterator::SKIP_DOTS));
        foreach ($it as $f) {
            if (!$f->isFile()) continue;
            $rel = substr($f->getPathname(), strlen($root) + 1);
            $rel = str_replace('\\', '/', $rel);
            if (preg_match('#(^|/)(\.DS_Store|Thumbs\.db)$#', $rel) || substr($rel, -4) === '.tmp') continue;
            // Release output and publisher only tooling never ships
            if (preg_match('#(^|/)dist(/|$)#', $rel) || $rel === 'tools/build-release.php') continue;
            $real = realpath($f->getPathname());
            foreach ($skipReal as $s) if ($real !== false && $s !== false && strpos($real . DIRECTORY_SEPARATOR, $s . DIRECTORY_SEPARATOR) === 0) continue 2;
            // Anything that looks like a secret is a stop, not a quiet skip, so the mistake gets noticed
            if (preg_match('#(\.(key|pem|pfx|p12)|\.pub)$#i', $rel) || preg_match('#(^|/)\.env(\.|$)#', $rel) || preg_match('#(^|/)(id_rsa|id_ed25519)#', $rel)) { $suspect[] = $rel; continue; }
            $list[] = $rel;
        }
    }
    sort($list);
    return $list;
}

$suspect = [];
if (realpath($out) === realpath($root)) $fail('--out must be a separate folder, not the blog folder itself.');
$update = files_under($root, $published, ['index.php', 'config.sample.php', 'README.md'], $suspect, [realpath($out)]);
$update = array_values(array_diff($update, ['release.json', 'tools/build-release.php']));
if ($suspect) $fail("These files look like keys or secrets and sit in a folder that is published, so nothing was built:\n  - " . implode("\n  - ", $suspect) . "\nMove them out of the blog folder, then run this again.");

// lib/version.php carries the version, update address and public key
$vphp = (string) file_get_contents("$root/lib/version.php");
$bake = function (string $src) use ($version, $url, $public) {
    $src = preg_replace("/const TS_VERSION\s*=\s*'[^']*';/", "const TS_VERSION    = '$version';", $src, 1, $n1);
    $src = preg_replace("/const TS_UPDATE_URL\s*=\s*'[^']*';/", "const TS_UPDATE_URL = '$url/latest.json';", $src, 1, $n2);
    $src = preg_replace("/const TS_UPDATE_KEY\s*=\s*'[^']*';/", "const TS_UPDATE_KEY = '$public';", $src, 1, $n3);
    if ($n1 + $n2 + $n3 !== 3) { fwrite(STDERR, "Error: lib/version.php does not have the expected lines.\n"); exit(1); }
    return $src;
};
$contents = [];
foreach ($update as $rel) $contents[$rel] = $rel === 'lib/version.php' ? $bake($vphp) : (string) file_get_contents("$root/$rel");

// Last line of defense: the secret key itself must not appear in anything that is about to ship
foreach ($contents as $rel => $data) {
    if (strpos($data, base64_encode($secret)) !== false || strpos($data, $secret) !== false || strpos($data, bin2hex($secret)) !== false) {
        $fail("The secret signing key appears inside $rel. Nothing was built. Remove it and consider the key exposed if it was ever published.");
    }
}

// Refuse to ship code that does not parse
foreach ($contents as $rel => $data) {
    if (substr($rel, -4) !== '.php') continue;
    try { token_get_all($data, TOKEN_PARSE); } catch (ParseError $e) { $fail("$rel has a syntax error on line " . $e->getLine()); }
}

$hashes = [];
foreach ($contents as $rel => $data) $hashes[$rel] = hash('sha256', $data);
ksort($hashes);
$release = json_encode(['name' => 'Themestrap Blog', 'version' => $version, 'released' => date('Y-m-d'), 'files' => $hashes], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);

function write_zip(string $path, array $contents, string $release, array $extra = []): void
{
    @unlink($path);
    $z = new ZipArchive();
    if ($z->open($path, ZipArchive::CREATE) !== true) { fwrite(STDERR, "Error: cannot write $path\n"); exit(1); }
    foreach ($contents as $rel => $data) $z->addFromString("tsblog/$rel", $data);
    $z->addFromString('tsblog/release.json', $release);
    foreach ($extra as $rel => $data) $z->addFromString("tsblog/$rel", $data);
    $z->close();
}

$updateZip = "$out/tsblog-$version.zip";
$bridge = isset($opt['bridge']);
$upContents = $contents;
$upRelease = $release;
if ($bridge) {
    $upContents = array_filter($contents, fn($rel) => strpos($rel, 'theme/themestrap/') !== 0, ARRAY_FILTER_USE_KEY);
    $h = [];
    foreach ($upContents as $rel => $data) $h[$rel] = hash('sha256', $data);
    ksort($h);
    $upRelease = json_encode(['name' => 'Themestrap Blog', 'version' => $version, 'released' => date('Y-m-d'), 'files' => $h], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
}
write_zip($updateZip, $upContents, $upRelease);

// A fresh install also carries the starter posts, the private folders and the server files
$extra = [];
foreach (['.htaccess', '.user.ini', '.gitignore'] as $f) if (is_file("$root/$f")) $extra[$f] = (string) file_get_contents("$root/$f");
foreach (['content/posts/welcome-to-your-blog.md', 'content/posts/about.md', 'data/.gitkeep', 'uploads/.gitkeep'] as $f) {
    $extra[$f] = is_file("$root/$f") ? (string) file_get_contents("$root/$f") : '';
}
write_zip("$out/tsblog-$version-install.zip", $contents, $release, $extra);

$sha = hash_file('sha256', $updateZip);
$sig = base64_encode(sodium_crypto_sign_detached("tsblog|$version|$sha", $secret));
$manifest = [
    'name' => 'Themestrap Blog', 'version' => $version, 'released' => date('Y-m-d'), 'min_php' => $opt['min-php'] ?? '8.1.0',
    'zip' => "$url/tsblog-$version.zip", 'sha256' => $sha, 'size' => filesize($updateZip), 'signature' => $sig, 'key_id' => $signerId, 'notes' => $notes,
];
file_put_contents("$out/latest.json", json_encode($manifest, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . "\n");

if ($histFile) {
    $history[$url] = ['trusts' => $keyId($bakePublic), 'version' => $version];
    if (!is_dir(dirname($histFile))) @mkdir(dirname($histFile), 0700, true);
    @file_put_contents($histFile, json_encode($history, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
}
echo "Built version $version in $out/\n";
echo "Signed with key $signerId" . (isset($opt['rotate-to']) ? "; blogs will trust key " . $keyId($bakePublic) . " from this release on" : "") . "\n";
echo "  tsblog-$version.zip           update package (" . count($upContents) . " files" . ($bridge ? ", bridge: without theme/themestrap/" : "") . ")\n";
echo "  tsblog-$version-install.zip   fresh install with the update address and key built in\n";
echo "  latest.json                    manifest, signed\n";
echo "Upload all three files to $url/\n";
echo "Address for Settings → Updates (already built into the install zip): $url/latest.json\n";
if (strpos($url, '://github.com/') !== false) echo "On GitHub: create a release, attach the three files, and publish it (not as a draft). The short address https://github.com/" . preg_replace('#^https://github.com/([^/]+/[^/]+)/.*#', '$1', $url) . " also works in Settings.\n";
