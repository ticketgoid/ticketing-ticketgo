// File: netlify/functions/get-events.js

const fs = require('fs').promises;
const path = require('path');

const CACHE_FILE_PATH = path.join('/tmp', 'events_cache.json');
const CACHE_DURATION_SUCCESS = 2 * 60 * 1000; // 2 menit
const CACHE_DURATION_FAILURE = 30 * 1000;    // 30 detik

// --- FUNGSI BARU UNTUK MENCOBA ULANG ---
const fetchWithRetry = async (url, options, retries = 3, backoff = 35000) => {
  for (let i = 0; i < retries; i++) {
    const response = await fetch(url, options);
    if (response.ok) {
      return response;
    }
    if (response.status === 429) {
      console.log(`Airtable Error 429. Mencoba lagi dalam ${backoff / 1000} detik... (Percobaan ${i + 1}/${retries})`);
      await new Promise(resolve => setTimeout(resolve, backoff));
      backoff *= 1.5; // Tambah waktu tunggu untuk percobaan berikutnya
    } else {
      // Untuk error selain 429, langsung gagalkan
      return response;
    }
  }
  // Jika semua percobaan gagal, lempar error
  throw new Error(`Gagal mengambil data dari Airtable setelah ${retries} kali percobaan.`);
};

exports.handler = async function (event, context) {
  try {
    const cachedData = JSON.parse(await fs.readFile(CACHE_FILE_PATH, 'utf-8'));
    const now = Date.now();

    if (now - cachedData.timestamp < cachedData.duration) {
      console.log('GET-EVENTS: Berhasil! Menyajikan data dari FILE CACHE.');
      return { statusCode: 200, body: JSON.stringify(cachedData.data) };
    }
  } catch (error) {
    if (error.code !== 'ENOENT') console.error('Gagal membaca file cache:', error);
  }

  console.log('GET-EVENTS: Cache tidak ada/kedaluwarsa. Mengambil data dari Airtable dengan logika retry...');
  const { AIRTABLE_API_KEY, AIRTABLE_BASE_ID_EVENT } = process.env;
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID_EVENT}/Events?sort%5B0%5D%5Bfield%5D=Prioritas&sort%5B0%5D%5Bdirection%5D=desc&sort%5B1%5D%5Bfield%5D=Urutan&sort%5B1%5D%5Bdirection%5D=asc&sort%5B2%5D%5Bfield%5D=Waktu&sort%5B2%5D%5Bdirection%5D=asc`;

  try {
    // Gunakan fungsi fetchWithRetry yang baru
    const response = await fetchWithRetry(url, { headers: { 'Authorization': `Bearer ${AIRTABLE_API_KEY}` } });

    if (!response.ok) {
      throw new Error(`Airtable merespons dengan status: ${response.status}`);
    }

    const data = await response.json();
    
    // Tulis data yang berhasil ke cache dengan durasi normal
    await fs.writeFile(CACHE_FILE_PATH, JSON.stringify({
      timestamp: Date.now(),
      duration: CACHE_DURATION_SUCCESS,
      data: data,
    }));
    console.log('GET-EVENTS: Berhasil! File cache berhasil diperbarui dengan data dari Airtable.');

    return { statusCode: 200, body: JSON.stringify(data) };

  } catch (error) {
    // Blok ini akan berjalan jika SEMUA percobaan retry gagal
    console.error('Gagal total mengambil data setelah beberapa kali percobaan:', error.message);
    
    // Buat cache darurat
    const fallbackData = { records: [] };
    await fs.writeFile(CACHE_FILE_PATH, JSON.stringify({
      timestamp: Date.now(),
      duration: CACHE_DURATION_FAILURE,
      data: fallbackData,
    }));
    console.log('GET-EVENTS: Cache darurat dibuat.');

    return { statusCode: 200, body: JSON.stringify(fallbackData) };
  }
};
