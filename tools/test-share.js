/* Headless checks for the G.E. Archive page. Run with:
   NODE_PATH=/tmp/opencode/domtest/node_modules node tools/test-share.js */
const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');

const dir = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(dir, 'share', 'index.html'), 'utf8');

let failures = 0;
function ok(name, cond, extra) {
  if (cond) console.log('PASS ' + name);
  else {
    failures++;
    console.log('FAIL ' + name + (extra !== undefined ? ' -> ' + JSON.stringify(extra) : ''));
  }
}
const tick = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function boot(fetchImpl) {
  const vc = new VirtualConsole();
  vc.on('jsdomError', () => {});
  return new JSDOM(html, {
    url: 'http://localhost/share/',
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    virtualConsole: vc,
    beforeParse(w) {
      w.fetch = fetchImpl;
    }
  });
}

const files = [
  { type: 'file', name: 'gronaelden.jpg', size: 120000 },
  { type: 'file', name: 'donkey.gif', size: 2400000 },
  { type: 'file', name: 'chase.mp4', size: 5000000 },
  { type: 'file', name: 'notes.txt', size: 12 },
  { type: 'dir', name: 'old' }
];

function responder(list) {
  return async () => ({ ok: true, status: 200, json: async () => list });
}

(async function main() {
  const dom = boot(responder(files));
  const w = dom.window;
  const doc = w.document;
  await tick(60);

  const grid = doc.getElementById('grid');
  const meta = doc.getElementById('meta');
  const status = doc.getElementById('status');

  ok('gallery renders media files', grid.children.length === 3, grid.children.length);
  ok('non-media files are ignored', grid.textContent.indexOf('notes.txt') === -1);
  ok('meta counts items', meta.textContent === '3 items', meta.textContent);
  ok('status is hidden when full', status.hidden === true);

  const first = grid.children[0];
  const img = first.querySelector('img');
  ok('tiles use local media urls', !!img && img.getAttribute('src') === 'media/gronaelden.jpg',
    img && img.getAttribute('src'));
  ok('images are lazy loaded', img.getAttribute('loading') === 'lazy');
  ok('videos get a badge', grid.children[2].querySelector('.play') !== null);

  /* viewer */
  first.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  const viewer = doc.getElementById('viewer');
  ok('clicking a tile opens the viewer', viewer.hidden === false);
  ok('viewer shows the image', doc.getElementById('stage').querySelector('img') !== null);
  ok('viewer captions the file', doc.getElementById('caption').textContent.indexOf('gronaelden.jpg') === 0,
    doc.getElementById('caption').textContent);
  ok('viewer shows a counter', doc.getElementById('counter').textContent === '1 / 3',
    doc.getElementById('counter').textContent);

  doc.getElementById('next').dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  ok('next moves through the archive', doc.getElementById('caption').textContent.indexOf('donkey.gif') === 0,
    doc.getElementById('caption').textContent);

  doc.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  ok('escape closes the viewer', viewer.hidden === true);
  ok('body scroll lock is removed', doc.body.classList.contains('viewing') === false);

  /* empty archive */
  const empty = boot(responder([]));
  await tick(60);
  const emptyDoc = empty.window.document;
  ok('empty archive shows a message', emptyDoc.getElementById('status').hidden === false);
  ok('empty archive explains the folder', emptyDoc.getElementById('status').textContent.indexOf('share/media') !== -1);
  ok('empty count', emptyDoc.getElementById('meta').textContent === '0 items');

  /* failed fetch */
  const failing = boot(async () => { throw new Error('offline'); });
  await tick(60);
  const failDoc = failing.window.document;
  ok('fetch failure shows an error', failDoc.getElementById('status').hidden === false);
  ok('error links to the folder', failDoc.getElementById('status').querySelector('a') !== null);

  /* static checks */
  ok('no external scripts', doc.querySelectorAll('script[src]').length === 0);
  ok('page is indexable', /name="robots" content="index/.test(html) && !/noindex/.test(html));
  ok('page has a description', /name="description" content="[^"]{20,}"/.test(html));
  const ogImage = (html.match(/property="og:image" content="([^"]+)"/) || [])[1] || '';
  ok('page has a share preview image',
    /^https:\/\/gronaelden\.com\//.test(ogImage) && /\.(jpe?g|png|gif|webp)$/i.test(ogImage), ogImage);
  ok('the preview image exists in the repo',
    fs.existsSync(path.join(dir, ogImage.replace('https://gronaelden.com/', ''))), ogImage);
  ok('the preview image is the main photo', /\/photo\.jpg$/.test(ogImage), ogImage);
  ok('the page carries the disclaimer',
    /fake religion, made for laughs/.test(html) &&
      /The Church of Jesus Christ of\s+Latter-day Saints/.test(html));

  console.log(failures === 0 ? '\nALL ARCHIVE TESTS PASSED' : '\n' + failures + ' ARCHIVE TEST(S) FAILED');
  process.exit(failures ? 1 : 0);
})();
