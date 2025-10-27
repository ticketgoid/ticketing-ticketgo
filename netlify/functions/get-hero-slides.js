// File: netlify/functions/get-hero-slides.js

const cache = {
  data: null,
  timestamp: 0,
};

const CACHE_DURATION = 2 * 60 * 1000; // 2 menit

exports.handler = async function (event, context) {
  const now = Date.now();

  if (cache.data && (now - cache.timestamp < CACHE_DURATION)) {
    console.log('GET-HERO-SLIDES: Menyajikan data dari cache...');
    return {
      statusCode: 200,
      body: JSON.stringify(cache.data),
    };
  }
  
  console.log('GET-HERO-SLIDES: Mengambil data baru dari Airtable...');
  const { AIRTABLE_API_KEY, AIRTABLE_BASE_ID_EVENT } = process.env;
  const tableName = 'HeroSlider'; 
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID_EVENT}/${encodeURIComponent(tableName)}?sort%5B0%5D%5Bfield%5D=Urutan&sort%5B0%5D%5Bdirection%5D=asc`;

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
    
    cache.data = data;
    cache.timestamp = now;

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
