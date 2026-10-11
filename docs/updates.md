# Updates

The blog can check for a new version, download it, and install it for you. It is one button in **Settings → Updates**. This page explains how it works, how it keeps you safe, and (for whoever publishes the blog) how to release a new version.

## For site owners

### Updating

1. Open **Settings** and scroll to **Updates**. If a newer version exists you will also see a banner on the posts page.
2. Click **Check for updates** to look right now. It also looks by itself about once a day when you open the admin, unless you turn that off under Advanced options.
3. Read what is new, then click **Install version X**. Confirm.
4. The site pauses for a few seconds. When the page reloads you are on the new version.

Your posts, pictures, settings, password, `config.php` and any theme of your own are never touched. Only the blog's own program files change.

### Going back

If something looks wrong after an update, click **Go back to X** in the same place. It puts every file back exactly as it was. Each update keeps a backup; the last two are kept, so you can step back twice.

### What an update changes

| Updated | Never touched |
| - | - |
| `index.php`, `lib/`, `assets/`, `tools/`, `docs/`, `theme/default/`, `config.sample.php`, `README.md`, `release.json` | `content/`, `uploads/`, `data/`, `config.php`, `.htaccess`, `.user.ini`, any theme other than `default` |

If you edited files in `theme/default/`, an update replaces them. Copy the theme to a name of your own first and select it in Settings (see [Themes](themes.md)).

### What it needs

The Updates card tells you in plain words if something is missing. Normally nothing is.

| Need | Why |
| - | - |
| An update address and a signing key | Built into releases made with the release tool. Otherwise set the address under Settings → Advanced and the key in `config.php` |
| The `zip` and `sodium` PHP extensions | To unpack the update and check its signature. Almost every host has both |
| A way to download | cURL, or `allow_url_fopen` |
| Writable program folders | The same permissions that let the blog save posts. Usually already true on shared hosting |

If your server cannot update itself, you can still update by hand. See [Manual updating](#manual-updating).

### Privacy

A check downloads one small file, `latest.json`, from the update address. The request carries the blog's version in the user agent (`ThemestrapBlog/1.0.0`) and nothing else about you or your site. Turn automatic checks off under Settings → Advanced and the blog only looks when you press the button.

## How it keeps you safe

An update is code that runs on your site, so the blog does not simply trust whatever it downloads.

| Check | What it prevents |
| - | - |
| HTTPS only | Someone tampering with the download in transit |
| SHA-256 checksum | A damaged or substituted file |
| Ed25519 signature, checked against the key already installed | A hacked download server pushing code. Only the holder of the publisher's secret key can make an update the blog accepts. The signature covers the version too, so an old signed release cannot be replayed as "new" |
| Every file inside must be a plain file in an allowed folder | Updates reaching your content, settings, `config.php` or other themes, and `../` tricks, absolute paths and links |
| Every file's hash must match the package's file list | A package with swapped or extra files |
| Every PHP file must parse | A broken release taking the site down |
| Backup first, then verify after writing | A failure half way. Anything that goes wrong puts the old files back automatically |
| A short maintenance pause | Visitors seeing a half-updated site |

All of these happen before the first file changes, except the last two.

## For the publisher

You publish updates by running one command. It builds the packages, signs them, and writes the manifest. You upload three files anywhere that serves them over HTTPS.

### One time: make a signing key

```
php tools/build-release.php --keygen --key release.key
```

This writes `release.key` (the **secret** key) and `release.key.pub`, and prints the public key. Keep the secret key private and make a backup. Whoever holds it can publish updates to every copy of your blog, and if you lose it you cannot publish.

### Each release

1. Change the code. The version number is set by the command, not by editing a file.
2. Build:

   ```
   php tools/build-release.php --version 1.0.1 \
        --url https://example.com/blog-updates \
        --key release.key \
        --notes "Faster pages. Fixes the date picker."
   ```

3. Upload the three files from `dist/` to the `--url` folder:

   | File | Purpose |
   | - | - |
   | `latest.json` | The manifest every blog checks. Always the newest release |
   | `tsblog-1.0.1.zip` | The update package that blogs download |
   | `tsblog-1.0.1-install.zip` | A fresh install for new sites, with the update address and your public key already built in |

`--notes` appears in the Updates card before anyone installs. `--notes-file` reads it from a file. `--min-php` sets the oldest PHP the release supports (default 8.1.0).

### Where to host the files

Anywhere that serves static files over HTTPS: your own site, object storage, or a GitHub release. For GitHub, upload the three files to a release and use this address, which always points at the latest release:

```
--url https://github.com/OWNER/REPO/releases/latest/download
```

The package must be on the same host as `latest.json`, which this satisfies.

### The first release matters

Blogs update themselves only if they know where to look and whose signature to trust. Both are built in by the release tool. So give new users the `-install.zip` from your first release, not a copy of the source folder. Blogs installed from anything else need the address set in Settings → Advanced and the key set in `config.php`:

```php
'update_public_key' => 'PASTE-THE-PUBLIC-KEY',
```

### Changing the signing key

Build the next release with a new key file. Blogs verify it with the key they already have, install it, and from then on trust the new key (it is part of the release). Do this if you ever suspect the old key was exposed.

### Rolling back a bad release

Blogs only move forward. To retract a release, publish a higher version number with the fix, or restore the previous `latest.json` so nobody new installs the bad one. Blogs that already installed it can use **Go back**.

## Manual updating

For a server that cannot update itself, or if you simply prefer to: download the update zip (or ask the publisher for it), unzip it, and upload everything inside the `tsblog` folder over your site, **except** the folders listed under "Never touched" above. Then delete nothing else. Your content and settings stay as they are.

## Testing against your own computer

Releases can be served over plain `http://` from `localhost` for testing, but only when `config.php` says so:

```php
'update_allow_insecure' => true,
```

Never enable this on a live site. It has no effect for any address other than localhost.
