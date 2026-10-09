# Writing

Everything about creating posts: the editor, the Markdown it understands, and the front matter that describes each post.

## The editor

The editor has two modes, switched with the **Simple** and **Markdown** buttons at the top. Both produce the same thing: a Markdown file. **Simple** is where new posts open, and the editor remembers your last choice. A post that contains raw HTML opens in Markdown mode so nothing is lost.

### Markdown mode

You write Markdown directly. The toolbar inserts the syntax for you, and the view buttons on its right side switch between:

| View | What you see |
| - | - |
| Write | Only your text. The page grows as you type, like a document |
| Split | Your text on the left and the rendered post on the right |
| Preview | Only the rendered post |

The preview is produced by the same code that renders the live site, so it matches what readers will see.

### Simple mode (rich text)

You format with the toolbar or by selecting text, and you can also type Markdown shortcuts as you go:

| Type | You get |
| - | - |
| `# `, `## `, `### ` at the start of a line | A heading |
| `- ` or `* ` | A bullet list |
| `1. ` | A numbered list |
| `> ` | A quote |
| three backticks, then Enter | A code block |
| `---`, then Enter | A divider |
| `**bold**`, `*italic*`, `~~strike~~`, `` `code` `` | The formatting, applied when you type the closing mark |

Switching modes converts the text once, so nothing is lost for normal writing. See [limits of Simple mode](#limits-of-simple-mode) for the few exceptions.

The summary marker (see [below](#the-summary-marker)) appears in Simple mode as a dashed line labeled "Summary ends here".

### Keyboard shortcuts

| Keys | Action |
| - | - |
| `Ctrl/⌘ + S` | Save, keeping the current status |
| `Ctrl/⌘ + B` | Bold (Markdown mode) |
| `Ctrl/⌘ + I` | Italic (Markdown mode) |
| `Ctrl/⌘ + K` | Link (Markdown mode) |
| `Enter` in a list or quote | Continue it. On an empty item, end it |
| `Tab` / `Shift + Tab` in a list | Indent or outdent |
| `Esc` | Leave focus mode |

### Focus mode

The expand icon hides the toolbar, the status bar and the settings panel, leaving only the page. Move the mouse to the top to bring the top bar back, and press `Esc` to leave.

### Images

Paste a picture, drop it onto the editor, or use the image button. Big photos are shrunk in your browser first (to at most 2,000 pixels wide), so even phone photos upload quickly on any host. JPG, PNG, GIF and WebP are accepted. Files are stored in `uploads/YYYY/MM/`.

### Saving, publishing and drafts

| Button | What it does |
| - | - |
| **Save draft** | Saves without publishing. Shown while the post is a draft |
| **Publish** | Saves and makes the post public |
| **Update** | Saves a published post |
| **Unpublish** | Saves and returns the post to a draft |

The label next to the buttons shows where you are: *Unsaved changes*, *Saving…*, *Draft saved* or *Published*. The browser also warns you if you try to leave with unsaved changes.

A copy of what you type is kept in your browser every moment. If your connection drops or the tab closes, the editor offers to restore that copy the next time you open the post.

### The settings panel

| Setting | Notes |
| - | - |
| Address | The URL slug. Follows the title until you edit it. Letters, numbers and dashes only |
| Publish date | Pick the day from the calendar (the date button) and the time beside it. A future date schedules the post, and it appears on its own when the time arrives. The note under the field tells you which it is. **Now** resets to the present |
| Type | **Post** appears in lists and the feed. **Page** appears in the menu and stays out of the feed |
| Tags | Type a tag and press Enter. Up to 20 per post |
| Summary for search engines | The meta description and social card text. Aim for 160 characters. If empty, the opening paragraph is used |
| Cover image | Shown at the top of the post and used for social cards |

Changing the address of a published post changes its URL. The blog does not create redirects, so update links you control.

### Drafts and scheduled posts

Drafts and posts dated in the future are hidden from the home page, tag pages, search, the feed and the sitemap. While you are signed in you can open them by address to preview them, and a notice at the top says they are not public yet.

## Markdown reference

### Text

```
**bold**  *italic*  ***both***  ~~strikethrough~~  `inline code`

A line ending in two spaces  
or a backslash\
breaks here.
```

Escape a special character with a backslash: `\*not italic\*`.

### Headings

```
## A section
### A subsection
```

Use `##` and below inside a post. The post title is already the page's top-level heading, so starting the body with `# Title` repeats it. Every heading gets an `id` for linking, built from its text (`## Hello there` becomes `#hello-there`). Duplicates get `-2`, `-3`.

### Links and images

```
[link text](https://example.com)
[with a title](https://example.com "Title")
![alt text](/uploads/2026/10/photo.jpg "Optional title")
<https://example.com>
https://bare-urls-link-themselves.com
```

Only `http`, `https`, `mailto` and `tel` links are allowed, and only `http` and `https` images. Anything else, such as `javascript:`, is dropped. Images load lazily.

### Lists

```
- bullet
- another
  - nested (indent by two spaces)

1. numbered
2. in order

- [x] task done
- [ ] task to do
```

### Quotes

```
> A quote that can contain **formatting**
> and several lines.
```

### Code

Use fences. Name the language to add a `language-xxx` class, which highlighters can use.

````
```js
const greeting = 'hello';
```
````

Indented code blocks (four leading spaces) are not supported. Use a fence.

### Tables

```
| Name  | Qty |
|:------|----:|
| Apple |   3 |
| Pear  |  12 |
```

The row of dashes sets alignment: `:--` left, `:-:` center, `--:` right.

### Dividers

```
---
```

### The summary marker

Put `<!--more-->` on its own line. Text above it becomes the summary on the home page and in lists. Without it, the first paragraph is used (up to 200 characters). A `description` in the front matter, or in the settings panel, takes priority over both.

```
The opening that readers see in the list.

<!--more-->

The rest of the post.
```

The marker never appears on the post page itself.

### Raw HTML

By default, HTML you type is shown as text, which keeps the site safe. If you are the only author, you can enable it in **Settings → Advanced → Allow HTML inside posts**. That allows embeds such as video iframes. Only turn it on if you trust everyone who can sign in. See [Security](security.md).

### Not supported

Footnotes, reference-style links (`[text][ref]`), definition lists, and indented code blocks. Everything else in everyday Markdown works.

## Front matter

Each post file begins with a block between two `---` lines. The admin writes it for you, and you can write it by hand.

```
---
title: Hello world
date: 2026-10-02 09:00
updated: 2026-10-03 14:30
status: published
type: post
tags: [notes, design]
description: Shown in search results and social cards.
image: /uploads/2026/10/cover.jpg
---

Your Markdown starts here.
```

| Field | Values | Default when missing |
| - | - | - |
| `title` | Text | The first `# Heading` in the body, else the file name |
| `date` | Any date PHP can read, such as `2026-10-02` or `2026-10-02 09:00` | The file's last modified time |
| `updated` | Same | The `date` |
| `status` | `published` or `draft` | `published` |
| `type` | `post` or `page` | `post` |
| `tags` | `[a, b]` or `a, b` | none |
| `description` | Text | The summary, or the first paragraph |
| `image` | A URL or a path starting with `/` | none |

Values with a colon followed by a space, a leading quote or bracket, or a leading or trailing space are wrapped in quotes by the admin. When writing by hand, wrap such values in double quotes: `title: "Note: a colon"`.

The address of a post is its **file name**, without `.md` (or `.md.php` for protected files). `hello-world.md` is served at `/hello-world`. File names must use lowercase letters, numbers and dashes. Other files in the folder are ignored. See [Storage](storage.md#plain-and-protected-files) for the protected format.

### Reserved addresses

These cannot be used because the blog already uses them: `ts-probe`, `admin`, `tag`, `tags`, `page`, `search`, `feed`, `feed.xml`, `sitemap.xml`, `robots.txt`, `uploads`, `theme`, `assets`, `data`, `content`, `lib`, `index`, `api`.

## Limits of Simple mode

Simple mode converts your Markdown to formatted text and back. Normal writing survives that unchanged, including the summary marker. A few things do not:

| Item | What happens |
| - | - |
| Raw HTML and embeds (with Allow HTML on) | Reduced to plain content. Posts that contain HTML open in Markdown mode automatically |
| Line wrapping and extra blank lines | Normalized |
| Table cell alignment | Not kept. Cells keep their text |

If a post uses any of these, stay in Markdown mode for it. Nothing is changed until you switch modes and save.
