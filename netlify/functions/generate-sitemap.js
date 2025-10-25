exports.handler = async function (event, context) {
  const { AIRTABLE_API_KEY, AIRTABLE_BASE_ID_EVENT } = process.env;
  const YOUR_DOMAIN = "https://ticketgo.my.id"; 

  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID_EVENT}/Events`;

  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
      },
    });

    if (!response.ok) {
      throw new Error("Gagal mengambil data event dari Airtable.");
    }

    const data = await response.json();
    const events = data.records;

    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  
  <url>
    <loc>${YOUR_DOMAIN}/</loc>
    <priority>1.00</priority>
  </url>
  <url>
    <loc>${YOUR_DOMAIN}/faq.html</loc>
    <priority>0.80</priority>
  </url>
  <url>
    <loc>${YOUR_DOMAIN}/syarat-ketentuan.html</loc>
    <priority>0.80</priority>
  </url>

  `;

    events.forEach(event => {
      sitemap += `
  <url>
    <loc>${YOUR_DOMAIN}/checkout.html?eventId=${event.id}</loc>
    <priority>0.90</priority>
  </url>
`;
    });

    sitemap += `</urlset>`;

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/xml',
      },
      body: sitemap,
    };

  } catch (error) {
    console.error('Error saat membuat sitemap:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Gagal membuat sitemap.' }),
    };
  }
};
