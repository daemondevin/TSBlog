# Security

What the blog protects, how, and what is left for you to do.

## The model

One author, one password, a mostly static public site. The public pages have no forms, no cookies and no user input except the search box. Everything that changes content sits behind the admin sign-in.

The blog is designed for hosting you do not control: no server rules are needed for it to be safe.

## Protection that works on any server

Many blogs depend on `.htaccess` or nginx rules to hide private files. Those rules are ignored on some hosts, so this blog does not rely on them.

| What | How it stays safe |
| - | - |
| Password, settings, caches, logs | Stored as PHP files that start with `<?php http_response_code(404); exit; ?>`. If a server hands one out instead of running it, the visitor sees nothing |
| Post files | Stored as `.md.php` with the same guard line whenever the server might hand out files. The blog tests for that during setup. See [Storage](storage.md#plain-and-protected-files) |
| SQLite database | Given a random name, so it cannot be guessed |
| Engine files in `lib/` | Each starts with a check that stops them from running outside the blog |
| Folder listings | `index.html` files in the private folders |
| Extra layer on Apache | `.htaccess` files deny direct access too |

Test it yourself: open `yoursite/data/admin.php` and `yoursite/config.php`. Each should show a blank page or "not found".

## What is built in

### Sign-in

| Protection | Detail |
| - | - |
| Password storage | Hashed with PHP's `password_hash()` (bcrypt by default). The plain password is never stored |
| Strength | At least eight characters when you set it |
| Brute force | Five wrong passwords within 15 minutes lock that address out for 10 minutes. The sign-in form shows a live countdown for the lockout |
| Sign-in form | Built on Themestrap's `PluginAuth`. With JavaScript it answers inline without reloading the page. Without JavaScript it is an ordinary form post. Redirects after sign-in are limited to this site |
| Session | A fresh random id is issued at sign-in. The cookie is HTTP-only, `SameSite=Lax`, and `Secure` on HTTPS. Session files live in the blog's private folder when it can write there |

### Requests

| Protection | Detail |
| - | - |
| CSRF | Every state-changing request needs a per-session token, compared in constant time |
| Headers | `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: SAMEORIGIN` |
| Content Security Policy | Public pages allow scripts, styles and fonts from your own site only. Inline scripts do not run, anywhere. Admin pages, and post pages while the “keep reading” fade is on, additionally allow inline styles, which the Themestrap plugins inject. Turning the fade off restores the strictest policy on posts |
| Admin pages | Marked `noindex` and never cached |
| Error messages | Hidden from visitors by default and saved to a private log instead |

### Content

| Protection | Detail |
| - | - |
| Markdown output | Raw HTML is escaped by default, so a post cannot inject script |
| Links and images | Only `http`, `https`, `mailto` and `tel` links and only `http` and `https` images survive. `javascript:` and `data:` URLs are removed |
| Output escaping | Every template value goes through `e()` |
| Addresses | Validated against `^[a-z0-9]+(-[a-z0-9]+)*$`, so a request cannot reach other files, and `../` never works |
| Reserved addresses | Names the blog uses cannot be taken by a post |

### Uploads

| Protection | Detail |
| - | - |
| Type check | The file's real content must be a JPG, PNG, GIF or WebP image. A renamed script is rejected. SVG is not accepted |
| Size | Limited to what the server allows, and never above 8 MB |
| Names | Rebuilt from the original name plus a random suffix, with a safe extension chosen from the detected type |
| Execution | `uploads/.htaccess` stops script handling on Apache. On other servers, uploads are only ever created as image files |

## Updates

The built-in updater does not trust the network. Every release is signed with an Ed25519 key, and the blog verifies the signature against the key already installed before it unpacks anything. It also checks the download's SHA-256, refuses any file outside the program folders, refuses links and `..` paths, checks that every PHP file parses, and backs up what it replaces. A hacked download server alone cannot push code to your blog. Publishers' signing keys are kept outside the blog folder, and the release tool refuses to package anything that looks like a key. The signature check works with or without PHP's `sodium` extension, because a pure-PHP copy of the same algorithm is bundled (`lib/vendor/sodium_compat`, ISC license). See [Updates](updates.md#how-it-keeps-you-safe).

## What you should do

1. **Finish setup right after uploading.** The first person to open `/admin` picks the password.
2. **Use HTTPS.** Without it, your password and session cookie travel in the clear. Settings → Health tells you whether your connection is secure.
3. **Use a strong, unique password.** There is no second factor.
4. **Keep PHP supported.** Choose a maintained version in your host's control panel.
5. **Back up** from Settings now and then.
6. **Keep the blog updated.** Settings → Updates takes a minute.

## Turning on raw HTML

**Settings → Advanced → Allow HTML inside posts** lets posts contain any HTML, including scripts. Posts you write are trusted by definition, so this is reasonable on a personal blog and is how video embeds work. Two consequences:

- Anyone who can sign in can run script on your site. Only enable it when you are the sole author.
- Public pages then permit `https:` frames and media in their Content Security Policy. Inline scripts still do not run, because the policy blocks them.

## Analytics

Analytics are off by default. When on, records live in guarded files in `data/` (they answer with an empty 404 if a server hands them out), are deleted after the retention period, and never leave your server. IP addresses can be shortened or not kept at all. Click records are sent by the visitor's browser with a time limited token, so anyone could submit false ones. The admin shows their text as plain text, never as links. Details are in [Analytics](analytics.md).

## Comments

Comments are off by default. When on, every field is escaped on output and links carry `rel="nofollow ugc noopener"`. The public endpoint accepts only a form post with a valid token, a hidden trap field, a per visitor rate limit and length limits, and it never echoes visitor text back (messages come from a fixed list). Comments are stored in a guarded file in `data/`, and email addresses are never printed on the site. Details are in [Comments](comments.md).

## Not included

These are left out on purpose, to keep the system small:

- Multiple users, roles, two-factor authentication and password reset by email. (A password reset by file is described in [Troubleshooting](troubleshooting.md#i-forgot-my-password).)
- Redirecting HTTP to HTTPS. Do it in your host's control panel.
- Rate limiting of public pages. Use your host or a CDN.
