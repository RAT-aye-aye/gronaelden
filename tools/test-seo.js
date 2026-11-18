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
ok('sitemap lists the moving record', locs.indexOf('https://gronaelden.com/watch/') !== -1, locs);

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
ok('apex shows the photo', /<img[^>]+src="photo\.jpg"/.test(apex));
ok('apex links to the archive', /href="share\/"/.test(apex));
ok('apex shows the book', /<img[^>]+src="bible\.jpg"/.test(apex));
ok('apex links to the book', /href="Bible\/"/.test(apex));
ok('the book image exists', fs.existsSync(path.join(dir, 'bible.jpg')));
ok('the sitemap lists the book image',
  imageLocs.indexOf('https://gronaelden.com/bible.jpg') !== -1);
const apexOg = (apex.match(/property="og:image" content="([^"]+)"/) || [])[1] || '';
ok('apex has an og:image', apexOg === 'https://gronaelden.com/photo.jpg', apexOg);
ok('apex declares the image size', /og:image:width" content="596"/.test(apex) && /og:image:height" content="468"/.test(apex));

/* ---------- the disclaimer: this is a joke, and the author is not ---------- */
const DISCLAIMER = /fake religion, made for laughs/;
const CHURCH = /The Church of Jesus Christ of\s+Latter-day Saints/;
ok('apex says it is a fake religion', DISCLAIMER.test(apex));
ok('apex names the real church', CHURCH.test(apex));
ok('the disclaimer is visible text, not just metadata',
  /<footer[\s\S]*fake religion[\s\S]*<\/footer>/.test(apex));
ok('the description says it is a joke too', /A fake religion, made for laughs/.test(
  (apex.match(/name="description" content="([^"]+)"/) || [])[1] || ''));

/* ---------- Bible: the full text, generated from Bible/scriptures.txt ---------- */
const bible = read('Bible/index.html');
const source = read('Bible/scriptures.txt');

ok('bible has a real title', /<title>The Gröna Scriptures — Gröna Elden<\/title>/.test(bible));
ok('bible has a canonical url',
  /rel="canonical" href="https:\/\/gronaelden\.com\/Bible\/"/.test(bible));
ok('bible is indexable now that it has the text',
  /name="robots" content="index[^"]*"/.test(bible) && !/noindex/.test(bible));
ok('bible allows large image previews', /max-image-preview:large/.test(bible));
ok('bible has a description', /name="description" content="[^"]{40,}"/.test(bible));
ok('bible links back to the apex', /href="\.\.\/"/.test(bible));
ok('bible carries the disclaimer too', DISCLAIMER.test(bible) && CHURCH.test(bible));
ok('the sitemap lists the bible', locs.indexOf('https://gronaelden.com/Bible/') !== -1, locs);

/* structure */
const reckoningHeads = (bible.match(/<section class="reckoning"/g) || []).length;
const sourceReckonings = (source.match(/^# /gm) || []).length - 1;
ok('every reckoning is a section', reckoningHeads === sourceReckonings,
  { page: reckoningHeads, source: sourceReckonings });

const sourceChapters = (source.match(/^### /gm) || []).length - 1;
const pageChapters = (bible.match(/<h3 /g) || []).length;
ok('every chapter is a heading', pageChapters === sourceChapters,
  { page: pageChapters, source: sourceChapters });

const ids = [...bible.matchAll(/id="([^"]+)"/g)].map((m) => m[1]);
const dupIds = ids.filter((id, i) => ids.indexOf(id) !== i);
ok('every id is unique', dupIds.length === 0, dupIds);

const toc = (bible.match(/<nav class="toc"[\s\S]*?<\/nav>/) || [''])[0];
const tocTargets = [...toc.matchAll(/href="#([^"]+)"/g)].map((m) => m[1]);
ok('the contents list has an entry per reckoning', tocTargets.length === sourceReckonings, tocTargets.length);
ok('every contents link lands on an element',
  tocTargets.every((id) => ids.indexOf(id) !== -1), tocTargets.filter((id) => ids.indexOf(id) === -1));

ok('the record is closed on the page', /THE RECORD IS CLOSED\./.test(bible));

/* the page is generated: every paragraph of the text must survive into it */
const escape = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const paragraphs = source
  .split(/\r?\n/)
  .map((l) => l.trim())
  .filter((l) => l && !l.startsWith('#') && l !== '---' && !l.startsWith('*'));
const lost = paragraphs.filter((p) => bible.indexOf('<p>' + escape(p) + '</p>') === -1);
ok('every paragraph of the text is on the page', lost.length === 0,
  { missing: lost.length, first: lost[0] });

let drift = '';
try {
  require('child_process').execFileSync(
    process.execPath,
    [path.join(dir, 'tools', 'build-bible.mjs'), '--check'],
    { stdio: 'pipe' }
  );
} catch (e) {
  drift = String(e.stdout || e.stderr || e.message).trim();
}
ok('the page is what the text file generates', drift === '', drift);

ok('the sitemap image urls all resolve to files',
  imageLocs.every((u) => fs.existsSync(path.join(dir, u.replace('https://gronaelden.com/', '')))),
  imageLocs.filter((u) => !fs.existsSync(path.join(dir, u.replace('https://gronaelden.com/', '')))));


console.log(failures === 0 ? '\nALL SEO TESTS PASSED' : '\n' + failures + ' SEO TEST(S) FAILED');
process.exit(failures ? 1 : 0);
