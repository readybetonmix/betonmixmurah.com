/**
 * tools/lib/site.js
 *
 * ONE place for every site-specific setting used by the tools in tools/. Porting these tools to
 * another Hugo site means editing THIS file (plus tools/prompts/*.json), not the scripts.
 *
 * baseURL / title / price table are read from config.toml at runtime, so changing the domain in
 * config.toml (e.g. from betonmixmurah-com.pages.dev to betonmixmurah.com) is picked up
 * automatically by GSC, IndexNow, robots.txt and the sitemap.
 */

const fs   = require('fs');
const path = require('path');

// `toml` is an npm dependency; if it is not installed (e.g. a workflow that skips `npm ci`) fall
// back to a tiny regex reader that only knows baseURL and title, so the tools never crash on it.
let toml = null;
try { toml = require('toml'); } catch { /* handled below */ }

const ROOT = path.join(__dirname, '..', '..');

function readHugoConfig() {
  // config.toml and hugo.toml are kept identical in this repo; config.toml is the one the tools read.
  for (const name of ['config.toml', 'hugo.toml']) {
    const p = path.join(ROOT, name);
    if (fs.existsSync(p)) {
      const raw = fs.readFileSync(p, 'utf8');
      if (toml) {
        try { return { file: p, data: toml.parse(raw) }; }
        catch (err) { console.warn(`⚠️  Could not parse ${name}: ${err.message}`); }
      }
      const pick = key => { const m = raw.match(new RegExp('^' + key + '\\s*=\\s*"([^"]*)"', 'm')); return m ? m[1] : undefined; };
      return { file: p, data: { baseURL: pick('baseURL'), title: pick('title'), params: {} } };
    }
  }
  return { file: null, data: {} };
}

const hugo   = readHugoConfig();
const params = hugo.data.params || {};
const baseURL = String(hugo.data.baseURL || 'https://betonmixmurah-com.pages.dev').replace(/\/+$/, '');

// "Pagar Panel Polos + Tiang — 250.000 /m" style lines, taken from [[params.tabelItems]] so the AI
// only ever quotes the REAL price list of the site instead of inventing numbers.
function priceListForPrompt() {
  const items = Array.isArray(params.tabelItems) ? params.tabelItems : [];
  if (!items.length) return '(Daftar harga resmi belum tersedia — JANGAN menyebut angka harga apa pun.)';
  return items.map(i => `- ${i.name}: Rp ${i.price}`).join('\n');
}

function areaListForPrompt() {
  const areas = Array.isArray(params.area_served) ? params.area_served : [];
  return areas.length ? areas.join(', ') : 'Jabodetabek';
}

module.exports = {
  ROOT,
  CONTENT_DIR : path.join(ROOT, 'content'),
  STATIC_DIR  : path.join(ROOT, 'static'),
  PUBLIC_DIR  : path.join(ROOT, 'public'),

  SITE_NAME   : 'BetonMixMurah',
  BRAND_REGEX : /beton\s?mix\s?murah/i,         // used by revise-articles.js to keep the brand name
  SITE_URL    : `${baseURL}/`,                   // always with trailing slash
  BASE_URL    : baseURL,                         // never with trailing slash
  SITE_TITLE  : hugo.data.title || 'BetonMixMurah | Supplier Pagar Panel Beton dan Sewa Truk Crane',

  // Folder under content/ that receives every AI-generated article  (content/blog/<slug>.md → /blog/<slug>/)
  ARTICLE_FOLDER : 'blog',
  // Sections under content/ that count as "articles": used for duplicate checks and internal links.
  // Anything else under content/ (contact page, profile, ...) is never touched or linked.
  ARTICLE_SECTIONS: ['pagar', 'crane', 'blog'],

  // Reader address rule (see tools/prompts/*.json): "Teman BM" ONLY in the first and the closing
  // paragraph, "Anda" everywhere else.
  AUDIENCE_NAME : 'Teman BM',

  GENERIC_IMAGE : '/images/admin/featured-image.png',

  hugo,
  params,
  priceListForPrompt,
  areaListForPrompt,
};
