document.addEventListener('DOMContentLoaded', async () => {
    const galleryContainer = document.getElementById('testimoni-gallery');

    if (!galleryContainer) return;

    try {
        const response = await fetch('/api/get-testimoni');
        if (!response.ok) {
            throw new Error('Gagal memuat data galeri.');
        }

        const data = await response.json();
        const testimonials = data.records;

        galleryContainer.innerHTML = ''; // Kosongkan pesan "Memuat galeri..."

        if (!testimonials || testimonials.length === 0) {
            galleryContainer.innerHTML = '<p>Belum ada testimoni untuk ditampilkan.</p>';
            return;
        }

        testimonials.forEach(record => {
            const fields = record.fields;
            
            // --- PERUBAHAN DI SINI ---
            // Mengambil data dari kolom 'Foto' dan 'Nama Event'
            const imageUrl = fields.Foto?.[0]?.url;
            const eventName = fields['Nama Event'] || 'Testimoni TicketGo'; // Fallback jika nama event kosong
            // --- AKHIR PERUBAHAN ---

            if (imageUrl) {
                const galleryItem = document.createElement('div');
                galleryItem.className = 'gallery-item';
                
                const img = document.createElement('img');
                img.src = imageUrl;
                img.alt = eventName; // Menggunakan nama event untuk alt text
                img.loading = 'lazy';

                galleryItem.appendChild(img);
                galleryContainer.appendChild(galleryItem);
            }
        });

    } catch (error) {
        console.error('Error:', error);
        galleryContainer.innerHTML = '<p>Gagal memuat galeri. Silakan coba lagi nanti.</p>';
    }
});
