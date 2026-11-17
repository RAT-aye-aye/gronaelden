/* No dependencies. Checks that the disclaimer is on every page, in visible text.
   Run with: node tools/test-disclaimer.js
   This is the one thing on the site that is not a joke: whatever else changes,
   every page must say that the religion is fake and that the owner is a
   believing member of The Church of Jesus Christ of Latter-day Saints. */

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

// Comments are not visible to a reader, so they do not count.
const visible = (html) => html.replace(/<!--[\s\S]*?-->/g, ' ');
const text = (html) =>
  visible(html)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&[a-z]+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const pages = [
  ['index.html', 'the apex'],
  ['share/index.html', 'the archive'],
  ['Bible/index.html', 'the scriptures'],
];

for (const [file, label] of pages) {
  const html = read(file);
  const t = text(html);

  ok(`${label} says the religion is fake`, /fake religion/i.test(t), file);
  ok(`${label} says it is made for laughs`, /made for laughs/i.test(t), file);
  ok(
    `${label} names the Church`,
    /Church of Jesus Christ of Latter-day Saints/i.test(t),
    file
  );
  ok(`${label} says the owner is a believing member`, /believing member/i.test(t), file);
}

// The Bible page is generated, so the template has to carry it too.
const build = read('tools/build-bible.mjs');
ok('the Bible generator keeps the disclaimer', /fake religion/i.test(build) && /Latter-day Saints/i.test(build));

// The front page should not be mistaken for a real religion by a crawler either.
const apex = read('index.html');
ok('the apex description calls it a fake religion', /fake religion/i.test(apex));

if (failures) {
  console.log(`\n${failures} FAILED — the disclaimer is not negotiable.`);
  process.exit(1);
}
console.log('\nALL DISCLAIMER TESTS PASSED');
