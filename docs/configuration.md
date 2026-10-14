# Settings

Almost everything is changed on the **Settings** page in the admin. There is no file to edit. For people who want more control, an optional `config.php` can override the page. Both are covered here.

## How settings work

There are three layers. Later ones win.

1. **Built-in defaults.** The blog works with these from the first visit.
2. **The Settings page.** What you save is stored in `data/settings.php`.
3. **`config.php` (optional).** For advanced users. Anything set here overrides the Settings page, and that setting shows as *Set in config.php* and is greyed out in the admin.

Changes take effect immediately. There is nothing to restart.

## The Settings page

### Your blog

| Setting | What it does |
| - | - |
| Blog name | Shown in the header, page titles, the feed and social cards |
| Tagline | A few words added to the home page title, such as `My Blog · Notes on building for the web` |
| Description | The home page's description in search results, and the feed's description |
| Your name | Shown in the footer and in structured data. Falls back to the blog name |

### Reading

| Setting | What it does |
| - | - |
| Posts per page | How many posts a list shows before it paginates (1 to 50) |
| Date style | How dates look on the site. Choose from six styles |
| Time zone | Decides when scheduled posts go live and how dates are shown. Detected from your browser during setup |
| Language code | The language of the pages and feed, such as `en`, `fr` or `pt-BR` |

### Reading aids

| Setting | What it does |
| - | - |
| Show a reading progress bar on posts | A thin bar at the top of the screen that fills as the reader works through the post. It measures the post's own text, so the footer and the next/previous links do not count. It hides itself when the whole post fits on screen. About 1 KB of script |
| Show a “keep reading” fade on posts | A soft fade at the bottom of the screen with a small “Keep reading” pill while there is more of the post to read, plus edge shadows on wide code blocks and tables. It uses Themestrap's `PluginScrollShadow`, which needs jQuery, so it adds about 110 KB to post pages. Turn it off for the lightest possible pages |

Both are on by default. They only appear on post pages, never on the home page or lists.

### Advanced options

These are folded away on purpose. The defaults suit almost everyone.

#### Footer line

A short line added to the footer after the copyright.

#### Page links

| Choice | Meaning |
| - | - |
| Automatic (recommended) | The blog finds out whether pretty links work on your server and uses them if so |
| Always pretty | Addresses look like `/my-post`. Needs the server to send unknown addresses to `index.php`, see [Hosting](deployment.md#pretty-links) |
| Always plain | Addresses look like `/index.php?r=my-post`. Works everywhere |

Plain links are not a problem, just longer. Pretty links look nicer in search results and when shared.

Pretty links turn on by themselves when they can. In Automatic mode the blog notices when a clean address reaches it, and it also tests your server during setup and whenever you press **Test my server again**.

If you force “Always pretty” on a server that cannot do it, links break. To recover, open `yoursite/index.php?r=admin/settings`, which works on every server, and switch back to Automatic.

#### Where posts are kept

| Choice | Meaning |
| - | - |
| Files | One file per post in `content/posts`. The default. Easy to back up and to edit by hand |
| SQLite | One database file. Only offered when the server supports it |

Switching copies your posts across automatically. The old copy is left in place, so you can switch back safely. See [Storage](storage.md).

#### Post file format

| Choice | Meaning |
| - | - |
| Automatic (recommended) | Plain files when your server keeps private folders private, protected files when it does not |
| Plain `.md` files | Pure Markdown files. Nicest for hand editing and git |
| Protected `.md.php` files | Cannot be downloaded by visitors even on servers that ignore privacy rules |

Why this exists: some servers hand out any file you ask for. That would let someone read a *draft* if they guessed its address. The blog tests for this and picks the format for you.

#### Theme

Choose from the folders in `theme/`. See [Themes](themes.md).

#### Posts in the RSS feed

How many recent posts appear in `/feed.xml` (1 to 100).

#### Site address

Leave empty. The blog works out its own address. Fill it in only when your site sits behind a proxy or CDN that changes the address, or to force `https://`. Include any folder: `https://example.com/blog`.

#### Update address and automatic checks

| Setting | What it does |
| - | - |
| Update address | Where to look for new versions: the `latest.json` address, a folder that contains it, or a GitHub repository address (`https://github.com/OWNER/REPO`). Leave empty to use the one built into your copy |
| Look for updates automatically | Checks about once a day when you open the admin. Off means only when you press the button |

See [Updates](updates.md).

#### Allow HTML inside posts

Lets posts contain raw HTML, which is how video embeds work. Anyone who can sign in could then run script on your site, so turn it on only when you are the only author. Public pages also then allow `https:` frames in their security policy.

### Password

Change your password here. You need the current one. A password set in `config.php` must be changed there.

### Backup

**Download a backup** gives you a zip with your posts, pictures, settings and password file. It needs the zip feature on the server, which almost every host has. If yours does not, the page says so and tells you which folders to copy by hand.

### Health

A plain-language checklist about your server: PHP version, whether the blog can save in its folders, the biggest picture it can upload, whether the connection is secure, whether pretty links are on, and whether private files are safe. Each line says what it means and how to fix it. **Test my server again** repeats the browser-side checks.

## The optional `config.php`

You never need this. It exists for people who want settings under version control, to lock a setting so it cannot be changed from the admin, or to move folders. To use it, copy `config.sample.php` to `config.php` and remove the `//` from the lines you want.

```php
<?php
return [
    'title'    => 'My Blog',
    'timezone' => 'America/New_York',
    'pretty_urls' => 'on',
];
```

Every key:

| Key | Default | Notes |
| - | - | - |
| `title`, `tagline`, `description`, `author`, `footer` | see Settings | Text settings |
| `language` | `en` | |
| `timezone` | `UTC` (or detected) | A [PHP timezone name](https://www.php.net/manual/en/timezones.php) |
| `date_format` | `M j, Y` | Any [PHP date format](https://www.php.net/manual/en/datetime.format.php). The admin offers six, but `config.php` accepts any |
| `posts_per_page`, `feed_items` | `8`, `20` | |
| `theme` | `default` | A folder in `theme/` |
| `url` | detected | Include any folder, no trailing slash |
| `pretty_urls` | `'auto'` | `'auto'`, `'on'` or `'off'` |
| `store` | `'files'` | `'files'` or `'sqlite'` |
| `post_files` | `'auto'` | `'auto'`, `'plain'` or `'protected'` |
| `allow_html` | `false` | |
| `update_url` | built in | The update address, `https://`. A `latest.json` address, a folder, or a GitHub repository |
| `update_check` | `true` | Automatic checks when the admin is opened |
| `update_public_key` | built in | The key update packages must be signed with. `config.php` only |
| `update_allow_insecure` | `false` | Allow `http://localhost` update addresses, for testing. `config.php` only |
| `reading_progress` | `true` | Progress bar on post pages |
| `scroll_shadow` | `true` | “Keep reading” fade and edge shadows on post pages. Loads jQuery and one plugin on post pages |
| `admin_password_hash` | empty | A hash, from `php -r "echo password_hash('secret', PASSWORD_DEFAULT);"`. Overrides the stored password |
| `data_dir` | `data/` in the blog folder | Absolute path. See below |
| `content_dir` | `content/` in the blog folder | Absolute path. See below |
| `debug` | `false` | `true` shows error messages on the page instead of only logging them |

### Moving folders out of the web root

On a host where you can reach folders above the public one, you can keep private data entirely out of reach of the web:

```php
'data_dir'    => '/home/you/private/blog-data',
'content_dir' => '/home/you/private/blog-content',
```

Use absolute paths with no trailing slash. The blog creates the folders if it can. Existing files are not moved for you: copy `data/` and `content/` there first. `uploads/` must stay inside the public folder because images are served from it.

### Settings keys you cannot move to config.php

These are fixed in the code on purpose. Each is a single number you can edit if you need to.

| Limit | Value | Where |
| - | - | - |
| Image upload size | The smaller of your server's PHP limits, up to 8 MB | `ts_upload_limit()` in `lib/settings.php` |
| Image types | JPG, PNG, GIF, WebP | `ts_admin_upload()` in `lib/admin.php` |
| Tags per post | 20 | `TSStore::parseTags()` in `lib/store.php` |
| Address length | 80 characters | `TSStore::slugify()` in `lib/store.php` |
| Reading speed | 220 words per minute | `TSStore::derive()` in `lib/store.php` |
| Search results | 50 | `lib/front.php` |
| Failed sign-ins before lockout | 5 in 15 minutes, locking for 10 | `ts_throttle()` in `lib/app.php` |

Big pictures are shrunk in the browser before upload, so the server limit rarely matters. See [Hosting](deployment.md#php-settings) to raise it anyway.
