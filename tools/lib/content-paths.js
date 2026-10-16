/**
 * tools/lib/content-paths.js
 *
 * Maps a content file to the URL Hugo publishes it at. The default (path without ".md") is right
 * for this site, but a `url:` or `slug:` in the front matter overrides it — and every internal
 * link the tools create must point at the REAL URL, otherwise it 404s.
 *
 *   content/pagar/foo.md            → /pagar/foo/
 *   content/pagar/foo/index.md      → /pagar/foo/        (page bundle)
 *   slug: "bar"                     → /pagar/bar/
 *   url: "/x/y/"                    → /x/y/
 */

const path = require('path');

function unquote(v) {
  return String(v).trim().replace(/^["']|["']$/g, '').trim();
}

function frontMatterBlock(raw) {
  const m = String(raw || '').match(/^---\r?\n([\s\S]*?)\r?\n---/);
  return m ? m[1] : '';
}

function urlForFile(filePath, contentRoot, raw) {
  const rel = path.relative(contentRoot, filePath).replace(/\\/g, '/').replace(/\.md$/, '');
  const fm = frontMatterBlock(raw);

  const urlMatch = fm.match(/^url:\s*(.+?)\s*$/m);
  if (urlMatch) {
    let u = unquote(urlMatch[1]);
    if (u) {
      if (!u.startsWith('/')) u = '/' + u;
      if (!u.endsWith('/')) u += '/';
      return u;
    }
  }

  let segments = rel.split('/');
  if (segments[segments.length - 1] === 'index') segments.pop(); // page bundle

  const slugMatch = fm.match(/^slug:\s*(.+?)\s*$/m);
  if (slugMatch && segments.length) {
    const s = unquote(slugMatch[1]);
    if (s) segments[segments.length - 1] = s.replace(/^\/+|\/+$/g, '');
  }
  return '/' + segments.join('/') + '/';
}

module.exports = { urlForFile, frontMatterBlock };
