// File: netlify/functions/get-event-details.js
const fetch = require('node-fetch');

exports.handler = async function (event, context) {
  const { AIRTABLE_API_KEY, AIRTABLE_BASE_ID_EVENT } = process.env;
  const { eventId } = event.queryStringParameters;

  if (!eventId) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Event ID is required' }) };
  }

  const fetchData = async (url) => {
    const response = await fetch(url, { headers: { 'Authorization': `Bearer ${AIRTABLE_API_KEY}` } });
    if (!response.ok) throw new Error(`Airtable API Error: ${response.status} for URL: ${url}`);
    return await response.json();
  };

  try {
    // 1. Ambil detail event utama
    const eventDetails = await fetchData(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID_EVENT}/Events/${eventId}`);
    
    // 2. Ambil jenis tiket berdasarkan relasi
    const ticketTypeIds = eventDetails.fields.ticket_types || [];
    const ticketFilter = `OR(${ticketTypeIds.map(id => `RECORD_ID()='${id}'`).join(',')})`;
    const ticketTypes = ticketTypeIds.length > 0 ? await fetchData(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID_EVENT}/Ticket%20Types?filterByFormula=${encodeURIComponent(ticketFilter)}`) : { records: [] };

    // 3. Ambil form fields berdasarkan relasi
    const formFieldIds = eventDetails.fields.formfields || [];
    const formFilter = `OR(${formFieldIds.map(id => `RECORD_ID()='${id}'`).join(',')})`;
    const formFields = formFieldIds.length > 0 ? await fetchData(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID_EVENT}/Form%20Fields?filterByFormula=${encodeURIComponent(formFilter)}&sort%5B0%5D%5Bfield%5D=Urutan&sort%5B0%5D%5Bdirection%5D=asc`) : { records: [] };

    return {
      statusCode: 200,
      body: JSON.stringify({
        eventDetails,
        ticketTypes,
        formFields
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
