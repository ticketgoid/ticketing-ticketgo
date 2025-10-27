import { createClient } from '@supabase/supabase-js';

// Inisialisasi Supabase Client
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

export async function handler(event, context) {
  console.log('GET-EVENTS: Mengambil data dari Supabase...');

  try {
    const { data, error } = await supabase
      .from('Events')
      .select('*')
      .order('Prioritas', { ascending: false })
      .order('Urutan', { ascending: true });

    if (error) throw error;

    // Transformasi data agar cocok dengan format yang diharapkan frontend
    const airtableFormattedData = {
      records: data.map(item => ({
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
