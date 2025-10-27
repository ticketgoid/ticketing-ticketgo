// File: netlify/functions/get-testimoni.js

const fs = require('fs').promises;
const path = require('path');

const CACHE_FILE_PATH = path.join('/tmp', 'testimoni_cache.json');
const CACHE_DURATION = 12 * 60 * 60 * 1000; // 12 jam

exports.handler = async function (event, context) {
  try {
    const cachedData = JSON.parse(await fs.readFile(CACHE_FILE_PATH, 'utf-8'));
    const now = Date.now();

    if (now - cachedData.timestamp < CACHE_DURATION) {
      console.log('GET-TESTIMONI: Menyajikan data dari file cache...');
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cachedData.data),
      };
    }
  } catch (error) {
    if (error.code !== 'ENOENT') console.error('Gagal membaca cache testimoni:', error);
  }

  console.log('GET-TESTIMONI: Membaca data dari direktori assets/testimoni...');
  
  const testimoniDir = path.resolve(process.cwd(), 'assets/testimoni');

  try {
    const files = await fs.readdir(testimoniDir);

    const testimonials = files
      .filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file))
      .map(file => {
        // Ambil nama file tanpa ekstensi untuk dijadikan Nama Event
        const eventName = path.parse(file).name.replace(/[-_]/g, ' ');
        return {
          id: file,
          fields: {
            'Foto': [{ url: `/assets/testimoni/${file}` }],
            'Nama Event': eventName
          }
        };
      });

    const responseData = { records: testimonials };

    await fs.writeFile(CACHE_FILE_PATH, JSON.stringify({
      timestamp: Date.now(),
      data: responseData,
    }));
    console.log('GET-TESTIMONI: File cache berhasil dibuat/diperbarui.');

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(responseData),
    };
  } catch (error) {
    console.error(`Error saat membaca direktori ${testimoniDir}:`, error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Gagal membaca konten testimoni' }),
    };
  }
};
