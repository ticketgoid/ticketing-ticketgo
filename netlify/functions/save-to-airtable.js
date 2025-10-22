// GANTI SELURUH ISI FILE DENGAN KODE BARU INI
const fetch = require('node-fetch');

// Helper function untuk mengirim data ke Airtable
const postToAirtable = async (apiKey, baseId, tableName, record) => {
  const url = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ records: [record] }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error(`Gagal menulis ke ${tableName}:`, JSON.stringify(errorData));
    // Kita tidak melempar error agar jika salah satu gagal, yang lain tetap berjalan
    return { success: false, error: errorData };
  }

  return { success: true };
};


exports.handler = async function (event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  // Ambil semua variabel lingkungan yang dibutuhkan
  const { 
    AIRTABLE_API_KEY, 
    AIRTABLE_BASE_ID_EVENT, // Base untuk pelacakan kuota
    AIRTABLE_BASE_ID_REKAP,   // Base untuk rekap historis
  } = process.env;

  const data = JSON.parse(event.body);

  // --- 1. Persiapan Record untuk Pelacakan Kuota (di Base Event List) ---
  const quotaTrackerRecord = {
    fields: {
      "OrderID": data.order_id,
      "Jumlah Tiket": data.item_details.quantity,
      "Tiket yg Dibeli": [data.item_details.ticketRecordId], // Link ke Ticket Types
      "Kursi yg Dibeli": data.item_details.seatName || null,
      "Link ke Event": [data.eventId] // Link ke Event
    },
  };

  // --- 2. Persiapan Record untuk Rekap Penjualan (di Base Penjualan) ---
  // Menggunakan struktur dari gambar image_fc7b79.png Anda
  const rekapRecord = {
    fields: {
      "OrderID": data.order_id,
      "NamaPembeli": data.customer_details.first_name,
      "Email": data.customer_details.email,
      "NoHP": data.customer_details.phone,
      "JenisTiket": data.item_details.name,
      "JumlahTiket": data.item_details.quantity,
      "TotalBayar": parseFloat(data.gross_amount),
      "StatusPembayaran": data.transaction_status,
      // Tambahkan field lain jika ada (misal: KodeUnik, QRCode, dll)
    },
  };

  try {
    // Menjalankan kedua proses penulisan data secara paralel
    const [quotaResult, rekapResult] = await Promise.all([
      // Menulis ke tabel 'Penjualan' di Base Event List untuk melacak kuota
      postToAirtable(AIRTABLE_API_KEY, AIRTABLE_BASE_ID_EVENT, 'Penjualan', quotaTrackerRecord),
      
      // Menulis ke tabel dinamis (misal: 'rona') di Base Penjualan untuk rekap
      postToAirtable(AIRTABLE_API_KEY, AIRTABLE_BASE_ID_REKAP, data.rekapTableName, rekapRecord)
    ]);

    if (!quotaResult.success || !rekapResult.success) {
      console.warn("Satu atau lebih proses penulisan ke Airtable gagal.");
      // Meskipun ada yang gagal, kita tetap anggap berhasil dari sisi pengguna
    }

    return { statusCode: 200, body: JSON.stringify({ message: 'Success' }) };

  } catch (error) {
    console.error('Fungsi save-to-airtable gagal total:', error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
