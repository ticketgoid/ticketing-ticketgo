// GANTI SELURUH ISI FILE DENGAN KODE BARU INI
const fetch = require('node-fetch');

// Helper function untuk memanggil API Airtable dengan penanganan error
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
    // 1. Ambil detail event utama dari Base Event List
    const eventDetails = await airtableFetch(AIRTABLE_API_KEY, `https://api.airtable.com/v0/${AIRTABLE_BASE_ID_EVENT}/Events/${eventId}`);
    
    // 2. Ambil jenis tiket (sudah termasuk Sisa Kuota dari Rollup)
    const ticketTypeIds = eventDetails.fields.ticket_types || [];
    let ticketTypes = { records: [] };
    if (ticketTypeIds.length > 0) {
        const ticketFilter = `OR(${ticketTypeIds.map(id => `RECORD_ID()='${id}'`).join(',')})`;
        ticketTypes = await airtableFetch(AIRTABLE_API_KEY, `https://api.airtable.com/v0/${AIRTABLE_BASE_ID_EVENT}/Ticket%20Types?filterByFormula=${encodeURIComponent(ticketFilter)}&sort%5B0%5D%5Bfield%5D=Urutan&sort%5B0%5D%5Bdirection%5D=asc`);
    }

    // 3. Ambil form fields
    const formFieldIds = eventDetails.fields.formfields || [];
    let formFields = { records: [] };
    if (formFieldIds.length > 0) {
        const formFilter = `OR(${formFieldIds.map(id => `RECORD_ID()='${id}'`).join(',')})`;
        formFields = await airtableFetch(AIRTABLE_API_KEY, `https://api.airtable.com/v0/${AIRTABLE_BASE_ID_EVENT}/Form%20Fields?filterByFormula=${encodeURIComponent(formFilter)}&sort%5B0%5D%5Bfield%5D=Urutan&sort%5B0%5D%5Bdirection%5D=asc`);
    }

    // 4. (BARU) Logika untuk menghitung Sisa Kuota Kursi
    let seatQuotas = {};
    const eventType = eventDetails.fields['Tipe Event'];
    const seatPriceTableName = eventDetails.fields['Tabel Harga Kursi'];

    if (eventType === 'Dengan Pilihan Kursi' && seatPriceTableName) {
        // Ambil SEMUA data penjualan dari tabel 'Penjualan' di Base Event List yang terkait dengan event ini
        const salesFilter = `{Link ke Event} = '${eventDetails.fields.Name}'`; // Asumsi ada field Name di tabel Event
        const allSales = await airtableFetch(AIRTABLE_API_KEY, `https://api.airtable.com/v0/${AIRTABLE_BASE_ID_EVENT}/Penjualan?filterByFormula=${encodeURIComponent(salesFilter)}`);
        
        // Ambil SEMUA data kursi dari Base Harga Seating
        const allSeats = await airtableFetch(AIRTABLE_API_KEY, `https://api.airtable.com/v0/${AIRTABLE_BASE_ID_SEAT}/${encodeURIComponent(seatPriceTableName)}`);

        // Hitung sisa kuota untuk setiap kursi di dalam kode
        allSeats.records.forEach(seat => {
            const seatName = seat.fields.nama;
            if (!seatName) return;

            const totalQuota = seat.fields['Total Kuota'] || 0;
            
            // Jumlahkan tiket terjual untuk kursi spesifik ini
            const soldCount = allSales.records
                .filter(sale => sale.fields['Kursi yg Dibeli'] === seatName)
                .reduce((sum, sale) => sum + (sale.fields['Jumlah Tiket'] || 0), 0);
            
            seatQuotas[seatName.toLowerCase()] = totalQuota - soldCount;
        });
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        eventDetails,
        ticketTypes,
        formFields,
        seatQuotas // Kirim data sisa kuota kursi yang sudah dihitung ke frontend
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
