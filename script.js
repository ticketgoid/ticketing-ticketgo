// GANTI SELURUH ISI FILE script.js DENGAN KODE INI

window.addEventListener('load', () => {
    const preloader = document.getElementById('preloader');
    const mainContent = document.getElementById('main-content');
    
    setTimeout(() => {
        if(preloader) preloader.classList.add('fade-out');
        if(mainContent) mainContent.classList.remove('hidden');
    }, 2000); 

    initializeApp();
});

function initializeApp() {
    // --- KONFIGURASI PENTING ---
    const AIRTABLE_API_KEY = 'patL6WezaL3PYo6wP.e1c40c7a7b38a305974867e3973993737d5ae8f5892e4498c3473f2774d3664c';
    const AIRTABLE_BASE_ID = 'appXLPTB00V3gUH2e';
    const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzDevdyhUaABFeN0_T-bY_D_oi7bEg12H7azjh7KuQY1l6uXn6z7fyHeTYG0j_bnpshhg/exec';

    // --- Variabel Global & Elemen DOM ---
    let allEvents = [];
    const eventGrid = document.getElementById('eventGrid');
    
    // --- Logika Carousel Hero ---
    const slides = document.querySelectorAll('.slide');
    if (slides.length > 0) {
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');
        let currentSlide = 0;
        const showSlide = (index) => {
            slides.forEach(slide => slide.classList.remove('active-slide'));
            if(slides[index]) slides[index].classList.add('active-slide');
        };
        const nextSlide = () => {
            currentSlide = (currentSlide + 1) % slides.length;
            showSlide(currentSlide);
        };
        const prevSlide = () => {
            currentSlide = (currentSlide - 1 + slides.length) % slides.length;
            showSlide(currentSlide);
        };
        if (nextBtn && prevBtn) {
            nextBtn.addEventListener('click', nextSlide);
            prevBtn.addEventListener('click', prevSlide);
            setInterval(nextSlide, 5000);
            showSlide(currentSlide);
        }
    }
    
    // --- FUNGSI UTAMA: MENGAMBIL DAN MENAMPILKAN EVENT DARI AIRTABLE ---
    async function renderEvents() {
        if (!eventGrid) return;
        eventGrid.innerHTML = '<p>Sedang memuat event...</p>';
        const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Events?filterByFormula=%7BPendaftaran%20Dibuka%7D%3D1&sort%5B0%5D%5Bfield%5D=Prioritas&sort%5B0%5D%5Bdirection%5D=desc&sort%5B1%5D%5Bfield%5D=Urutan&sort%5B1%5D%5Bdirection%5D=asc&sort%5B2%5D%5Bfield%5D=Waktu&sort%5B2%5D%5Bdirection%5D=asc`;

        try {
            const response = await fetch(url, { headers: { 'Authorization': `Bearer ${AIRTABLE_API_KEY}` } });
            if (!response.ok) throw new Error(`Error: ${response.status} - ${response.statusText}`);
            const data = await response.json();
            allEvents = data.records;
            eventGrid.innerHTML = ''; 

            if (allEvents.length === 0) {
                eventGrid.innerHTML = '<p>Belum ada event yang tersedia.</p>';
            } else {
                allEvents.forEach(record => {
                    const fields = record.fields;
                    if (!fields['Nama Event'] || !fields['Gambar Event'] || fields['Gambar Event'].length === 0) return;

                    const eventDate = new Date(fields['Waktu']);
                    const formattedDate = eventDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
                    const formattedTime = eventDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false }).replace('.',':');
                    const isPriority = fields['Prioritas'] === true;

                    const eventCard = document.createElement('div');
                    eventCard.className = 'event-card';
                    eventCard.setAttribute('data-event-id', record.id); 
                    eventCard.innerHTML = `
                        <div class="card-image">
                            <img src="${fields['Gambar Event'][0].url}" alt="${fields['Nama Event']}">
                            <span class="tag festival">${fields['Tag'] || ''}</span>
                        </div>
                        <div class="card-content">
                            <h3 class="event-title">${fields['Nama Event']} ${isPriority ? '<i class="fas fa-star priority-star"></i>' : ''}</h3>
                            <p class="detail"><i class="fas fa-map-marker-alt"></i> ${fields['Lokasi'] || ''}</p>
                            <p class="detail"><i class="fas fa-calendar-alt"></i> ${formattedDate} &nbsp; <i class="fas fa-clock"></i> ${formattedTime}</p>
                            <div class="price-buy">
                                <p class="price">Mulai dari<br><span>Rp ${Number(fields['Harga'] || 0).toLocaleString('id-ID')}</span></p>
                                <button class="btn-buy" data-event-id="${record.id}">Beli Tiket</button>
                            </div>
                        </div>`;
                    eventGrid.appendChild(eventCard);
                });
            }
            checkAllEventQuotas();
            setupEventListeners();
        } catch (error) {
            console.error("Gagal mengambil event dari Airtable:", error);
            eventGrid.innerHTML = '<p>Gagal memuat event. Cek kembali konfigurasi Anda.</p>';
        }
    }

    // ## FUNGSI CEK KUOTA EVENT ##
    async function checkAllEventQuotas() {
        // ... (Fungsi ini tetap sama, tidak perlu diubah) ...
    }
    
    // --- FUNGSI PENGATUR EVENT LISTENERS ---
    function setupEventListeners() {
        const searchInput = document.getElementById('searchInput');
        if(searchInput) {
            searchInput.addEventListener('input', () => {
                const searchTerm = searchInput.value.toLowerCase();
                document.querySelectorAll('.event-card').forEach(card => {
                    const eventTitle = card.querySelector('.event-title').textContent.toLowerCase();
                    card.style.display = eventTitle.includes(searchTerm) ? 'flex' : 'none';
                });
            });
        }
        
        // Mengarahkan ke halaman checkout.html
        document.querySelectorAll('.btn-buy').forEach(button => {
            button.addEventListener('click', () => {
                const eventId = button.dataset.eventId;
                if (eventId) {
                    window.location.href = `checkout.html?eventId=${eventId}`;
                }
            });
        });
        
        const scrollWrapper = document.querySelector('.event-grid-wrapper');
        const scrollLeftBtn = document.getElementById('scrollLeftBtn');
        const scrollRightBtn = document.getElementById('scrollRightBtn');
        if(scrollWrapper && scrollLeftBtn && scrollRightBtn) {
            scrollLeftBtn.addEventListener('click', () => { scrollWrapper.scrollBy({ left: -scrollWrapper.clientWidth * 0.8, behavior: 'smooth' }); });
            scrollRightBtn.addEventListener('click', () => { scrollWrapper.scrollBy({ left: scrollWrapper.clientWidth * 0.8, behavior: 'smooth' }); });
        }
    }

    // --- LOGIKA SEARCH ICON & SCROLL ---
    const searchIcon = document.getElementById('searchIcon');
    const searchInput = document.getElementById('searchInput');
    const eventsSection = document.getElementById('events');
    let hasScrolledOnInput = false;
    if (searchIcon && searchInput) {
        searchIcon.addEventListener('click', (event) => {
            event.preventDefault();
            searchInput.classList.toggle('active');
            searchInput.focus();
            if (!searchInput.classList.contains('active')) hasScrolledOnInput = false;
        });
        searchInput.addEventListener('input', () => {
            if (!hasScrolledOnInput && eventsSection) {
                eventsSection.scrollIntoView({ behavior: 'smooth' });
                hasScrolledOnInput = true;
            }
        });
    }

    // --- Inisialisasi Aplikasi ---
    renderEvents();
}

