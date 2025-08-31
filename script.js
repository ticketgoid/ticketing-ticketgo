document.addEventListener('DOMContentLoaded', () => {

    // --- KONFIGURASI PENTING ---
    // Masukkan detail Airtable dan Google Script Anda di sini.
    const AIRTABLE_API_KEY = 'patL6WezaL3PYo6wP.e1c40c7a7b38a305974867e3973993737d5ae8f5892e4498c3473f2774d3664c';
    const AIRTABLE_BASE_ID = 'appXLPTB00V3gUH2e';
    const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzDevdyhUaABFeN0_T-bY_D_oi7bEg12H7azjh7KuQY1l6uXn6z7fyHeTYG0j_bnpshhg/exec';

    // --- Logika Carousel Hero ---
    const slides = document.querySelectorAll('.slide');
    if (slides.length > 0) {
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');
        let currentSlide = 0;
        function showSlide(index) { slides.forEach(slide => slide.classList.remove('active-slide')); slides[index].classList.add('active-slide'); }
        function nextSlide() { currentSlide = (currentSlide + 1) % slides.length; showSlide(currentSlide); }
        function prevSlide() { currentSlide = (currentSlide - 1 + slides.length) % slides.length; showSlide(currentSlide); }
        nextBtn.addEventListener('click', nextSlide);
        prevBtn.addEventListener('click', prevSlide);
        setInterval(nextSlide, 5000);
        showSlide(currentSlide);
    }
    
    // --- FUNGSI UTAMA: MENGAMBIL DAN MENAMPILKAN EVENT DARI AIRTABLE ---
    const eventGrid = document.getElementById('eventGrid');
    async function renderEvents() {
        eventGrid.innerHTML = '<p>Sedang memuat event...</p>';
        // Nama tabel di Airtable adalah "Events"
        const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Events`;

        try {
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${AIRTABLE_API_KEY}`
                }
            });
            if (!response.ok) {
                throw new Error(`Error: ${response.status} - ${response.statusText}`);
            }
            const data = await response.json();
            const events = data.records;

            eventGrid.innerHTML = ''; // Kosongkan grid sebelum memuat

            // Logika untuk layout dinamis (1 atau 2 baris)
            const scrollLeftBtn = document.getElementById('scrollLeftBtn');
            const scrollRightBtn = document.getElementById('scrollRightBtn');
            const threshold = 4;
            if (events.length > threshold) {
                eventGrid.classList.add('two-rows');
                scrollLeftBtn.classList.add('visible');
                scrollRightBtn.classList.add('visible');
            } else {
                eventGrid.classList.remove('two-rows');
                scrollLeftBtn.classList.remove('visible');
                scrollRightBtn.classList.remove('visible');
            }

            if (events.length === 0) {
                eventGrid.innerHTML = '<p>Belum ada event yang tersedia.</p>';
            } else {
                events.forEach(record => {
                    const fields = record.fields;
                    
                    if (!fields['Nama Event'] || !fields['Gambar Event']) {
                        return; // Lewati baris ini jika nama atau gambar kosong
                    }
                    
                    // Mengambil dan memformat Tanggal & Waktu dari satu field "Waktu"
                    const eventDate = new Date(fields['Waktu']);
                    const formattedDate = eventDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
                    const formattedTime = eventDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false }).replace('.',':');

                    const eventCard = document.createElement('div');
                    eventCard.className = 'event-card';
                    eventCard.innerHTML = `
                        <div class="card-image">
                            <img src="${fields['Gambar Event'][0].url}" alt="${fields['Nama Event']}">
                            <span class="tag festival">${fields['Tag'] || ''}</span>
                        </div>
                        <div class="card-content">
                            <h3 class="event-title">${fields['Nama Event']}</h3>
                            <p class="detail"><i class="fas fa-map-marker-alt"></i> ${fields['Lokasi'] || ''}</p>
                            <p class="detail"><i class="fas fa-calendar-alt"></i> ${formattedDate} &nbsp; <i class="fas fa-clock"></i> ${formattedTime}</p>
                            <p class="event-description" style="display:none;">${fields['Deskripsi'] || ''}</p>
                            <div class="price-buy">
                                <p class="price">Mulai dari<br><span>Rp ${Number(fields['Harga'] || 0).toLocaleString('id-ID')}</span></p>
                                <button class="btn-buy" data-event="${fields['Nama Event']}">Beli</button>
                            </div>
                        </div>`;
                    eventGrid.appendChild(eventCard);
                });
            }
            setupEventListeners();
        } catch (error) {
            console.error("Gagal mengambil event dari Airtable:", error);
            eventGrid.innerHTML = '<p>Gagal memuat event. Cek kembali konfigurasi API Key dan Base ID Anda.</p>';
        }
    }

    function setupEventListeners() {
        const searchInput = document.getElementById('searchInput');
        const eventCards = document.querySelectorAll('.event-card');
        if(searchInput) {
            searchInput.addEventListener('input', () => {
                const searchTerm = searchInput.value.toLowerCase();
                eventCards.forEach(card => {
                    const eventTitle = card.querySelector('.event-title').textContent.toLowerCase();
                    card.style.display = eventTitle.includes(searchTerm) ? 'flex' : 'none';
                });
            });
        }
        
        document.querySelectorAll('.btn-buy').forEach(button => {
            button.addEventListener('click', () => {
                const eventCard = button.closest('.event-card');
                const eventName = button.dataset.event;
                const eventImage = eventCard.querySelector('.card-image img').src;
                const eventDescription = eventCard.querySelector('.event-description').textContent;
                openModal(eventName, eventImage, eventDescription);
            });
        });
        
        const scrollWrapper = document.querySelector('.event-grid-wrapper');
        const scrollLeftBtn = document.getElementById('scrollLeftBtn');
        const scrollRightBtn = document.getElementById('scrollRightBtn');
        if(scrollWrapper) {
            scrollLeftBtn.addEventListener('click', () => {
                const scrollAmount = scrollWrapper.clientWidth * 0.8;
                scrollWrapper.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
            });
            scrollRightBtn.addEventListener('click', () => {
                const scrollAmount = scrollWrapper.clientWidth * 0.8;
                scrollWrapper.scrollBy({ left: scrollAmount, behavior: 'smooth' });
            });
        }
    }

    const searchIcon = document.getElementById('searchIcon');
    const searchInput = document.getElementById('searchInput');
    const eventsSection = document.getElementById('events');
    let hasScrolledOnInput = false;
    if (searchIcon) {
        searchIcon.addEventListener('click', (event) => {
            event.preventDefault();
            searchInput.classList.toggle('active');
            searchInput.focus();
            if (!searchInput.classList.contains('active')) hasScrolledOnInput = false;
        });
    }
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            if (!hasScrolledOnInput) {
                eventsSection.scrollIntoView({ behavior: 'smooth' });
                hasScrolledOnInput = true;
            }
        });
    }

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
    const phoneInput = document.getElementById('phone');
    const phoneError = document.getElementById('phoneError');
    const emailInput = document.getElementById('email');
    const emailError = document.getElementById('emailError');
    
    phoneInput.addEventListener('input', () => {
        phoneInput.value = phoneInput.value.replace(/[^0-9]/g, '');
        if (phoneInput.value.startsWith('0')) {
            phoneError.textContent = 'Gunakan format 8xx (tanpa 0 di depan)';
            phoneError.classList.add('visible');
            phoneInput.closest('.phone-input-group').classList.add('input-error');
        } else {
            phoneError.classList.remove('visible');
            phoneInput.closest('.phone-input-group').classList.remove('input-error');
        }
    });

    function validateEmail() {
        const email = emailInput.value;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (email === '' || emailRegex.test(email)) {
            emailError.classList.remove('visible');
            emailInput.classList.remove('input-error');
            return true;
        } else {
            emailError.textContent = 'Gunakan format email yang lengkap';
            emailError.classList.add('visible');
            emailInput.classList.add('input-error');
            return false;
        }
    }
    emailInput.addEventListener('input', validateEmail);

    const feedbackModal = document.getElementById('feedbackModal');
    const feedbackContent = feedbackModal.querySelector('.feedback-content');
    const feedbackIcon = feedbackModal.querySelector('.feedback-icon i');
    const feedbackTitle = document.getElementById('feedbackTitle');
    const feedbackMessage = document.getElementById('feedbackMessage');
    const closeFeedbackBtn = document.getElementById('closeFeedbackBtn');

    function showFeedbackModal(status, title, message) {
        feedbackContent.className = 'feedback-content ' + status;
        feedbackIcon.className = status === 'success' ? 'fas fa-check-circle' : 'fas fa-times-circle';
        feedbackTitle.textContent = title;
        feedbackMessage.textContent = message;
        feedbackModal.classList.add('visible');
    }
    closeFeedbackBtn.addEventListener('click', () => feedbackModal.classList.remove('visible'));

    function openModal(eventName, eventImage, eventDescription) {
        modalEventTitle.textContent = `Detail: ${eventName}`;
        formEventTitle.textContent = eventName;
        modalEventImage.src = eventImage;
        modalEventDescription.textContent = eventDescription;
        modal.style.display = 'block';
        detailView.style.display = 'block';
        formView.style.display = 'none';
    };

    const closeModal = () => { if (modal) modal.style.display = 'none'; };
    if (showFormButton) showFormButton.addEventListener('click', () => { detailView.style.display = 'none'; formView.style.display = 'block'; });
    if (closeButton) closeButton.addEventListener('click', closeModal);
    window.addEventListener('click', (event) => { if (event.target === modal) closeModal(); });

    if (registrationForm) {
        registrationForm.addEventListener('submit', (event) => {
            event.preventDefault();
            const isEmailValid = validateEmail();
            const isPhoneValid = !phoneInput.value.startsWith('0') && phoneInput.value.length > 8;
            if (!isPhoneValid) {
                 phoneError.textContent = 'Nomor telepon tidak valid';
                 phoneError.classList.add('visible');
                 phoneInput.closest('.phone-input-group').classList.add('input-error');
            }
            if (!isEmailValid || !isPhoneValid) { return; }

            const submitBtn = document.getElementById('submitBtn');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Mengirim...';
            
            const formData = new FormData(registrationForm);
            formData.set('phone', '+62' + phoneInput.value);
            formData.append('event', formEventTitle.textContent);
            
            fetch(SCRIPT_URL, { method: 'POST', body: formData })
                .then(response => response.json())
                .then(data => {
                    closeModal();
                    if (data.result === 'success') {
                        const userEmail = emailInput.value;
                        const successMessage = `Silahkan cek email (${userEmail}) secara berkala, tiket akan segera dikirim. Periksa juga tab spam.`;
                        showFeedbackModal('success', 'Pendaftaran Berhasil', successMessage);
                        registrationForm.reset();
                    } else {
                        if (data.error === 'duplicate') {
                            showFeedbackModal('error', 'Pendaftaran Gagal', data.message);
                        } else {
                            throw new Error(data.error || 'Terjadi kesalahan.');
                        }
                    }
                })
                .catch(error => {
                    console.error('Error!', error.message);
                    closeModal();
                    showFeedbackModal('error', 'Pendaftaran Gagal', 'Terjadi masalah koneksi. Pastikan URL Script sudah benar dan coba lagi.');
                })
                .finally(() => {
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Kirim Pendaftaran';
                });
        });
    }
    
    // Hapus link dan file admin lama karena tidak digunakan lagi
    const adminLink = document.getElementById('adminLink');
    if (adminLink) {
        adminLink.style.display = 'none'; // Sembunyikan link admin
    }

    renderEvents();
});
