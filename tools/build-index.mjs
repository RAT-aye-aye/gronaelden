/* Regenerates share/media/manifest.json and sitemap.xml from the media folder.
   Run after adding or removing files:  node tools/build-index.mjs */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const mediaDir = path.join(dir, 'share', 'media');
const MEDIA = /\.(jpe?g|png|gif|webp|avif|mp4|webm)$/i;

const files = fs
  .readdirSync(mediaDir)
  .filter((f) => !f.startsWith('.') && MEDIA.test(f))
  .sort();

const items = files.map((name) => ({
  name,
  size: fs.statSync(path.join(mediaDir, name)).size
}));

/* ---------- manifest: the gallery's first paint, served from the same origin ---------- */

fs.writeFileSync(
  path.join(mediaDir, 'manifest.json'),
  JSON.stringify({ items }, null, 2) + '\n'
);

/* ---------- sitemap ---------- */

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const lines = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
  '        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
  '  <url>',
  '    <loc>https://gronaelden.com/</loc>',
  '    <changefreq>yearly</changefreq>',
  '    <image:image>',
  '      <image:loc>https://gronaelden.com/photo.jpg</image:loc>',
  '    </image:image>',
  '    <image:image>',
  '      <image:loc>https://gronaelden.com/bible.jpg</image:loc>',
  '    </image:image>',
  '  </url>',
  '  <url>',
  '    <loc>https://gronaelden.com/share/</loc>',
  '    <changefreq>weekly</changefreq>'
];

for (const name of files) {
  lines.push(
    '    <image:image>',
    `      <image:loc>https://gronaelden.com/share/media/${esc(name)}</image:loc>`,
    '    </image:image>'
  );
}

lines.push(
  '  </url>',
  '  <url>',
  '    <loc>https://gronaelden.com/Bible/</loc>',
  '    <changefreq>monthly</changefreq>',
  '    <image:image>',
  '      <image:loc>https://gronaelden.com/bible.jpg</image:loc>',
  '    </image:image>',
  '  </url>',
  '  <url>',
  '    <loc>https://gronaelden.com/watch/</loc>',
  '    <changefreq>weekly</changefreq>',
  '  </url>',
  '</urlset>',
  ''
);

fs.writeFileSync(path.join(dir, 'sitemap.xml'), lines.join('\n'));

console.log(`manifest.json: ${items.length} items`);
console.log(`sitemap.xml: 4 pages, ${items.length + 2} images`);
