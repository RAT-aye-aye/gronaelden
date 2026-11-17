# gronaelden.com

The homepage is the portrait, one button into the archive, and the Book of
Gronest: <https://gronaelden.com>. Static, served by GitHub Pages.

- `index.html` — the apex. The photo, "The Archive" button → `share/`, and the
  book cover → `Bible/`.
- `photo.jpg` — the portrait (596×468), also the `og:image` for the apex and
  `/share/`, so every link preview shows him.
- `bible.jpg` — the book cover (1100×1430).
- `Bible/` — the book. `scriptures.txt` is the text; `index.html` is generated
  from it by `tools/build-bible.mjs`. Never edit the HTML by hand.

All three pages carry the same footer note: **this is a fake religion, made for
laughs, and the person who runs the site is a believing member of The Church of
Jesus Christ of Latter-day Saints.** Keep it on every page — it is the one thing
that keeps the joke from being mistaken for a real movement, and
`tools/test-seo.js` / `tools/test-share.js` fail if it goes missing.

## /Bible/ — the Gröna Scriptures

<https://gronaelden.com/Bible/> is the full text: three parts, 17 chapters,
~2,500 words, one page, with a contents list. Third person, scriptural, and
deliberately spare: **Gröna Elden is the only named thing in it.** No other
character, place or church has a name — the people, the keepers, the house,
the hill. And no Jesus, no Father, no Christ: Gröna Elden is the god of this
world only, so the book never mentions another.

The doctrine is the point, and it **affirms** the LDS distinctives rather than
refusing them: pre-mortal life behind a veil, agency that cannot be compelled,
earth as a proving, covenant and sealing, continuing prophets, priesthood by
the laying on of hands, ordinances for the dead, tithing, the Word of Wisdom,
missionary work, and degrees of glory. The agency chapter is the hinge — he
says "Thou hast no need to do anything. Thou mayest choose", a keeper writes
down only the first half as "Thou needst do nothing", and the people keep that
half for a thousand years until he corrects the pen.

It ends in an apostasy, not an argument: the covenant is kept for a season,
the keepers alter the record, the house falls, and the record waits in the hill.

- **`Bible/scriptures.txt` is the source of truth.** Edit that, then:

  ```sh
  node tools/build-bible.mjs          # regenerate Bible/index.html
  node tools/build-bible.mjs --check  # fail if the HTML is stale
  ```

  `tools/test-seo.js` runs the `--check` for you, checks that every paragraph of
  the text survives onto the page, that headings and contents links match the
  source, and that no id is duplicated. The HTML is a build artefact: do not
  hand-edit it, the next build will overwrite it.
- The page is `index, follow` and in the sitemap now that it has content, with
  `book` Open Graph type and the cover as its preview image.
- `# THE FIRST RECKONING` in the text is a section, `##` beneath it is that
  section's subtitle, `###` is a chapter, `**...**` is the closing line, and
  `---` is ignored. That is the whole format.


## /share/ — the G.E. Archive

<https://gronaelden.com/share/> is a small public gallery of GIFs and photos,
linked from the apex.

- Files live in `share/media/`. Drop them there on GitHub and the gallery lists
  them automatically through the public GitHub contents API.
- Images (`jpg`, `jpeg`, `png`, `gif`, `webp`, `avif`) and videos (`mp4`,
  `webm`) are supported. Click a tile for the full-size view, a download link,
  and previous/next navigation.
- Viewing needs no repo permissions. There is no upload backend: whoever owns
  the repo adds files, everyone else just opens the link.
- The page is **indexable on purpose**: `index, follow, max-image-preview:large`,
  a real title and description, Open Graph tags for link previews, and an entry
  in `sitemap.xml` (which `robots.txt` points at).
- The first paint comes from `share/media/manifest.json`, a committed list of
  the folder served from this site. No API, no quota, instant. The live listing
  (edge, then GitHub) is fetched afterwards and replaces it.
- Listings are cached in `sessionStorage` for two minutes; the ↻ button forces
  a fresh check.

The manifest is not a nicety: Google's crawl of `/share/` came back as a
**Soft 404** because GitHub rate-limits its IPs, the page then rendered
"Could not load the archive", and that reads as an error page. With the
manifest, the page always has real content to render.

The listing goes through the `edge` Worker at `api.gronaelden.com` when it is
deployed, which caches the answer in KV for five minutes and (with a GitHub
token set on the Worker) raises the upstream limit from 60 requests/hour per IP
to 5,000. If the edge is missing or down, the page falls back to calling GitHub
directly, so nothing breaks. See <https://github.com/RAT-aye-aye/edge>.

Upload page:
<https://github.com/RAT-aye-aye/gronaelden/upload/main/share/media>

## Search engines

- `robots.txt` allows everything and points at `https://gronaelden.com/sitemap.xml`.
- `sitemap.xml` lists the apex, `/share/`, `/Bible/`, and every file in
  `share/media` as an `image:image`, plus `photo.jpg` and `bible.jpg` under the
  apex. `share/media/manifest.json` is the gallery's first paint.
- Both are generated. After adding or removing files, run:

  ```sh
  node tools/build-index.mjs
  ```

  `tools/test-seo.js` fails if either drifts from the folder.
- To make Google pick it up faster: Search Console → add `gronaelden.com` →
  verify (a DNS TXT record at Porkbun, or a file I can add to the repo) →
  Sitemaps → submit `sitemap.xml`. An inbound link from an already-indexed site
  (say the varnic.org hub) helps more than anything else.

## The photo

- `photo.jpg` — the apex portrait (596×468). Also the `og:image` for the apex
  and for `/share/`, so every link preview shows him.
- Displayed with `object-fit: contain` inside a rounded frame, so the whole
  photo is visible.
- `CNAME` points the site at `gronaelden.com`; HTTPS is enforced.

## Tests

```sh
NODE_PATH=/tmp/opencode/domtest/node_modules node tools/test-share.js
NODE_PATH=/tmp/opencode/domtest/node_modules node tools/test-share-edge.js
NODE_PATH=/tmp/opencode/domtest/node_modules node tools/test-seo.js

# regenerate manifest.json + sitemap.xml after adding media
node tools/build-index.mjs

# regenerate Bible/index.html after editing Bible/scriptures.txt
node tools/build-bible.mjs
```
