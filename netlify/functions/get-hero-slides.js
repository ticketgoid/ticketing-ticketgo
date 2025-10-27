// File: netlify/functions/get-hero-slides.js

const fs = require('fs').promises;
const path = require('path');

const CACHE_FILE_PATH = path.join('/tmp', 'hero_slides_cache.json');
// Cache sangat lama karena kontennya di-hardcode. Perubahan hanya terjadi saat deployment baru.
const CACHE_DURATION = 12 * 60 * 60 * 1000; // 12 jam

exports.handler = async function (event, context) {
  try {
    const cachedData = JSON.parse(await fs.readFile(CACHE_FILE_PATH, 'utf-8'));
    const now = Date.now();

    if (now - cachedData.timestamp < CACHE_DURATION) {
      console.log('GET-HERO-SLIDES: Menyajikan data dari file cache...');
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cachedData.data),
      };
    }
  } catch (error) {
    if (error.code !== 'ENOENT') console.error('Gagal membaca cache hero:', error);
  }

  console.log('GET-HERO-SLIDES: Membaca data dari direktori assets/hero...');
  
  // Path ke direktori aset Anda dari root proyek
  const heroDir = path.resolve(process.cwd(), 'assets/hero');

  try {
    const files = await fs.readdir(heroDir);

    const slides = files
      .filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file)) // Hanya ambil file gambar
      .sort() // Urutkan berdasarkan nama (misal: "1_...", "2_...")
      .map(file => ({
        id: file, // Menggunakan nama file sebagai ID unik
        fields: {
          // Buat struktur data yang sama persis seperti yang diharapkan frontend dari Airtable
          'Gambar': [{ url: `/assets/hero/${file}` }],
          // Anda bisa menambahkan link tujuan di sini jika diperlukan di masa depan
          'LinkTujuan': null 
        }
      }));

    const responseData = { records: slides };

    // Tulis data ke file cache untuk permintaan selanjutnya
    await fs.writeFile(CACHE_FILE_PATH, JSON.stringify({
      timestamp: Date.now(),
      data: responseData,
    }));
    console.log('GET-HERO-SLIDES: File cache berhasil dibuat/diperbarui.');

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(responseData),
    };
  } catch (error) {
    console.error(`Error saat membaca direktori ${heroDir}:`, error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Gagal membaca konten hero slides' }),
    };
  }
};
