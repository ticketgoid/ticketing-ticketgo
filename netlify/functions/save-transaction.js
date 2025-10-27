// File: netlify/functions/save-transaction.js

import { createClient } from '@supabase/supabase-js';

// Gunakan kunci 'service_role' di sini karena ini adalah operasi backend yang aman
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

export async function handler(event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const data = JSON.parse(event.body);

  try {
    // 1. Simpan data transaksi utama ke tabel 'Penjualan'
    const { error: saleError } = await supabase.from('Penjualan').insert({
      event_id: data.eventId,
      order_id: data.order_id,
      nama_pembeli: data.customer_details.first_name,
      email: data.customer_details.email,
      no_hp: data.customer_details.phone,
      jenis_tiket: data.item_details.name,
      seating: data.item_details.seatName,
      jumlah_tiket: data.item_details.quantity,
      total_bayar: parseFloat(data.gross_amount),
      status_pembayaran: data.transaction_status,
    });

    if (saleError) throw new Error(`Gagal menyimpan penjualan: ${saleError.message}`);

    // 2. Update Kuota Terjual
    let targetTable, targetId;
    if (data.eventType === 'Dengan Pilihan Kursi') {
      targetTable = 'Harga_Seating';
      targetId = data.item_details.seatRecordId;
    } else {
      targetTable = 'Ticket_Types';
      targetId = data.item_details.ticketRecordId;
    }

    // Panggil fungsi database untuk menambah 'KuotaTerjual' secara aman
    const { error: quotaError } = await supabase.rpc('increment_kuota_terjual', {
      table_name: targetTable,
      row_id: targetId,
      increment_value: data.item_details.quantity,
    });

    if (quotaError) throw new Error(`Gagal mengupdate kuota: ${quotaError.message}`);
    
    console.log(`Transaksi ${data.order_id} berhasil disimpan dan kuota diupdate.`);
    return { statusCode: 200, body: JSON.stringify({ message: 'Success' }) };

  } catch (error) {
    console.error('Fungsi save-transaction gagal:', error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
}
