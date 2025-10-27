// File: netlify/functions/get-testimoni.js

const cache = {
  data: null,
  timestamp: 0,
};

const CACHE_DURATION = 10 * 60 * 1000; // 10 menit

exports.handler = async function (event, context) {
  const now = Date.now();

  if (cache.data && (now - cache.timestamp < CACHE_DURATION)) {
    console.log('GET-TESTIMONI: Menyajikan data dari cache...');
    return {
      statusCode: 200,
      body: JSON.stringify(cache.data),
    };
  }

  console.log('GET-TESTIMONI: Mengambil data baru dari Airtable...');
  const { AIRTABLE_API_KEY, AIRTABLE_BASE_ID_EVENT } = process.env;
  const tableName = 'Testimoni'; 
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID_EVENT}/${encodeURIComponent(tableName)}`;

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
    console.error('Error fetching testimoni from Airtable:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to fetch testimoni' }),
    };
  }
};
