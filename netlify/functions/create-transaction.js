// File: netlify/functions/create-transaction.js

// Import 'node-fetch' untuk kompatibilitas yang lebih baik
const fetch = require('node-fetch');

exports.handler = async function (event, context) {
  // Tambahkan ini untuk melihat log setiap kali fungsi dipanggil
  console.log("Fungsi create-transaction dimulai...");
  console.log("Metode HTTP:", event.httpMethod);

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  try {
    const payload = JSON.parse(event.body);
    const serverKey = process.env.MIDTRANS_SERVER_KEY;
    const isProduction = false;

    // Tambahkan ini untuk debugging
    console.log("Payload yang diterima dari frontend:", JSON.stringify(payload, null, 2));
    console.log("Membaca MIDTRANS_SERVER_KEY:", serverKey ? `***${serverKey.slice(-4)}` : "TIDAK DITEMUKAN!");

    if (!serverKey) {
        throw new Error("MIDTRANS_SERVER_KEY tidak ditemukan di environment variables.");
    }

    const midtransApiUrl = isProduction
      ? 'https://app.midtrans.com/snap/v1/transactions'
      : 'https://app.sandbox.midtrans.com/snap/v1/transactions';

    const encodedKey = Buffer.from(serverKey + ':').toString('base64');

    console.log("Mengirim permintaan ke Midtrans...");
    const midtransResponse = await fetch(midtransApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Basic ${encodedKey}`,
      },
      body: JSON.stringify({
        transaction_details: payload.transaction_details, // Perbaiki bagian ini
        item_details: payload.item_details,
        customer_details: payload.customer_details,
        credit_card: { secure: true },
      }),
    });
    
    console.log("Menerima respons dari Midtrans dengan status:", midtransResponse.status);
    const data = await midtransResponse.json();
    console.log("Isi respons dari Midtrans:", JSON.stringify(data, null, 2));

    if (!midtransResponse.ok) {
      throw new Error(data.error_messages?.join(', ') || 'Gagal membuat transaksi dengan Midtrans');
    }

    console.log("Berhasil! Mengirim token ke frontend.");
    return {
      statusCode: 200,
      body: JSON.stringify({ token: data.token }),
    };

  } catch (error) {
    // Ini adalah bagian paling penting, akan mencetak error detail ke log
    console.error("!!! ERROR TERJADI DI DALAM FUNGSI:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
