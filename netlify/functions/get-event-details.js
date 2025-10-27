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

    // Transformasi data agar sesuai format Airtable
    const eventDetails = { id: eventDetailsRes.data.id, fields: eventDetailsRes.data };
    const ticketTypes = { records: ticketTypesRes.data.map(t => ({ id: t.id, fields: t })) };
    const formFields = { records: formFieldsRes.data.map(f => ({ id: f.id, fields: f })) };

    let sisaKuota = {};
    ticketTypes.records.forEach(ticket => {
        const ticketName = ticket.fields.Name;
        if (ticketName) {
            const sisa = (ticket.fields.TotalKuota || 0) - (ticket.fields.KuotaTerjual || 0);
            sisaKuota[ticketName.toLowerCase()] = { sisa: sisa > 0 ? sisa : 0, recordId: ticket.id };
        }
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        eventDetails,
        ticketTypes,
        formFields,
        sisaKuota,
        seatPrices: {}
      }),
    };
  } catch (error) {
    console.error('Error di fungsi get-event-details:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to fetch event details', details: error.message }),
    };
  }
}
