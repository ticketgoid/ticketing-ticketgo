// GANTI SELURUH ISI FILE DENGAN KODE BARU INI
const fetch = require('node-fetch');

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

exports.handler = async function (event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { AIRTABLE_API_KEY, AIRTABLE_BASE_ID_EVENT, AIRTABLE_BASE_ID_REKAP } = process.env;
  const data = JSON.parse(event.body);

  const quotaTrackerRecord = {
    fields: {
      "OrderID": data.order_id,
      "Jumlah Tiket": data.item_details.quantity,
      "Tiket yg Dibeli": [data.item_details.ticketRecordId],
      "Kursi yg Dibeli": data.item_details.seatName || null,
      "Link ke Event": [data.eventId]
    },
  };

  // ### PERBAIKAN NAMA FIELD ###
  // Nama field disesuaikan persis dengan screenshot Base 'Penjualan' Anda
  const rekapRecord = {
    fields: {
      "Order ID": data.order_id, // Perbaikan: "OrderID" -> "Order ID"
      "Nama Pembeli": data.customer_details.first_name, // Perbaikan: "NamaPembeli" -> "Nama Pembeli"
      "Email": data.customer_details.email,
      "No. HP": data.customer_details.phone, // Perbaikan: "NoHP" -> "No. HP"
      "Jenis Tiket": data.item_details.name, // Perbaikan: "JenisTiket" -> "Jenis Tiket"
      "Jumlah Tiket": data.item_details.quantity, // Perbaikan: "JumlahTiket" -> "Jumlah Tiket"
      "Total Bayar": parseFloat(data.gross_amount), // Perbaikan: "TotalBayar" -> "Total Bayar"
      "Status Pembayaran": data.transaction_status, // Perbaikan: "StatusPembayaran" -> "Status Pembayaran"
    },
  };

  try {
    const [quotaResult, rekapResult] = await Promise.all([
      postToAirtable(AIRTABLE_API_KEY, AIRTABLE_BASE_ID_EVENT, 'Penjualan', quotaTrackerRecord),
      postToAirtable(AIRTABLE_API_KEY, AIRTABLE_BASE_ID_REKAP, data.rekapTableName, rekapRecord)
    ]);

    if (!quotaResult.success || !rekapResult.success) {
      console.warn("Satu atau lebih proses penulisan ke Airtable gagal.");
    }

    return { statusCode: 200, body: JSON.stringify({ message: 'Success' }) };

  } catch (error) {
    console.error('Fungsi save-to-airtable gagal total:', error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
