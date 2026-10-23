# Analytics

TSBlog can show you how many people read your posts, where they came from, and which links they click. It runs on your own server: no cookies, no outside service, nothing sent anywhere. It is off until you turn it on under **Settings → Analytics**, and the results are under **Analytics** at the top of the admin.

## What is recorded

| Record | How | Contains |
| - | - | - |
| Page view | The server, when a page is built | Time, page, referring site, browser, system, device, IP address, a visitor code |
| Link click | A 1 KB script (`assets/track.js`) | Time, the page it was on, the address clicked, the same browser details |
| Not found | The server | The address that did not exist |

Clicks are counted for links to other sites, for downloads (zip, pdf, office files, audio, video and similar) and for email and phone links. Links between your own pages are not.

Left out: your own visits while you are signed in, requests from bots and crawlers (they are only counted, and shown as a number), the RSS feed, and browser prefetching. A “visitor” is a distinct browser, worked out from a keyed hash of the address and browser. It is not a person, and it cannot be matched with anything on another site.

## The page

Choose the last 7, 30, 90 or 365 days. You get page views, visitors, link clicks and broken addresses with today's numbers; a views per day chart (hover a bar for the day); top pages; where visitors came from; links clicked; browsers, systems and devices; visitor IP addresses with request counts; addresses that were not found; and the latest 60 events. **Export CSV** downloads the raw records for the range. **Clear data** deletes everything after asking.

## IP addresses and privacy

An IP address can identify a person, and the law in some places (the EU and UK, for instance) treats it as personal data. Under **Visitor IP addresses** choose:

- **Keep the full address.** The most detail. Useful for spotting one visitor or a scanner.
- **Keep a shortened address.** The last number of an IPv4 address is set to 0, and an IPv6 address is cut to its first three groups.
- **Do not keep addresses.** The IP address list disappears. Views and visitors still work.

Records are deleted after **Keep records for** days (90 by default). If your visitors are in a region with privacy rules, shorten or drop the addresses and say what you collect on a privacy page.

## Where it is stored

One file per month in `data/`, such as `hits-2026-10.php`, one line per record, behind the same guard as your other private files. A month stops growing at 25 MB. Analytics are not part of the backup download. Copy the `hits-*.php` files yourself if you want them.

## Limits

- Pages served from another cache (a CDN, say) are never seen by the blog, so they are not counted.
- A click is sent by the browser, so someone could send false ones. Treat click lists as a guide.
- There is no location lookup, no search keywords and no time on page. Keeping it small is the point.
- Themes need no changes: the click script is added to every public page just before `</body>`.
