document.addEventListener('DOMContentLoaded', () => {

    // --- KONFIGURASI PENTING ---
    // Ganti placeholder di bawah ini dengan data Anda yang sebenarnya.
    const AIRTABLE_API_KEY = 'GANTI_DENGAN_API_KEY_ANDA';
    const AIRTABLE_BASE_ID = 'GANTI_DENGAN_BASE_ID_ANDA';
    const SCRIPT_URL = 'GANTI_DENGAN_URL_SCRIPT_ANDA';

    // Peringatan jika konfigurasi belum diisi.
    if (SCRIPT_URL.startsWith('GANTI') || AIRTABLE_API_KEY.startsWith('GANTI') || AIRTABLE_BASE_ID.startsWith('GANTI')) {
        alert("PENTING: Harap isi detail AIRTABLE_API_KEY, AIRTABLE_BASE_ID, dan SCRIPT_URL di dalam file script.js agar website berfungsi penuh.");
    }

    // --- ELEMEN GLOBAL ---
    const eventGrid = document.getElementById('eventGrid');
    let allEvents = []; // Variabel untuk menyimpan semua data event dari Airtable.

    // --- FUNGSI UTAMA UNTUK MEMUAT DAN MENAMPILKAN EVENT ---
    async function renderEvents() {
        eventGrid.innerHTML = '<p>Sedang memuat event...</p>';
        const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Events`;

        try {
            // 1. Ambil data event dari Airtable
            const response = await fetch(url, { headers: { 'Authorization': `Bearer ${AIRTABLE_API_KEY}` } });
            if (!response.ok) throw new Error(`Airtable Error: ${response.status}`);
            const data = await response.json();
            allEvents = data.records;

            eventGrid.innerHTML = '';
            
            // 2. Buat semua kartu event dan render ke halaman
            allEvents.forEach(record => {
                const fields = record.fields;
                if (!fields['Nama Event'] || !fields['Gambar Event']) return;
                
                const eventDate = new Date(fields['Waktu']);
                const formattedDate = eventDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
                const formattedTime = eventDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false }).replace('.',':');

                const eventCard = document.createElement('div');
                eventCard.className = 'event-card';
                eventCard.setAttribute('data-event-id', record.id); // Simpan ID untuk referensi
                eventCard.innerHTML = `
                    <div class="card-image"><img src="${fields['Gambar Event'][0].url}" alt="${fields['Nama Event']}"><span class="tag festival">${fields['Tag'] || ''}</span></div>
                    <div class="card-content">
                        <h3 class="event-title">${fields['Nama Event']}</h3>
                        <p class="detail"><i class="fas fa-map-marker-alt"></i> ${fields['Lokasi'] || ''}</p>
                        <p class="detail"><i class="fas fa-calendar-alt"></i> ${formattedDate} &nbsp; <i class="fas fa-clock"></i> ${formattedTime}</p>
                        <p class="event-description" style="display:none;">${fields['Deskripsi'] || ''}</p>
                        <div class="price-buy">
                            <p class="price">Mulai dari<br><span>Rp ${Number(fields['Harga'] || 0).toLocaleString('id-ID')}</span></p>
                            <button class="btn-buy" data-event-id="${record.id}">Beli</button>
                        </div>
                    </div>`;
                eventGrid.appendChild(eventCard);
            });

            // 3. Setelah semua kartu ada di halaman, cek kuota untuk masing-masing
            checkAllEventQuotas();
            setupEventListeners();
        } catch (error) {
            console.error("Gagal memuat atau memproses event:", error);
            eventGrid.innerHTML = '<p>Gagal memuat event. Cek kembali konfigurasi Anda.</p>';
        }
    }
    
    // --- FUNGSI UNTUK CEK KUOTA EVENT ---
    async function checkAllEventQuotas() {
        // Logika untuk layout dinamis (1 atau 2 baris)
        const scrollLeftBtn = document.getElementById('scrollLeftBtn');
        const scrollRightBtn = document.getElementById('scrollRightBtn');
        const threshold = 4;
        if (allEvents.length > threshold) {
            eventGrid.classList.add('two-rows');
            scrollLeftBtn.classList.add('visible');
            scrollRightBtn.classList.add('visible');
        } else {
            eventGrid.classList.remove('two-rows');
            scrollLeftBtn.classList.remove('visible');
            scrollRightBtn.classList.remove('visible');
        }

        allEvents.forEach(async (record) => {
            const eventId = record.id;
            const fields = record.fields;
            const eventName = fields['Nama Event'];
            const quota = fields['Kuota'];

            if (typeof quota === 'undefined') return;

            try {
                const response = await fetch(`${SCRIPT_URL}?event=${encodeURIComponent(eventName)}`);
                const data = await response.json();

                if (data.status === 'success') {
                    const currentCount = data.count;
                    const eventCard = document.querySelector(`.event-card[data-event-id="${eventId}"]`);
                    const buyButton = eventCard.querySelector('.btn-buy');
                    
                    if (currentCount >= quota) {
                        buyButton.textContent = 'Pendaftaran Penuh';
                        buyButton.disabled = true;
                        buyButton.classList.add('disabled');
                    }
                }
            } catch (error) {
                console.error(`Gagal memeriksa kuota untuk ${eventName}:`, error);
            }
        });
    }

    // --- FUNGSI UNTUK MENGATUR SEMUA EVENT LISTENER ---
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
                const eventId = button.dataset.eventId;
                const eventData = allEvents.find(event => event.id === eventId);
                openModal(eventData);
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

    // --- FUNGSI LAIN-LAIN (SEARCH, MODAL, FORM, NOTIFIKASI) ---
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

    function openModal(eventData) {
        const fields = eventData.fields;
        modalEventTitle.textContent = `Detail: ${fields['Nama Event']}`;
        modalEventImage.src = fields['Gambar Event'][0].url;
        modalEventDescription.textContent = fields['Deskripsi'] || '';
        formEventTitle.textContent = fields['Nama Event'];
        
        modal.style.display = 'block';
        detailView.style.display = 'block';
        formView.style.display = 'none';
    };
    
    if (showFormButton) {
        showFormButton.addEventListener('click', () => {
            const eventName = formEventTitle.textContent;
            const eventData = allEvents.find(event => event.fields['Nama Event'] === eventName);
            detailView.style.display = 'none';
            formView.style.display = 'block';
            generateFormFields(eventData.id);
        });
    }

    async function generateFormFields(eventId) {
        const formContainer = document.getElementById('registrationForm');
        formContainer.innerHTML = '<p>Memuat formulir...</p>';

        const filterFormula = `FIND('${eventId}', RECORD_ID())`;
        const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Form%20Fields?filterByFormula=${encodeURIComponent(filterFormula)}`;

        try {
            const response = await fetch(url, { headers: { 'Authorization': `Bearer ${AIRTABLE_API_KEY}` } });
            if (!response.ok) throw new Error(`Error: ${response.status}`);
            const data = await response.json();
            const fields = data.records;

            let formHTML = '';
            fields.forEach(record => {
                const field = record.fields;
                const fieldName = field['Field Label'].replace(/\s+/g, '');
                
                formHTML += `
                    <div class="form-group floating-label">
                        <input type="${field['Field Type'].toLowerCase()}" id="${fieldName}" name="${field['Field Label']}" ${field['Is Required'] ? 'required' : ''} placeholder=" ">
                        <label for="${fieldName}">${field['Field Label']}</label>
                    </div>`;
            });
            formHTML += `<button type="submit" id="submitBtn" class="btn-primary">Kirim Pendaftaran</button>`;
            formContainer.innerHTML = formHTML;

        } catch (error) {
            console.error("Gagal mengambil field formulir:", error);
            formContainer.innerHTML = '<p>Gagal memuat formulir. Coba lagi nanti.</p>';
        }
    }

    const closeModal = () => { if (modal) modal.style.display = 'none'; };
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
            formData.append('Event Name', formEventTitle.textContent);
            
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
    
    const adminLink = document.getElementById('adminLink');
    if (adminLink) {
        adminLink.addEventListener('click', (e) => {
            e.preventDefault();
            const password = prompt("Masukkan password admin:");
            if (password === "uns2025") {
                window.location.href = 'admin.html';
            } else if (password) {
                alert("Password salah!");
            }
        });
    }

    renderEvents();
});
