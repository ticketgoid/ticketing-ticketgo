// File: netlify/functions/get-events.js

const fs = require('fs').promises;
const path = require('path');

// Path ke file cache di direktori sementara yang disediakan oleh Netlify
const CACHE_FILE_PATH = path.join('/tmp', 'events_cache.json');
// Durasi cache (2 menit)
const CACHE_DURATION = 2 * 60 * 1000;

exports.handler = async function (event, context) {
  try {
    // Coba baca file cache terlebih dahulu
    const cachedData = JSON.parse(await fs.readFile(CACHE_FILE_PATH, 'utf-8'));
    const now = Date.now();

    // Jika cache valid, sajikan dari cache
    if (now - cachedData.timestamp < CACHE_DURATION) {
      console.log('GET-EVENTS: Menyajikan data dari file cache...');
      return {
        statusCode: 200,
        body: JSON.stringify(cachedData.data),
      };
    }
  } catch (error) {
    // Abaikan error jika file cache tidak ada, ini wajar terjadi pertama kali
    if (error.code !== 'ENOENT') {
      console.error('Gagal membaca file cache:', error);
    }
  }

  console.log('GET-EVENTS: Mengambil data baru dari Airtable...');
  const { AIRTABLE_API_KEY, AIRTABLE_BASE_ID_EVENT } = process.env;
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID_EVENT}/Events?sort%5B0%5D%5Bfield%5D=Prioritas&sort%5B0%5D%5Bdirection%5D=desc&sort%5B1%5D%5Bfield%5D=Urutan&sort%5B1%5D%5Bdirection%5D=asc&sort%5B2%5D%5Bfield%5D=Waktu&sort%5B2%5D%5Bdirection%5D=asc`;

  try {
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${AIRTABLE_API_KEY}` },
    });

    if (!response.ok) {
      return { statusCode: response.status, body: response.statusText };
    }

    const data = await response.json();
    
    // Siapkan data untuk disimpan di cache
    const dataToCache = {
      timestamp: Date.now(),
      data: data,
    };

    // Tulis data baru ke file cache
    await fs.writeFile(CACHE_FILE_PATH, JSON.stringify(dataToCache));
    console.log('GET-EVENTS: File cache berhasil diperbarui.');

    return {
      statusCode: 200,
      body: JSON.stringify(data),
    };
  } catch (error) {
    console.error('Error fetching events from Airtable:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to fetch events' }),
    };
  }
};
