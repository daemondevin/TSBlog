# Hosting and deployment

## Short version

On ordinary shared hosting you do not have to do anything except upload the files and open `/admin`. The blog adapts to your server by itself:

- Pretty links need server rules. If they are missing, the blog uses plain links that work everywhere.
- Some servers hand out private files. If yours does, the blog stores posts in a protected format.
- If a folder cannot be written to, the setup page tells you in plain words which one and how to fix it.

Everything in the rest of this page is optional, for people who want pretty links on a server that needs a nudge, or who want to tune things.

## Shared hosting (cPanel, Plesk and similar)

1. Upload the contents of the `tsblog` folder to `public_html` (or a subfolder).
2. Check that PHP is 8.1 or newer: look for **PHP version** or **Select PHP version** in the control panel.
3. Open `yoursite/admin` and answer the three questions.

No root access, no command line and no configuration are needed. If you want a free security certificate, look for **SSL** or **Let’s Encrypt** in the control panel and switch it on. Then open the site with `https://`. Settings → Health tells you if your connection is not secure.

## If the setup page shows a red box

The blog could not write to a folder. This is the most common first-run problem, and it is fixed in your file manager:

1. Find the folder named in the red box (`data`, `content/posts` or `uploads`).
2. Right-click it and choose **Permissions** (or **Change permissions**).
3. Set it to `755`. If the box is still there after you click **Check again**, try `775`, then `777`.

Once saved, the red box disappears. These three are the only places the blog writes to.

## Pretty links

Pretty links look like `/my-post`. Plain links look like `/index.php?r=my-post`. Both work. The blog starts with plain links and upgrades to pretty ones automatically when it detects that your server supports them.

### Apache (most shared hosting)

Nothing to do. The included `.htaccess` file turns pretty links on, and the blog detects that during setup. Make sure `.htaccess` was uploaded (it is a hidden file). The server needs `mod_rewrite` and must allow `.htaccess` files, which is standard.

### nginx, Caddy and others (advanced, optional)

On shared hosting you usually cannot change these. If you can, add the rules below. Then open **Settings → Advanced → Page links** and press **Test my server again** in the Health section. Without these rules, the blog simply keeps using plain links.

nginx:

```nginx
server {
    server_name example.com;
    root /var/www/blog;
    index index.php;

    client_max_body_size 20m;

    location / { try_files $uri $uri/ /index.php?$query_string; }

    location ~ ^/(lib|data|content|tools)/ { deny all; }
    location = /config.php                 { deny all; }
    location ~ ^/uploads/.*\.php$          { deny all; }

    location ~ \.php$ {
        include fastcgi_params;
        fastcgi_pass unix:/run/php/php-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
    }
}
```

The `deny` rules are optional extras. Private files are already stored in a form that is safe to serve, but denying direct access is still good practice. Find your PHP socket with `ls /run/php/`; it may be versioned, such as `php8.3-fpm.sock`, or a TCP address like `127.0.0.1:9000`. Test with `sudo nginx -t && sudo systemctl reload nginx`.

Caddy:

```
example.com {
    root * /var/www/blog
    @private path /lib/* /data/* /content/* /tools/* /config.php
    respond @private 403
    php_fastcgi unix//run/php/php-fpm.sock
    file_server
}
```

### In a subfolder

Upload into `/blog/` and open `/blog/admin`. Links, the feed and the sitemap follow the folder automatically. On Apache nothing else is needed. On nginx, put the rules under `location /blog/` and make the `try_files` fallback `/blog/index.php?$query_string`.

## HTTPS

Turn it on in your host's control panel, then visit the site with `https://`. The blog does not redirect for you, so enable the redirect at the host (usually a toggle called “Force HTTPS”). Behind a proxy or load balancer, make sure it sends `X-Forwarded-Proto: https`, and consider setting the site address in Settings → Advanced.

## PHP settings

A `.user.ini` file in the blog folder asks PHP for a 16 MB upload limit and hides error messages from visitors. Hosts that use PHP-FPM or CGI (most of them) honor it. Hosts that do not simply ignore it.

You rarely need to care: pictures are shrunk in your browser before uploading, so even a 2 MB server limit handles phone photos. If you want the limit raised anyway, set these in your host's PHP settings page, `php.ini`, or `.user.ini`:

| Setting | Typical default | Suggested |
| - | - | - |
| `upload_max_filesize` | `2M` | `16M` |
| `post_max_size` | `8M` | `20M` |

nginx also has its own `client_max_body_size` (default 1 MB). Raise it to match, or uploads fail with a 413 error.

## Caching and CDNs

- HTML pages send an `ETag` and `Cache-Control: public, max-age=0, must-revalidate`. Browsers and CDNs revalidate cheaply, and you never see stale posts.
- Search results, the admin, and post pages while you are signed in are never cached.
- Theme and admin files include a version in their address that changes when you edit them, so the long cache on static files is safe.

## Backups

Easiest: **Settings → Download a backup**. It gives you a zip of posts, pictures, settings and your password file.

By hand: copy these.

| Back up | Contains |
| - | - |
| `content/` | Your posts (file storage) |
| `uploads/` | Your pictures |
| `data/settings.php`, `data/admin.php`, `data/state.php` | Settings, password, detected server features |
| `data/blog-….db` | Your posts, when using SQLite |

To restore, upload them back. There is nothing to import or rebuild. Because posts are plain files, version control also works well. The included `.gitignore` leaves out `data/` and `uploads/`.

## Updating

There is no updater and no database to migrate. To update, replace these with the new versions and keep everything else:

| Replace | Keep |
| - | - |
| `index.php`, `lib/`, `assets/`, `theme/default/`, `tools/`, `.htaccess`, `.user.ini` | `content/`, `uploads/`, `data/`, `config.php` if you have one, any theme of your own |

If you changed files in `theme/default/`, copy them into a theme of your own first so an update cannot overwrite them. See [Themes](themes.md).

## Moving to another host

Download a backup, upload the blog to the new host, then upload the backup's folders on top. Check Settings → Health. If the address changed and you had set a Site address, update it.

## Running it on your own computer

For trying it out, from inside the blog folder:

```
php -S localhost:8000 index.php
```

Then open <http://localhost:8000/admin>. This is only a test server.
