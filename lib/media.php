<?php
defined('TS_ROOT') or exit;
// Entry formats and media.
//
// A post has a format that says what sits above its text:
//   standard   the cover image (or nothing)
//   slider     several pictures in a carousel
//   gallery    several pictures as a grid that opens in a lightbox
//   video      YouTube, Vimeo, or a video file
//   audio      SoundCloud, Spotify, or an audio file
//   embed      CodePen (and the other supported players)
//
// Only addresses that resolve to a known player or a plain media file are accepted, so a post can never
// carry an arbitrary iframe. The result is always built here, never copied from what the author typed.

final class TSMedia
{
    public const FORMATS = [
        'standard' => 'Standard (cover image)',
        'slider'   => 'Slider (several pictures)',
        'gallery'  => 'Gallery (pictures with a lightbox)',
        'video'    => 'Video',
        'audio'    => 'Audio',
        'embed'    => 'Embed (CodePen and similar)',
    ];

    public const MAX_ITEMS = 40;

    // Hosts a page may frame. Used for the Content-Security-Policy frame-src directive.
    public const FRAME_HOSTS = [
        'https://www.youtube-nocookie.com', 'https://player.vimeo.com', 'https://codepen.io',
        'https://w.soundcloud.com', 'https://open.spotify.com',
    ];

    public static function format($f): string
    {
        $f = is_string($f) ? strtolower(trim($f)) : '';
        return isset(self::FORMATS[$f]) ? $f : 'standard';
    }

    public static function isImages(string $format): bool { return $format === 'slider' || $format === 'gallery'; }

    // Accepts a newline or comma separated string, a JSON list, or an array
    public static function parseList($v): array
    {
        if (is_string($v)) {
            $t = trim($v);
            if ($t !== '' && $t[0] === '[') {
                $d = json_decode($t, true);
                if (is_array($d)) $v = $d;
            }
        }
        if (is_string($v)) $v = preg_split('/\R+/', $v);
        $out = [];
        foreach ((array) $v as $item) {
            $u = trim((string) $item);
            if ($u !== '' && !in_array($u, $out, true)) $out[] = $u;
            if (count($out) >= self::MAX_ITEMS) break;
        }
        return $out;
    }

    // Validates the media of a post for its format. Returns [list, errors].
    public static function clean(string $format, array $list): array
    {
        $errors = [];
        if ($format === 'standard') return [[], $errors];
        if (self::isImages($format)) {
            $keep = [];
            foreach ($list as $u) {
                if (TSMarkdown::safeUrl($u, true) !== '') $keep[] = $u;
                else $errors[] = 'This picture address is not valid: ' . mb_substr($u, 0, 60);
            }
            return [$keep, $errors];
        }
        $list = array_slice($list, 0, 1);
        if ($list && self::resolve($format, $list) === null) {
            $errors[] = 'That address is not supported. Use a YouTube, Vimeo, CodePen, SoundCloud or Spotify link, or a link to an mp4, webm, mp3 or ogg file.';
        }
        return [$list, $errors];
    }

    // What to show for a post: ['kind' => images|iframe|video|audio, ...] or null
    public static function resolve(string $format, array $list): ?array
    {
        if ($format === 'standard' || !$list) return null;
        if (self::isImages($format)) {
            $items = array_values(array_filter($list, fn($u) => TSMarkdown::safeUrl($u, true) !== ''));
            return $items ? ['kind' => 'images', 'items' => $items, 'mode' => $format] : null;
        }
        $u = trim((string) $list[0]);
        return self::player($u) ?? self::file($u);
    }

    // First picture of a post, for social cards and thumbnails
    public static function firstImage(array $post): string
    {
        if (($post['image'] ?? '') !== '') return $post['image'];
        $r = self::resolve(self::format($post['format'] ?? ''), (array) ($post['media'] ?? []));
        return $r && $r['kind'] === 'images' ? $r['items'][0] : '';
    }

    private static function host(string $u): array
    {
        $p = @parse_url($u);
        if (!$p || !in_array(strtolower($p['scheme'] ?? ''), ['http', 'https'], true) || empty($p['host'])) return ['', '', []];
        parse_str($p['query'] ?? '', $q);
        return [preg_replace('/^(www|m)\./', '', strtolower($p['host'])), $p['path'] ?? '', $q];
    }

    private static function player(string $u): ?array
    {
        [$h, $path, $q] = self::host($u);
        if ($h === '') return null;

        if (in_array($h, ['youtube.com', 'youtube-nocookie.com', 'youtu.be'], true)) {
            $id = '';
            if ($h === 'youtu.be') $id = trim($path, '/');
            elseif (preg_match('#^/(?:embed|shorts|live|v)/([\w-]{11})#', $path, $m)) $id = $m[1];
            elseif (($q['v'] ?? '') !== '') $id = (string) $q['v'];
            if (!preg_match('/^[\w-]{11}$/', $id)) return null;
            return ['kind' => 'iframe', 'provider' => 'youtube', 'ratio' => '16x9', 'title' => 'YouTube video player',
                'src' => 'https://www.youtube-nocookie.com/embed/' . $id,
                'allow' => 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share', 'fullscreen' => true];
        }
        if ($h === 'vimeo.com' || $h === 'player.vimeo.com') {
            if (!preg_match('#^/(?:video/|[\w/]*?)(\d{5,12})(?:/|$)#', $path, $m)) return null;
            return ['kind' => 'iframe', 'provider' => 'vimeo', 'ratio' => '16x9', 'title' => 'Vimeo video player',
                'src' => 'https://player.vimeo.com/video/' . $m[1], 'allow' => 'autoplay; fullscreen; picture-in-picture', 'fullscreen' => true];
        }
        if ($h === 'codepen.io') {
            if (!preg_match('#^/([\w-]{1,40})/(?:pen|embed|full|details)/([A-Za-z0-9]{3,12})#', $path, $m)) return null;
            return ['kind' => 'iframe', 'provider' => 'codepen', 'ratio' => '16x9', 'title' => 'CodePen: ' . $m[2],
                'src' => 'https://codepen.io/' . $m[1] . '/embed/' . $m[2] . '?default-tab=result', 'allow' => '', 'fullscreen' => false];
        }
        if ($h === 'soundcloud.com' || $h === 'w.soundcloud.com' || $h === 'api.soundcloud.com') {
            $page = $u;
            if ($h === 'w.soundcloud.com') {
                $page = (string) ($q['url'] ?? '');
                [$ph] = self::host($page);
                if (!in_array($ph, ['soundcloud.com', 'api.soundcloud.com'], true)) return null;
            } elseif (trim($path, '/') === '') {
                return null;
            }
            $page = preg_replace('/[?#].*$/', '', $page);
            return ['kind' => 'iframe', 'provider' => 'soundcloud', 'ratio' => 'soundcloud', 'title' => 'SoundCloud player',
                'src' => 'https://w.soundcloud.com/player/?url=' . rawurlencode($page) . '&color=%23ff5500&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true&visual=true',
                'allow' => '', 'fullscreen' => false];
        }
        if ($h === 'open.spotify.com') {
            if (!preg_match('#^/(?:embed/)?(track|album|playlist|episode|show|artist)/([A-Za-z0-9]{10,30})#', $path, $m)) return null;
            return ['kind' => 'iframe', 'provider' => 'spotify', 'ratio' => 'spotify', 'title' => 'Spotify player',
                'src' => 'https://open.spotify.com/embed/' . $m[1] . '/' . $m[2], 'allow' => 'encrypted-media', 'fullscreen' => false];
        }
        return null;
    }

    private static function file(string $u): ?array
    {
        if ($u === '' || preg_match('/[\x00-\x1f\x7f\s]/', $u)) return null;
        $isAbs = preg_match('#^https?://#i', $u);
        if (!$isAbs && ($u[0] !== '/' || (isset($u[1]) && $u[1] === '/'))) return null;
        $path = strtolower((string) parse_url($u, PHP_URL_PATH));
        if (preg_match('/\.(mp4|webm|ogv|m4v)$/', $path)) return ['kind' => 'video', 'src' => $u];
        if (preg_match('/\.(mp3|ogg|oga|wav|m4a|aac|flac)$/', $path)) return ['kind' => 'audio', 'src' => $u];
        return null;
    }

    // The iframe or media element for a resolved player, with classes the theme styles
    public static function html(array $r, string $class = 'tsm'): string
    {
        switch ($r['kind']) {
            case 'iframe':
                return '<div class="' . $class . ' ' . $class . '-frame ' . $class . '-' . e($r['ratio']) . '"><iframe src="' . e($r['src']) . '" title="' . e($r['title']) . '" loading="lazy"'
                    . ($r['allow'] !== '' ? ' allow="' . e($r['allow']) . '"' : '') . ($r['fullscreen'] ? ' allowfullscreen' : '')
                    . ' referrerpolicy="strict-origin-when-cross-origin"></iframe></div>';
            case 'video':
                return '<div class="' . $class . ' ' . $class . '-frame ' . $class . '-16x9"><video src="' . e($r['src']) . '" controls preload="metadata"></video></div>';
            case 'audio':
                return '<div class="' . $class . ' ' . $class . '-audio"><audio src="' . e($r['src']) . '" controls preload="none"></audio></div>';
            case 'images':
                $out = '<div class="' . $class . ' ' . $class . '-images">';
                foreach ($r['items'] as $u) $out .= '<a href="' . e($u) . '"><img src="' . e($u) . '" alt="" loading="lazy"></a>';
                return $out . '</div>';
        }
        return '';
    }
}

// Convenience for templates: the media of a post as simple markup (themes may build their own from TSMedia::resolve)
function ts_media(array $post): ?array
{
    return TSMedia::resolve(TSMedia::format($post['format'] ?? ''), (array) ($post['media'] ?? []));
}
