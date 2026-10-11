<?php
// Builds signed release packages for the blog's self updater. Command line only.
//
//   php tools/build-release.php --keygen [--key release.key]
//       Makes a signing key pair once. Keep the secret key (release.key) private and backed up.
//       The public key is printed and saved next to it as release.key.pub.
//
//   php tools/build-release.php --version 1.0.1 --url https://example.com/blog-updates --key release.key
//       [--notes "What changed"] [--notes-file CHANGES.txt] [--min-php 8.1.0] [--out dist]
//       Writes to dist/:
//         tsblog-1.0.1.zip          the update package (what the updater downloads)
//         tsblog-1.0.1-install.zip  a fresh install, with the address and key already built in
//         latest.json               the manifest. Upload all three files to --url
//
// Needs the zip and sodium PHP extensions.

if (PHP_SAPI !== 'cli') { http_response_code(403); exit; }

$root = dirname(__DIR__);
$opt = getopt('', ['keygen', 'version:', 'url:', 'key:', 'notes:', 'notes-file:', 'min-php:', 'out:']);
$fail = function (string $m) { fwrite(STDERR, "Error: $m\n"); exit(1); };

if (!extension_loaded('sodium')) $fail('The sodium PHP extension is required.');
if (!class_exists('ZipArchive')) $fail('The zip PHP extension is required.');

if (isset($opt['keygen'])) {
    $path = $opt['key'] ?? 'release.key';
    if (file_exists($path)) $fail("$path already exists. Move it away first; overwriting it would lock you out of publishing.");
    $pair = sodium_crypto_sign_keypair();
    file_put_contents($path, base64_encode(sodium_crypto_sign_secretkey($pair)) . "\n");
    @chmod($path, 0600);
    $pub = base64_encode(sodium_crypto_sign_publickey($pair));
    file_put_contents($path . '.pub', $pub . "\n");
    echo "Secret key written to $path (keep it private and make a backup).\nPublic key: $pub\n";
    exit(0);
}

$version = $opt['version'] ?? $fail('Give --version, for example --version 1.0.1');
$url = rtrim($opt['url'] ?? $fail('Give --url, the https address where you will upload the files.'), '/');
$keyFile = $opt['key'] ?? 'release.key';
$out = rtrim($opt['out'] ?? 'dist', '/');
if (!preg_match('/^\d+\.\d+\.\d+(-[0-9A-Za-z.]+)?$/', $version)) $fail('The version should look like 1.2.3.');
if (!preg_match('#^https?://#', $url)) $fail('--url must start with https://');
if (!is_file($keyFile)) $fail("Key file $keyFile not found. Make one with --keygen.");
$secret = base64_decode(trim((string) file_get_contents($keyFile)), true);
if ($secret === false || strlen($secret) !== SODIUM_CRYPTO_SIGN_SECRETKEYBYTES) $fail('That is not a valid secret key file.');
$public = base64_encode(sodium_crypto_sign_publickey_from_secretkey($secret));
$notes = isset($opt['notes-file']) ? trim((string) file_get_contents($opt['notes-file'])) : (string) ($opt['notes'] ?? '');
if (!is_dir($out) && !mkdir($out, 0775, true)) $fail("Could not create $out");

// What goes in an update. Never content, uploads, data, config.php, .htaccess, .user.ini or other themes.
function files_under(string $root, array $dirs, array $top): array
{
    $list = [];
    foreach ($top as $f) if (is_file("$root/$f")) $list[] = $f;
    foreach ($dirs as $d) {
        if (!is_dir("$root/$d")) continue;
        $it = new RecursiveIteratorIterator(new RecursiveDirectoryIterator("$root/$d", FilesystemIterator::SKIP_DOTS));
        foreach ($it as $f) {
            if (!$f->isFile()) continue;
            $rel = substr($f->getPathname(), strlen($root) + 1);
            if (preg_match('#(^|/)(\.DS_Store|Thumbs\.db)$#', $rel) || substr($rel, -4) === '.tmp') continue;
            $list[] = str_replace('\\', '/', $rel);
        }
    }
    sort($list);
    return $list;
}

$update = files_under($root, ['lib', 'assets', 'tools', 'docs', 'theme/default'], ['index.php', 'config.sample.php', 'README.md']);
$update = array_values(array_diff($update, ['release.json']));

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

// Refuse to ship code that does not parse
foreach ($contents as $rel => $data) {
    if (substr($rel, -4) !== '.php') continue;
    try { token_get_all($data, TOKEN_PARSE); } catch (ParseError $e) { $fail("$rel has a syntax error on line " . $e->getLine()); }
}

$hashes = [];
foreach ($contents as $rel => $data) $hashes[$rel] = hash('sha256', $data);
ksort($hashes);
$release = json_encode(['name' => 'TSBlog', 'version' => $version, 'released' => date('Y-m-d'), 'files' => $hashes], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);

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
write_zip($updateZip, $contents, $release);

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
    'name' => 'TSBlog', 'version' => $version, 'released' => date('Y-m-d'), 'min_php' => $opt['min-php'] ?? '8.1.0',
    'zip' => "$url/tsblog-$version.zip", 'sha256' => $sha, 'size' => filesize($updateZip), 'signature' => $sig, 'notes' => $notes,
];
file_put_contents("$out/latest.json", json_encode($manifest, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . "\n");

echo "Built version $version in $out/\n";
echo "  tsblog-$version.zip           update package (" . count($contents) . " files)\n";
echo "  tsblog-$version-install.zip   fresh install with the update address and key built in\n";
echo "  latest.json                    manifest, signed\n";
echo "Upload all three files to $url/\n";
