/* =====================================================================
   build.js: turns the game's source files into the public website.

   Run it with:   node tools/build.js
   It makes a folder called dist/ holding exactly what gets put online
   (GitHub Pages, see .github/workflows/deploy.yml). Node.js runs it;
   there is nothing to install. GitHub runs it for you on every push.

   Why do we need a build at all? index.html is a "fragment" with no
   <html>, <head> or <body>, because the Claude Artifact publisher adds
   those. A real website needs them (and a <!doctype html>, or browsers
   fall back to an old "quirks mode" that can change how things are laid
   out). The source files are never changed: dist/ is a copy.
   ===================================================================== */

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const dist = path.join(root, 'dist');

// Start from an empty dist/ so nothing old is left behind.
fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(path.join(dist, 'js'), { recursive: true });

// Copy the stylesheet and every script the page loads (read from index.html itself, so a new script
// file is picked up automatically).
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
fs.copyFileSync(path.join(root, 'style.css'), path.join(dist, 'style.css'));
const scripts = [...html.matchAll(/<script src="([^"]+)"/g)].map(m => m[1]);
for (const file of scripts) fs.copyFileSync(path.join(root, file), path.join(dist, file));

// The fragment starts with <meta>, <title> and <link> tags (the page's "head" material) and then has
// the visible page, which starts at <main id="app">. Everything before that goes in <head>, the rest
// in <body>.
const split = html.indexOf('<main');
if (split < 0) throw new Error('index.html has no <main> element to start the page body at.');
let page = `<!doctype html>
<html lang="en">
<head>
${html.slice(0, split)}
</head>
<body>
${html.slice(split)}
</body>
</html>
`;

// "Cache busting": GitHub Pages tells browsers they may keep a saved copy
// of every file for 10 minutes, so right after an update a player could
// get the new page but OLD scripts (owner, 2026-11-24: "didn't work for
// me"). Adding ?v=<version> to each file's link gives every build new
// addresses, so the browser has no saved copy and downloads the new files.
// The version is the commit's id on GitHub (GITHUB_SHA), or the time when
// you build on your own computer.
const version = (process.env.GITHUB_SHA || String(Date.now())).slice(0, 12);
page = page
  .replace('href="style.css"', `href="style.css?v=${version}"`)
  .replace(/<script src="([^"]+)"/g, `<script src="$1?v=${version}"`);
fs.writeFileSync(path.join(dist, 'index.html'), page);

console.log(`Built dist/ with ${scripts.length} scripts (version ${version}).`);
