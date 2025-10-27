// File: netlify/functions/get-event-details.js

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

export async function handler(event, context) {
  const { eventId } = event.queryStringParameters;

  if (!eventId) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Event ID is required' }) };
  }
  
  try {
    const [eventDetailsRes, ticketTypesRes, formFieldsRes] = await Promise.all([
      supabase.from('Events').select('*').eq('id', eventId).single(),
      supabase.from('Ticket_Types').select('*').eq('event_id', eventId).order('Urutan'),
      supabase.from('Form_Fields').select('*').eq('event_id', eventId).order('Urutan')
    ]);

    if (eventDetailsRes.error) throw eventDetailsRes.error;

    const eventDetails = { id: eventDetailsRes.data.id, fields: eventDetailsRes.data };
    const ticketTypes = { records: ticketTypesRes.data.map(t => ({ id: t.id, fields: t })) };
    const formFields = { records: formFieldsRes.data.map(f => ({ id: f.id, fields: f })) };

    let sisaKuota = {};
    let seatPrices = {};
    const eventType = eventDetails.fields.TipeEvent;

    if (eventType === 'Dengan Pilihan Kursi') {
        // --- INILAH LOGIKA YANG DITAMBAHKAN ---
        const { data: seatData, error: seatError } = await supabase
            .from('Harga_Seating')
            .select('*')
            .eq('event_id', eventId);

        if (seatError) throw seatError;

        seatData.forEach(seat => {
            const seatName = seat.nama;
            if (seatName) {
                const seatNameLower = seatName.toLowerCase();
                const sisa = (seat.TotalKuota || 0) - (seat.KuotaTerjual || 0);
                sisaKuota[seatNameLower] = { sisa: sisa > 0 ? sisa : 0, recordId: seat.id };
                seatPrices[seatNameLower] = seat.harga_seat || 0;
            }
        });

    } else { // Tanpa Pilihan Kursi
        ticketTypes.records.forEach(ticket => {
            const ticketName = ticket.fields.Name;
            if (ticketName) {
                const sisa = (ticket.fields.TotalKuota || 0) - (ticket.fields.KuotaTerjual || 0);
                sisaKuota[ticketName.toLowerCase()] = { sisa: sisa > 0 ? sisa : 0, recordId: ticket.id };
            }
        });
    }

    const responseData = {
        eventDetails,
        ticketTypes,
        formFields,
        sisaKuota,
        seatPrices
    };
    
    console.log("DEBUG: Data Poster yang akan dikirim:", JSON.stringify(responseData.eventDetails.fields.Poster, null, 2));

    return {
      statusCode: 200,
      body: JSON.stringify(responseData),// File: netlify/functions/get-event-details.js

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

export async function handler(event, context) {
  const { eventId } = event.queryStringParameters;

  if (!eventId) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Event ID is required' }) };
  }
  
  try {
    const [eventDetailsRes, ticketTypesRes, formFieldsRes] = await Promise.all([
      supabase.from('Events').select('*').eq('id', eventId).single(),
      supabase.from('Ticket_Types').select('*').eq('event_id', eventId).order('Urutan'),
      supabase.from('Form_Fields').select('*').eq('event_id', eventId).order('Urutan')
    ]);

    if (eventDetailsRes.error) throw eventDetailsRes.error;

    const eventDetails = { id: eventDetailsRes.data.id, fields: eventDetailsRes.data };
    const ticketTypes = { records: ticketTypesRes.data.map(t => ({ id: t.id, fields: t })) };
    const formFields = { records: formFieldsRes.data.map(f => ({ id: f.id, fields: f })) };

    let sisaKuota = {};
    let seatPrices = {};
    const eventType = eventDetails.fields.TipeEvent;

    if (eventType === 'Dengan Pilihan Kursi') {
        const { data: seatData, error: seatError } = await supabase
            .from('Harga_Seating')
            .select('*')
            .eq('event_id', eventId);
        
        // --- INILAH DEBUGGER YANG DITAMBAHKAN ---
        console.log(`DEBUG: Hasil query dari Harga_Seating untuk eventId ${eventId}:`, JSON.stringify(seatData, null, 2));
        // --- AKHIR DEBUGGER ---

        if (seatError) throw seatError;

        seatData.forEach(seat => {
            const seatName = seat.nama;
            if (seatName) {
                const seatNameLower = seatName.toLowerCase();
                const sisa = (seat.TotalKuota || 0) - (seat.KuotaTerjual || 0);
                sisaKuota[seatNameLower] = { sisa: sisa > 0 ? sisa : 0, recordId: seat.id };
                seatPrices[seatNameLower] = seat.harga_seat || 0;
            }
        });

    } else { // Tanpa Pilihan Kursi
        ticketTypes.records.forEach(ticket => {
            const ticketName = ticket.fields.Name;
            if (ticketName) {
                const sisa = (ticket.fields.TotalKuota || 0) - (ticket.fields.KuotaTerjual || 0);
                sisaKuota[ticketName.toLowerCase()] = { sisa: sisa > 0 ? sisa : 0, recordId: ticket.id };
            }
        });
    }

    const responseData = {
        eventDetails,
        ticketTypes,
        formFields,
        sisaKuota,
        seatPrices
    };

    return {
      statusCode: 200,
      body: JSON.stringify(responseData),
    };

  } catch (error) {
    console.error('Error di fungsi get-event-details:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to fetch event details', details: error.message }),
    };
  }
}
    };

  } catch (error) {
    console.error('Error di fungsi get-event-details:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to fetch event details', details: error.message }),
    };
  }
}
