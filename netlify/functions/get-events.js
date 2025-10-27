// File: netlify/functions/get-events.js

const cache = {
  data: null,
  timestamp: 0,
  isFetching: false, // Penanda untuk mencegah pengambilan data ganda
};

const CACHE_DURATION = 2 * 60 * 1000; // 2 menit

// Fungsi sederhana untuk memberi jeda
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

exports.handler = async function (event, context) {
  const now = Date.now();

  // Jika ada data di cache dan masih valid, langsung kembalikan
  if (cache.data && (now - cache.timestamp < CACHE_DURATION)) {
    console.log('GET-EVENTS: Menyajikan data dari cache memori...');
    return {
      statusCode: 200,
      body: JSON.stringify(cache.data),
    };
  }

  // Jika ada permintaan lain yang sedang mengambil data, tunggu sebentar
  if (cache.isFetching) {
    console.log('GET-EVENTS: Menunggu proses pengambilan data yang sedang berjalan...');
    await sleep(1000); // Tunggu 1 detik
    // Coba lagi, kemungkinan cache sudah terisi oleh permintaan sebelumnya
    return exports.handler(event, context);
  }

  // Kunci proses pengambilan data
  cache.isFetching = true;

  console.log('GET-EVENTS: Mengambil data baru dari Airtable...');
  const { AIRTABLE_API_KEY, AIRTABLE_BASE_ID_EVENT } = process.env;
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID_EVENT}/Events?sort%5B0%5D%5Bfield%5D=Prioritas&sort%5B0%5D%5Bdirection%5D=desc&sort%5B1%5D%5Bfield%5D=Urutan&sort%5B1%5D%5Bdirection%5D=asc&sort%5B2%5D%5Bfield%5D=Waktu&sort%5B2%5D%5Bdirection%5D=asc`;

  try {
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${AIRTABLE_API_KEY}` },
    });

    if (!response.ok) {
      // Jika error, buka kunci agar permintaan berikutnya bisa mencoba lagi
      cache.isFetching = false;
      return { statusCode: response.status, body: response.statusText };
    }

    const data = await response.json();
    
    // Simpan data ke cache
    cache.data = data;
    cache.timestamp = now;

    return {
      statusCode: 200,
      body: JSON.stringify(data),
    };
  } catch (error) {
    console.error('Error fetching events from Airtable:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to fetch events' }),
    };
  } finally {
    // Pastikan kunci selalu terbuka setelah selesai, baik berhasil maupun gagal
    cache.isFetching = false;
  }
};
