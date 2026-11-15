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
const media = fs.readdirSync(path.join(dir, 'share', 'media')).filter((f) => !f.startsWith('.'));

const missing = media.filter(
  (f) => imageLocs.indexOf('https://gronaelden.com/share/media/' + f) === -1
);
ok('every media file is in the sitemap', missing.length === 0, missing);

const ghosts = imageLocs
  .map((u) => u.replace('https://gronaelden.com/share/media/', ''))
  .filter((f) => media.indexOf(f) === -1);
ok('the sitemap invents no files', ghosts.length === 0, ghosts);
ok('the sitemap has all 12 images', imageLocs.length === media.length, {
  sitemap: imageLocs.length,
  files: media.length
});

/* ---------- share page head ---------- */
ok('archive is indexable', /name="robots" content="index[^"]*"/.test(share) && !/noindex/.test(share));
ok('archive allows large image previews', /max-image-preview:large/.test(share));
ok('archive has a canonical url',
  /rel="canonical" href="https:\/\/gronaelden\.com\/share\/"/.test(share));
ok('archive has a real title', /<title>G\.E\. Archive — Gröna Elden<\/title>/.test(share));
ok('archive has a description',
  /name="description" content="The G\.E\. Archive/.test(share));
ok('archive has an og:image pointing at a real file',
  (share.match(/property="og:image" content="([^"]+)"/) || [])
    .slice(1)
    .every((u) => media.indexOf(u.replace('https://gronaelden.com/share/media/', '')) !== -1));
ok('archive has a twitter card', /name="twitter:card" content="summary_large_image"/.test(share));

/* ---------- apex ---------- */
ok('apex is not blocked from indexing', !/name="robots"[^>]*noindex/.test(apex));
ok('apex still has a title', /<title>[^<]*<\/title>/.test(apex));

console.log(failures === 0 ? '\nALL SEO TESTS PASSED' : '\n' + failures + ' SEO TEST(S) FAILED');
process.exit(failures ? 1 : 0);
