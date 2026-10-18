# Themes

A theme controls everything readers see. The default theme is small on purpose: about 6 KB of CSS, a 0.7 KB script, system fonts and no frameworks. You can restyle it, or make your own.

## Included themes

| Theme | What it is |
| - | - |
| `default` | Small and quiet: one column, system serif text, about 6 KB of CSS |
| `themestrap` | A blog layout in the style of Themestrap: sticky header, page header with breadcrumb, large entries with a date badge, a sidebar (search, categories, recent and updated posts, tags) and a dark footer. It shows every [entry format](writing.md#entry-formats): a standard image, a slider, a gallery with a lightbox, video, audio and CodePen embeds |

Choose one in Settings (Theme) or with `'theme' => 'themestrap'` in `config.php`. To recolor `themestrap`, change `--accent` (and the dark mode value under `[data-theme=dark]`) at the top of its `style.css`.

The `themestrap` theme has no dependencies: its slider, lightbox, tabs, menu and dark mode are one small `theme.js`. It does not need Bootstrap, jQuery (except the optional "keep reading" fade) or an icon font.

## Make your own theme

Never edit `theme/default/` or `theme/themestrap/` directly, because an update would overwrite your changes.

1. Copy `theme/default` to `theme/mine`.
2. Set `'theme' => 'mine'` in `config.php`.
3. Edit the files in `theme/mine/`.

For a quick color change, edit the variables at the top of `style.css`. They define the whole palette in both light and dark mode:

```css
:root {
    --bg: #fff;
    --fg: #1f2937;
    --muted: #6b7280;
    --line: #e5e7eb;
    --accent: #0b8a83;
    --accent-fg: #fff;
    --code: #f3f4f6;
    --card: #f9fafb;
    --w: 42rem;
}
```

`--w` is the width of the reading column. The dark palette is the second set of the same variables, used when the reader's system prefers dark or when they press the toggle.

## Files in a theme

| File | Renders |
| - | - |
| `layout.php` | The frame around every page: `<head>`, header, menu, footer |
| `home.php` | The home page, tag pages and search results (lists of posts) |
| `post.php` | One post or page |
| `tags.php` | The tag index |
| `404.php` | The not-found page |
| `style.css`, `theme.js` | Your assets. Names are up to you, since `layout.php` links them |

Every template is plain PHP with HTML. There is no template language to learn.

## Variables each template receives

### `layout.php`

| Variable | Contents |
| - | - |
| `$content` | The HTML of the page template. Print it unescaped: `<?= $content ?>` |
| `$meta` | An array describing the page, see below |
| `$pages` | The posts of type `page`, for the menu. Each has `slug` and `title` |

`$meta` keys:

| Key | Meaning |
| - | - |
| `title` | The full page title for `<title>` |
| `description` | Meta description text |
| `canonical` | Absolute canonical URL, or empty |
| `image` | Absolute image URL for social cards, or empty |
| `type` | `website` or `article` (the Open Graph type) |
| `noindex` | `true` for search, drafts, scheduled posts and not-found pages |
| `published`, `modified` | Dates of a post, for article tags |
| `tags` | The post's tags |
| `jsonld` | Structured data array for a post, or `null` |

### `home.php`

| Variable | Contents |
| - | - |
| `$posts` | The posts to list, see the post fields below |
| `$page`, `$pages` | The current page number and the page count |
| `$base` | The route the list lives at, such as `''` or `tag/design`, for building page links |
| `$newer`, `$older` | URLs of the neighboring pages, or `null` |
| `$heading` | A heading such as `Tagged “design”`, or `null` on the home page |
| `$search` | Set only on the search page: the text that was searched |

### `post.php`

| Variable | Contents |
| - | - |
| `$post` | The post, with `html` (the rendered body), `body` (the Markdown), `words` and `minutes` added |
| `$prev`, `$next` | The older and newer post (list fields only), or `null` |
| `$live` | `false` when a signed-in author is previewing a draft or scheduled post |

### `tags.php`

| Variable | Contents |
| - | - |
| `$tags` | A list of `['name' => 'Design', 'count' => 3]`, most used first |

### Post fields

Posts in lists have these keys: `slug`, `title`, `date`, `updated`, `status`, `type`, `tags` (array), `description`, `image`, `format`, `media` (array), `excerpt`, `words`, `minutes`. A full post adds `body` and, on the post page, `html`.

## Helper functions

| Function | Use |
| - | - |
| `e($text)` | Escape text for HTML. Use it on everything you print, except `$content` and `$post['html']` |
| `ts_url('route')` | A link to a page of the blog, correct in a subfolder and in both link styles: `ts_url('tag/design')`. Pass raw names, never pre-encoded ones. It encodes for you |
| `ts_file('path')` | A link to a real file such as an image, stylesheet or script: `ts_file('uploads/photo.jpg')` |
| `ts_route_field('route')` | For forms that submit with GET: outputs the hidden field plain links need, or nothing when pretty links are on |
| `ts_abs('route')` | A full address with the domain, for feeds and social tags |
| `ts_date($date, $format)` | Format a date. Without a format, uses `date_format` from config |
| `ts_asset('file')` | The URL of a file in your theme, with a version for cache busting |
| `ts_cfg('key')` | Read a setting from `config.php`, such as `ts_cfg('title')` |
| `ts_render($markdown)` | Render Markdown to HTML |
| `ts_media($post)` | What a post's format shows, or `null` for a standard post. An array with a `kind`: `images` (with `items` and `mode`), `iframe`, `video` or `audio` |
| `TSMedia::html($media, 'class')` | Safe markup for a resolved player. Classes are `class`, `class-frame`, `class-16x9` and so on, for you to style |
| `TSMedia::firstImage($post)` | The cover image, or the first picture of a slider or gallery |

`$GLOBALS['ts_admin']` is `true` when the author is signed in, which the default theme uses to show an Edit link.

## Examples

A post list entry:

```php
<?php foreach ($posts as $p): ?>
  <article>
    <h2><a href="<?= e(ts_url($p['slug'])) ?>"><?= e($p['title']) ?></a></h2>
    <time datetime="<?= e(date('c', strtotime($p['date']))) ?>"><?= e(ts_date($p['date'])) ?></time>
    <p><?= e($p['description'] ?: $p['excerpt']) ?></p>
  </article>
<?php endforeach; ?>
```

A search form that works with both link styles:

```php
<form action="<?= e(ts_url('search')) ?>" role="search"><?= ts_route_field('search') ?>
  <input type="search" name="q">
</form>
```

A footer line with the author:

```php
<footer>© <?= date('Y') ?> <?= e(ts_cfg('author')) ?></footer>
```

## Keep it fast

- Keep CSS in one file and load it from `<head>`. The default does.
- Prefer system fonts. A web font costs a request and a layout shift.
- Add a script only when it earns its place. The public pages send a Content Security Policy that allows scripts only from your own site, so inline `<script>` blocks will not run. Put code in a `.js` file in your theme. Post pages also allow inline styles when the “keep reading” fade is on, because Themestrap plugins add their CSS that way.
- Players from entry formats (YouTube, Vimeo, CodePen, SoundCloud, Spotify) are always allowed by the Content Security Policy. Any other iframe, typed by hand into a post, needs `'allow_html' => true`.

## Reading aids on post pages

`post.php` adds two optional features, each controlled by a setting (see [Settings](configuration.md#reading-aids)):

| Feature | Markup and files |
| - | - |
| Reading progress bar | `<div class="progress-reading" … data-reading-target=".prose"><div class="progress-bar"></div></div>` and `reading.js` (no dependencies). The bar tracks the element named by `data-reading-target`, from the top of the post to its end |
| “Keep reading” fade | `vendor/jquery.min.js`, `vendor/themestrap.plugin.scrollshadow.js` and `post.js`, loaded with `defer` on post pages only |

The markup and class names (`.progress-reading .progress-bar`) match the Themestrap framework's own Reading Progress snippet, so a Themestrap page can use the same bar. Style them in your theme's CSS:

```css
.progress-reading { position: fixed; top: 0; left: 0; right: 0; height: 3px; }
.progress-reading .progress-bar { height: 100%; width: 0; background: var(--accent); }
:root { --ts-ss-fade: var(--bg); }   /* the fade dissolves into the page background */
```

`--ts-ss-fade` must match the page background, or the fade shows as a coloured band. To leave these features out of your own theme, drop the markup and the `<script>` tags from `post.php`.

## Things to leave alone in `layout.php`

These make the built-in features work, so keep them when you restyle:

| Keep | Because |
| - | - |
| The RSS `<link rel="alternate">` | Feed readers find your feed with it |
| The `<title>`, description, canonical and Open Graph tags | They are your SEO |
| The JSON-LD `<script type="application/ld+json">` block | Structured data for search engines |
| `data-theme-toggle` on the dark mode button, and `theme.js` in the `<head>` | The toggle, and no flash of the wrong theme on load |
