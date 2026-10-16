/**
 * tools/lib/addressing.js
 *
 * Reader-address rule of this site: the audience is called "Teman BM" ONLY in the first paragraph
 * and in the closing (last) paragraph of an article; everywhere else it is "Anda".
 * Shared by generate-articles.js (validation + retry) and revise-articles.js (validation).
 *
 * "Prose paragraph" = a plain text block: headings, images, HTML/tables, lists and the
 * [[TABEL_...]] / [[[PLACEHOLDER_N]]] tokens are NOT counted as paragraphs.
 */

function proseParagraphs(body) {
  return String(body || '').split(/\n\s*\n/).map(b => b.trim()).filter(Boolean)
    .filter(b => !/^(#|!\[|<|\||\[\[|[-*+]\s|\d+[.)]\s|\{\{)/.test(b));
}

function countOccurrences(text, needle) {
  return needle ? String(text).split(needle).length - 1 : 0;
}

function checkAddressing(body, name) {
  const paras = proseParagraphs(body);
  const problems = [];
  if (paras.length < 2) return { ok: false, problems: ['artikel tidak punya paragraf pembuka & penutup yang jelas'] };
  const first = paras[0], last = paras[paras.length - 1];
  const total = countOccurrences(body, name);
  const mid   = total - countOccurrences(first, name) - countOccurrences(last, name);
  if (!first.includes(name)) problems.push(`paragraf pertama tidak menyapa "${name}"`);
  if (!last.includes(name))  problems.push(`paragraf penutup tidak menyapa "${name}"`);
  if (mid > 0)               problems.push(`"${name}" muncul ${mid}x di luar paragraf pertama/penutup (harus "Anda")`);
  if (/\b(kamu|sobat|kawan|bapak\/ibu|mitra)\b/i.test(body)) problems.push('memakai sapaan lain (kamu/sobat/kawan/Bapak/Ibu/Mitra)');
  return { ok: problems.length === 0, problems };
}

module.exports = { proseParagraphs, countOccurrences, checkAddressing };
