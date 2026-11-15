/* Headless checks for how the site presents itself to search engines.
   Run with: NODE_PATH=/tmp/opencode/domtest/node_modules node tools/test-seo.js */
const fs = require('fs');
const path = require('path');

const dir = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(dir, p), 'utf8');

let failures = 0;
function ok(name, cond, extra) {
  if (cond) console.log('PASS ' + name);
  else {
    failures++;
    console.log('FAIL ' + name + (extra !== undefined ? ' -> ' + JSON.stringify(extra) : ''));
  }
}

const share = read('share/index.html');
const apex = read('index.html');
const robots = read('robots.txt');
const sitemap = read('sitemap.xml');

/* ---------- robots.txt ---------- */
ok('robots.txt allows everything', /User-agent:\s*\*\s*\nAllow:\s*\/\s*$/m.test(robots), robots);
ok('robots.txt points at the sitemap',
  robots.indexOf('Sitemap: https://gronaelden.com/sitemap.xml') !== -1);

/* ---------- sitemap.xml ---------- */
const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
ok('sitemap is a urlset', sitemap.indexOf('http://www.sitemaps.org/schemas/sitemap/0.9') !== -1);
ok('sitemap lists the apex', locs.indexOf('https://gronaelden.com/') !== -1);
ok('sitemap lists the archive', locs.indexOf('https://gronaelden.com/share/') !== -1);

const imageLocs = [...sitemap.matchAll(/<image:loc>([^<]+)<\/image:loc>/g)].map((m) => m[1]);
const media = fs
  .readdirSync(path.join(dir, 'share', 'media'))
  .filter((f) => !f.startsWith('.') && f !== 'manifest.json');
const PREFIX = 'https://gronaelden.com/share/media/';
const shareLocs = imageLocs.filter((u) => u.startsWith(PREFIX));

const missing = media.filter((f) => shareLocs.indexOf(PREFIX + f) === -1);
ok('every media file is in the sitemap', missing.length === 0, missing);

const ghosts = shareLocs
  .map((u) => u.replace(PREFIX, ''))
  .filter((f) => media.indexOf(f) === -1);
ok('the sitemap invents no files', ghosts.length === 0, ghosts);
ok('the sitemap has one entry per media file', shareLocs.length === media.length, {
  sitemap: shareLocs.length,
  files: media.length
});
ok('the sitemap lists the apex photo',
  imageLocs.indexOf('https://gronaelden.com/photo.jpg') !== -1);

/* ---------- manifest: what the gallery paints before any API call ---------- */
const manifest = JSON.parse(read('share/media/manifest.json'));
const manifestNames = manifest.items.map((i) => i.name);
ok('manifest lists every media file',
  media.every((f) => manifestNames.indexOf(f) !== -1), media.filter((f) => manifestNames.indexOf(f) === -1));
ok('manifest has no extra files',
  manifestNames.every((f) => media.indexOf(f) !== -1), manifestNames.filter((f) => media.indexOf(f) === -1));
ok('manifest sizes match the files',
  manifest.items.every((i) => fs.statSync(path.join(dir, 'share', 'media', i.name)).size === i.size));
ok('manifest carries no paths or urls',
  manifestNames.every((n) => n.indexOf('/') === -1 && n.indexOf('http') === -1));

/* ---------- share page head ---------- */
ok('archive is indexable', /name="robots" content="index[^"]*"/.test(share) && !/noindex/.test(share));
ok('archive allows large image previews', /max-image-preview:large/.test(share));
ok('archive has a canonical url',
  /rel="canonical" href="https:\/\/gronaelden\.com\/share\/"/.test(share));
ok('archive has a real title', /<title>G\.E\. Archive — Gröna Elden<\/title>/.test(share));
ok('archive has a description',
  /name="description" content="The G\.E\. Archive/.test(share));
const ogImage = (share.match(/property="og:image" content="([^"]+)"/) || [])[1] || '';
ok('archive has an og:image pointing at a real file',
  fs.existsSync(path.join(dir, ogImage.replace('https://gronaelden.com/', ''))) && ogImage !== '',
  ogImage);
ok('the archive preview uses the main photo', /\/photo\.jpg$/.test(ogImage), ogImage);
ok('archive has a twitter card', /name="twitter:card" content="summary_large_image"/.test(share));

/* ---------- apex ---------- */
ok('apex is not blocked from indexing', !/name="robots"[^>]*noindex/.test(apex));
ok('apex still has a title', /<title>Gröna Elden<\/title>/.test(apex));
const apexOg = (apex.match(/property="og:image" content="([^"]+)"/) || [])[1] || '';
ok('apex has an og:image', apexOg === 'https://gronaelden.com/photo.jpg', apexOg);
ok('apex declares the image size', /og:image:width" content="596"/.test(apex) && /og:image:height" content="468"/.test(apex));

console.log(failures === 0 ? '\nALL SEO TESTS PASSED' : '\n' + failures + ' SEO TEST(S) FAILED');
process.exit(failures ? 1 : 0);
