// File: netlify/functions/get-hero-slides.js

const fs = require('fs').promises;
const path = require('path');

const CACHE_FILE_PATH = path.join('/tmp', 'hero_slides_cache.json');
const CACHE_DURATION = 2 * 60 * 1000; // 2 menit

exports.handler = async function (event, context) {
  try {
    const cachedData = JSON.parse(await fs.readFile(CACHE_FILE_PATH, 'utf-8'));
    const now = Date.now();

    if (now - cachedData.timestamp < CACHE_DURATION) {
      console.log('GET-HERO-SLIDES: Menyajikan data dari file cache...');
      return {
        statusCode: 200,
        body: JSON.stringify(cachedData.data),
      };
    }
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.error('Gagal membaca file cache hero slides:', error);
    }
  }

  console.log('GET-HERO-SLIDES: Mengambil data baru dari Airtable...');
  const { AIRTABLE_API_KEY, AIRTABLE_BASE_ID_EVENT } = process.env;
  const tableName = 'HeroSlider'; 
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID_EVENT}/${encodeURIComponent(tableName)}?sort%5B0%5D%5Bfield%5D=Urutan&sort%5B0%5D%5Bdirection%5D=asc`;

  try {
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${AIRTABLE_API_KEY}` },
    });

    if (!response.ok) {
      return { statusCode: response.status, body: response.statusText };
    }

    const data = await response.json();
    
    const dataToCache = {
      timestamp: Date.now(),
      data: data,
    };
    
    await fs.writeFile(CACHE_FILE_PATH, JSON.stringify(dataToCache));
    console.log('GET-HERO-SLIDES: File cache berhasil diperbarui.');

    return {
      statusCode: 200,
      body: JSON.stringify(data),
    };
  } catch (error) {
    console.error('Error fetching hero slides from Airtable:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to fetch hero slides' }),
    };
  }
};
