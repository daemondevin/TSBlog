# Storage

Where your posts and settings live, how the two storage options differ, and what each file in `data/` is.

## Two options, one behavior

The blog stores posts in either **files** or **SQLite**. Everything else behaves identically: the admin, the public site, the feed, search and tags. Switch any time under **Settings → Advanced → Where posts are kept**. Switching copies your posts across for you and leaves the old copy in place.

| | Files (default) | SQLite |
| - | - | - |
| Where posts live | `content/posts/`, one file per post | One file in `data/`, named like `blog-3f9a….db` |
| Needs | Nothing | SQLite support in PHP (most hosts have it; the admin tells you if not) |
| Edit with | The admin, or any text editor or FTP | The admin, or any SQLite tool |
| Version control | Excellent. Readable diffs | Poor. One binary file |
| Backups | Copy a folder | Copy one file |
| Best for | Almost everyone | Hosts where many small files are awkward |

If unsure, keep the default.

The database file has a random name that is stored in `data/state.php`, so nobody can guess its address and download it.

## Post files

Each post is a Markdown file with front matter. See [Writing](writing.md#front-matter) for every field.

```
content/posts/
  welcome-to-your-blog.md
  about.md
```

### Plain and protected files

Some servers hand out any file they are asked for. On such a server, someone could type the address of a draft and read it. The blog guards against that.

| Format | File name | When |
| - | - | - |
| Plain | `my-post.md` | Your server keeps private folders private |
| Protected | `my-post.md.php` | Your server does not, or the blog could not tell |

A protected file starts with one extra line:

```
<?php http_response_code(404); exit; ?>
---
title: My post
...
```

If a server runs it instead of handing it out, the visitor gets an empty "not found" page and never the text. The blog reads both formats at any time, and rewrites all posts when the format changes. **Settings → Advanced → Post file format** lets you force either one. When editing a protected file by hand, keep its first line.

The blog picks the format by testing your server during setup (and when you press **Test my server again**): it checks whether a harmless file in the private `content/` folder can be downloaded.

### Writing files by hand

You can create, edit, rename and delete post files directly, with or without the admin. The blog notices changes on the next visit.

A minimal post:

```
---
title: My post
date: 2026-10-02
---

Hello.
```

Name it with lowercase letters, numbers and dashes, such as `my-post.md`. Files with other names are ignored.

## SQLite

Posts live in one table, created on first use:

| Column | Holds |
| - | - |
| `slug` (primary key) | The address |
| `title`, `date`, `updated`, `status`, `type` | As in front matter |
| `tags` | A JSON array |
| `description`, `image` | As in front matter |
| `body` | The Markdown |
| `excerpt`, `words`, `plain` | Prepared when saving, for fast lists and search |

It uses write-ahead logging, so reading while saving is safe.

## What is in `data/`

Everything here is private, and every `.php` file starts with a guard line so it is safe even if a server hands it out.

| File | Holds |
| - | - |
| `settings.php` | What you saved on the Settings page |
| `admin.php` | Your password, hashed. The password itself is never stored |
| `hits-YYYY-MM.php` | Analytics records, one file per month, one line per visit or click. Not included in the backup. Delete them to clear analytics |
| `comments.php` | Every comment, whichever storage option you use. Included in the backup. Delete it to remove all comments |
| `state.php` | What the blog learned about your server (pretty links, private files) and the SQLite file name |
| `login.php` | Failed sign-in counts, for the lockout |
| `index.cache.php` | A quick index of your posts. Rebuilt on its own, safe to delete |
| `log.php` | The last 100 problems the blog recorded |
| `sessions/` | Who is signed in |
| `backups/` | The program files replaced by the last two updates, for **Go back** |
| `updating.lock` | Exists only while an update runs, and is ignored after five minutes |
| `blog-….db` | The SQLite database, only if you use it |

`index.html` and `.htaccess` files in the private folders keep them from being listed or downloaded on servers that honor them.

### The index cache

Lists need the title, date, tags and summary of every post, so the blog keeps an index. It rebuilds itself whenever a post file is added, removed, renamed or changed. You never need to clear it. To force a rebuild, delete `data/index.cache.php`.

## Moving between stores from the command line

The admin does this for you. If you prefer a terminal, from the blog folder:

```
php tools/migrate.php files sqlite
php tools/migrate.php sqlite files
```

It copies every post and leaves the source untouched. Then choose the new store under Settings. The script refuses to run from a web request.

## Growth

The blog loads the post index into memory for each request that lists posts. That is instant for hundreds of posts and comfortable into the low thousands. At tens of thousands, a database-backed blog is a better fit.

Pages for single posts read only that post, so they stay fast at any size.
