document.addEventListener('DOMContentLoaded', () => {

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
        function showSlide(index) { slides.forEach(slide => slide.classList.remove('active-slide')); if(slides[index]) slides[index].classList.add('active-slide'); }
        function nextSlide() { currentSlide = (currentSlide + 1) % slides.length; showSlide(currentSlide); }
        function prevSlide() { currentSlide = (currentSlide - 1 + slides.length) % slides.length; showSlide(currentSlide); }
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
        const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Events?sort%5B0%5D%5Bfield%5D=Waktu&sort%5B0%5D%5Bdirection%5D=asc`;

        try {
            const response = await fetch(url, { headers: { 'Authorization': `Bearer ${AIRTABLE_API_KEY}` } });
            if (!response.ok) throw new Error(`Error: ${response.status} - ${response.statusText}`);
            const data = await response.json();
            allEvents = data.records;
            eventGrid.innerHTML = ''; 

            // ## KEMBALIKAN KE LOGIKA SEMULA UNTUK TAMPILAN GRID ##
            const scrollLeftBtn = document.getElementById('scrollLeftBtn');
            const scrollRightBtn = document.getElementById('scrollRightBtn');
            const threshold = 4;
            if (allEvents.length > threshold) {
                eventGrid.classList.add('two-rows');
            } else {
                eventGrid.classList.remove('two-rows');
            }


            if (allEvents.length === 0) {
                eventGrid.innerHTML = '<p>Belum ada event yang tersedia.</p>';
            } else {
                allEvents.forEach(record => {
                    const fields = record.fields;
                    if (!fields['Nama Event'] || !fields['Gambar Event']) return;
                    const eventDate = new Date(fields['Waktu']);
                    const formattedDate = eventDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
                    const formattedTime = eventDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false }).replace('.',':');
                    const eventCard = document.createElement('div');
                    eventCard.className = 'event-card';
                    eventCard.innerHTML = `<div class="card-image"><img src="${fields['Gambar Event'][0].url}" alt="${fields['Nama Event']}"><span class="tag festival">${fields['Tag'] || ''}</span></div><div class="card-content"><h3 class="event-title">${fields['Nama Event']}</h3><p class="detail"><i class="fas fa-map-marker-alt"></i> ${fields['Lokasi'] || ''}</p><p class="detail"><i class="fas fa-calendar-alt"></i> ${formattedDate} &nbsp; <i class="fas fa-clock"></i> ${formattedTime}</p><p class="event-description" style="display:none;">${fields['Deskripsi'] || ''}</p><div class="price-buy"><p class="price">Mulai dari<br><span>Rp ${Number(fields['Harga'] || 0).toLocaleString('id-ID')}</span></p><button class="btn-buy" data-event-id="${record.id}">Beli</button></div></div>`;
                    eventGrid.appendChild(eventCard);
                });
            }
            setupEventListeners();
        } catch (error)
        {
            console.error("Gagal mengambil event dari Airtable:", error);
            eventGrid.innerHTML = '<p>Gagal memuat event. Cek kembali konfigurasi Anda.</p>';
        }
    }

    // ## FUNGSI FORMULIR DINAMIS (VERSI STABIL) ##
    async function generateFormFields(eventId) {
        const formContainer = document.getElementById('registrationForm');
        formContainer.innerHTML = '<p>Memuat formulir...</p>';
        const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Form%20Fields?sort%5B0%5D%5Bfield%5D=Urutan&sort%5B0%5D%5Bdirection%5D=asc`;

        try {
            const response = await fetch(url, { headers: { 'Authorization': `Bearer ${AIRTABLE_API_KEY}` } });
            if (!response.ok) throw new Error(`Error: ${response.status}`);
            const data = await response.json();
            const allFormFields = data.records;
            const fields = allFormFields.filter(record => record.fields.Event && record.fields.Event.includes(eventId));

            if (fields.length === 0) {
                formContainer.innerHTML = '<p>Formulir pendaftaran untuk event ini belum dikonfigurasi.</p>';
                return;
            }

            let formHTML = '';
            fields.forEach(record => {
                const field = record.fields;
                const fieldId = field['Field Label'].replace(/[^a-zA-Z0-9]/g, ''); 
                
                // Kembali ke struktur input sederhana tanpa validasi khusus
                formHTML += `
                <div class="form-group floating-label">
                    <input type="${field['Field Type'].toLowerCase()}" id="${fieldId}" name="${field['Field Label']}" ${field['Is Required'] ? 'required' : ''} placeholder=" ">
                    <label for="${fieldId}">${field['Field Label']}</label>
                </div>`;
            });
            formHTML += `<button type="submit" id="submitBtn" class="btn-primary">Kirim Pendaftaran</button>`;
            formContainer.innerHTML = formHTML;

        } catch (error) {
            console.error("Gagal mengambil field formulir:", error);
            formContainer.innerHTML = '<p>Gagal memuat formulir. Coba lagi nanti.</p>';
        }
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
        
        document.querySelectorAll('.btn-buy').forEach(button => {
            button.addEventListener('click', () => {
                const eventId = button.dataset.eventId;
                const eventData = allEvents.find(event => event.id === eventId);
                if (eventData) {
                    openModal(eventData);
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

    // --- LOGIKA MODAL ---
    const modal = document.getElementById('eventModal');
    const closeButton = document.querySelector('.close-button');
    const showFormButton = document.getElementById('showFormButton');
    const detailView = document.getElementById('detailView');
    const formView = document.getElementById('formView');
    const modalEventTitle = document.getElementById('modalEventTitle');
    const formEventTitle = document.getElementById('formEventTitle');
    const registrationForm = document.getElementById('registrationForm');
    const modalEventImage = document.getElementById('modalEventImage');
    const modalEventDescription = document.getElementById('modalEventDescription');
    const feedbackModal = document.getElementById('feedbackModal');
    const closeFeedbackBtn = document.getElementById('closeFeedbackBtn');
    
    function showFeedbackModal(status, title, message) {
        if (!feedbackModal) return;
        const feedbackContent = feedbackModal.querySelector('.feedback-content');
        const feedbackIcon = feedbackModal.querySelector('.feedback-icon i');
        const feedbackTitle = document.getElementById('feedbackTitle');
        const feedbackMessage = document.getElementById('feedbackMessage');
        feedbackContent.className = 'feedback-content ' + status;
        feedbackIcon.className = status === 'success' ? 'fas fa-check-circle' : 'fas fa-times-circle';
        feedbackTitle.textContent = title;
        feedbackMessage.textContent = message;
        feedbackModal.classList.add('visible');
    }
    if (closeFeedbackBtn) {
        closeFeedbackBtn.addEventListener('click', () => feedbackModal.classList.remove('visible'));
    }

    function openModal(eventData) {
        const fields = eventData.fields;
        modalEventTitle.textContent = `Detail: ${fields['Nama Event']}`;
        formEventTitle.textContent = fields['Nama Event'];
        modalEventImage.src = fields['Gambar Event'][0].url;
        modalEventDescription.textContent = fields['Deskripsi'] || '';
        modal.dataset.currentEventId = eventData.id;
        modal.style.display = 'block';
        detailView.style.display = 'block';
        formView.style.display = 'none';
        registrationForm.innerHTML = '';
    };
    
    if (showFormButton) {
        showFormButton.addEventListener('click', () => {
            const eventId = modal.dataset.currentEventId;
            if (eventId) {
                detailView.style.display = 'none';
                formView.style.display = 'block';
                generateFormFields(eventId);
            } else {
                alert("Terjadi kesalahan, ID event tidak ditemukan.");
            }
        });
    }

    const closeModal = () => { if (modal) modal.style.display = 'none'; };
    if (closeButton) closeButton.addEventListener('click', closeModal);
    window.addEventListener('click', (event) => { if (event.target === modal) closeModal(); });

    // --- LOGIKA PENGIRIMAN FORM (VERSI STABIL) ---
    if (registrationForm) {
        registrationForm.addEventListener('submit', (event) => {
            event.preventDefault();
            const form = event.target;

            // Validasi sederhana bawaan browser
            if (!form.checkValidity()) {
                form.reportValidity();
                return;
            }

            const submitBtn = form.querySelector('#submitBtn');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Mengirim...';
            const formData = new FormData(form);
            
            // Format +62 akan kita tambahkan kembali di langkah selanjutnya
            // Validasi email juga akan ditambahkan kembali

            formData.append('Event Name', formEventTitle.textContent);
            
            fetch(SCRIPT_URL, { method: 'POST', body: formData })
                .then(response => response.json())
                .then(data => {
                    closeModal();
                    if (data.result === 'success') {
                        showFeedbackModal('success', 'Pendaftaran Berhasil', 'Tiket akan segera dikirim melalui email. Periksa juga folder spam.');
                    } else {
                        showFeedbackModal('error', 'Pendaftaran Gagal', data.message || 'Terjadi kesalahan yang tidak diketahui.');
                    }
                })
                .catch(error => {
                    console.error('Error!', error.message);
                    closeModal();
                    showFeedbackModal('error', 'Pendaftaran Gagal', 'Terjadi masalah koneksi. Pastikan URL Script sudah benar dan coba lagi.');
                })
                .finally(() => {
                    // Tombol akan dibuat ulang, jadi tidak perlu reset
                });
        });
    }
    
    // --- Inisialisasi Aplikasi ---
    renderEvents();
});
