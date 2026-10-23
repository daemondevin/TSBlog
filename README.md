# Themestrap Blog

A small, fast blog that works the moment you upload it. There is nothing to install, no database, no settings file to edit, and no server rules to write. Your posts are plain files, and you manage everything from a friendly admin page in your browser.

**Three steps**

1. Upload the folder to your web hosting (FTP, or your host's file manager).
2. Open your site and add `/admin` to the address.
3. Answer three questions (blog name, your name, a password). You are in.

That is the whole setup. It works on ordinary shared hosting with no root access, and it does not matter whether your host runs Apache or nginx.

> Do step 2 straight after uploading. The first person to open the admin page chooses the password.

## What you get

| Need | How |
| - | - |
| Writing | A simple toolbar editor for everyone, or Markdown if you like it. Paste or drop pictures |
| Settings | A Settings page for the name, time zone, look, and more. No files to edit |
| Links | Pretty links (`/my-post`) when your server allows them, plain links otherwise. Chosen for you |
| Safety | Private files stay private even on servers that ignore privacy rules |
| Backups | One button downloads a zip of everything |
| Updates | One button checks for a new version, verifies it, installs it, and can go back. Your content is never touched |
| Reading | A fast, clean theme, an RSS feed, tags, search, dark mode, a reading progress bar and a “keep reading” fade on posts |
| SEO | Titles, descriptions, social cards, sitemap, structured data |
| Drafts and scheduling | Built in |

Requirements: PHP 8.1 or newer (every major host offers it, usually under “PHP version” in the control panel).

## Documentation

| Guide | For |
| - | - |
| [Getting started](docs/getting-started.md) | Upload, set up, write your first post |
| [Writing](docs/writing.md) | The editor, Markdown reference, front matter |
| [Settings](docs/configuration.md) | Every setting, plus the optional `config.php` for advanced control |
| [Hosting and deployment](docs/deployment.md) | Shared hosting, what to do if something needs fixing, advanced server rules, backups, updating |
| [Comments](docs/comments.md) | Turning on comments, moderating, spam protection |
| [Themes](docs/themes.md) | Restyling and building your own theme |
| [Storage](docs/storage.md) | Files or SQLite, protected files, where everything lives |
| [Updates](docs/updates.md) | Installing updates, and publishing releases |
| [Security](docs/security.md) | What is protected, and what to check |
| [Architecture](docs/architecture.md) | How it works, for developers |
| [Troubleshooting](docs/troubleshooting.md) | Plain-language fixes and a checklist |

## Folder map

```
index.php          starts everything
lib/               the engine
theme/default/     the small, plain theme
theme/themestrap/  a Bootstrap style blog theme with every entry format
assets/admin/      the admin editor
content/posts/     your posts
uploads/           your pictures
data/              settings, password, caches (private)
config.sample.php  optional advanced settings (rename to config.php to use)
docs/              this documentation
```

## The admin and Themestrap

The admin is built from Themestrap plugins: `PluginAuth` (sign-in and setup), `PluginCalendar` and `PluginTimePicker` (publish date and time), `PluginSelect` (every dropdown), `PluginNumberInput` (the number fields), `PluginDialog` (every question and notice), `PluginMarkdownEditor`, `PluginRichEditor`, `PluginTagsInput`, `PluginToolbar` and `PluginMarkdown`. Copies live in `assets/admin/themestrap/` so the blog is self-contained. The public site loads only one plugin, `PluginScrollShadow`, and only on post pages (you can switch it off in Settings).
