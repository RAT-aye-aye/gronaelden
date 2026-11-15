# gronaelden.com

The apex is a single full-screen photo, nothing else:
<https://gronaelden.com>. Static, served by GitHub Pages.

## /share/ — the G.E. Archive

<https://gronaelden.com/share/> is a small public gallery of GIFs and photos.
It is deliberately **not linked from the apex**, which stays a pure photo page.

- Files live in `share/media/`. Drop them there on GitHub and the gallery lists
  them automatically through the public GitHub contents API.
- Images (`jpg`, `jpeg`, `png`, `gif`, `webp`, `avif`) and videos (`mp4`,
  `webm`) are supported. Click a tile for the full-size view, a download link,
  and previous/next navigation.
- Viewing needs no repo permissions. There is no upload backend: whoever owns
  the repo adds files, everyone else just opens the link.
- The page is `noindex`, so it stays out of search results.
- Listings are cached in `sessionStorage` for two minutes; the ↻ button forces
  a fresh check.

The listing goes through the `edge` Worker at `api.gronaelden.com` when it is
deployed, which caches the answer in KV for five minutes and (with a GitHub
token set on the Worker) raises the upstream limit from 60 requests/hour per IP
to 5,000. If the edge is missing or down, the page falls back to calling GitHub
directly, so nothing breaks. See <https://github.com/RAT-aye-aye/edge>.

Upload page:
<https://github.com/RAT-aye-aye/gronaelden/upload/main/share/media>

## The photo

- `photo.jpg` — the apex image (1672×941).
- Displayed with `object-fit: contain`, so the whole photo is always visible,
  with black bars filling the rest of the screen (letterboxed).
- `CNAME` points the site at `gronaelden.com`; HTTPS is enforced.

## Tests

```sh
NODE_PATH=/tmp/opencode/domtest/node_modules node tools/test-share.js
NODE_PATH=/tmp/opencode/domtest/node_modules node tools/test-share-edge.js
```
