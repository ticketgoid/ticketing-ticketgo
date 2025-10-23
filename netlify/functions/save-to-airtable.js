// GANTI SELURUH ISI FILE DENGAN KODE BARU INI
const fetch = require('node-fetch');

// Fungsi untuk membuat record baru (POST)
const postToAirtable = async (apiKey, baseId, tableName, record) => {
  const url = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ records: [record] }),
  });
  if (!response.ok) {
    const errorData = await response.json();
    console.error(`Gagal menulis ke ${tableName}:`, JSON.stringify(errorData));
    return { success: false, error: errorData };
  }
  return { success: true };
};

// --- FUNGSI BARU UNTUK UPDATE KUOTA ---
const updateAirtableRecord = async (apiKey, baseId, tableName, recordId, quantity) => {
    const url = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}/${recordId}`;

    // 1. Ambil nilai 'Kuota Terjual' saat ini
    const getResponse = await fetch(url, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    if (!getResponse.ok) {
        console.error(`Gagal mengambil data kuota dari ${tableName} untuk diupdate.`);
        return { success: false, error: 'Failed to fetch current quota' };
    }
    const currentData = await getResponse.json();
    const currentSold = currentData.fields['Kuota Terjual'] || 0;
    
    // 2. Hitung nilai baru dan update
    const newSold = currentSold + quantity;
    const patchResponse = await fetch(url, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            fields: {
                "Kuota Terjual": newSold
            }
        }),
    });

    if (!patchResponse.ok) {
        const errorData = await patchResponse.json();
        console.error(`Gagal mengupdate kuota di ${tableName}:`, JSON.stringify(errorData));
        return { success: false, error: errorData };
    }
    return { success: true };
};

exports.handler = async function (event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { AIRTABLE_API_KEY, AIRTABLE_BASE_ID_EVENT, AIRTABLE_BASE_ID_REKAP, AIRTABLE_BASE_ID_SEAT } = process.env;
  const data = JSON.parse(event.body);
  
  // Data untuk rekapitulasi (Base 'Penjualan')
  const rekapRecord = {
    fields: {
      "Order ID": data.order_id,
      "Nama Pembeli": data.customer_details.first_name,
      "Email": data.customer_details.email,
      "No. HP": data.customer_details.phone,
      "Jenis Tiket": data.item_details.name,
      "Jumlah Tiket": data.item_details.quantity,
      "Total Bayar": parseFloat(data.gross_amount),
      "Status Pembayaran": data.transaction_status,
    },
  };

  try {
    // Proses pencatatan rekap tetap berjalan seperti biasa
    const rekapResult = await postToAirtable(AIRTABLE_API_KEY, AIRTABLE_BASE_ID_REKAP, data.rekapTableName, rekapRecord);
    
    // --- LOGIKA UPDATE KUOTA BARU ---
    let quotaUpdateResult = { success: false };
    if (data.eventType === 'Dengan Pilihan Kursi') {
        // Update kuota di Base 'Harga Seating'
        quotaUpdateResult = await updateAirtableRecord(
            AIRTABLE_API_KEY,
            AIRTABLE_BASE_ID_SEAT,
            data.item_details.seatTableName, // Nama tabel (cth: 'rona')
            data.item_details.seatRecordId, // ID record kursi (cth: "VIP")
            data.item_details.quantity
        );
    } else { // 'Tanpa Pilihan Kursi'
        // Update kuota di Base 'Event List', tabel 'Ticket Types'
        quotaUpdateResult = await updateAirtableRecord(
            AIRTABLE_API_KEY,
            AIRTABLE_BASE_ID_EVENT,
            'Ticket Types',
            data.item_details.ticketRecordId, // ID record jenis tiket
            data.item_details.quantity
        );
    }
    // --- AKHIR LOGIKA UPDATE KUOTA BARU ---

    if (!rekapResult.success || !quotaUpdateResult.success) {
      console.warn("Satu atau lebih proses penulisan/update ke Airtable gagal.");
    }

    return { statusCode: 200, body: JSON.stringify({ message: 'Success' }) };

  } catch (error) {
    console.error('Fungsi save-to-airtable gagal total:', error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
