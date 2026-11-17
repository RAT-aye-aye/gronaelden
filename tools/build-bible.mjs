/* Builds Bible/index.html from Bible/scriptures.txt.
   Run after editing the text:  node tools/build-bible.mjs
   Check for drift:             node tools/build-bible.mjs --check

   The .txt is the source of truth: it is the file the author writes in and the
   thing that gets committed. The HTML is generated, never hand-edited. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(root, 'Bible', 'scriptures.txt');
const OUT = path.join(root, 'Bible', 'index.html');

const esc = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const slug = (s) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/* ---------- parse: headings, paragraphs, the closing line ---------- */

const lines = fs.readFileSync(SRC, 'utf8').split(/\r?\n/);

const book = { title: '', subtitles: [], epigraph: '', byline: '', sections: [], colophon: '' };
let section = null;
let chapter = null;

for (const raw of lines) {
  const line = raw.trim();
  if (!line || line === '---') continue;

  if (line.startsWith('### ')) {
    const name = line.slice(4).trim();
    if (!section) {
      book.byline = name;
      continue;
    }
    chapter = { title: name, id: slug(name), paragraphs: [] };
    section.chapters.push(chapter);
    continue;
  }

  if (line.startsWith('## ')) {
    const text = line.slice(3).trim();
    if (!section) book.subtitles.push(text);
    else if (!section.subject) section.subject = text;
    continue;
  }

  if (line.startsWith('# ')) {
    const text = line.slice(2).trim();
    if (!book.title) {
      book.title = text;
      continue;
    }
    section = { title: text, id: slug(text), subject: '', chapters: [] };
    book.sections.push(section);
    continue;
  }

  if (line.startsWith('**') && line.endsWith('**')) {
    book.colophon = line.slice(2, -2).trim();
    continue;
  }

  if (!section) {
    if (!book.epigraph) book.epigraph = line.replace(/^\*|\*$/g, '');
    else book.subtitles.push(line);
    continue;
  }

  chapter.paragraphs.push(line);
}

/* ---------- ids must be unique or the contents links go somewhere wrong ---------- */

const ids = [...book.sections.map((s) => s.id), ...book.sections.flatMap((s) => s.chapters.map((c) => c.id))];
const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
if (dupes.length) {
  console.error('duplicate ids: ' + [...new Set(dupes)].join(', '));
  process.exit(1);
}

/* ---------- assemble ---------- */

const SMALL = ['of', 'the', 'and', 'a', 'an', 'to', 'in', 'upon', 'which', 'from', 'for', 'who'];
const titleCase = (s) => {
  const words = s.toLowerCase().split(' ');
  return words
    .map((w, i) => {
      const afterDash = i > 0 && /[—–-]$/.test(words[i - 1]);
      if (SMALL.includes(w) && i > 0 && !afterDash) return w;
      return w.charAt(0).toUpperCase() + w.slice(1);
    })
    .join(' ');
};

const toc = book.sections
  .map(
    (s) =>
      `      <li><a href="#${s.id}"><span class="label">${esc(titleCase(s.title))}</span>` +
      (s.subject ? `<span class="hint">${esc(s.subject)}</span>` : '') +
      '</a></li>'
  )
  .join('\n');

const body = book.sections
  .map(
    (s, i) => `  <section class="reckoning" id="${s.id}">
    <header class="reckoning-head">
      <h2>${esc(s.title)}</h2>
      ${s.subject ? `<p class="subject">${esc(s.subject)}</p>` : ''}
    </header>
${s.chapters
  .map(
    (c) => `    <h3 id="${c.id}">${esc(c.title)}</h3>
${c.paragraphs.map((p) => `    <p>${esc(p)}</p>`).join('\n')}`
  )
  .join('\n\n')}
  </section>${i === book.sections.length - 1 ? '' : '\n\n  <p class="ornament" aria-hidden="true">\u2042</p>'}`
  )
  .join('\n\n');

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#05070a">
<title>${esc(titleCase(book.title))} — Gröna Elden</title>
<meta name="description" content="${esc(book.subtitles.join('. '))}. The complete scripture.">
<link rel="canonical" href="https://gronaelden.com/Bible/">
<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">
<meta property="og:type" content="book">
<meta property="og:site_name" content="gronaelden">
<meta property="og:title" content="${esc(titleCase(book.title))}">
<meta property="og:description" content="${esc(book.subtitles.join('. '))}.">
<meta property="og:url" content="https://gronaelden.com/Bible/">
<meta property="og:image" content="https://gronaelden.com/bible.jpg">
<meta property="og:image:width" content="1100">
<meta property="og:image:height" content="1430">
<meta property="og:image:alt" content="The Book of Gronest">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(titleCase(book.title))}">
<meta name="twitter:description" content="${esc(book.subtitles.join('. '))}.">
<meta name="twitter:image" content="https://gronaelden.com/bible.jpg">
<style>
  :root {
    --bg: #05070a;
    --ink: #dfe4ec;
    --dim: #8a92a5;
    --faint: #5b6272;
    --gold: #c9a24a;
    --green: #7dbf63;
    --rule: rgba(255, 255, 255, .09);
  }
  * { box-sizing: border-box; }
  html { scroll-behavior: smooth; }
  body {
    margin: 0;
    background: radial-gradient(80% 40% at 50% 0%, #16210f66 0%, transparent 65%), var(--bg);
    color: var(--ink);
    font-family: "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, "Times New Roman", serif;
    font-size: 17.5px;
    line-height: 1.75;
    -webkit-font-smoothing: antialiased;
    text-rendering: optimizeLegibility;
  }
  ::selection { background: rgba(125, 191, 99, .28); }

  .bar {
    position: sticky;
    top: 0;
    z-index: 5;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 10px max(14px, env(safe-area-inset-left)) 10px max(14px, env(safe-area-inset-right));
    background: rgba(5, 7, 10, .86);
    backdrop-filter: blur(10px);
    border-bottom: 1px solid var(--rule);
    font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    font-size: 12px;
    letter-spacing: .04em;
  }
  .bar a {
    color: var(--dim);
    text-decoration: none;
    padding: 4px 0;
  }
  .bar a:hover, .bar a:focus-visible { color: var(--green); outline: none; }
  .bar .brand { color: var(--gold); letter-spacing: .16em; text-transform: uppercase; font-size: 10.5px; }

  .page {
    max-width: 42rem;
    margin: 0 auto;
    padding: 34px max(20px, env(safe-area-inset-left)) 80px max(20px, env(safe-area-inset-right));
  }

  /* ---------- title page ---------- */
  .title-block { text-align: center; padding: 18px 0 8px; }
  .kicker {
    margin: 0 0 14px;
    color: var(--green);
    font-family: system-ui, sans-serif;
    font-size: 10.5px;
    letter-spacing: .28em;
    text-transform: uppercase;
  }
  h1 {
    margin: 0;
    font-size: clamp(30px, 8.5vw, 44px);
    font-weight: 600;
    line-height: 1.15;
    letter-spacing: .01em;
  }
  .sub {
    margin: 14px 0 0;
    color: var(--ink);
    font-size: clamp(16px, 4.4vw, 19px);
    font-style: italic;
  }
  .byline {
    margin: 8px 0 0;
    color: var(--gold);
    font-family: system-ui, sans-serif;
    font-size: 10.5px;
    letter-spacing: .2em;
    text-transform: uppercase;
  }
  .epigraph {
    max-width: 30rem;
    margin: 26px auto 0;
    color: var(--dim);
    font-size: 15px;
    font-style: italic;
    line-height: 1.7;
  }

  /* ---------- contents ---------- */
  .toc {
    margin: 34px 0 44px;
    padding: 20px 22px 8px;
    background: rgba(255, 255, 255, .022);
    border: 1px solid var(--rule);
    border-radius: 12px;
  }
  .toc h2 {
    margin: 0 0 12px;
    color: var(--faint);
    font-family: system-ui, sans-serif;
    font-size: 10px;
    letter-spacing: .26em;
    text-transform: uppercase;
    font-weight: 600;
  }
  .toc ol { margin: 0; padding: 0; list-style: none; counter-reset: toc; }
  .toc li { counter-increment: toc; border-top: 1px solid var(--rule); }
  .toc li:first-child { border-top: none; }
  .toc a {
    display: flex;
    gap: 12px;
    padding: 9px 0;
    text-decoration: none;
    color: var(--ink);
    font-family: system-ui, sans-serif;
  }
  .toc a::before {
    content: counter(toc, upper-roman);
    min-width: 2.1em;
    color: var(--gold);
    font-size: 10.5px;
    letter-spacing: .08em;
    padding-top: 3px;
  }
  .toc .label { font-size: 13.5px; font-weight: 600; }
  .toc .hint {
    display: block;
    color: var(--dim);
    font-size: 12px;
    font-weight: 400;
    line-height: 1.5;
    margin-top: 2px;
  }
  .toc a:hover .label, .toc a:focus-visible .label { color: var(--green); }

  /* ---------- the text ---------- */
  .reckoning { scroll-margin-top: 64px; }
  .reckoning-head { margin: 0 0 26px; }
  .reckoning h2 {
    margin: 0;
    color: var(--gold);
    font-family: system-ui, sans-serif;
    font-size: 11.5px;
    font-weight: 600;
    letter-spacing: .26em;
    text-transform: uppercase;
  }
  .reckoning .subject {
    margin: 9px 0 0;
    font-size: clamp(21px, 5.4vw, 26px);
    font-style: italic;
    line-height: 1.3;
  }
  h3 {
    margin: 40px 0 16px;
    color: var(--dim);
    font-family: system-ui, sans-serif;
    font-size: 11.5px;
    font-weight: 600;
    letter-spacing: .17em;
    text-transform: uppercase;
    scroll-margin-top: 64px;
  }
  h3::after {
    content: "";
    display: block;
    width: 34px;
    margin-top: 9px;
    border-bottom: 1px solid rgba(201, 162, 74, .45);
  }
  p { margin: 0 0 1.05em; }
  .ornament {
    margin: 44px 0;
    text-align: center;
    color: rgba(201, 162, 74, .45);
    font-size: 17px;
    letter-spacing: .5em;
    user-select: none;
  }
  .colophon {
    margin: 52px 0 0;
    text-align: center;
    color: var(--gold);
    font-family: system-ui, sans-serif;
    font-size: 10.5px;
    letter-spacing: .28em;
    text-transform: uppercase;
  }

  /* ---------- closing ---------- */
  .finis {
    margin-top: 34px;
    padding-top: 22px;
    border-top: 1px solid var(--rule);
    text-align: center;
    font-family: system-ui, sans-serif;
    color: var(--faint);
    font-size: 11px;
    line-height: 1.8;
  }
  .finis a { color: var(--dim); text-decoration: none; border-bottom: 1px solid rgba(255, 255, 255, .14); }
  .finis a:hover { color: var(--green); }
  .disclaimer {
    max-width: 34rem;
    margin: 22px auto 0;
    color: #6f7688;
    font-size: 11.5px;
    line-height: 1.7;
  }
  .disclaimer b { color: #9aa2b4; font-weight: 600; }

  @media print {
    body { background: #fff; color: #111; font-size: 11pt; }
    .bar, .toc, .ornament { display: none; }
    a { color: inherit; text-decoration: none; }
  }
</style>
</head>
<body>
  <nav class="bar">
    <a href="../">← Gröna Elden</a>
    <span class="brand">The Record</span>
    <a href="#contents">Contents</a>
  </nav>

  <main class="page">
    <header class="title-block">
      <p class="kicker">The Sacred Writings</p>
      <h1>${esc(titleCase(book.title))}</h1>
      ${book.subtitles.map((s) => `<p class="sub">${esc(s)}</p>`).join('\n      ')}
      ${book.byline ? `<p class="byline">${esc(book.byline)}</p>` : ''}
      ${book.epigraph ? `<p class="epigraph">${esc(book.epigraph)}</p>` : ''}
    </header>

    <nav class="toc" id="contents" aria-label="Contents">
      <h2>Contents</h2>
      <ol>
${toc}
      </ol>
    </nav>

${body}

${book.colophon ? `    <p class="colophon">${esc(book.colophon)}</p>\n` : ''}
    <div class="finis">
      <p><b>This is a fake religion, made for laughs.</b> The person who runs this site is
      a believing member of The Church of Jesus Christ of Latter-day Saints.</p>
      <p><a href="../">← Back to gronaelden.com</a></p>
    </div>
  </main>
</body>
</html>
`;

if (process.argv.includes('--check')) {
  const current = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
  if (current !== html) {
    console.error('Bible/index.html is out of date. Run: node tools/build-bible.mjs');
    process.exit(1);
  }
  console.log('Bible/index.html matches Bible/scriptures.txt');
  process.exit(0);
}

fs.writeFileSync(OUT, html);

const chapters = book.sections.reduce((n, s) => n + s.chapters.length, 0);
const words = book.sections
  .flatMap((s) => s.chapters.flatMap((c) => c.paragraphs))
  .join(' ')
  .split(/\s+/)
  .filter(Boolean).length;

console.log(`Bible/index.html: ${book.sections.length} reckonings, ${chapters} chapters, ${words} words`);
