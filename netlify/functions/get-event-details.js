// GANTI SELURUH ISI FILE DENGAN KODE BARU INI
const fetch = require('node-fetch');

// Fungsi pembantu untuk berkomunikasi dengan Airtable API
const airtableFetch = async (apiKey, url) => {
    const response = await fetch(url, { headers: { 'Authorization': `Bearer ${apiKey}` } });
    if (!response.ok) {
        const errorBody = await response.text();
        console.error(`Airtable API Error: ${response.status} for URL: ${url}`);
        console.error('Error Body:', errorBody);
        throw new Error(`Airtable API Error: ${response.status}`);
    }
    return await response.json();
};

exports.handler = async function (event, context) {
  const { 
    AIRTABLE_API_KEY, 
    AIRTABLE_BASE_ID_EVENT, 
    AIRTABLE_BASE_ID_SEAT,
  } = process.env;
  
  const { eventId } = event.queryStringParameters;

  if (!eventId) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Event ID is required' }) };
  }

  try {
    // 1. Mengambil detail event utama dari Base 'Event List'
    const eventDetails = await airtableFetch(AIRTABLE_API_KEY, `https://api.airtable.com/v0/${AIRTABLE_BASE_ID_EVENT}/Events/${eventId}`);
    
    // 2. Mengambil jenis tiket yang terhubung dengan event ini
    const ticketTypeIds = eventDetails.fields.ticket_types || [];
    let ticketTypes = { records: [] };
    if (ticketTypeIds.length > 0) {
        const ticketFilter = `OR(${ticketTypeIds.map(id => `RECORD_ID()='${id}'`).join(',')})`;
        ticketTypes = await airtableFetch(AIRTABLE_API_KEY, `https://api.airtable.com/v0/${AIRTABLE_BASE_ID_EVENT}/Ticket%20Types?filterByFormula=${encodeURIComponent(ticketFilter)}&sort%5B0%5D%5Bfield%5D=Urutan&sort%5B0%5D%5Bdirection%5D=asc`);
    }

    // 3. Mengambil form fields yang terhubung dengan event ini
    const formFieldIds = eventDetails.fields.formfields || [];
    let formFields = { records: [] };
    if (formFieldIds.length > 0) {
        const formFilter = `OR(${formFieldIds.map(id => `RECORD_ID()='${id}'`).join(',')})`;
        formFields = await airtableFetch(AIRTABLE_API_KEY, `https://api.airtable.com/v0/${AIRTABLE_BASE_ID_EVENT}/Form%20Fields?filterByFormula=${encodeURIComponent(formFilter)}&sort%5B0%5D%5Bfield%5D=Urutan&sort%5B0%5D%5Bdirection%5D=asc`);
    }

    // --- LOGIKA KUOTA BARU ---
    let sisaKuota = {}; // Objek untuk menyimpan sisa kuota (key: nama, value: sisa)
    const eventType = eventDetails.fields['Tipe Event'];
    const seatPriceTableName = eventDetails.fields['Tabel Harga Kursi'];

    if (eventType === 'Dengan Pilihan Kursi' && seatPriceTableName) {
        // Jika event pakai kursi, ambil kuota dari Base 'Harga Seating'
        const allSeats = await airtableFetch(AIRTABLE_API_KEY, `https://api.airtable.com/v0/${AIRTABLE_BASE_ID_SEAT}/${encodeURIComponent(seatPriceTableName)}`);
        allSeats.records.forEach(seat => {
            const seatName = seat.fields.nama; // 'nama' dari tabel 'rona'
            if (seatName) {
                // Langsung ambil 'Sisa Kuota' dari Airtable
                sisaKuota[seatName.toLowerCase()] = {
                    sisa: seat.fields['Sisa Kuota'] || 0,
                    recordId: seat.id // Simpan recordId untuk proses update nanti
                };
            }
        });

    } else if (eventType === 'Tanpa Pilihan Kursi') {
        // Jika event tidak pakai kursi, ambil kuota dari 'Ticket Types'
        ticketTypes.records.forEach(ticket => {
            const ticketName = ticket.fields.Name;
            if (ticketName) {
                // Langsung ambil 'Sisa Kuota' dari Airtable
                sisaKuota[ticketName.toLowerCase()] = {
                    sisa: ticket.fields['Sisa Kuota'] || 0,
                    recordId: ticket.id // Simpan recordId untuk proses update nanti
                };
            }
        });
    }
    // --- AKHIR LOGIKA KUOTA BARU ---

    return {
      statusCode: 200,
      body: JSON.stringify({
        eventDetails,
        ticketTypes,
        formFields,
        sisaKuota // Kirim objek sisaKuota ke frontend
      }),
    };
  } catch (error) {
    console.error('Error di fungsi get-event-details:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to fetch event details', details: error.message }),
    };
  }
};
