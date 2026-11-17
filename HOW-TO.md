# How to change stuff

No terminal, no installs. Everything here happens on github.com in a browser,
on a phone or a laptop. Changes go live about a minute after you commit.

## The 30-second version

1. Go to **github.com/RAT-aye-aye/gronaelden**
2. Open the file you want (`index.html` for the front page, `share/index.html`
   for the gallery, `Bible/index.html` for the book)
3. Tap the **pencil** icon (top right of the file)
4. Change the words
5. Scroll down, tap **Commit changes** → **Commit changes**
6. Wait a minute, then reload gronaelden.com

That's it. Every change is one file, one pencil, one green button.

## Change words

The text of a page is just the words between the tags. On the front page you
will see things like:

```html
<h1>The Archive</h1>
<p class="disclaimer"><b>This is a fake religion, made for laughs.</b> ...</p>
```

Change what is between `>` and `<`. Do not delete the tags themselves — that is
what holds the page together. If a line starts with `<`, it is a tag; leave it.

## Change the book

Open **`Bible/index.html`**. The scripture is ordinary paragraphs:

```html
<p>And He said, "Thou mayest choose."</p>
```

Change the words, leave the `<p>` and `</p>`. Chapter headings are `<h3>`.

`Bible/scriptures.txt` is the same text kept for the build script. You can edit
both, or ignore the `.txt` — the site reads `index.html`, so editing that is
what changes the page.

## Add a picture or GIF

1. Go to **share/media**
2. **Add file** → **Upload files**
3. Drop the image in, tap **Commit changes**

It shows up in the gallery on the next load, after a minute or so. It will be
picked up by the live listing from GitHub even if `manifest.json` was not
updated. If it does not appear, tap **Refresh** in the gallery; if it still
does not, open `manifest.json` and add it by hand:

```json
{ "name": "your-file.gif", "size": 0 }
```

`size` is only used for the little "1.2 MB" label, so `0` just hides the label.

## Change the colours

At the top of `index.html` (and `share/index.html`) there is a block like:

```css
--bg: #05070a;      /* page background */
--ink: #e9edf5;     /* normal text */
--muted: #8a92a5;   /* grey text */
--green: #7dbf63;   /* the accent */
```

Change the hex codes. `#000000` is black, `#ffffff` is white; any colour picker
on the internet will give you a code like that.

## Do not touch these

| File | Why |
| --- | --- |
| `CNAME` | contains `gronaelden.com`. Change it and the site stops answering at the domain |
| `.nojekyll` | an empty file that stops GitHub from processing the site; leave it |
| `robots.txt` | tells Google it may index the site |
| `sitemap.xml` | stale is fine, broken is not |

## The one rule

Every page keeps a visible line in the footer (or header) saying that this is a
fake religion made for laughs, and that the person who runs the site is an
active, believing member of The Church of Jesus Christ of Latter-day Saints.
Visible text, not a comment, not tiny grey text nobody reads. It is in the
footer of all three pages right now — keep it there when you edit.
