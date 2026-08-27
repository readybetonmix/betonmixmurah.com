const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const { execSync } = require('child_process');
const axios = require('axios');

const contentDir = path.join(__dirname, 'content');
const now = new Date();

// Daftar layanan ping
const pingServices = [
  'http://ping.googleapis.com/ping?sitemap=',
  'http://www.bing.com/ping?sitemap=',
  'http://rpc.pingomatic.com/',
  'http://www.sitemaps.org/ping?sitemap=',
  'http://www.feedburner.com/fb/a/pingSubmit?bloglink=',
  'https://indexnow.org/ping?sitemap=',
];

// Fungsi untuk melakukan ping
async function pingSearchEngines(sitemapUrl) {
  for (const service of pingServices) {
    try {
      await axios.get(`${service}${sitemapUrl}`);
      console.log(`Berhasil melakukan ping ke ${service}`);
    } catch (error) {
      console.error(`Gagal melakukan ping ke ${service}:`, error.message);
    }
  }
}

// Cari semua file .md secara rekursif (termasuk subfolder crane/, pagar/, dll)
function getAllMarkdownFiles(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      getAllMarkdownFiles(fullPath, files);
    } else if (entry.name.endsWith('.md')) {
      files.push(fullPath);
    }
  }
  return files;
}

// Fungsi untuk memeriksa dan memperbarui artikel.
// PENTING: `date` (tanggal pembuatan asli) TIDAK PERNAH diubah.
// Yang diupdate hanya `lastmod` (tanggal revisi), supaya Google tetap
// bisa membedakan "kapan dibuat" vs "kapan direvisi" — baik untuk SEO
// karena histori umur konten tetap terjaga.
function recyclePost(filePath) {
  const fileContent = fs.readFileSync(filePath, 'utf8');
  const { data, content } = matter(fileContent);

  // Jika belum ada `date` sama sekali, lewati (bukan kandidat recycle)
  if (!data.date) return false;

  const postDate = new Date(data.date);
  if (isNaN(postDate.getTime())) return false;

  // Acuan umur konten: lastmod jika ada, kalau tidak pakai date asli
  const referenceDate = data.lastmod ? new Date(data.lastmod) : postDate;
  const monthsDiff =
    (now.getFullYear() - referenceDate.getFullYear()) * 12 +
    now.getMonth() - referenceDate.getMonth();

  if (monthsDiff >= 12) {
    // `date` (dibuat) dibiarkan apa adanya — hanya `lastmod` yang diupdate
    data.lastmod = now.toISOString().split('T')[0];
    const updatedContent = matter.stringify(content, data);
    fs.writeFileSync(filePath, updatedContent);
    return true;
  }

  return false;
}

// Memeriksa semua artikel (rekursif)
let updatedCount = 0;
const allMarkdownFiles = getAllMarkdownFiles(contentDir);
allMarkdownFiles.forEach(filePath => {
  if (recyclePost(filePath)) {
    updatedCount++;
    console.log(`Diperbarui (lastmod): ${path.relative(contentDir, filePath)}`);
  }
});

if (updatedCount > 0) {
  console.log(`${updatedCount} artikel telah diperbarui.`);
  // Rebuild situs Hugo
  execSync('hugo', { stdio: 'inherit' });

  // Lakukan ping ke mesin pencari
  const sitemapUrl = 'https://betonmixmurah-com.pages.dev/sitemap.xml';
  pingSearchEngines(sitemapUrl);
} else {
  console.log('Tidak ada artikel yang perlu diperbarui.');
}