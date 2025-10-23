exports.handler = async function (event, context) {
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

    if (!serverKey) {
        throw new Error("MIDTRANS_SERVER_KEY tidak ditemukan di environment variables.");
    }

    const midtransApiUrl = isProduction
      ? 'https://app.midtrans.com/snap/v1/transactions'
      : 'https://app.sandbox.midtrans.com/snap/v1/transactions';

    const encodedKey = Buffer.from(serverKey + ':').toString('base64');

    // ==================== BAGIAN YANG DIPERBAIKI ====================
    // Midtrans membutuhkan 'item_details' sebagai sebuah ARRAY.
    // Kita bungkus objek item_details dari frontend dengan kurung siku [].
    const midtransPayload = {
      transaction_details: {
        order_id: payload.order_id,
        gross_amount: payload.gross_amount,
      },
      item_details: [payload.item_details], // <-- PERUBAHAN UTAMA DI SINI
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
      body: JSON.stringify(midtransPayload),
    });
    
    const data = await midtransResponse.json();

    if (!midtransResponse.ok) {
      // Memberikan pesan error yang lebih jelas dari Midtrans
      throw new Error(data.error_messages?.join(', ') || 'Gagal membuat transaksi dengan Midtrans');
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ token: data.token }),
    };

  } catch (error) {
    console.error("!!! ERROR DI FUNGSI create-transaction:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};

