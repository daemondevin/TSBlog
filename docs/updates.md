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
| `index.php`, `lib/`, `assets/`, `tools/migrate.php`, `docs/`, `theme/default/`, `config.sample.php`, `README.md`, `release.json` | `content/`, `uploads/`, `data/`, `config.php`, `.htaccess`, `.user.ini`, any theme other than `default` |

If you edited files in `theme/default/`, an update replaces them. Copy the theme to a name of your own first and select it in Settings (see [Themes](themes.md)).

### What it needs

The Updates card tells you in plain words if something is missing. Normally nothing is.

| Need | Why |
| - | - |
| An update address and a signing key | Built into releases made with the release tool. Otherwise set the address under Settings → Advanced and the key in `config.php` |
| The `zip` PHP extension | To unpack the update. Almost every host has it |
| Signature checking | Uses PHP's `sodium` extension when there is one, and a bundled pure-PHP copy when there is not. Nothing to install either way. See [No sodium extension](#no-sodium-extension) |
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

### No sodium extension

Signature checking needs Ed25519. Almost every PHP has it built in (it has shipped with PHP since 7.2), but some hosts compile it out. In that case the blog uses `lib/vendor/sodium_compat`, an open source pure-PHP implementation of the same algorithm (ISC license, bundled unmodified). It gives identical results and takes about a twentieth of a second per check, so you will not notice it. It is only loaded when the extension is missing.

A downloaded program is deliberately *not* used for this. Many hosts forbid running programs from PHP, a binary built for one system will not run on another, and a binary would be one more unverified piece of code sitting in the middle of the thing that decides what code to trust.

## For the publisher

You publish updates by running one command. It builds the packages, signs them, and writes the manifest. You upload three files anywhere that serves them over HTTPS.

### One time: make a signing key

The release tool needs the `zip` extension. It uses the `sodium` extension if you have it and the bundled pure-PHP version if you do not.

```
php tools/build-release.php --keygen
```

This writes the **secret** key to `~/.tsblog/release.key` (`%USERPROFILE%\.tsblog\release.key` on Windows), with a matching `release.key.pub`, and prints the public key and its fingerprint. The key is deliberately kept **outside the blog folder**.

Keep the secret key private and make a backup. Whoever holds it can publish updates to every copy of your blog, and if you lose it you cannot publish.

#### Keep the key out of what you publish

The tool protects you, in layers:

| Safeguard | What it does |
| - | - |
| Default location outside the blog folder | The key is never near the files that get packaged |
| Refuses a key inside a published folder | A key under `lib/`, `assets/`, `tools/`, `docs/` or `theme/default/` stops the build |
| Refuses key-like files | Any `.key`, `.pem`, `.pub` or `.env` file in a published folder stops the build, naming the file |
| Scans for the key itself | If the secret appears inside any file about to ship (pasted into a doc, say), the build stops |
| Never packages `dist/` or the tool itself | Release output and `tools/build-release.php` are left out of every package. Blogs only receive `tools/migrate.php` |
| Remembers which key each address uses | Refuses to sign with a different key than the one blogs already trust (see below) |
| `.gitignore` | Ignores `release.key*`, `*.key`, `*.pem`, `.env` and `dist/`, so a key cannot be committed by accident |

The updater on each blog also refuses any package that contains key-like files or a `dist/` folder, so such a package would not install even if one were built by other means.

If a key is ever published or committed, treat it as compromised and change keys as described below, publishing the rotation release right away.

### Each release

1. Change the code. The version number is set by the command, not by editing a file.
2. Build:

   ```
   php tools/build-release.php --version 1.0.1 \
        --url https://example.com/blog-updates \
        --notes "Faster pages. Fixes the date picker."
   ```

3. Upload the three files from `dist/` to the `--url` folder:

   | File | Purpose |
   | - | - |
   | `latest.json` | The manifest every blog checks. Always the newest release |
   | `tsblog-1.0.1.zip` | The update package that blogs download |
   | `tsblog-1.0.1-install.zip` | A fresh install for new sites, with the update address and your public key already built in |

`--key PATH` uses a key somewhere other than the default. `--github OWNER/REPO` is a shortcut for the GitHub folder address, and the tool prints the address to use in Settings when it finishes. `--notes` appears in the Updates card before anyone installs. `--notes-file` reads it from a file. `--min-php` sets the oldest PHP the release supports (default 8.1.0).

### Where to host the files

Anywhere that serves static files over HTTPS: your own site, object storage, or a GitHub release. The package must be on the same host as `latest.json`.

#### On GitHub

```
php tools/build-release.php --version 1.0.1 --github OWNER/REPO --notes "What changed"
```

Then, on GitHub: create a release, **attach all three files** from `dist/`, and **publish** it (a draft does not count). That is all. GitHub's `latest` release address always points at the newest published release, so blogs find new versions without any change on their side.

Blogs built from your `-install.zip` already know the address. For any other copy, put the repository address in **Settings → Advanced → Update address**:

```
https://github.com/OWNER/REPO
```

#### Which address goes where

There are two addresses and they are easy to mix up:

| Where | What it is | Example |
| - | - | - |
| `--url` for the release tool | The **folder** you upload the three files to | `https://example.com/blog-updates` |
| Settings → Update address | Where blogs look for `latest.json` | `https://example.com/blog-updates/latest.json` |

The Settings field is forgiving. It accepts the `latest.json` address, the folder (the blog adds `latest.json`), or a GitHub repository address such as `https://github.com/OWNER/REPO` (the blog uses its latest release). The Updates card shows the exact address it is using, under "Looking at".

### The first release matters

Blogs update themselves only if they know where to look and whose signature to trust. Both are built in by the release tool. So give new users the `-install.zip` from your first release, not a copy of the source folder. Blogs installed from anything else need the address set in Settings → Advanced and the key set in `config.php`:

```php
'update_public_key' => 'PASTE-THE-PUBLIC-KEY',
```

### Keys and fingerprints

Every blog trusts exactly one signing key, the one baked into it when it was built. A release signed with any other key is refused with "The update's signature is not valid", even if everything else is perfect. That makes it important to always sign with the same key.

Each key has a short **fingerprint**. The Updates card shows the one your blog trusts ("This blog trusts signing key …"), and the release tool prints the same one:

```
php tools/build-release.php --show-key
```

If the two differ, the blog will refuse the release. The card warns you about this *before* you click Install, and the release tool remembers which key each update address was last signed with and **refuses to sign with a different one** unless you say so. That stops the most common mistake: generating a second key and building with it.

### Changing the signing key

Do this if a key was exposed, or you want a new one. Blogs only accept a release signed with the key they *already* trust, so the release that introduces a new key must be signed with the **old** key and carry the **new** one:

```
php tools/build-release.php --keygen --key /path/to/new.key
php tools/build-release.php --version 1.1.0 --url https://example.com/blog-updates \
     --key /path/to/old.key --rotate-to /path/to/new.key
```

Blogs verify it with the old key, install it, and from then on trust the new key. Build every release after that with the new key. Publish the rotation release as soon as you can: until blogs install it, anyone with the old key can still publish to them.

Building with a new key *without* `--rotate-to` produces a release no existing blog will accept. The tool stops you; `--allow-new-key` overrides that and means every blog must then be updated by hand once.

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
