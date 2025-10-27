import { createClient } from '@supabase/supabase-js';

// Inisialisasi Supabase Client
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

export async function handler(event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  const { MIDTRANS_SERVER_KEY } = process.env;

  try {
    const payload = JSON.parse(event.body);
    const { order_id, eventId, ticketTypeId, seatName, quantity, customer_details } = payload;

    if (!eventId || !ticketTypeId || !quantity || !customer_details) {
      throw new Error("Data tidak lengkap untuk membuat transaksi.");
    }
    if (!MIDTRANS_SERVER_KEY) {
      throw new Error("MIDTRANS_SERVER_KEY tidak ditemukan.");
    }

    // --- 1. AMBIL DATA DARI SUPABASE UNTUK VALIDASI ---
    const { data: eventDetails, error: eventError } = await supabase
      .from('Events')
      .select('*')
      .eq('id', eventId)
      .single();

    if (eventError) throw new Error(`Event tidak ditemukan: ${eventError.message}`);

    const { data: ticketType, error: ticketError } = await supabase
      .from('Ticket_Types')
      .select('*')
      .eq('id', ticketTypeId)
      .single();

    if (ticketError) throw new Error(`Jenis tiket tidak ditemukan: ${ticketError.message}`);

    const eventType = eventDetails['Tipe Event'];
    let baseSeatPrice = 0;
    let sisaKuota = 0;

    // --- 2. VALIDASI KUOTA & AMBIL HARGA DASAR DARI SUPABASE ---
    if (eventType === 'Dengan Pilihan Kursi') {
      if (!seatName) throw new Error("Kursi belum dipilih.");
      
      const { data: seatData, error: seatError } = await supabase
        .from('Harga_Seating')
        .select('*')
        .eq('event_id', eventId)
        .eq('nama', seatName)
        .single();
      
      if (seatError || !seatData) {
        throw new Error(`Kursi "${seatName}" tidak ditemukan untuk event ini.`);
      }
      
      baseSeatPrice = seatData.harga_seat || 0;
      sisaKuota = (seatData.TotalKuota || 0) - (seatData.KuotaTerjual || 0);

    } else { // 'Tanpa Pilihan Kursi'
      sisaKuota = (ticketType.TotalKuota || 0) - (ticketType.KuotaTerjual || 0);
    }

    // Validasi kuota
    if (sisaKuota < quantity) {
      throw new Error(`Maaf, sisa kuota untuk tiket ini tidak mencukupi (sisa: ${sisaKuota}).`);
    }

    // --- 3. KALKULASI HARGA DI SERVER ---
    let subtotal = 0, pricePerTicket = 0;
    const ticketPriceField = parseInt((ticketType.Price || 0).toString().replace(/[^0-9]/g, '')) || 0;
    const isDiscountTicket = ticketType.Discount === true;
    const isBundleTicket = (ticketType.BundleQuantity || 1) > 1;

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
    
    const adminFee = parseInt((ticketType.Admin_Fee || 0).toString().replace(/[^0-9]/g, '')) || 0;
    const totalAdminFee = adminFee * quantity;
    const finalTotal = subtotal + totalAdminFee;
    // --- AKHIR KALKULASI HARGA ---

    // --- 4. BUAT PAYLOAD MIDTRANS ---
    const midtransPayload = {
      transaction_details: { order_id: order_id, gross_amount: finalTotal },
      item_details: [{
          id: ticketTypeId,
          price: pricePerTicket + adminFee,
          quantity: quantity,
          name: ticketType.Name || 'Tiket'
      }],
      customer_details: customer_details,
      credit_card: { secure: true },
    };

    // --- 5. PANGGIL API MIDTRANS ---
    const midtransApiUrl = 'https://app.midtrans.com/snap/v1/transactions';
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
}
