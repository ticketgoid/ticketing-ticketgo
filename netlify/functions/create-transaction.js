// File: netlify/functions/create-transaction.js

const fetch = require('node-fetch');

exports.handler = async function (event, context) {
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
    
    // ==================== BAGIAN YANG DIPERBAIKI ====================
    const midtransPayload = {
      transaction_details: {
        order_id: payload.order_id,
        gross_amount: payload.gross_amount,
      },
      item_details: payload.item_details,
      customer_details: payload.customer_details,
      credit_card: { secure: true },
    };
    // ==============================================================

    const midtransResponse = await fetch(midtransApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Basic ${encodedKey}`,
      },
      body: JSON.stringify(midtransPayload), // Menggunakan payload yang sudah diperbaiki
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
    console.error("!!! ERROR TERJADI DI DALAM FUNGSI:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
