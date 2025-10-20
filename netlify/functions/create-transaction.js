// File: netlify/functions/create-transaction.js

// Handler function yang akan dieksekusi oleh Netlify
exports.handler = async function (event, context) {
  // Hanya izinkan permintaan POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  try {
    const payload = JSON.parse(event.body);
    
    // Ambil Server Key dari Environment Variables di Netlify (lebih aman)
    const serverKey = process.env.MIDTRANS_SERVER_KEY;
    const isProduction = false; // Ganti ke true jika sudah live

    if (!serverKey) {
        throw new Error("MIDTRANS_SERVER_KEY belum diatur di Netlify.");
    }

    const midtransApiUrl = isProduction
      ? 'https://app.midtrans.com/snap/v1/transactions'
      : 'https://app.sandbox.midtrans.com/snap/v1/transactions';

    // Enkripsi Server Key untuk header Authorization
    const encodedKey = Buffer.from(serverKey + ':').toString('base64');

    const midtransResponse = await fetch(midtransApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Basic ${encodedKey}`,
      },
      body: JSON.stringify({
        transaction_details: {
          order_id: payload.order_id,
          gross_amount: payload.gross_amount,
        },
        item_details: payload.item_details,
        customer_details: payload.customer_details,
        credit_card: { secure: true },
      }),
    });

    const data = await midtransResponse.json();

    if (!midtransResponse.ok) {
      throw new Error(data.error_messages?.join(', ') || 'Gagal membuat transaksi dengan Midtrans');
    }

    // Jika berhasil, kirim token kembali ke frontend
    return {
      statusCode: 200,
      body: JSON.stringify({ token: data.token }),
    };

  } catch (error) {
    // Jika terjadi error, kirim pesan yang jelas
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};