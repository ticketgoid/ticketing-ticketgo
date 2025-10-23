exports.handler = async function (event, context) {
  const { AIRTABLE_API_KEY, AIRTABLE_BASE_ID_SEAT } = process.env;
  const tableName = 'rona';
  const targetName = event.queryStringParameters?.seat;

  if (!targetName) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Seat name parameter is required.' }),
    };
  }

  // FORMULA BARU: Langsung filter di Airtable untuk efisiensi maksimal
  const formula = `LOWER({nama}) = LOWER("${targetName.replace(/"/g, '\\"')}")`;
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID_SEAT}/${encodeURIComponent(tableName)}?filterByFormula=${encodeURIComponent(formula)}&maxRecords=1`;

  try {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
    });

    if (!response.ok) {
      throw new Error(`Airtable API Error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.records || data.records.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: `Seat "${targetName}" not found.` }),
      };
    }

    const record = data.records[0];
    const price = record.fields.harga_seat || 0;

    return {
      statusCode: 200,
      body: JSON.stringify({
        seat: record.fields.nama,
        price: price,
        // Quantity tidak lagi dihitung di sini
      }),
    };

  } catch (error) {
    console.error('Error fetching seat data:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to fetch seat data', details: error.message }),
    };
  }
};
