# Architecture

How the blog is built, for anyone who wants to understand it, change it or extend it. You do not need any of this to use the blog.

## Design rules

- **Works the moment it is uploaded.** No settings file, no server rules, no root access. Every feature that needs the server to cooperate has a fallback that does not.
- **Files first.** Posts are Markdown files. The database is optional.
- **No dependencies.** No Composer packages and no framework. The Markdown renderer, router, feed, sitemap, settings and login are all in `lib/`.
- **One path in.** Every request that is not a real file goes to `index.php`.
- **Public pages ship almost nothing.** No cookies, no framework, one stylesheet and one tiny script.

## Folder map

```
index.php              tiny bootstrap: PHP version check, then lib/front.php
config.sample.php      optional overrides (copy to config.php)
.htaccess, .user.ini   optional extras for Apache and PHP-FPM hosts
lib/
  front.php            public router
  app.php              URLs, HTTP, sessions, CSRF, feed, sitemap
  settings.php         settings layers, private data files, folder setup, health checks
  store.php            the store interface and both drivers
  markdown.php         the Markdown renderer
  admin.php            the admin controller
  compat.php           fallbacks for hosts without mbstring or ctype
  version.php          the installed version, plus the built-in update address and public key
  update.php           the self updater
  vendor/              bundled third-party code (sodium_compat, used only when PHP has no sodium extension)
  views/               admin templates
theme/default/         the public theme (templates, style.css, reading.js, post.js, vendor/)
assets/admin/          admin interface: stylesheet, scripts, Themestrap plugins
content/posts/         Markdown files (file store)
uploads/               pictures
data/                  settings, password, state, caches, log
tools/migrate.php      copy posts between stores from a terminal
tools/build-release.php  builds signed update and install packages (publishers only, never shipped in packages)
release.json           the file list and hashes of the installed release
```

Every file in `lib/`, `lib/views/` and `theme/` starts with `defined('TS_ROOT') or exit;`, so none of them does anything when requested directly.

## Settings layers

`ts_boot()` builds the configuration from three sources, later ones winning:

1. `ts_defaults()` in `lib/settings.php`
2. `data/settings.php`, written by the Settings page
3. `config.php`, if present. Its keys are recorded in `locked`, which the admin uses to grey out fields

It also reads `data/state.php`, which holds facts the blog learned about the server, and derives:

| Derived value | From |
| - | - |
| `pretty` | `pretty_urls` (`on`, `off`, or `auto` with `state.pretty === true`) |
| `guard` | `post_files` (`protected`, `plain`, or `auto` with `state.exposed !== false`) |
| `base`, `url` | `SCRIPT_NAME` and the request host, unless `url` is set |

### Private data files

`ts_data_read()` and `ts_data_write()` store JSON in `data/<name>.php`, behind the guard line `<?php http_response_code(404); exit; ?>`. Writes are atomic (temp file, then rename) and use mode `0600` where the host allows it.

### State

| Key | Meaning |
| - | - |
| `pretty` | `true` once a clean address has reached the blog or the browser test succeeded |
| `exposed` | `true` if a visitor could download a file inside `content/`, `false` if not, absent if unknown |
| `sqlite_file` | The random name of the SQLite database |

### Self-setup

`ts_prepare_dirs()` runs on every request. It creates `data/`, `content/posts/` and `uploads/` if missing, and drops `index.html` and `.htaccess` files and a probe file `content/ts-probe.txt` in them. All errors are silenced, because the health check reports what could not be done.

## The life of a request

1. The web server hands any request that is not a real file to `index.php` (and `php -S` serves real files itself). On PHP older than 8.1 a friendly page is shown instead.
2. `lib/front.php` loads the settings, installs error handlers (errors are logged to `data/log.php` and shown as a friendly page), and opens the store.
3. It works out the route. A request that arrives as `index.php?r=tag/design` uses the `r` parameter. Otherwise it uses the path, minus the folder prefix. A clean address that reaches the router proves pretty links work, and the blog records that in the state file.
4. The first path segment picks a route. A route asks the store for posts, renders a theme template through `ts_page()`, and sends the result with `ts_send()`, which adds an `ETag` and answers `304 Not Modified` when nothing changed.

## Two link styles

| Style | Looks like | Needs |
| - | - | - |
| Pretty | `/my-post` | The server sends unknown paths to `index.php` |
| Plain | `/index.php?r=my-post` | Nothing |

`ts_url($route)` builds links to pages. `ts_file($path)` builds links to real files. `ts_abs()` adds the domain. The `r` parameter is honored in both styles, so `index.php?r=admin/settings` always works, even if pretty links are forced on and broken. That address is the recovery route.

### Detecting pretty links

| Signal | When |
| - | - |
| Evidence | A request reached the router with a clean path (not `/`, not `index.php`) |
| Browser test | During setup and on **Test my server again**, `assets/admin/probe.js` fetches `/ts-probe`. The router answers it with `tsblog-probe`; a server without the rules answers with its own "not found" page |

Until one of them succeeds, links are plain.

### Detecting exposed folders

The same script fetches `content/ts-probe.txt`. If the text `tsblog-private-probe` comes back, the server hands out private files, and `state.exposed` is set to `true`. The store then writes `.md.php` files with a guard line. If the file cannot be fetched, `state.exposed` is `false` and plain `.md` files are used. If the test could not run, the blog stays on the safe, protected format.

## Public routes

| Route | Shows |
| - | - |
| `/` and `/page/N` | The post list |
| `/tags` | The tag index |
| `/tag/{tag}` and `/tag/{tag}/page/N` | Posts with a tag. Case-insensitive |
| `/search?q=…` | Search results, up to 50, never cached, marked `noindex` |
| `/feed.xml` | RSS 2.0 with full content |
| `/sitemap.xml` | Posts, pages and tags |
| `/robots.txt` | Allows crawling, blocks `/admin` and `/search`, points to the sitemap |
| `/ts-probe` | Plain text used by the setup test |
| `/{address}` | One post or page |
| anything else | The 404 page |

In plain style, each of these is `index.php?r=<route>`. A page number past the last page, an unknown tag and an unknown address all return a real `404` status.

### Search

Words are split on spaces, and a post must contain **all** of them. A match in the title, summary or tags counts three times as much as a match in the first 4,000 characters of the body. Ties go to the newer post.

## Admin routes

Everything under `/admin` is protected. Unsigned visitors see the sign-in form, or the first-run setup when no password exists.

| Method and route | Does |
| - | - |
| `GET /admin` | Post list |
| `GET /admin/new` | New post editor |
| `GET /admin/edit/{address}` | Edit a post |
| `GET /admin/settings` | Settings page, including health |
| `GET /admin/backup` | Download a zip of posts, pictures and settings |
| `POST /admin/setup` | First-run setup. Only works when no password exists |
| `POST /admin/login`, `/admin/logout` | Sign in and out |
| `POST /admin/save`, `/admin/delete` | Create, update, delete. JSON |
| `POST /admin/upload` | Upload a picture. JSON with its URL |
| `POST /admin/render` | Markdown to HTML for the preview and Simple mode. Turns `<!--more-->` into `<hr data-more>` |
| `POST /admin/settings`, `/admin/password` | Save settings, change password |
| `POST /admin/probe` | Record the browser test results |

Every `POST` after sign-in needs a valid CSRF token, sent in an `X-CSRF-Token` header or a `_csrf` field. JSON responses look like this:

```json
{ "ok": true, "slug": "my-post", "status": "published", "url": "/my-post", "edit": "/admin/edit/my-post" }
{ "ok": false, "errors": ["A title is required."] }
```

## The store interface

`lib/store.php` defines `TSStore`. A driver implements four methods:

| Method | Returns |
| - | - |
| `index()` | Every post as an array, without the body |
| `get($slug)` | One post with its body, or `null` |
| `write($post, $oldSlug)` | Saves a post, removing the old address when it changed |
| `remove($slug)` | `true` if something was deleted |

Everything else is shared: `prepare()` (validation and normalizing), `published()`, `byTag()`, `tags()`, `search()` and `all()`. To add a third store, extend `TSStore`, implement the four methods, and add it to `TSStore::open()`.

`TSFileStore` also takes a `$guard` flag (see Storage) and offers `reformat()`, which rewrites every post in the current format. The Settings page calls it when the format changes.

A post is an array like this:

```php
[
  'slug' => 'my-post', 'title' => 'My post', 'date' => '2026-10-02 09:00', 'updated' => '2026-10-03 14:30',
  'status' => 'published', 'type' => 'post', 'tags' => ['notes'],
  'description' => '', 'image' => '', 'body' => "Markdown…\n",
]
```

Index entries also carry the derived keys `excerpt`, `words`, `minutes` and `plain`.

## The Markdown renderer

`lib/markdown.php` is one class, `TSMarkdown`, covering the everyday subset of CommonMark plus tables, task lists and strikethrough. It escapes raw HTML unless told otherwise and restricts link and image schemes. It also provides `excerpt()` and `wordCount()`. Rendering is a block pass followed by an inline pass.

## Health checks

`ts_health()` returns a list of items with a level (`ok`, `warn`, `fail`), a label and a plain-language detail: PHP version, writability of the three folders (by actually writing a temporary file), the upload limit, HTTPS, link style, private-file state, and the latest log lines. The setup page shows only failures; Settings shows all of them.

## The admin interface

The editor page is a plain HTML form enhanced by `assets/admin/editor.js`, which wires Themestrap plugins together:

| Plugin | Role |
| - | - |
| `PluginAuth` | The sign-in and first-run setup forms (validation, show/hide password, strength meter, inline errors, lockout countdown) |
| `PluginCalendar` | The publish date picker in the post settings |
| `PluginTimePicker` | The publish time, beside the calendar. Keeps `HH:mm` in the original input |
| `PluginSelect` | Every dropdown: the post type in the editor, and all six in Settings |
| `PluginNumberInput` | The number fields in Settings (posts per page, posts in the feed) |
| `PluginRichEditor` | Simple mode, with Markdown typing shortcuts and Markdown output |
| `PluginMarkdownEditor` | Markdown mode, with toolbar and preview |
| `PluginTagsInput` | The tag field. Pastes split into separate tags, and its options mirror `TSStore::parseTags` (the characters removed, case-insensitive duplicates, the limit of 20) so the chips match what the server keeps |
| `PluginDialog` | Every question or notice, through `PluginDialog.confirm()` and `alert()`. The admin never uses the browser's own `confirm()` or `alert()` boxes |
| `PluginToolbar`, `PluginMarkdown` | Used by the editors |

### Prompts and form controls

`assets/admin/prompts.js` wraps `PluginDialog.confirm()` and `alert()` as `tsPrompt.confirm()` and `tsPrompt.alert()`, with the admin's button styles, and falls back to the browser's own boxes only if the plugin is missing. The delete confirmation, the "leave without saving" question, and the update prompts all use it.

Leaving the editor with unsaved changes is covered twice. Clicking a link inside the page asks through a dialog. Closing or reloading the tab still shows the browser's own warning (`beforeunload`), because no script is allowed to replace that one.

`assets/admin/settings-ui.js` turns the Settings dropdowns into `PluginSelect` and the number fields into `PluginNumberInput`. The real `<select>` and `<input>` elements stay in the form and keep the values, so saving works exactly as before. `assets/admin/admin.css` maps each plugin's `--ts-*` colour tokens to the admin palette in light and dark.

### Admin files are versioned

Every admin script, stylesheet and icon font is linked as `file.js?v=<modification time>` (`ts_file_v()` in `lib/app.php`). When an update or a re-upload changes a file, its address changes too, so a browser can never keep running an old script against a page that expects the new one. Without this, a cached `editor.js` from before an update could leave a new control (such as the time picker) as a plain, unwired box.

### Sign-in and setup

The forms are real HTML forms, enhanced by `PluginAuth` with the `modx` adapter (form-encoded posts). The same endpoints serve both cases:

| Request | Reply |
| - | - |
| Carries `X-Requested-With: XMLHttpRequest` or `Accept: application/json` | JSON: `{ "ok": true, "redirect": "/admin" }`, or `{ "ok": false, "message": "…", "errors": { "password": "…" }, "retryAfter": 540 }` with status 401, 403, 422 or 429 |
| An ordinary form post | A redirect, or the page again with the message |

`ts_wants_json()` makes the choice, and `ts_auth_fail()` and `ts_auth_ok()` in `lib/admin.php` build the replies. During setup, `auth-init.js` adds the browser's time zone and the results of the server tests to the data (`beforeSubmit`). The scripts are external files because the admin's Content Security Policy blocks inline scripts.

Markdown is always the source of truth. Switching to Simple mode renders the Markdown on the server (`/admin/render`) and loads the result. Switching back converts the content to Markdown in the browser. Pictures are shrunk with a canvas before upload when they are large. The public site loads none of this.

## The updater

`lib/update.php` implements the whole flow, and the admin calls it through `POST /admin/update` with `op` set to `check`, `check_cached`, `install` or `restore`. Everything is JSON.

| Step | Where |
| - | - |
| Read the manifest (`latest.json`) over HTTPS, cache the result in `data/state.php` for 12 hours | `ts_update_check()` |
| Download the zip, compare its SHA-256, verify an Ed25519 signature (`ts_update_sodium()` loads the bundled pure-PHP implementation when the extension is missing) over `tsblog\|version\|sha256` against `TS_UPDATE_KEY` | `ts_update_install()` |
| Validate every entry (allowed folders, no links or `..`, size limits), match each file to `release.json`, parse every PHP file | `ts_update_install()`, `ts_update_allowed()` |
| Back up changed and removed files to `data/backups/<id>/`, write the new files (temp file, then rename), verify hashes, delete files the old release listed and the new one does not | `ts_update_install()` |
| On any failure, put the backup back | `ts_update_rollback()` |
| Pause the site with `data/updating.lock` (visitors get a 503 with `Retry-After`) | `ts_update_lock()`, `lib/front.php` |

`tools/build-release.php` is the other half. It bakes the version, update address and public key into `lib/version.php`, writes `release.json`, zips the program files, and signs the zip's hash with the secret key.

## Extending

| To... | Do this |
| - | - |
| Add a route | Add a block in `lib/front.php` before the single-post route, using `ts_page()` and `ts_send()` |
| Add a setting | Add it to `ts_defaults()`, `ts_settings_clean()` and the Settings view |
| Add a field to posts | Add it to `prepare()`, both drivers, the front matter functions, and the editor's settings panel |
| Change Markdown behavior | Edit `lib/markdown.php`. The admin preview follows automatically |
| Add a template | Create `theme/mine/name.php` and call `ts_page('name', $vars, $meta)` |
| Sign in with something else (SSO, a directory) | Replace `ts_auth_ok()`/`ts_auth_fail()` callers in `ts_admin()`. The form needs no change, because `PluginAuth` only needs the JSON shape above |

The PHP is about 2,100 lines in total.
