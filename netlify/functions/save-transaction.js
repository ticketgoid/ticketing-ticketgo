// File: netlify/functions/save-transaction.js

import { createClient } from '@supabase/supabase-js';

// Gunakan kunci 'service_role' karena ini adalah operasi backend yang aman
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

export async function handler(event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const data = JSON.parse(event.body);

  try {
    // --- INILAH PERBAIKANNYA ---
    const saleData = {
      event_id: data.eventId,
      order_id: data.order_id,
      nama_pembeli: data.customer_details.first_name,
      email: data.customer_details.email,
      no_hp: data.customer_details.phone,
      jenis_tiket: data.item_details.name,
      seating: data.item_details.seatName, // Pastikan nama kolom di Supabase juga 'seating'
      jumlah_tiket: data.item_details.quantity,
      total_bayar: parseFloat(data.gross_amount),
      status_pembayaran: data.transaction_status,
      // Menambahkan pengisian untuk kolom tanggal_transaksi
      tanggal_transaksi: new Date().toISOString(), 
    };
    // --- AKHIR PERBAIKAN ---
    
    console.log("Mencoba menyimpan data penjualan:", JSON.stringify(saleData, null, 2));

    const { error: saleError } = await supabase.from('Penjualan').insert(saleData);

    if (saleError) {
      console.error("Supabase insert error:", saleError);
      throw new Error(`Gagal menyimpan penjualan: ${saleError.message}`);
    }
    console.log(`Data penjualan untuk Order ID ${data.order_id} berhasil disimpan.`);

    // 2. Update Kuota Terjual
    let targetTable, targetId;
    if (data.eventType === 'Dengan Pilihan Kursi') {
      targetTable = 'Harga_Seating';
      targetId = data.item_details.seatRecordId;
    } else {
      targetTable = 'Ticket_Types';
      targetId = data.item_details.ticketRecordId;
    }

    if (!targetTable || !targetId) {
        throw new Error("Data untuk update kuota tidak lengkap.");
    }
    
    console.log(`Mencoba mengupdate kuota: Tabel=${targetTable}, ID=${targetId}, Jumlah=${data.item_details.quantity}`);
    
    const { error: quotaError } = await supabase.rpc('increment_kuota_terjual', {
      table_name: targetTable,
      row_id: targetId,
      increment_value: data.item_details.quantity,
    });

    if (quotaError) {
      console.error("Supabase RPC error:", quotaError);
      throw new Error(`Gagal mengupdate kuota: ${quotaError.message}`);
    }
    
    console.log(`Transaksi ${data.order_id} berhasil sepenuhnya.`);
    return { statusCode: 200, body: JSON.stringify({ message: 'Success' }) };

  } catch (error) {
    console.error('Fungsi save-transaction gagal total:', error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
}
