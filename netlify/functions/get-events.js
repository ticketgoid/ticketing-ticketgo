// File: netlify/functions/get-events.js

const fs = require('fs').promises;
const path = require('path');

const CACHE_FILE_PATH = path.join('/tmp', 'events_cache.json');
// Durasi cache normal (2 menit)
const CACHE_DURATION_SUCCESS = 2 * 60 * 1000;
// Durasi cache darurat jika Airtable gagal (30 detik)
const CACHE_DURATION_FAILURE = 30 * 1000;

exports.handler = async function (event, context) {
  try {
    const cachedData = JSON.parse(await fs.readFile(CACHE_FILE_PATH, 'utf-8'));
    const now = Date.now();

    if (now - cachedData.timestamp < cachedData.duration) {
      console.log('GET-EVENTS: Berhasil! Menyajikan data dari FILE CACHE.');
      return {
        statusCode: 200,
        body: JSON.stringify(cachedData.data),
      };
    }
  } catch (error) {
    if (error.code !== 'ENOENT') console.error('Gagal membaca file cache:', error);
  }

  console.log('GET-EVENTS: Cache tidak ada atau kedaluwarsa. Mengambil data baru dari Airtable...');
  const { AIRTABLE_API_KEY, AIRTABLE_BASE_ID_EVENT } = process.env;
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID_EVENT}/Events?sort%5B0%5D%5Bfield%5D=Prioritas&sort%5B0%5D%5Bdirection%5D=desc&sort%5B1%5D%5Bfield%5D=Urutan&sort%5B1%5D%5Bdirection%5D=asc&sort%5B2%5D%5Bfield%5D=Waktu&sort%5B2%5D%5Bdirection%5D=asc`;

  try {
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${AIRTABLE_API_KEY}` },
    });

    if (!response.ok) {
      // Jika error dari Airtable (misal 429), JANGAN HANYA GAGAL.
      console.error(`Airtable Error: ${response.status}. Membuat cache darurat.`);
      
      // --- INILAH PERUBAHAN KUNCI ---
      // Buat cache darurat dengan data kosong dan durasi pendek
      const fallbackData = { records: [] };
      await fs.writeFile(CACHE_FILE_PATH, JSON.stringify({
        timestamp: Date.now(),
        duration: CACHE_DURATION_FAILURE, // Durasi pendek
        data: fallbackData,
      }));

      // Kembalikan data kosong untuk sementara, BUKAN error.
      // Ini akan membuat halaman event kosong sesaat, tapi tidak error.
      return {
        statusCode: 200,
        body: JSON.stringify(fallbackData),
      };
    }

    const data = await response.json();
    
    // Tulis data baru yang berhasil ke file cache dengan durasi normal
    await fs.writeFile(CACHE_FILE_PATH, JSON.stringify({
      timestamp: Date.now(),
      duration: CACHE_DURATION_SUCCESS, // Durasi normal
      data: data,
    }));
    console.log('GET-EVENTS: Berhasil! File cache berhasil diperbarui dengan data dari Airtable.');

    return {
      statusCode: 200,
      body: JSON.stringify(data),
    };
  } catch (error) {
    console.error('Gagal total saat mengambil data dari Airtable:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to fetch events' }),
    };
  }
};
