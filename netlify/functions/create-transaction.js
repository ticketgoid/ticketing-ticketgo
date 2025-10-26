// Fungsi pembantu untuk berkomunikasi dengan Airtable API
// (Fungsi ini diduplikasi dari get-event-details.js untuk kemudahan)
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
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  const { 
    AIRTABLE_API_KEY, 
    AIRTABLE_BASE_ID_EVENT, 
    AIRTABLE_BASE_ID_SEAT,
    MIDTRANS_SERVER_KEY
  } = process.env;

  try {
    const payload = JSON.parse(event.body);
    const { 
      order_id, 
      eventId, 
      ticketTypeId, 
      seatName, 
      quantity, 
      customer_details 
    } = payload;

    if (!eventId || !ticketTypeId || !quantity || !customer_details) {
        throw new Error("Data tidak lengkap untuk membuat transaksi.");
    }
    if (!MIDTRANS_SERVER_KEY) {
        throw new Error("MIDTRANS_SERVER_KEY tidak ditemukan.");
    }

    // --- 1. AMBIL DATA UNTUK VALIDASI ---
    const eventDetails = await airtableFetch(AIRTABLE_API_KEY, `https://api.airtable.com/v0/${AIRTABLE_BASE_ID_EVENT}/Events/${eventId}`);
    const ticketType = await airtableFetch(AIRTABLE_API_KEY, `https://api.airtable.com/v0/${AIRTABLE_BASE_ID_EVENT}/Ticket%20Types/${ticketTypeId}`);
    
    const eventType = eventDetails.fields['Tipe Event'];
    const ticketFields = ticketType.fields;
    
    let baseSeatPrice = 0;
    let sisaKuota = 0;

    // --- 2. VALIDASI KUOTA & AMBIL HARGA DASAR ---
    if (eventType === 'Dengan Pilihan Kursi') {
        if (!seatName) throw new Error("Kursi belum dipilih.");
        
        const seatPriceTableName = eventDetails.fields['Tabel Harga Kursi'];
        const formula = `LOWER({nama}) = LOWER("${seatName.replace(/"/g, '\\"')}")`;
        const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID_SEAT}/${encodeURIComponent(seatPriceTableName)}?filterByFormula=${encodeURIComponent(formula)}&maxRecords=1`;
        const seatData = await airtableFetch(AIRTABLE_API_KEY, url);
        
        if (!seatData.records || seatData.records.length === 0) {
            throw new Error(`Kursi "${seatName}" tidak ditemukan.`);
        }
        
        const seatRecord = seatData.records[0];
        baseSeatPrice = seatRecord.fields.harga_seat || 0;
        sisaKuota = seatRecord.fields['Sisa Kuota'] || 0;

    } else { // 'Tanpa Pilihan Kursi'
        sisaKuota = ticketType.fields['Sisa Kuota'] || 0;
    }

    // Validasi kuota
    if (sisaKuota < quantity) {
        throw new Error(`Maaf, sisa kuota untuk tiket ini tidak mencukupi (sisa: ${sisaKuota}).`);
    }

    // --- 3. KALKULASI HARGA DI SERVER (LOGIKA DISALIN DARI checkout.js) ---
    let subtotal = 0, pricePerTicket = 0;
    const ticketPriceField = parseInt((ticketFields.Price || 0).toString().replace(/[^0-9]/g, '')) || 0;
    const isDiscountTicket = ticketFields.Discount === true;
    const isBundleTicket = (ticketFields.BundleQuantity || 1) > 1;

    if (isBundleTicket && isDiscountTicket) {
      const totalBasePrice = baseSeatPrice * quantity;
      subtotal = totalBasePrice - ticketPriceField;
      pricePerTicket = subtotal > 0 ? subtotal / quantity : 0;
    } else if (isDiscountTicket) {
      pricePerTicket = baseSeatPrice - ticketPriceField;
      subtotal = pricePerTicket * quantity;
    } else {
      pricePerTicket = baseSeatPrice > 0 ? baseSeatPrice : ticketPriceField;
      subtotal = pricePerTicket * quantity;
    }
    
    const adminFee = parseInt((ticketFields.Admin_Fee || 0).toString().replace(/[^0-9]/g, '')) || 0;
    const totalAdminFee = adminFee * quantity;
    const finalTotal = subtotal + totalAdminFee;
    // --- AKHIR KALKULASI HARGA ---

    // --- 4. BUAT PAYLOAD MIDTRANS DENGAN HARGA DARI SERVER ---
    const midtransPayload = {
      transaction_details: {
        order_id: order_id,
        gross_amount: finalTotal, // <-- HARGA AMAN DARI SERVER
      },
      item_details: [{
          id: ticketTypeId,
          price: pricePerTicket + adminFee, // Harga per item
          quantity: quantity,
          name: ticketFields.Name || 'Tiket'
      }],
      customer_details: customer_details,
      credit_card: { secure: true },
    };

    // --- 5. PANGGIL API MIDTRANS ---
    const isProduction = true; // Sesuaikan jika perlu
    const midtransApiUrl = isProduction
      ? 'https://app.midtrans.com/snap/v1/transactions'
      : 'https://app.sandbox.midtrans.com/snap/v1/transactions';

    const encodedKey = Buffer.from(MIDTRANS_SERVER_KEY + ':').toString('base64');

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


