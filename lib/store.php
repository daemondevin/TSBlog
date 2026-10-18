<?php
defined('TS_ROOT') or exit;
// Content storage. Two interchangeable drivers:
//   FileStore   one Markdown file per post in content/posts (default, no database)
//   SqliteStore one SQLite file in data/ (optional, via PDO, still serverless)

abstract class TSStore
{
    public const RESERVED = ['ts-probe', 'admin', 'tag', 'tags', 'page', 'search', 'feed', 'feed.xml', 'sitemap.xml',
        'robots.txt', 'uploads', 'theme', 'assets', 'data', 'content', 'lib', 'index', 'api'];

    abstract public function index(): array;           // every post, without 'body'
    abstract public function get(string $slug): ?array; // one post, with 'body'
    abstract protected function write(array $post, ?string $oldSlug): void;
    abstract public function remove(string $slug): bool;

    public static function slugify(string $s): string
    {
        $s = trim($s);
        if (function_exists('iconv')) {
            $t = @iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $s);
            if ($t !== false && $t !== '') $s = $t;
        }
        $s = strtolower(preg_replace('/[^A-Za-z0-9]+/', '-', $s));
        return trim(substr($s, 0, 80), '-');
    }

    public static function validSlug(string $s): bool
    {
        return (bool) preg_match('/^[a-z0-9]+(?:-[a-z0-9]+)*$/', $s) && strlen($s) <= 80;
    }

    public static function parseTags($tags): array
    {
        if (is_string($tags)) $tags = preg_split('/\s*,\s*/', trim($tags, " \t[]"));
        $out = [];
        foreach ((array) $tags as $t) {
            $t = trim(preg_replace('/\s+/', ' ', str_replace(['"', "'", '<', '>', ',', '/', '\\', '?', '#', '%'], '', (string) $t)));
            if ($t !== '' && !in_array(mb_strtolower($t), array_map('mb_strtolower', $out), true)) $out[] = $t;
        }
        return array_slice($out, 0, 20);
    }

    // Normalizes and validates a post coming from the admin or a file. Returns [post, errors].
    public function prepare(array $in, ?string $oldSlug = null): array
    {
        $errors = [];
        $title = trim(preg_replace('/\s+/', ' ', (string) ($in['title'] ?? '')));
        $body = rtrim(str_replace(["\r\n", "\r"], "\n", (string) ($in['body'] ?? ''))) . "\n";
        $slug = trim((string) ($in['slug'] ?? ''));
        $slug = $slug === '' ? self::slugify($title) : self::slugify($slug);
        if ($title === '') $errors[] = 'A title is required.';
        if ($slug === '') $slug = 'post-' . date('Ymd-His');
        if (in_array($slug, self::RESERVED, true)) $errors[] = "The address “{$slug}” is reserved. Choose another.";
        if (!self::validSlug($slug)) $errors[] = 'The address may only use letters, numbers and dashes.';
        if ($slug !== $oldSlug && $this->get($slug)) $errors[] = "Another post already uses the address “{$slug}”.";

        $ts = strtotime((string) ($in['date'] ?? ''));
        $date = date('Y-m-d H:i', $ts ?: time());
        $status = ($in['status'] ?? 'draft') === 'published' ? 'published' : 'draft';
        $type = ($in['type'] ?? 'post') === 'page' ? 'page' : 'post';
        $image = trim((string) ($in['image'] ?? ''));
        if ($image !== '' && TSMarkdown::safeUrl($image, true) === '') $image = '';
        $format = $type === 'page' ? 'standard' : TSMedia::format($in['format'] ?? 'standard');
        [$media, $mediaErrors] = TSMedia::clean($format, TSMedia::parseList($in['media'] ?? []));
        $errors = array_merge($errors, $mediaErrors);

        $post = [
            'slug' => $slug,
            'title' => $title,
            'date' => $date,
            'updated' => date('Y-m-d H:i'),
            'status' => $status,
            'type' => $type,
            'tags' => self::parseTags($in['tags'] ?? []),
            'description' => trim(preg_replace('/\s+/', ' ', (string) ($in['description'] ?? ''))),
            'image' => $image,
            'format' => $format,
            'media' => $media,
            'body' => $body,
        ];
        return [$post, $errors];
    }

    public function save(array $post, ?string $oldSlug = null): void
    {
        $this->write($post, $oldSlug);
    }

    // Derived fields every index entry carries
    protected function derive(array $p): array
    {
        $body = $p['body'] ?? '';
        $p['excerpt'] = $p['excerpt'] ?? TSMarkdown::excerpt($body);
        $p['words'] = $p['words'] ?? TSMarkdown::wordCount($body);
        $p['minutes'] = max(1, (int) ceil($p['words'] / 220));
        $plain = preg_replace('/[#>*_`~\[\]()!|-]+/', ' ', $body);
        $p['plain'] = $p['plain'] ?? mb_strtolower(mb_substr(preg_replace('/\s+/', ' ', $plain), 0, 4000));
        unset($p['body']);
        return $p;
    }

    // Public queries (run over the index, which is fine for thousands of posts)

    public function published(string $type = 'post'): array
    {
        $now = time();
        $list = array_filter($this->index(), fn($p) =>
            $p['status'] === 'published' && $p['type'] === $type && strtotime($p['date']) <= $now);
        usort($list, fn($a, $b) => strcmp($b['date'], $a['date']));
        return array_values($list);
    }

    public function byTag(string $tag): array
    {
        $tag = mb_strtolower($tag);
        return array_values(array_filter($this->published(), fn($p) =>
            in_array($tag, array_map('mb_strtolower', $p['tags']), true)));
    }

    public function tags(): array
    {
        $count = [];
        foreach ($this->published() as $p) {
            foreach ($p['tags'] as $t) {
                $k = mb_strtolower($t);
                $count[$k] = ['name' => $count[$k]['name'] ?? $t, 'count' => ($count[$k]['count'] ?? 0) + 1];
            }
        }
        uasort($count, fn($a, $b) => $b['count'] <=> $a['count'] ?: strcasecmp($a['name'], $b['name']));
        return array_values($count);
    }

    public function search(string $q): array
    {
        $words = array_filter(preg_split('/\s+/', mb_strtolower(trim($q))));
        if (!$words) return [];
        $hits = [];
        foreach ($this->published() as $p) {
            $hay = mb_strtolower($p['title'] . ' ' . $p['description'] . ' ' . implode(' ', $p['tags']));
            $score = 0;
            foreach ($words as $w) {
                if (mb_strpos($hay, $w) !== false) $score += 3;
                elseif (mb_strpos($p['plain'], $w) !== false) $score += 1;
                else { $score = 0; break; }
            }
            if ($score) $hits[] = [$score, $p];
        }
        usort($hits, fn($a, $b) => $b[0] <=> $a[0] ?: strcmp($b[1]['date'], $a[1]['date']));
        return array_map(fn($h) => $h[1], $hits);
    }

    // Everything for the admin list, newest first
    public function all(): array
    {
        $list = $this->index();
        usort($list, fn($a, $b) => strcmp($b['date'], $a['date']));
        return $list;
    }

    public static function open(array $cfg): TSStore
    {
        return ($cfg['store'] ?? 'files') === 'sqlite'
            ? new TSSqliteStore($cfg['paths']['data'] . '/' . ($cfg['sqlite_file'] ?? 'blog.db'))
            : new TSFileStore($cfg['paths']['content'], $cfg['paths']['data'], !empty($cfg['guard']));
    }
}

final class TSFileStore extends TSStore
{
    private const GUARD = "<?php http_response_code(404); exit; ?>\n";
    private string $dir;
    private string $cacheFile;
    private bool $guard;
    private ?array $memo = null;

    // $guard stores posts as slug.md.php with a guard line, so a server that hands out files instead of
    // running them still never shows a draft. Plain slug.md files are always readable either way.
    public function __construct(string $contentDir, string $dataDir, bool $guard = false)
    {
        $this->dir = rtrim($contentDir, '/') . '/posts';
        $this->cacheFile = rtrim($dataDir, '/') . '/index.cache.php';
        $this->guard = $guard;
        if (!is_dir($this->dir)) @mkdir($this->dir, 0775, true);
    }

    private function find(string $slug): ?string
    {
        foreach ([$this->guard ? '.md.php' : '.md', $this->guard ? '.md' : '.md.php'] as $ext) {
            if (is_file($this->dir . '/' . $slug . $ext)) return $this->dir . '/' . $slug . $ext;
        }
        return null;
    }

    private function target(string $slug): string
    {
        return $this->dir . '/' . $slug . ($this->guard ? '.md.php' : '.md');
    }

    private function files(): array
    {
        $out = [];
        foreach (array_merge(glob($this->dir . '/*.md.php') ?: [], glob($this->dir . '/*.md') ?: []) as $f) {
            $slug = preg_replace('/\.md(\.php)?$/', '', basename($f));
            if (self::validSlug($slug) && !isset($out[$slug])) $out[$slug] = $f;
        }
        return $out;
    }

    public static function parse(string $raw, string $slug, int $mtime = 0): array
    {
        $raw = str_replace(["\r\n", "\r"], "\n", $raw);
        $raw = preg_replace('/^\xEF\xBB\xBF/', '', $raw);
        if (strpos($raw, '<?php') === 0) $raw = (string) substr($raw, (int) strpos($raw, "\n") + 1);
        $meta = [];
        $body = $raw;
        if (preg_match('/\A---\n(.*?)\n---[ \t]*(?:\n|\z)(.*)\z/s', $raw, $m)) {
            $body = $m[2];
            foreach (explode("\n", $m[1]) as $line) {
                if (!preg_match('/^([A-Za-z_]+)\s*:\s*(.*)$/', $line, $kv)) continue;
                $v = trim($kv[2]);
                if ($v !== '' && $v[0] === '"') {
                    $d = json_decode($v, true);
                    $v = is_string($d) ? $d : trim($v, '"');
                } elseif ($v !== '' && $v[0] === "'" && substr($v, -1) === "'") {
                    $v = substr($v, 1, -1);
                }
                $meta[strtolower($kv[1])] = $v;
            }
        }
        $title = $meta['title'] ?? '';
        if ($title === '' && preg_match('/^#\s+(.+)$/m', $body, $h)) $title = trim($h[1]);
        return [
            'slug' => $slug,
            'title' => $title !== '' ? $title : $slug,
            'date' => date('Y-m-d H:i', strtotime($meta['date'] ?? '') ?: ($mtime ?: 0)),
            'updated' => $meta['updated'] ?? ($meta['date'] ?? ''),
            'status' => ($meta['status'] ?? 'published') === 'draft' ? 'draft' : 'published',
            'type' => ($meta['type'] ?? 'post') === 'page' ? 'page' : 'post',
            'tags' => self::parseTags($meta['tags'] ?? ''),
            'description' => $meta['description'] ?? '',
            'image' => $meta['image'] ?? '',
            'format' => TSMedia::format($meta['format'] ?? ''),
            'media' => TSMedia::parseList($meta['media'] ?? ''),
            'body' => ltrim($body, "\n"),
        ];
    }

    private static function q(string $v): string
    {
        $v = trim(preg_replace('/\s+/', ' ', $v));
        return preg_match('/^[\s"\'\[{]|\s$|: | #/', $v) ? json_encode($v, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) : $v;
    }

    public function serialize(array $p): string
    {
        $fm = "---\n"
            . 'title: ' . self::q($p['title']) . "\n"
            . 'date: ' . $p['date'] . "\n"
            . 'updated: ' . $p['updated'] . "\n"
            . 'status: ' . $p['status'] . "\n"
            . 'type: ' . $p['type'] . "\n"
            . 'tags: [' . implode(', ', array_map([self::class, 'q'], $p['tags'])) . "]\n";
        if ($p['description'] !== '') $fm .= 'description: ' . self::q($p['description']) . "\n";
        if ($p['image'] !== '') $fm .= 'image: ' . self::q($p['image']) . "\n";
        if (($p['format'] ?? 'standard') !== 'standard') $fm .= 'format: ' . $p['format'] . "\n";
        if (!empty($p['media'])) $fm .= 'media: ' . json_encode(array_values($p['media']), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n";
        return ($this->guard ? self::GUARD : '') . $fm . "---\n\n" . ltrim($p['body'], "\n");
    }

    public function index(): array
    {
        if ($this->memo !== null) return $this->memo;
        $files = $this->files();
        $sig = md5('v2' . ($this->guard ? 'g' : 'p') . implode('|', array_map(fn($f) => basename($f) . filemtime($f) . filesize($f), $files)));
        $raw = is_file($this->cacheFile) ? (string) @file_get_contents($this->cacheFile) : '';
        $raw = strpos($raw, '<?php') === 0 ? (string) substr($raw, (int) strpos($raw, "\n") + 1) : $raw;
        $cache = $raw !== '' ? @unserialize($raw, ['allowed_classes' => false]) : false;
        if (is_array($cache) && ($cache['sig'] ?? '') === $sig) return $this->memo = $cache['posts'];

        $posts = [];
        foreach ($files as $slug => $f) {
            $posts[] = $this->derive(self::parse((string) file_get_contents($f), $slug, (int) filemtime($f)));
        }
        @file_put_contents($this->cacheFile, self::GUARD . serialize(['sig' => $sig, 'posts' => $posts]), LOCK_EX);
        return $this->memo = $posts;
    }

    public function get(string $slug): ?array
    {
        if (!self::validSlug($slug) || !($f = $this->find($slug))) return null;
        return self::parse((string) file_get_contents($f), $slug, (int) filemtime($f));
    }

    protected function write(array $post, ?string $oldSlug): void
    {
        $target = $this->target($post['slug']);
        $tmp = $target . '.tmp';
        if (@file_put_contents($tmp, $this->serialize($post), LOCK_EX) === false) {
            throw new RuntimeException('The blog could not save your post because the “content/posts” folder is not writable. In your hosting file manager, set that folder’s permissions to 755 (or 775/777 if that does not work).');
        }
        rename($tmp, $target);
        foreach (['.md', '.md.php'] as $ext) {
            $other = $this->dir . '/' . $post['slug'] . $ext;
            if ($other !== $target && is_file($other)) @unlink($other);
        }
        if ($oldSlug && $oldSlug !== $post['slug']) {
            foreach (['.md', '.md.php'] as $ext) @unlink($this->dir . '/' . $oldSlug . $ext);
        }
        $this->memo = null;
    }

    public function remove(string $slug): bool
    {
        $this->memo = null;
        if (!self::validSlug($slug)) return false;
        $done = false;
        foreach (['.md', '.md.php'] as $ext) {
            $f = $this->dir . '/' . $slug . $ext;
            if (is_file($f) && @unlink($f)) $done = true;
        }
        return $done;
    }

    // Rewrites every post in the current format (plain or protected)
    public function reformat(): int
    {
        $n = 0;
        foreach (array_keys($this->files()) as $slug) {
            $p = $this->get($slug);
            if ($p) { $this->write($p, null); $n++; }
        }
        return $n;
    }
}

final class TSSqliteStore extends TSStore
{
    private PDO $db;
    private ?array $memo = null;

    public function __construct(string $file)
    {
        if (!class_exists('PDO') || !in_array('sqlite', PDO::getAvailableDrivers(), true)) {
            throw new RuntimeException('This server does not have SQLite support. Open Settings and choose “Files” for storage.');
        }
        $this->db = new PDO('sqlite:' . $file, null, null, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
        $this->db->exec('PRAGMA journal_mode=WAL; PRAGMA synchronous=NORMAL;');
        $this->db->exec('CREATE TABLE IF NOT EXISTS posts (
            slug TEXT PRIMARY KEY, title TEXT NOT NULL, date TEXT NOT NULL, updated TEXT, status TEXT NOT NULL,
            type TEXT NOT NULL, tags TEXT, description TEXT, image TEXT, body TEXT NOT NULL, excerpt TEXT, words INTEGER, plain TEXT)');
        $this->db->exec('CREATE INDEX IF NOT EXISTS posts_date ON posts(status, type, date)');
        // Older databases get the entry format columns the first time they are opened
        $cols = array_column($this->db->query('PRAGMA table_info(posts)')->fetchAll(), 'name');
        if (!in_array('format', $cols, true)) $this->db->exec("ALTER TABLE posts ADD COLUMN format TEXT NOT NULL DEFAULT 'standard'");
        if (!in_array('media', $cols, true)) $this->db->exec('ALTER TABLE posts ADD COLUMN media TEXT');
    }

    private function hydrate(array $r): array
    {
        $r['tags'] = $r['tags'] === '' || $r['tags'] === null ? [] : json_decode($r['tags'], true);
        $r['words'] = (int) ($r['words'] ?? 0);
        $r['format'] = TSMedia::format($r['format'] ?? '');
        $r['media'] = TSMedia::parseList($r['media'] ?? '');
        return $r;
    }

    public function index(): array
    {
        if ($this->memo !== null) return $this->memo;
        $rows = $this->db->query('SELECT slug,title,date,updated,status,type,tags,description,image,format,media,excerpt,words,plain FROM posts')->fetchAll();
        return $this->memo = array_map(function ($r) {
            $r = $this->hydrate($r);
            $r['minutes'] = max(1, (int) ceil($r['words'] / 220));
            return $r;
        }, $rows);
    }

    public function get(string $slug): ?array
    {
        $st = $this->db->prepare('SELECT * FROM posts WHERE slug = ?');
        $st->execute([$slug]);
        $r = $st->fetch();
        if (!$r) return null;
        unset($r['excerpt'], $r['words'], $r['plain']);
        $r['tags'] = $r['tags'] ? json_decode($r['tags'], true) : [];
        $r['format'] = TSMedia::format($r['format'] ?? '');
        $r['media'] = TSMedia::parseList($r['media'] ?? '');
        return $r;
    }

    protected function write(array $post, ?string $oldSlug): void
    {
        $d = $this->derive($post);
        $this->db->beginTransaction();
        if ($oldSlug && $oldSlug !== $post['slug']) {
            $this->db->prepare('DELETE FROM posts WHERE slug = ?')->execute([$oldSlug]);
        }
        $this->db->prepare('INSERT OR REPLACE INTO posts
            (slug,title,date,updated,status,type,tags,description,image,format,media,body,excerpt,words,plain) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
            ->execute([$post['slug'], $post['title'], $post['date'], $post['updated'], $post['status'], $post['type'],
                json_encode($post['tags'], JSON_UNESCAPED_UNICODE), $post['description'], $post['image'],
                $post['format'] ?? 'standard', json_encode(array_values($post['media'] ?? []), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), $post['body'],
                $d['excerpt'], $d['words'], $d['plain']]);
        $this->db->commit();
        $this->memo = null;
    }

    public function remove(string $slug): bool
    {
        $this->memo = null;
        $st = $this->db->prepare('DELETE FROM posts WHERE slug = ?');
        $st->execute([$slug]);
        return $st->rowCount() > 0;
    }
}
