    const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzDevdyhUaABFeN0_T-bY_D_oi7bEg12H7azjh7KuQY1l6uXn6z7fyHeTYG0j_bnpshhg/exec';

    if (SCRIPT_URL === 'https://script.google.com/macros/s/AKfycbzDevdyhUaABFeN0_T-bY_D_oi7bEg12H7azjh7KuQY1l6uXn6z7fyHeTYG0j_bnpshhg/exec' || SCRIPT_URL === '') 

    // ... (Kode initializeDefaultEvent, carousel, renderEvents, setupEventListeners tidak berubah) ...
    function initializeDefaultEvent() {
        if (!localStorage.getItem('events')) {
            const astuseraEvent = [{
                title: "Astusera", image: "assets/event1.jpg", location: "Auditorium SMK 8 Surakarta", date: "7 Sep 2025", time: "13:00", price: "50000", tag: "Pentas Seni", description: "Ini adalah deskripsi default untuk Astusera. Saksikan penampilan spektakuler dalam perayaan seni dan budaya tahunan!"
            }];
            localStorage.setItem('events', JSON.stringify(astuseraEvent));
        }
    }
    initializeDefaultEvent();
    const slides = document.querySelectorAll('.slide');
    if (slides.length > 0) {
        const prevBtn = document.getElementById('prevBtn'); const nextBtn = document.getElementById('nextBtn'); let currentSlide = 0; function showSlide(index) { slides.forEach(slide => slide.classList.remove('active-slide')); slides[index].classList.add('active-slide'); } function nextSlide() { currentSlide = (currentSlide + 1) % slides.length; showSlide(currentSlide); } function prevSlide() { currentSlide = (currentSlide - 1 + slides.length) % slides.length; showSlide(currentSlide); } prevBtn.addEventListener('click', prevSlide); nextBtn.addEventListener('click', nextSlide); setInterval(nextSlide, 5000); showSlide(currentSlide);
    }
    const eventGrid = document.getElementById('eventGrid');
    function renderEvents() {
        eventGrid.innerHTML = ''; const events = JSON.parse(localStorage.getItem('events')) || []; const scrollLeftBtn = document.getElementById('scrollLeftBtn'); const scrollRightBtn = document.getElementById('scrollRightBtn'); const eventCount = events.length; const threshold = 4; if (eventCount > threshold) { eventGrid.classList.add('two-rows'); scrollLeftBtn.classList.add('visible'); scrollRightBtn.classList.add('visible'); } else { eventGrid.classList.remove('two-rows'); scrollLeftBtn.classList.remove('visible'); scrollRightBtn.classList.remove('visible'); } if (events.length === 0) { eventGrid.innerHTML = '<p>Belum ada event yang tersedia.</p>'; } else { events.forEach(eventData => { const eventCard = document.createElement('div'); eventCard.className = 'event-card'; eventCard.innerHTML = `<div class="card-image"><img src="${eventData.image}" alt="${eventData.title}"><span class="tag festival">${eventData.tag}</span></div><div class="card-content"><h3 class="event-title">${eventData.title}</h3><p class="detail"><i class="fas fa-map-marker-alt"></i> ${eventData.location}</p><p class="detail"><i class="fas fa-calendar-alt"></i> ${eventData.date} &nbsp; <i class="fas fa-clock"></i> ${eventData.time}</p><p class="event-description" style="display:none;">${eventData.description}</p><div class="price-buy"><p class="price">Mulai dari<br><span>Rp ${Number(eventData.price).toLocaleString('id-ID')}</span></p><button class="btn-buy" data-event="${eventData.title}">Beli</button></div></div>`; eventGrid.appendChild(eventCard); }); }
        setupEventListeners();
    }
    function setupEventListeners() {
        const searchInput = document.getElementById('searchInput'); const eventCards = document.querySelectorAll('.event-card'); if(searchInput) { searchInput.addEventListener('input', () => { const searchTerm = searchInput.value.toLowerCase(); eventCards.forEach(card => { const eventTitle = card.querySelector('.event-title').textContent.toLowerCase(); card.style.display = eventTitle.includes(searchTerm) ? 'flex' : 'none'; }); }); }
        document.querySelectorAll('.btn-buy').forEach(button => { button.addEventListener('click', () => { const eventCard = button.closest('.event-card'); const eventName = button.dataset.event; const eventImage = eventCard.querySelector('.card-image img').src; const eventDescription = eventCard.querySelector('.event-description').textContent; openModal(eventName, eventImage, eventDescription); }); }); 
        const scrollWrapper = document.querySelector('.event-grid-wrapper'); const scrollLeftBtn = document.getElementById('scrollLeftBtn'); const scrollRightBtn = document.getElementById('scrollRightBtn'); if(scrollWrapper) { scrollLeftBtn.addEventListener('click', () => { const scrollAmount = scrollWrapper.clientWidth * 0.8; scrollWrapper.scrollBy({ left: -scrollAmount, behavior: 'smooth' }); }); scrollRightBtn.addEventListener('click', () => { const scrollAmount = scrollWrapper.clientWidth * 0.8; scrollWrapper.scrollBy({ left: scrollAmount, behavior: 'smooth' }); }); }
    }
    const searchIcon = document.getElementById('searchIcon'); const searchInput = document.getElementById('searchInput'); const eventsSection = document.getElementById('events'); let hasScrolledOnInput = false; if (searchIcon) { searchIcon.addEventListener('click', (event) => { event.preventDefault(); searchInput.classList.toggle('active'); searchInput.focus(); if (!searchInput.classList.contains('active')) hasScrolledOnInput = false; }); } if (searchInput) { searchInput.addEventListener('input', () => { if (!hasScrolledOnInput) { eventsSection.scrollIntoView({ behavior: 'smooth' }); hasScrolledOnInput = true; } }); }
    const adminLink = document.getElementById('adminLink'); if (adminLink) { adminLink.addEventListener('click', (e) => { e.preventDefault(); const password = prompt("Masukkan password admin:"); if (password === "uns2025") { window.location.href = 'admin.html'; } else if (password) { alert("Password salah!"); } }); }

    // --- Kode Modal, Validasi, dan Notifikasi ---
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
    
    // ## FUNGSI BARU: VALIDASI NOMOR TELEPON ##
    phoneInput.addEventListener('input', () => {
        // Hanya izinkan angka
        phoneInput.value = phoneInput.value.replace(/[^0-9]/g, '');

        if (phoneInput.value.startsWith('0')) {
            phoneError.textContent = 'Gunakan format 8xx (tanpa 0 di depan)';
            phoneError.classList.add('visible');
            phoneInput.classList.add('input-error');
        } else {
            phoneError.classList.remove('visible');
            phoneInput.classList.remove('input-error');
        }
    });

    // ## FUNGSI BARU: VALIDASI EMAIL ##
    function validateEmail() {
        const email = emailInput.value;
        // Regex untuk format email umum yang valid
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        
        if (email === '' || emailRegex.test(email)) {
            emailError.classList.remove('visible');
            emailInput.classList.remove('input-error');
            return true;
        } else {
            // Pesan error baru yang lebih umum
            emailError.textContent = 'Gunakan format email yang lengkap';
            emailError.classList.add('visible');
            emailInput.classList.add('input-error');
            return false;
        }
    }
    emailInput.addEventListener('input', validateEmail);

    // ## FUNGSI BARU: MENAMPILKAN POP-UP NOTIFIKASI ##
    const feedbackModal = document.getElementById('feedbackModal');
    const feedbackContent = feedbackModal.querySelector('.feedback-content');
    const feedbackIcon = feedbackModal.querySelector('.feedback-icon i');
    const feedbackTitle = document.getElementById('feedbackTitle');
    const feedbackMessage = document.getElementById('feedbackMessage');
    const closeFeedbackBtn = document.getElementById('closeFeedbackBtn');

    function showFeedbackModal(status, title, message) {
        feedbackContent.className = 'feedback-content ' + status; // 'success' atau 'error'
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
            
            // Cek validasi sebelum mengirim
            const isEmailValid = validateEmail();
            const isPhoneValid = !phoneInput.value.startsWith('0') && phoneInput.value.length > 0;
            if (!isEmailValid || !isPhoneValid) {
                return; // Hentikan pengiriman jika tidak valid
            }

            const submitBtn = document.getElementById('submitBtn');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Mengirim...';
            
            // Format nomor telepon dengan +62 sebelum mengirim
            const formData = new FormData(registrationForm);
            formData.set('phone', '+62' + phoneInput.value); // Ganti nomor telepon dengan format lengkap
            formData.append('event', formEventTitle.textContent);
            
            fetch(SCRIPT_URL, { method: 'POST', body: formData })
                .then(response => response.json())
                .then(data => {
                    closeModal(); // Tutup modal pendaftaran
                    if (data.result === 'success') {
                        // Ambil email yang diinput oleh pengguna
                        const userEmail = emailInput.value; 
                        
                        // Buat pesan baru yang dinamis
                        const successMessage = `Silahkan cek email (${userEmail}) secara berkala, tiket akan segera dikirim. Periksa juga tab spam.`;
                        
                        // Tampilkan notifikasi dengan pesan baru
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

    renderEvents();
;