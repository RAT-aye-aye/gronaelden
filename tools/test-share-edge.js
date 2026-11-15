/* Headless checks for the archive's edge-first listing. Run with:
   NODE_PATH=/tmp/opencode/domtest/node_modules node tools/test-share-edge.js */
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

const EDGE = 'https://api.gronaelden.com';

function boot(fetchImpl) {
  const vc = new VirtualConsole();
  vc.on('jsdomError', () => {});
  const calls = [];
  const dom = new JSDOM(html, {
    url: 'http://localhost/share/',
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    virtualConsole: vc,
    beforeParse(w) {
      w.fetch = async function (target, options) {
        calls.push({ url: String(target), options: options || {} });
        return fetchImpl(String(target), options || {});
      };
    }
  });
  return { dom, w: dom.window, doc: dom.window.document, calls };
}

const jsonResponse = (data, status) => ({
  ok: (status || 200) < 400,
  status: status || 200,
  json: async () => data
});

const edgeFiles = [
  { name: 'from-the-edge.jpg', size: 1000, type: 'file' },
  { name: 'clown.gif', size: 2000, type: 'file' }
];
const githubFiles = [
  { name: 'direct-from-github.jpg', size: 3000, type: 'file' }
];

async function main() {
  /* -------- the edge answers -------- */
  {
    const { doc, calls } = boot(async (target) => {
      if (target.indexOf('manifest.json') !== -1) return jsonResponse({ items: [] });
      if (target.indexOf(EDGE + '/list') === 0) return jsonResponse(edgeFiles);
      if (target.indexOf('api.github.com') !== -1) return jsonResponse(githubFiles);
      throw new Error('unexpected ' + target);
    });
    await tick(80);

    const grid = doc.getElementById('grid');
    ok('two tiles from the edge', grid.children.length === 2, grid.children.length);
    ok('the edge tiles are the ones rendered',
      grid.querySelector('img').getAttribute('src') === 'media/from-the-edge.jpg',
      grid.querySelector('img').getAttribute('src'));
    ok('github was not asked', calls.every((c) => c.url.indexOf('api.github.com') === -1),
      calls.map((c) => c.url));
    const listingCalls = calls.filter((c) => c.url.indexOf('manifest.json') === -1);
    ok('the manifest is fetched first', calls[0].url.indexOf('manifest.json') !== -1, calls[0].url);
    ok('the first listing call is the edge', listingCalls[0].url === EDGE + '/list', listingCalls[0].url);
    ok('no force flag on the first load', listingCalls[0].url.indexOf('force') === -1);
    ok('meta counts the edge items', doc.getElementById('meta').textContent === '2 items',
      doc.getElementById('meta').textContent);
  }

  /* -------- the edge is down: GitHub direct -------- */
  {
    const { doc, calls } = boot(async (target) => {
      if (target.indexOf(EDGE + '/list') === 0) throw new TypeError('no dns');
      return jsonResponse(githubFiles);
    });
    await tick(120);
    ok('a dead edge falls back to GitHub',
      doc.getElementById('grid').children.length === 1, doc.getElementById('grid').children.length);
    ok('the fallback really called GitHub',
      calls.some((c) => c.url.indexOf('api.github.com') !== -1), calls.map((c) => c.url));
  }

  /* -------- the edge answers with something odd -------- */
  {
    const { doc } = boot(async (target) => {
      if (target.indexOf(EDGE + '/list') === 0) return jsonResponse({ error: 'nope' });
      return jsonResponse(githubFiles);
    });
    await tick(120);
    ok('a non-array edge reply falls back',
      doc.getElementById('grid').children.length === 1, doc.getElementById('grid').children.length);
  }
  {
    const { doc } = boot(async (target) => {
      if (target.indexOf(EDGE + '/list') === 0) return jsonResponse([], 502);
      return jsonResponse(githubFiles);
    });
    await tick(120);
    ok('a 502 from the edge falls back',
      doc.getElementById('grid').children.length === 1, doc.getElementById('grid').children.length);
  }

  /* -------- refresh asks the edge to skip its cache -------- */
  {
    const { doc, calls } = boot(async (target) => {
      if (target.indexOf(EDGE + '/list') === 0) return jsonResponse(edgeFiles);
      return jsonResponse(githubFiles);
    });
    await tick(80);
    doc.getElementById('refresh').dispatchEvent(new (doc.defaultView.MouseEvent)('click', { bubbles: true }));
    await tick(80);
    ok('refresh sends force=1', calls.some((c) => c.url === EDGE + '/list?force=1'),
      calls.map((c) => c.url));
  }

  /* -------- soft-404 guard: the manifest alone keeps the page full -------- */
  {
    const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'share', 'media', 'manifest.json'), 'utf8'));
    const { doc } = boot(async (target) => {
      if (target.indexOf('manifest.json') !== -1) return jsonResponse(manifest);
      throw new TypeError('rate limited by everything');
    });
    await tick(150);
    const tiles = doc.querySelectorAll('#grid .tile').length;
    ok('a manifest keeps the gallery full when every API fails',
      tiles === manifest.items.length, { tiles: tiles, manifest: manifest.items.length });
    ok('no error card when the manifest has content',
      doc.getElementById('status').hidden === true, doc.getElementById('status').textContent);
    ok('the count comes from the manifest',
      doc.getElementById('meta').textContent === manifest.items.length + ' items',
      doc.getElementById('meta').textContent);
  }

  /* -------- both down -------- */
  {
    const { doc } = boot(async () => {
      throw new TypeError('everything is down');
    });
    await tick(120);
    ok('both down shows the error card', doc.getElementById('status').hidden === false);
    ok('offline is reported', doc.getElementById('meta').textContent === 'offline',
      doc.getElementById('meta').textContent);
  }

  /* -------- static -------- */
  {
    const { doc } = boot(async () => jsonResponse(edgeFiles));
    ok('the edge base is declared in one place',
      doc.querySelector('meta[name="edge-api"]').getAttribute('content') === EDGE);
    ok('no external scripts', doc.querySelectorAll('script[src]').length === 0);
  }

  console.log(failures === 0 ? '\nALL EDGE-ARCHIVE TESTS PASSED' : '\n' + failures + ' EDGE-ARCHIVE TEST(S) FAILED');
  process.exit(failures ? 1 : 0);
}

main();
