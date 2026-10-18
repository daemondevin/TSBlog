<?php defined('TS_ROOT') or exit;
// Helpers shared by this theme's templates. Loaded with require_once, so it is safe to include twice.

if (!function_exists('tsx_icon')) {
    // Small inline icons, so the theme needs no icon font
    function tsx_icon(string $name): string
    {
        static $d = [
            'user' => '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/>',
            'folder' => '<path d="M3 6.5A1.5 1.5 0 0 1 4.5 5h4.2l2 2.5h8.8A1.5 1.5 0 0 1 21 9v9.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5z"/>',
            'clock' => '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
            'search' => '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>',
            'moon' => '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
            'sun' => '<circle cx="12" cy="12" r="4"/><path d="M12 3v1.5M12 19.5V21M3 12h1.5M19.5 12H21M5.6 5.6l1 1M17.4 17.4l1 1M5.6 18.4l1-1M17.4 6.6l1-1"/>',
            'left' => '<path d="m14.5 5-7 7 7 7"/>',
            'right' => '<path d="m9.5 5 7 7-7 7"/>',
            'plus' => '<path d="M12 5v14M5 12h14"/>',
            'bars' => '<path d="M4 7h16M4 12h16M4 17h16"/>',
            'x' => '<path d="m6 6 12 12M18 6 6 18"/>',
            'rss' => '<path d="M5 5a14 14 0 0 1 14 14M5 11a8 8 0 0 1 8 8"/><circle cx="6" cy="18" r="1.4"/>',
            'play' => '<path d="M8 5.5v13l11-6.5z"/>',
            'tag' => '<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.2"/>',
        ];
        return '<svg class="tsx-i" viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' . ($d[$name] ?? '') . '</svg>';
    }

    // Sets what the page header shows. The layout renders after the page template, so this is read there.
    function tsx_head(string $h1, array $crumbs = [], bool $sidebar = true): void
    {
        $GLOBALS['tsx_head'] = ['h1' => $h1, 'crumbs' => $crumbs, 'sidebar' => $sidebar];
    }

    function tsx_tag_url(string $t): string { return ts_url('tag/' . mb_strtolower($t)); }

    // "Jan 9" style badge parts
    function tsx_badge(string $date): array { $t = strtotime($date); return [date('j', $t), date('M', $t)]; }

    function tsx_tag_links(array $tags): string
    {
        $o = [];
        foreach ($tags as $t) $o[] = '<a href="' . e(tsx_tag_url($t)) . '">' . e($t) . '</a>';
        return implode(', ', $o);
    }

    // The media block of an entry, chosen by its format. $link makes a standard cover image clickable (list pages).
    function tsx_media(array $p, ?string $link = null): string
    {
        $r = ts_media($p);
        if ($r === null) {
            if (($p['image'] ?? '') === '') return '';
            $img = '<img class="tsx-cover" src="' . e($p['image']) . '" alt="" loading="lazy">';
            return '<div class="post-image">' . ($link ? '<a href="' . e($link) . '" tabindex="-1" aria-hidden="true">' . $img . '</a>' : $img) . '</div>';
        }
        if ($r['kind'] === 'images' && $r['mode'] === 'slider') {
            $o = '<div class="tsx-slider" data-slider role="region" aria-roledescription="carousel" aria-label="' . e($p['title']) . ' pictures"><div class="tsx-track" data-track>';
            foreach ($r['items'] as $i => $u) {
                $o .= '<figure class="tsx-slide" role="group" aria-roledescription="slide" aria-label="' . ($i + 1) . ' of ' . count($r['items']) . '"><img src="' . e($u) . '" alt="" loading="' . ($i ? 'lazy' : 'eager') . '"></figure>';
            }
            return '<div class="post-image">' . $o . '</div></div></div>';
        }
        if ($r['kind'] === 'images') {
            $o = '<div class="tsx-gallery" data-lightbox>';
            foreach ($r['items'] as $u) {
                $o .= '<a class="tsx-thumb-link" href="' . e($u) . '"><img src="' . e($u) . '" alt="" loading="lazy"><span class="tsx-zoom">' . tsx_icon('plus') . '</span></a>';
            }
            return '<div class="post-image">' . $o . '</div></div>';
        }
        return '<div class="post-image">' . TSMedia::html($r, 'tsx') . '</div>';
    }

    // Square thumbnail for the sidebar lists
    function tsx_thumb(array $p): string
    {
        $img = TSMedia::firstImage($p);
        if ($img !== '') return '<img class="tsx-sq" src="' . e($img) . '" alt="" width="50" height="50" loading="lazy">';
        return '<span class="tsx-sq tsx-sq-ph" aria-hidden="true">' . e(mb_strtoupper(mb_substr($p['title'], 0, 1))) . '</span>';
    }

    // Page links for the pagination bar: first, last, and a window around the current page
    function tsx_pages(int $page, int $pages): array
    {
        $out = [];
        for ($i = 1; $i <= $pages; $i++) {
            if ($i === 1 || $i === $pages || abs($i - $page) <= 1) $out[] = $i;
            elseif (end($out) !== 0) $out[] = 0;
        }
        return $out;
    }

    function tsx_page_url(string $base, int $n): string
    {
        return $n <= 1 ? ts_url($base) : ts_url(($base === '' ? '' : $base . '/') . 'page/' . $n);
    }

    function tsx_meta(array $p, bool $readMore = false): string
    {
        $o = '<div class="post-meta">';
        if (ts_cfg('author') !== '') $o .= '<span>' . tsx_icon('user') . ' By ' . e(ts_cfg('author')) . '</span>';
        if (!empty($p['tags'])) $o .= '<span>' . tsx_icon('folder') . ' ' . tsx_tag_links($p['tags']) . '</span>';
        if (isset($p['minutes'])) $o .= '<span>' . tsx_icon('clock') . ' ' . (int) $p['minutes'] . ' min read</span>';
        if ($readMore) $o .= '<span class="tsx-more"><a class="btn-xs" href="' . e(ts_url($p['slug'])) . '">Read more</a></span>';
        return $o . '</div>';
    }
}
