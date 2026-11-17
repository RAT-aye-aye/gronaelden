# Handoff

This is a joke website about a made-up religion called **Gröna Elden**. It is
not a real church, it has no members, and it asks nothing of anybody. The
person who built it is a believing member of The Church of Jesus Christ of
Latter-day Saints, and the site says so on every page, in the footer, in plain
words — that is the point of the disclaimer, and it stays.

## The one rule

Every page must say, in visible text, that this is a fake religion made for
laughs and that the owner of gronaelden.com is a believing member of The Church
of Jesus Christ of Latter-day Saints.

There are no checks and no tests for it. It is a manual rule: if you edit a
page, look at the footer before you push. Reword it if you like, but keep both
facts in it — that it is fake and for laughs, and that the person who runs the
domain is a believing member of the Church.

Everything else here — the book, the pictures, the jokes — is yours to change,
delete, or burn.

## What is here

| Path | What it is |
| --- | --- |
| `index.html` | the front page: portrait, the archive button, the book cover |
| `share/` | the public gallery of photos and GIFs |
| `share/media/` | the actual images, plus `manifest.json` |
| `Bible/` | the scriptures — one long page |
| `Bible/scriptures.txt` | **the text of the book.** This is the source of truth |
| `Bible/index.html` | generated from `scriptures.txt` — do not hand-edit |
| `tools/` | the small build and test scripts |
| `CNAME`, `robots.txt`, `sitemap.xml` | what makes the domain and Google work |

## Everyday edits

**The book.** Edit `Bible/scriptures.txt`, then:

```sh
node tools/build-bible.mjs          # regenerate Bible/index.html
node tools/build-bible.mjs --check  # fail if the page is out of date
```

The format is simple: `# ` is a part, `## ` is its subtitle, `### ` is a
chapter, blank lines separate paragraphs, `---` is ignored, and the first plain
line is the epigraph. Commit both files.

**A new picture or GIF.** Drop the file into `share/media/`, then:

```sh
node tools/build-index.mjs          # rewrite manifest.json and sitemap.xml
```

Commit the image, the manifest, and the sitemap. It appears in the gallery on
the next deploy. Nothing is uploaded through the site itself.

**Colours, wording, layout.** Edit the HTML directly. There is no framework and
no build step for the front page or the gallery.

## Deploying

Push to `main`. GitHub Pages publishes the repository root, so a push is a
deploy. Check it with:

```sh
gh api repos/OWNER/gronaelden/pages --jq .status   # "built" when it is done
```

## Taking it over

1. **The repo.** Owner: Settings → General → Danger Zone → Transfer ownership.
   History comes with it.
2. **The domain.** `gronaelden.com` is registered elsewhere; whoever holds the
   DNS account holds the site. Point the `A`/`CNAME` records at the new repo's
   Pages settings.
3. **Search Console.** Add the new owner as a user on the property, and re-verify
   once the verification token in `index.html` is yours. Nothing else is needed
   for Google to keep indexing it.
4. **The verification tag** in `index.html` is tied to the old account. Replace
   it, do not just delete it, or Search Console loses the property.

## If it stops being fun

Nothing here expires. It is static files on free hosting: no database, no
server, no bill, no cron job. If you never touch it again, it keeps working
exactly as it is. Archive the repo (Settings → Archive this repository) if you
want to make sure nobody edits it by accident, or leave it open and come back
to it in five years.

You are allowed to just stop. That is not a failure mode; it is a finished
project.
