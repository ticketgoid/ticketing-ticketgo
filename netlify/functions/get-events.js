// File: netlify/functions/get-events.js

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

export async function handler(event, context) {
  try {
    const { data: events, error: eventsError } = await supabase
      .from('Events')
      .select(`
        *,
        Ticket_Types (*),
        Harga_Seating (*)
      `)
      .order('Prioritas', { ascending: false })
      .order('Urutan', { ascending: true });

    if (eventsError) throw eventsError;

    // Hitung total sisa kuota untuk setiap event
    const eventsWithQuota = events.map(event => {
      let totalSisaKuota = 0;
      if (event['Tipe Event'] === 'Dengan Pilihan Kursi') {
        totalSisaKuota = event.Harga_Seating.reduce((sum, seat) => {
          return sum + ((seat.TotalKuota || 0) - (seat.KuotaTerjual || 0));
        }, 0);
      } else {
        totalSisaKuota = event.Ticket_Types.reduce((sum, ticket) => {
          return sum + ((ticket.TotalKuota || 0) - (ticket.KuotaTerjual || 0));
        }, 0);
      }
      return { ...event, totalSisaKuota };
    });

    const airtableFormattedData = {
      records: eventsWithQuota.map(item => ({
        id: item.id,
        fields: item,
      }))
    };

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(airtableFormattedData),
    };
  } catch (error) {
    console.error('Error fetching events from Supabase:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to fetch events', details: error.message }),
    };
  }
}
