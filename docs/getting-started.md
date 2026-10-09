# Getting started

From download to your first published post in about five minutes. No technical knowledge is needed.

## What you need

- A web hosting account that runs PHP 8.1 or newer. Almost every host does. If yours is older, look for **PHP version** in the hosting control panel and pick 8.1 or higher.
- A way to upload files: your host's **File Manager** (in the control panel) or an FTP program such as FileZilla.

You do not need a database, a command line, or any settings.

## 1. Upload

1. Unzip the download on your computer. You will see a folder named `tsblog`.
2. Open your host's File Manager (or FTP program) and go to your website's main folder. It is often called `public_html`, `www` or `htdocs`.
3. Upload the **contents** of the `tsblog` folder there. (To put the blog in a subfolder of your site, such as `example.com/blog`, create a `blog` folder first and upload into it.)

Tip: if uploading many files is slow, upload the zip file itself and use the File Manager's **Extract** option.

Make sure you can see the hidden files `.htaccess` and `.user.ini` after uploading. Your file manager may have a “show hidden files” option. They are optional, but they help.

## 2. Open the admin

In your browser, go to your site's address followed by `/admin`, for example `https://example.com/admin`.

If you see a page that says **Welcome! Let’s set up your blog.**, everything is working. If you see something else, open [Troubleshooting](troubleshooting.md).

> Do this straight away. The first person to open this page chooses the password.

## 3. Answer three questions

| Question | Notes |
| - | - |
| What is your blog called? | Shown at the top of every page. You can change it later |
| Your name | Optional. Shown on posts |
| A password | At least 8 characters. There is no username |

Your time zone is detected from your browser, and the blog quietly checks your hosting to pick the best settings. Click **Create my blog**. You are signed in.

If the page shows a red box titled **One thing needs fixing first**, follow the plain steps in it (usually: set a folder's permissions to 755 in your file manager), then click **Check again**.

## 4. Write your first post

1. Click **New post**.
2. Type a title, press Enter, and write. Use the toolbar above the page for bold, headings, lists, quotes and links. To add a picture, paste it or drag it onto the page.
3. Click **Save draft** to keep it private, or **Publish** to put it on your site.

Prefer to type symbols such as `**bold**`? Click **Markdown** at the top instead of **Simple**. Your post is the same either way.

The sliders button opens extra options: the web address, the publish date (a future date schedules the post), tags, a summary for search engines, and a cover picture. You can ignore all of it.

## 5. Make it yours

Click **Settings** at the top of the admin. Change the blog name, tagline, time zone, how many posts show per page and more. Click **Save settings**.

The two sample items (a welcome post and an About page) can be edited or deleted from the posts list.

## 6. Keep a backup

In **Settings**, click **Download a backup** now and then. It gives you a zip of all your posts, pictures and settings. To restore, upload its folders back to your site.

## If something does not look right

| You see | Do this |
| - | - |
| A page about PHP being too old | Change the PHP version in your hosting control panel to 8.1 or higher |
| A red “needs fixing” box | Follow the steps in it. It is almost always one folder permission |
| Long addresses like `index.php?r=about` | Nothing is wrong. Your server uses plain links. See [Settings](configuration.md#page-links) if you want pretty ones |
| Anything else | [Troubleshooting](troubleshooting.md) |

## Where to go next

| I want to... | Read |
| - | - |
| Learn the editor and Markdown | [Writing](writing.md) |
| Change settings | [Settings](configuration.md) |
| Change how the site looks | [Themes](themes.md) |
| Move to another host, or tune the server | [Hosting and deployment](deployment.md) |
