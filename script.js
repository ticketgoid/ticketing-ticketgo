// GANTI SELURUH ISI FILE script.js DENGAN KODE BARU INI
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
    // --- Variabel Global & Elemen DOM ---
    const eventGrid = document.getElementById('eventGrid');
    let allEventsData = []; // Variabel untuk menyimpan semua data event

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
    
    // --- FUNGSI UTAMA: MENGAMBIL DAN MENAMPILKAN EVENT DARI NETLIFY FUNCTION ---
    async function renderEvents() {
        if (!eventGrid) return;
        eventGrid.innerHTML = '<p>Sedang memuat event...</p>';
        const url = '/api/get-events'; 
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Error: ${response.status} - ${response.statusText}`);
            const data = await response.json();
            
            allEventsData = data.records; // Simpan data event untuk digunakan di pencarian
            
            eventGrid.innerHTML = ''; 

            if (allEventsData.length === 0) {
                eventGrid.innerHTML = '<p>Belum ada event yang tersedia.</p>';
            } else {
                allEventsData.forEach(record => {
                    const fields = record.fields;
                    if (!fields['NamaEvent'] || !fields['GambarEvent'] || !fields['GambarEvent'].length === 0) return;

                    const eventDate = new Date(fields['Waktu']);
                    const formattedDate = eventDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
                    const formattedTime = eventDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false }).replace('.',':');
                    const isPriority = fields['Prioritas'] === true;
                    
                    const isRegistrationOpen = fields['Pendaftaran Dibuka'] === true;
                    const buttonHTML = isRegistrationOpen
                        ? `<button class="btn-buy" data-event-id="${record.id}">Beli Tiket</button>`
                        : `<button class="btn-buy disabled" disabled>Ditutup</button>`;

                    const eventCard = document.createElement('div');
                    eventCard.className = 'event-card';
                    eventCard.setAttribute('data-event-id', record.id); 
                    eventCard.innerHTML = `
                        <div class="card-image">
                            <img src="${fields['GambarEvent'][0].url}" alt="${fields['NamaEvent']}">
                            <span class="tag festival">${fields['Tag'] || ''}</span>
                        </div>
                        <div class="card-content">
                            <h3 class="event-title">${fields['NamaEvent']} ${isPriority ? '<i class="fas fa-star priority-star"></i>' : ''}</h3>
                            <p class="detail"><i class="fas fa-map-marker-alt"></i> ${fields['Lokasi'] || ''}</p>
                            <p class="detail"><i class="fas fa-calendar-alt"></i> ${formattedDate} &nbsp; <i class="fas fa-clock"></i> ${formattedTime}</p>
                            <div class="price-buy">
                                <p class="price">Mulai dari<br><span>Rp ${Number(fields['Harga'] || 0).toLocaleString('id-ID')}</span></p>
                                ${buttonHTML} 
                            </div>
                        </div>`;
                    eventGrid.appendChild(eventCard);
                });
            }
            setupEventListeners();
        } catch (error) {
            console.error("Gagal mengambil event dari backend:", error);
            eventGrid.innerHTML = '<p>Gagal memuat event. Silakan coba lagi nanti.</p>';
        }
    }
    
    // --- FUNGSI PENGATUR EVENT LISTENERS ---
    function setupEventListeners() {
        // Logika untuk klik tombol "Beli Tiket" pada kartu event
        eventGrid.addEventListener('click', function(e) {
            if (e.target && e.target.matches('button.btn-buy:not(:disabled)')) {
                const eventId = e.target.closest('.event-card').dataset.eventId;
                if (eventId) {
                    window.location.href = `checkout.html?eventId=${eventId}`;
                }
            }
        });
        
        // Logika untuk tombol scroll carousel
        const scrollWrapper = document.querySelector('.event-grid-wrapper');
        const scrollLeftBtn = document.getElementById('scrollLeftBtn');
        const scrollRightBtn = document.getElementById('scrollRightBtn');
        if(scrollWrapper && scrollLeftBtn && scrollRightBtn) {
            scrollLeftBtn.addEventListener('click', () => { scrollWrapper.scrollBy({ left: -scrollWrapper.clientWidth * 0.8, behavior: 'smooth' }); });
            scrollRightBtn.addEventListener('click', () => { scrollWrapper.scrollBy({ left: scrollWrapper.clientWidth * 0.8, behavior: 'smooth' }); });
        }
        
        // Inisialisasi logika live search baru
        initializeLiveSearch();
    }
    
    // --- FUNGSI BARU UNTUK LOGIKA LIVE SEARCH ---
    function initializeLiveSearch() {
        const searchInput = document.getElementById('searchInput');
        const resultsContainer = document.getElementById('searchResultsContainer');

        searchInput.addEventListener('input', () => {
            const searchTerm = searchInput.value.toLowerCase();

            if (searchTerm.length === 0) {
                resultsContainer.classList.remove('visible');
                return;
            }

            const filteredEvents = allEventsData.filter(record => 
                record.fields.NamaEvent.toLowerCase().includes(searchTerm)
            );

            displaySearchResults(filteredEvents);
        });
        
        // Sembunyikan hasil pencarian jika klik di luar area pencarian
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-container')) {
                resultsContainer.classList.remove('visible');
            }
        });
    }

    function displaySearchResults(events) {
        const resultsContainer = document.getElementById('searchResultsContainer');
        resultsContainer.innerHTML = '';

        if (events.length === 0) {
            resultsContainer.classList.remove('visible');
            return;
        }

        events.forEach(record => {
            const fields = record.fields;
            const eventDate = new Date(fields.Waktu);
            const formattedDate = eventDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
            const formattedTime = eventDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.',':');

            const item = document.createElement('a');
            item.href = `checkout.html?eventId=${record.id}`;
            item.className = 'search-result-item';
            
            item.innerHTML = `
                <img src="${fields.GambarEvent[0].thumbnails.small.url}" alt="${fields.NamaEvent}" class="result-image">
                <div class="result-info">
                    <div class="result-title">${fields.NamaEvent}</div>
                    <div class="result-date">${formattedDate}, ${formattedTime} WIB</div>
                </div>
            `;
            resultsContainer.appendChild(item);
        });

        resultsContainer.classList.add('visible');
    }

    // --- Inisialisasi Aplikasi ---
    renderEvents();
}
