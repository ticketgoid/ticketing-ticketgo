/*
 * API Endpoint baru untuk mengambil data Hero Slider dari Airtable.
 * Pastikan Anda punya tabel 'HeroSlider' di Base 'Event List' Anda
 * dengan kolom 'Gambar' (Attachment), 'LinkTujuan' (URL), dan 'Urutan' (Number).
 */
exports.handler = async function (event, context) {
  // Asumsi tabel HeroSlider ada di Base yang sama dengan Events
  const { AIRTABLE_API_KEY, AIRTABLE_BASE_ID_EVENT } = process.env;
  const tableName = 'HeroSlider'; 
  
  // Mengurutkan berdasarkan kolom 'Urutan', dari yang terkecil ke terbesar
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
