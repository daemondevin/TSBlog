# Troubleshooting

Find what you see, then follow the fix. A checklist is at the end. Most problems are one folder permission or one setting.

**First stop:** sign in and open **Settings**. The **Health** section at the bottom checks your server and explains in plain words what is wrong and how to fix it.

## Before you can sign in

### I see “One quick change is needed” about PHP

Your hosting runs an old PHP. In your hosting control panel look for **PHP version** or **Select PHP version**, choose 8.1 or higher, and reload.

### The setup page shows a red box, “One thing needs fixing first”

The blog cannot write to a folder. In your file manager, right-click the folder named in the box, choose **Permissions**, and set it to `755`. Click **Check again**. If the box stays, try `775`, then `777`.

### Only the home page works, other addresses say “not found”

That cannot happen with plain links, so check for these:

- You switched Page links to **Always pretty** on a server that cannot do it. Open `yoursite/index.php?r=admin/settings` (this address works on every server), set **Page links** to **Automatic**, and save.
- You are using a configuration file that forces `'pretty_urls' => 'on'`. Remove that line.

### A blank white page

PHP hit an error and is hiding it. In a file manager, open `data/log.php` (or ask your host for the PHP error log). Or create a `config.php` with `<?php return ['debug' => true];` to see the message on the page, then delete it afterward.

### “The blog could not start”

The message on the page says why. Common ones:

| Message | Fix |
| - | - |
| This server does not have SQLite support | Open `yoursite/index.php?r=admin/settings` and choose **Files** for storage, or set `'store' => 'files'` in `config.php` |
| Anything about a folder | Set that folder's permissions as described above |

### The page has no styling

The `theme/` folder was not uploaded, or Settings names a theme that does not exist (the blog falls back to `default` automatically). Upload the whole `theme` folder again.

### I can’t sign in, or I keep landing back on the sign-in form

- The browser must accept cookies for your site.
- The blog must be able to write to the `data` folder (see the permissions fix above).
- After five wrong passwords, wait ten minutes, or delete `data/login.php`.

### I forgot my password

1. In your file manager, delete the file `data/admin.php`.
2. Open `yoursite/admin`. It asks you to choose a new password, like the first time.

If you set `admin_password_hash` in `config.php`, replace it with a new hash instead (see [Settings](configuration.md#the-optional-configphp)). Because this works by file access, anyone who can write to `data/` can reset the password, so keep that folder private.

## After you are in

### The links are long and look like `index.php?r=…`

Nothing is wrong. Your server uses plain links, which work everywhere. If you want pretty ones and you use Apache, make sure the hidden file `.htaccess` was uploaded, then press **Test my server again** in Settings. See [Hosting](deployment.md#pretty-links).

### My post is not on the site

1. **Status.** A draft is hidden. Open it and click Publish.
2. **Date.** A future date means scheduled. It appears when the time comes, in your time zone (see Settings).
3. **Type.** A **Page** appears in the menu, not in the post list.
4. **Hand-made files.** The file name must be lowercase letters, numbers and dashes, ending `.md` or `.md.php`, and the front matter must start on the first line (after the guard line, in protected files).

### The summary on the home page is wrong

A summary typed in the post settings always wins. Clear it to use the automatic one. Otherwise type `<!--more-->` on its own line where you want the summary to end. See [Writing](writing.md#the-summary-marker).

### “The address … is reserved” or “Another post already uses the address”

Pick another address in the post's settings panel. Reserved names are listed in [Writing](writing.md#reserved-addresses).

### “Your session expired” when saving

You were signed out. Copy your text, reload, and sign in again. The editor also keeps a copy in the browser and offers to restore it.

### “The blog could not save your post”

The `content/posts` folder is not writable. Set its permissions to 755 (or 775/777).

### Picture upload fails

| Message | Cause and fix |
| - | - |
| “That picture is too big for this server” | The picture is bigger than the server allows even after shrinking. Use a smaller one, or raise the limits (see [Hosting](deployment.md#php-settings)) |
| “Please use a JPG, PNG, GIF or WebP picture” | Convert it. SVG and other types are not accepted |
| “…the uploads folder is not writable” | Set the `uploads` folder's permissions to 755 (or 775/777) |
| Fails with no message on nginx | nginx's `client_max_body_size` is too small. See [Hosting](deployment.md#php-settings) |

### The sign-in button says “Try again in 9:41”

Five wrong passwords lock sign-in for ten minutes, and the button counts down. To clear it sooner, delete `data/login.php` in your file manager.

### There is no progress bar, or no “keep reading” fade, on posts

Both only appear on post pages (not the home page), and each has a switch under **Settings → Reading aids**. The progress bar hides itself when the whole post fits on the screen, and the fade only shows while there is more of the post below. If the fade shows as a coloured band, your theme's `--ts-ss-fade` does not match its background (see [Themes](themes.md#reading-aids-on-post-pages)).

### The calendar in the post settings looks plain or oversized

It needs the files in `assets/admin/`. Upload that folder again. In a very narrow window it shrinks to fit the settings panel.

### The editor looks unstyled or the toolbar has no icons

Files in `assets/admin/` did not upload. Upload the `assets` folder again, including `assets/admin/fa/webfonts/`.

### The preview is blank

Your session probably expired. Reload and sign in. If it happens again, press F12 in your browser, open the Console, and look for a red message.

### Tables or embeds look wrong in Simple mode

Simple mode keeps most things but not raw HTML or embeds. A post that contains HTML opens in Markdown mode automatically. See [Writing](writing.md#limits-of-simple-mode).

### Backup says the server cannot make zip files

Copy the `content`, `uploads` and `data` folders with your FTP program instead.

### A control in the admin looks plain or does nothing

If the time picker, a dropdown or a stepper shows up as an ordinary box, the browser is almost certainly running an old copy of a script. Admin files are versioned so this should fix itself on the next page load. If it does not, press **Ctrl + F5** (or **Cmd + Shift + R** on a Mac) once, and check that the whole `assets` folder was uploaded.

## Updates

### The Updates card says automatic updating is not available

It lists exactly what is missing. The usual causes are no update address (set one under Settings → Advanced), a program folder the blog cannot write to (set it to 755, or 775/777), or the `zip` PHP extension being missing (your host's PHP settings page lists extensions). A missing `sodium` extension is not a problem, the blog carries its own copy. You can always update by hand, see [Updates](updates.md#manual-updating).

### “Nothing was found at the update address (404)”

The Updates card shows the address it tried under “Looking at”. Open that address in a browser: it should show a small block of text starting with `{"name": "Themestrap Blog", …`. If you get a “not found” page instead:

- On GitHub, the release must be **published** (not a draft) and have `latest.json`, the zip and the install zip **attached**. Pre-releases are skipped by GitHub's “latest”.
- Check the repository name in the address, and that it is not private (a private repository cannot be reached without a login).
- If you host the files yourself, check that `latest.json` is in the folder the address names.

### “That address did not return update information”

The address answered, but with a web page rather than `latest.json`. Use the address of `latest.json`, its folder, or a GitHub repository address. See [which address goes where](updates.md#which-address-goes-where).

### “Could not reach the update server”

The server could not connect. If the message mentions a certificate, your host's list of trusted certificate authorities is out of date. Ask the host to update it, or update by hand (see [Manual updating](updates.md#manual-updating)). If it mentions a timeout, try again later.

### I fixed the address but it still shows an error

Press **Check for updates**, which always looks again. Automatic checks retry a failed check after ten minutes, and a changed address is checked straight away.

### “The update’s signature is not valid”

The release was not signed with the key this blog trusts. The message names both keys by fingerprint ("signed with key X, but this blog trusts key Y"), and the Updates card shows the one your blog trusts. The usual cause is that a **second signing key** was made and used for a release.

To find out, on the publisher's computer run `php tools/build-release.php --show-key` and compare the fingerprint with the one in the blog's Updates card.

**If you still have the original key** (look for other copies of `release.key` and in `~/.tsblog/`): rebuild the release with it, `--key PATH-TO-ORIGINAL`, and upload the three files again.

**If the original key is gone or you want to move to the new one:**

- To fix a blog right now, update it by hand once (see [Manual updating](updates.md#manual-updating)). The release you upload carries the new key, so the blog trusts it from then on. Or, on that blog, set the new public key in `config.php`: `'update_public_key' => 'CONTENTS-OF-release.key.pub'`.
- To avoid this next time, use `--rotate-to` when changing keys (see [Changing the signing key](updates.md#changing-the-signing-key)).

Other things that produce the same message:

- `latest.json` was edited by hand. The signature covers the version, so changing it breaks the signature.
- The key in `config.php` (`update_public_key`) is the secret key. It must be the public key from `release.key.pub` (44 characters). A different message appears for that case.
- The zip and `latest.json` come from different builds. Re-upload all three files from one build together.

Nothing was changed on your site in any of these cases.

### “The downloaded update does not match its checksum”

The download was cut short or the files on the server are out of step. Try again. If it repeats, the publisher should re-upload `latest.json` and the zip together.

### “Could not replace …” or “The previous version was put back”

A file could not be written, so the blog restored everything it had changed. Check folder permissions, then try again.

### The site says “Updating…” and stays that way

An update was interrupted. The pause lifts by itself after five minutes. To clear it now, delete `data/updating.lock` in your file manager.

### I installed an update and something looks wrong

Settings → Updates → **Go back**. If the admin itself is broken, restore by hand: copy the files from the newest folder in `data/backups/*/files/` back over the site, keeping the same paths, and delete the files listed under `added` in that folder's `meta.json`.

## Where the blog records problems

The last 100 problems are written to `data/log.php`, which is private. Settings → Health shows the most recent ones. Open the file in your file manager to read the rest.

## Checklist

Work through these in order and stop at the first that fails.

1. The site address shows the blog, not a server error page.
2. `yoursite/admin` shows either the setup page or the sign-in form.
3. Settings → Health shows no red items.
4. The PHP version in your hosting control panel is 8.1 or newer.
5. The `data`, `content/posts` and `uploads` folders are set to 755 (or 775/777).
6. `yoursite/index.php?r=admin` works. If it does and `yoursite/admin` does not, the problem is pretty links: switch Page links to Automatic.
7. `data/log.php` has no recent entries, or the entries explain the problem.
8. In your browser, F12 → Network tab shows no red (failed) requests for the page that is misbehaving.
