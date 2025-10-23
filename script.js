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

// --- FUNGSI BARU: Logika Hero Slider Dinamis (Request 3) ---
async function loadHeroSlider() {
    const sliderContainer = document.querySelector('.hero-slider-container');
    const sliderDotsContainer = document.getElementById('sliderDots');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');

    if (!sliderContainer || !sliderDotsContainer || !prevBtn || !nextBtn) {
        console.error("Elemen Hero Slider tidak ditemukan.");
        return;
    }

    try {
        const response = await fetch('/api/get-hero-slides');
        if (!response.ok) throw new Error('Gagal mengambil data slider');
        
        const data = await response.json();
        const slidesData = data.records;

        if (!slidesData || slidesData.length === 0) {
            sliderContainer.innerHTML = '<p>Slides tidak tersedia.</p>'; // Fallback
            return;
        }

        // 1. Bangun HTML Slider dari data Airtable
        sliderContainer.innerHTML = ''; // Kosongkan kontainer
        slidesData.forEach((record, index) => {
            const fields = record.fields;
            const imageUrl = fields['Gambar']?.[0]?.url;
            const linkUrl = fields['LinkTujuan']; // Ambil link

            if (imageUrl) {
                // Tentukan elemen pembungkus: <a> jika ada link, <div> jika tidak
                const wrapperTag = linkUrl ? 'a' : 'div';
                const slideWrapper = document.createElement(wrapperTag);
                
                if (linkUrl) {
                    slideWrapper.href = linkUrl;
                    // Buka link eksternal di tab baru
                    if (linkUrl.startsWith('http')) {
                        slideWrapper.target = '_blank';
                        slideWrapper.rel = 'noopener noreferrer';
                    }
                }

                slideWrapper.className = 'slide';
                slideWrapper.dataset.slideIndex = index;
                
                const slideImage = document.createElement('img');
                slideImage.src = imageUrl;
                slideImage.alt = `Promotional Image ${index + 1}`;
                
                slideWrapper.appendChild(slideImage);
                sliderContainer.appendChild(slideWrapper);
            }
        });

        // 2. Setelah HTML dibuat, jalankan logika slider
        const slides = document.querySelectorAll('.slide'); // Ambil slide yang baru dibuat
        if (slides.length === 0) return;

        let currentSlide = 0;
        let heroInterval;

        // --- Fungsi Bawaan Slider (sekarang di dalam loadHeroSlider) ---
        function createSliderDots() {
            sliderDotsContainer.innerHTML = '';
            slides.forEach((_, index) => {
                const dot = document.createElement('button');
                dot.className = 'slider-dot';
                dot.dataset.index = index;
                dot.setAttribute('aria-label', `Go to slide ${index + 1}`);
                dot.addEventListener('click', () => {
                    showSlide(index);
                    resetInterval();
                });
                sliderDotsContainer.appendChild(dot);
            });
        }
        
        const showSlide = (index) => {
            slides.forEach(slide => slide.classList.remove('active-slide'));
            if(slides[index]) slides[index].classList.add('active-slide');

            Array.from(sliderDotsContainer.children).forEach((dot, dotIndex) => {
                dot.classList.toggle('active', dotIndex === index);
            });
            currentSlide = index;
        };

        const nextSlide = () => {
            currentSlide = (currentSlide + 1) % slides.length;
            showSlide(currentSlide);
        };
        
        const prevSlide = () => {
            currentSlide = (currentSlide - 1 + slides.length) % slides.length;
            showSlide(currentSlide);
        };

        const resetInterval = () => {
            clearInterval(heroInterval);
            heroInterval = setInterval(nextSlide, 5000);
        };
        // --- Akhir Fungsi Bawaan Slider ---

        // 3. Inisialisasi Slider
        nextBtn.addEventListener('click', () => {
            nextSlide();
            resetInterval();
        });
        prevBtn.addEventListener('click', () => {
            prevSlide();
            resetInterval();
        });
        
        createSliderDots();
        showSlide(currentSlide);
        heroInterval = setInterval(nextSlide, 5000);

    } catch (error) {
        console.error("Error memuat Hero Slider:", error);
        sliderContainer.innerHTML = '<p>Gagal memuat promosi. Coba lagi nanti.</p>';
    }
}


// --- Fungsi untuk memuat Event Cards (Tidak Berubah) ---
async function renderEvents() {
    const eventGrid = document.getElementById('eventGrid');
    if (!eventGrid) return;
    eventGrid.innerHTML = '<p>Sedang memuat event...</p>';
    const url = '/api/get-events'; 
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Error: ${response.status} - ${response.statusText}`);
        const data = await response.json();
        
        window.allEventsData = data.records; // Simpan data event untuk digunakan di pencarian
        
        eventGrid.innerHTML = ''; 

        if (allEventsData.length === 0) {
            eventGrid.innerHTML = '<p>Belum ada event yang tersedia.</p>';
        } else {
            allEventsData.forEach(record => {
                const fields = record.fields;
                if (!fields['NamaEvent'] || !fields['GambarEvent'] || !fields['GambarEvent'].length === 0) return;

                const penyelenggara = fields['Penyelenggara'] || '';
                const isVerified = fields['verifikasi'] === true;
                const eventDate = new Date(fields['Waktu']);
                const formattedDate = eventDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
                const formattedTime = eventDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false }).replace('.',':');
                const isPriority = fields['Prioritas'] === true;
                
                const isRegistrationOpen = fields['Pendaftaran Dibuka'] === true;
                const buttonHTML = isRegistrationOpen
                    ? `<button class="btn-buy" data-event-id="${record.id}">Beli Tiket</button>`
                    : `<button class="btn-buy disabled" disabled>Sold Out</button>`;

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
                        
                        ${penyelenggara ? `<p class="penyelenggara">${penyelenggara} ${isVerified ? '<i class="fas fa-check-circle verified-icon"></i>' : ''}</p>` : ''}

                        <p class="detail"><i class="fas fa-map-marker-alt"></i> ${fields['Lokasi'] || ''}</p>
                        <p class="detail"><i class="fas fa-calendar-alt"></i> ${formattedDate} &nbsp; <i class="fas fa-clock"></i> ${formattedTime}</p>
                        
                        <div class="price-buy">
                            <p class="price">
                                <span class="price-label">Mulai dari</span><br>
                                <span>Rp ${Number(fields['Harga'] || 0).toLocaleString('id-ID')}</span>
                            </p>
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

// --- Fungsi Pengatur Event Listener (Tidak Berubah) ---
function setupEventListeners() {
    const eventGrid = document.getElementById('eventGrid');
    if (eventGrid) {
        eventGrid.addEventListener('click', function(e) {
            const card = e.target.closest('.event-card');
            if (card) {
                const eventId = card.dataset.eventId;
                if (eventId) {
                    window.location.href = `checkout.html?eventId=${eventId}`;
                }
            }
        });
    }
    
    const scrollWrapper = document.querySelector('.event-grid-wrapper');
    const scrollLeftBtn = document.getElementById('scrollLeftBtn');
    const scrollRightBtn = document.getElementById('scrollRightBtn');
    if(scrollWrapper && scrollLeftBtn && scrollRightBtn) {
        scrollLeftBtn.addEventListener('click', () => { scrollWrapper.scrollBy({ left: -scrollWrapper.clientWidth * 0.8, behavior: 'smooth' }); });
        scrollRightBtn.addEventListener('click', () => { scrollWrapper.scrollBy({ left: scrollWrapper.clientWidth * 0.8, behavior: 'smooth' }); });
    }
    
    initializeLiveSearch();
}

// --- Fungsi Logika Live Search (Tidak Berubah) ---
function initializeLiveSearch() {
    const searchInput = document.getElementById('searchInput');
    const resultsContainer = document.getElementById('searchResultsContainer');
    if (!searchInput || !resultsContainer) return;

    searchInput.addEventListener('input', () => {
        const searchTerm = searchInput.value.toLowerCase();

        if (searchTerm.length === 0) {
            resultsContainer.classList.remove('visible');
            return;
        }

        const filteredEvents = (window.allEventsData || []).filter(record => 
            record.fields.NamaEvent.toLowerCase().includes(searchTerm)
        );

        displaySearchResults(filteredEvents);
    });
    
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-container')) {
            resultsContainer.classList.remove('visible');
        }
    });
}

// --- Fungsi Tampilan Hasil Pencarian (Tidak Berubah) ---
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

// --- FUNGSI BARU: Animasi Looping untuk "Why TicketGo" ---
function initializeWhyGoAnimation() {
    if (window.innerWidth <= 600) return;
    const whyCards = document.querySelectorAll('.why-card');
    if (whyCards.length === 0) return;

    let currentThrobIndex = 0;
    
    // Tampilkan yang pertama langsung
    whyCards[currentThrobIndex].classList.add('is-throbbing');

    // Atur interval untuk berganti setiap 3 detik (3000 ms)
    setInterval(() => {
        // 1. Hapus "kedut" dari kartu yang sekarang
        whyCards[currentThrobIndex].classList.remove('is-throbbing');
        
        // 2. Pindah ke kartu berikutnya (dan kembali ke 0 jika sudah di akhir)
        currentThrobIndex = (currentThrobIndex + 1) % whyCards.length;
        
        // 3. Tambahkan "kedut" ke kartu yang baru
        whyCards[currentThrobIndex].classList.add('is-throbbing');
        
    }, 3000); // Ganti angka 3000 (ms) ini untuk mengubah kecepatan giliran
}

// --- FUNGSI BARU: Animasi Carousel "Why TicketGo" (Mobile) ---
function initializeWhyGoCarousel() {
    // Hanya jalankan di mobile
    if (window.innerWidth > 600) return; 

    const grid = document.querySelector('.why-grid');
    if (!grid) return;

    let currentCardIndex = 0;
    const cards = grid.querySelectorAll('.why-card');
    if (cards.length === 0) return;

    // Tambahkan 'scroll-behavior: smooth' via JS
    grid.style.scrollBehavior = 'smooth';

    setInterval(() => {
        // Pindah ke kartu berikutnya
        currentCardIndex = (currentCardIndex + 1) % cards.length;
        
        const card = cards[currentCardIndex];
        
        // Kalkulasi posisi scroll baru agar kartu pas di tengah
        const gridWidth = grid.offsetWidth;
        const cardWidth = card.offsetWidth;
        const cardLeft = card.offsetLeft; // Jarak kartu dari kiri container

        // Target scroll = posisi kiri kartu - (setengah sisa ruang)
        const newScrollLeft = cardLeft - (gridWidth - cardWidth) / 2;

        grid.scrollTo(newScrollLeft, 0);

    }, 5000); // Ganti angka ini (dalam ms) untuk kecepatan ganti (5 detik)
}

// --- Fungsi Inisialisasi Utama ---
function initializeApp() {
    // Panggil kedua fungsi pemuat data secara paralel
    loadHeroSlider();
    renderEvents();
    initializeWhyGoAnimation();
    initializeWhyGoCarousel();
}



