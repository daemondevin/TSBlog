# Comments

TSBlog has a small built in comment system. It needs no account, no database and no outside service. It is off until you turn it on.

## Turning it on

Open **Settings → Comments** and choose a mode:

| Mode | What happens |
| - | - |
| Off | Nothing is shown and nothing is accepted. Your existing comments are kept |
| On, I approve each comment first | New comments wait until you approve them |
| On, show comments right away | Comments appear at once. A comment with more than two links still waits for you |
| Closed | Existing comments stay visible. The form is replaced by “Comments are closed” |

Comments appear under posts only, not pages. Scheduled and draft posts do not accept comments.

## What readers see

A list of approved comments, oldest first, then a form with a name, an optional email and the comment. Readers can reply to a comment, one level deep. Text is plain: line breaks are kept and web addresses become links marked `nofollow ugc`, so a spammer gets nothing from them. The email address is never shown on the site.

With JavaScript the form sends without reloading the page. Without it, the form still works and brings the reader back to the comments.

## Moderating

When comments are on, or any are waiting, a **Comments** link appears at the top of the admin, with a count of comments waiting. The page lists every comment with **Approve**, **Spam** and **Delete**. Filter by Waiting, Approved or Spam. Deleting asks first. Deleting a post deletes its comments, and changing a post's address keeps them with the post.

## Spam protection

- Each form carries a token that proves it came from your site. It lasts 24 hours, and the pages stay cacheable.
- A hidden field that people never see. Anything that fills it in is silently dropped.
- A limit of 5 comments per visitor in 10 minutes and 30 per day. Visitors are told apart by a keyed hash of their address, never the address itself.
- Comments with more than two links wait for approval, even in the open mode.
- The same comment cannot be posted twice.
- Length limits: name 60, comment 2000 characters.

If a spam wave still gets through, switch to “I approve each comment first”.

## Where they are stored

All comments are in `data/comments.php`, a guarded private file like your settings, for both the file and SQLite storage options. It is included in the backup download. Copy it to move comments to another install.

## Themes

A theme shows comments by calling `ts_comments_section($post)` in `post.php`, which returns the whole section (or an empty string when comments are off), and loading its own `comments.js` when `TSComments::accepting()`. The markup uses `tsc-*` classes that the theme styles. See [Themes](themes.md).
