exports.handler = async function (event, context) {
  // --- PERUBAHAN DI SINI ---
  // Menggunakan AIRTABLE_BASE_ID_EVENT, bukan _TESTI
  const { AIRTABLE_API_KEY, AIRTABLE_BASE_ID_EVENT } = process.env;
  // Menggunakan nama tabel 'Testimoni'
  const tableName = 'Testimoni'; 
  // --- AKHIR PERUBAHAN ---

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
