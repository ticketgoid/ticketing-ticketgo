// File: netlify/functions/get-events.js

// 1. Buat "cache" di luar handler agar persisten antar pemanggilan
const cache = {
  data: null,
  timestamp: 0,
};

// Durasi cache dalam milidetik (2 menit)
const CACHE_DURATION = 2 * 60 * 1000; 

exports.handler = async function (event, context) {
  const now = Date.now();

  // 2. Cek apakah cache valid dan kembalikan jika iya
  if (cache.data && (now - cache.timestamp < CACHE_DURATION)) {
    console.log('GET-EVENTS: Menyajikan data dari cache...');
    return {
      statusCode: 200,
      body: JSON.stringify(cache.data),
    };
  }

  console.log('GET-EVENTS: Mengambil data baru dari Airtable...');
  const { AIRTABLE_API_KEY, AIRTABLE_BASE_ID_EVENT } = process.env;
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID_EVENT}/Events?sort%5B0%5D%5Bfield%5D=Prioritas&sort%5B0%5D%5Bdirection%5D=desc&sort%5B1%5D%5Bfield%5D=Urutan&sort%5B1%5D%5Bdirection%5D=asc&sort%5B2%5D%5Bfield%5D=Waktu&sort%5B2%5D%5Bdirection%5D=asc`;

  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
      },
    });

    if (!response.ok) {
      return { statusCode: response.status, body: response.statusText };
    }

    const data = await response.json();
    
    // 3. Simpan data baru ke cache sebelum mengembalikannya
    cache.data = data;
    cache.timestamp = now;

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
