// File: netlify/functions/get-event-details.js
const fetch = require('node-fetch');

exports.handler = async function (event, context) {
  const { AIRTABLE_API_KEY, AIRTABLE_BASE_ID_SEAT } = process.env;

  const fetchData = async (url) => {
    const response = await fetch(url, { headers: { 'Authorization': `Bearer ${AIRTABLE_API_KEY}` } });
    if (!response.ok) throw new Error(`Airtable API Error: ${response.status} for URL: ${url}`);
    return await response.json();
  };

  try {
    const seatEvent = await fetchData(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID_SEAT}/rona`);
    
    const namaSeat = seatEvent.fields.nama || [];
    const hargaSeat = seatEvent.fields.harga_seat || [];
    
    // 2. Ambil jenis tiket berdasarkan relasi
    // const ticketTypeIds = eventDetails.fields.ticket_types || [];
    // const ticketFilter = `OR(${ticketTypeIds.map(id => `RECORD_ID()='${id}'`).join(',')})`;
    // const ticketTypes = ticketTypeIds.length > 0 ? await fetchData(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID_SEAT}/Ticket%20Types?filterByFormula=${encodeURIComponent(ticketFilter)}`) : { records: [] };

    // 3. Ambil form fields berdasarkan relasi
    // const formFieldIds = eventDetails.fields.formfields || [];
    // const formFilter = `OR(${formFieldIds.map(id => `RECORD_ID()='${id}'`).join(',')})`;
    // const formFields = formFieldIds.length > 0 ? await fetchData(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID_SEAT}/Form%20Fields?filterByFormula=${encodeURIComponent(formFilter)}&sort%5B0%5D%5Bfield%5D=Urutan&sort%5B0%5D%5Bdirection%5D=asc`) : { records: [] };

    return {
      statusCode: 200,
      body: JSON.stringify({
        seatEvent,
        namaSeat,
        hargaSeat
      }),
    };
  } catch (error) {
    console.error('Error fetching event details from Airtable:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to fetch event details', details: error.message }),
    };
  }
};
