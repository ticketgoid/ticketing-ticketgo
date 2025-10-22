// File: netlify/functions/get-event-details.js
const fetch = require('node-fetch');

exports.handler = async function (event, context) {
  const { AIRTABLE_API_KEY, AIRTABLE_BASE_ID_SEAT } = process.env;
  const tableName = 'rona';

  const fetchData = async (url) => {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
    });
    if (!response.ok) throw new Error(`Airtable API Error: ${response.status} for URL: ${url}`);
    return await response.json();
  };

  try {
    // Fetch all rows from the 'rona' table
    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID_SEAT}/${tableName}`;
    const data = await fetchData(url);

    // Extract only nama and price from each record
    const seats = data.records.map(record => ({
      id: record.id,
      nama: record.fields.nama || null,
      price: record.fields.harga_seat || null, 
    }));

    const nama_seat = record.fields.nama || null;
    const harga_seat = record.fields.harga_seat || null;

    return {
      statusCode: 200,
      body: JSON.stringify({
        nama_seat,
        harga_seat
      }),
    };
  } catch (error) {
    console.error('Error fetching seat data from Airtable:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to fetch seat data',
        details: error.message,
      }),
    };
  }
};
