// File: netlify/functions/save-to-airtable.js

exports.handler = async function (event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { AIRTABLE_API_KEY, AIRTABLE_BASE_ID, AIRTABLE_TABLE_NAME } = process.env;
  const data = JSON.parse(event.body);

  const record = {
    fields: {
      "OrderID": data.order_id,
      "NamaPembeli": data.customer_details.first_name,
      "Email": data.customer_details.email,
      "NoHP": data.customer_details.phone,
      "JenisTiket": data.item_details.name,
      "JumlahTiket": data.item_details.quantity,
      // ============ INI BAGIAN YANG DIPERBAIKI ============
      "TotalBayar": parseFloat(data.gross_amount),
      // ===================================================
      "StatusPembayaran": data.transaction_status,
    },
  };

  try {
    const response = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ records: [record] }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(JSON.stringify(errorData));
    }

    return { statusCode: 200, body: JSON.stringify({ message: 'Success' }) };

  } catch (error) {
    console.error('Airtable Error:', error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
