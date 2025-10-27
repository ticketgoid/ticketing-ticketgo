// File: netlify/functions/save-transaction.js

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

export async function handler(event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const data = JSON.parse(event.body);

  try {
    const saleData = {
      event_id: data.eventId,
      order_id: data.order_id,
      nama_pembeli: data.customer_details.first_name,
      email: data.customer_details.email,
      no_hp: data.customer_details.phone,
      jenis_tiket: data.item_details.name,
      seating: data.item_details.seatName, // Pastikan nama kolom di Supabase adalah 'seating'
      jumlah_tiket: data.item_details.quantity,
      total_bayar: parseFloat(data.gross_amount),
      status_pembayaran: data.transaction_status,
      tanggal_transaksi: new Date().toISOString(), // Mengisi kolom tanggal_transaksi
    };
    
    console.log("Mencoba menyimpan data penjualan:", JSON.stringify(saleData, null, 2));
    const { error: saleError } = await supabase.from('Penjualan').insert(saleData);
    if (saleError) throw new Error(`Gagal menyimpan penjualan: ${saleError.message}`);

    let targetTable, targetId;
    if (data.eventType === 'Dengan Pilihan Kursi') {
      targetTable = 'Harga_Seating';
      targetId = data.item_details.seatRecordId;
    } else {
      targetTable = 'Ticket_Types';
      targetId = data.item_details.ticketRecordId;
    }

    if (!targetTable || !targetId) throw new Error("Data untuk update kuota tidak lengkap.");
    
    const { error: quotaError } = await supabase.rpc('increment_kuota_terjual', {
      table_name: targetTable,
      row_id: targetId,
      increment_value: data.item_details.quantity,
    });

    if (quotaError) throw new Error(`Gagal mengupdate kuota: ${quotaError.message}`);
    
    return { statusCode: 200, body: JSON.stringify({ message: 'Success' }) };

  } catch (error) {
    console.error('Fungsi save-transaction gagal:', error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
}
