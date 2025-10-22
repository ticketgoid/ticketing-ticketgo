const fetch = require('node-fetch');

exports.handler = async function (event, context) {
  const { AIRTABLE_API_KEY, AIRTABLE_BASE_ID_SEAT } = process.env;
  const tableName = 'rona';

  // Dynamic query example: ?seat=Gold&qty=2
  const targetName = event.queryStringParameters?.seat || 'Gold';
  const quantity = parseInt(event.queryStringParameters?.qty || '1');

  const fetchData = async (url) => {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
    });
    if (!response.ok) throw new Error(`Airtable API Error: ${response.status}`);
    return await response.json();
  };

  try {
    // Fetch all seat rows
    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID_SEAT}/${encodeURIComponent(tableName)}`;
    const data = await fetchData(url);

    // Extract name and price fields
    const seats = data.records.map(record => ({
      nama: record.fields.nama || null,
      price: record.fields.harga_seat || null,
    }));

    // Find seat by name
    const match = seats.find(
      seat => seat.nama?.toLowerCase() === targetName.toLowerCase()
    );

    if (!match) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: `Seat "${targetName}" not found.` }),
      };
    }

    const subtotal = match.price * quantity;

    return {
      statusCode: 200,
      body: JSON.stringify({
        seat: targetName,
        price: match.price,
        quantity,
        subtotal: `Rp ${subtotal.toLocaleString('id-ID')}`,
      }),
    };
  } catch (error) {
    console.error('Error fetching seat data:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to fetch seat data',
        details: error.message,
      }),
    };
  }
};
