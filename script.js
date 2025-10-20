// Event listener ini akan menunggu seluruh konten halaman (termasuk gambar) selesai dimuat.
window.addEventListener('load', () => {
    const preloader = document.getElementById('preloader');
    const mainContent = document.getElementById('main-content');
    
    // Beri sedikit jeda agar transisi fade-out terlihat mulus.
    setTimeout(() => {
        if(preloader) {
            preloader.classList.add('fade-out');
        }
        if(mainContent) {
            mainContent.classList.remove('hidden');
        }
    }, 2000); 

    // Setelah preloader disembunyikan, baru jalankan semua fungsi utama website.
    initializeApp();
});


// Semua kode Anda yang sudah ada sekarang dibungkus di dalam fungsi ini.
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
        const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Events?sort%5B0%5D%5Bfield%5D=Prioritas&sort%5B0%5D%5Bdirection%5D=desc&sort%5B1%5D%5Bfield%5D=Urutan&sort%5B1%5D%5Bdirection%5D=asc&sort%5B2%5D%5Bfield%5D=Waktu&sort%5B2%5D%5Bdirection%5D=asc`;

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
                            <p class="event-description" style="display:none;">${fields['Deskripsi'] || ''}</p>
                            <div class="price-buy">
                                <p class="price">Mulai dari<br><span>Rp ${Number(fields['Harga'] || 0).toLocaleString('id-ID')}</span></p>
                                <button class="btn-buy" data-event-id="${record.id}">Beli</button>
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
        const scrollLeftBtn = document.getElementById('scrollLeftBtn');
        const scrollRightBtn = document.getElementById('scrollRightBtn');
        const threshold = 4;
        if (allEvents.length > threshold) {
            eventGrid.classList.add('two-rows');
            if(scrollLeftBtn) scrollLeftBtn.style.display = 'block';
            if(scrollRightBtn) scrollRightBtn.style.display = 'block';
        } else {
            eventGrid.classList.remove('two-rows');
            if(scrollLeftBtn) scrollLeftBtn.style.display = 'none';
            if(scrollRightBtn) scrollRightBtn.style.display = 'none';
        }

        for (const record of allEvents) {
            const eventId = record.id;
            const fields = record.fields;
            const eventName = fields['Nama Event'];
            const quota = fields['Kuota'];
            const isRegistrationOpen = fields['Pendaftaran Dibuka'] === true;
            const eventCard = document.querySelector(`.event-card[data-event-id="${eventId}"]`);
            
            if (!eventCard) continue;
            
            const buyButton = eventCard.querySelector('.btn-buy');

            if (!isRegistrationOpen) {
                buyButton.textContent = 'Ditutup';
                buyButton.disabled = true;
                buyButton.classList.add('disabled');
                continue;
            }

            if (typeof quota !== 'undefined') {
                try {
                    const response = await fetch(`${SCRIPT_URL}?event=${encodeURIComponent(eventName)}`);
                    const data = await response.json();

                    if (data.status === 'success') {
                        const currentCount = data.count;
                        if (currentCount >= quota) {
                            buyButton.textContent = 'Pendaftaran Penuh';
                            buyButton.disabled = true;
                            buyButton.classList.add('disabled');
                        }
                    }
                } catch (error) {
                    console.error(`Gagal memeriksa kuota untuk ${eventName}:`, error);
                }
            }
        }
    }

    // ## FUNGSI FORMULIR DINAMIS BARU ##
    async function generateFormFields(eventId, eventData) {
        const formContainer = document.getElementById('registrationForm');
        const ticketOptionsContainer = document.getElementById('ticketOptionsContainer');
        formContainer.innerHTML = '<p>Memuat formulir...</p>';
        ticketOptionsContainer.innerHTML = '';
    
        const eventName = eventData.fields['Nama Event'];
        const adminFee = eventData.fields['Admin Fee'] || 0;
    
        try {
            // 1. Ambil Field Form (Nama, Email, dll)
            const formFieldsResponse = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Form%20Fields?filterByFormula=FIND(%22${encodeURIComponent(eventName)}%22%2C+ARRAYJOIN(Event))`, { headers: { 'Authorization': `Bearer ${AIRTABLE_API_KEY}` } });
            if (!formFieldsResponse.ok) throw new Error(`Error fetching form fields: ${formFieldsResponse.status}`);
            const formFieldsData = await formFieldsResponse.json();
            
            // 2. Ambil Tipe Tiket untuk event ini
            const ticketTypesResponse = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Ticket%20Types?filterByFormula=FIND(%22${encodeURIComponent(eventName)}%22%2C+ARRAYJOIN({Nama Event}))`, { headers: { 'Authorization': `Bearer ${AIRTABLE_API_KEY}` } });
            if (!ticketTypesResponse.ok) throw new Error(`Error fetching ticket types: ${ticketTypesResponse.status}`);
            const ticketTypesData = await ticketTypesResponse.json();
    
            // 3. Ambil Bundles untuk event ini
            const bundlesResponse = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Bundles?filterByFormula=FIND(%22${encodeURIComponent(eventName)}%22%2C+ARRAYJOIN({Nama Event}))`, { headers: { 'Authorization': `Bearer ${AIRTABLE_API_KEY}` } });
            if (!bundlesResponse.ok) throw new Error(`Error fetching bundles: ${bundlesResponse.status}`);
            const bundlesData = await bundlesResponse.json();
    
            // Render Opsi Tiket dan Bundle
            ticketTypesData.records.forEach(ticket => {
                const t = ticket.fields;
                ticketOptionsContainer.innerHTML += `
                    <div class="ticket-option">
                        <input type="radio" id="${ticket.id}" name="ticket_choice" value="${ticket.id}" data-price="${t.Price}" data-name="${t.Name}" data-qty="1">
                        <label for="${ticket.id}">${t.Name} - <strong>Rp ${t.Price.toLocaleString('id-ID')}</strong></label>
                    </div>
                `;
            });
            bundlesData.records.forEach(bundle => {
                const b = bundle.fields;
                // Asumsi harga normal tiket tunggal ada di record pertama Tipe Tiket
                const singleTicketPrice = ticketTypesData.records.length > 0 ? ticketTypesData.records[0].fields.Price : 0;
                const normalPrice = singleTicketPrice * b['Ticket Quantity'];
                const savings = normalPrice - b['Bundle Price'];
    
                ticketOptionsContainer.innerHTML += `
                    <div class="ticket-option">
                        <input type="radio" id="${bundle.id}" name="ticket_choice" value="${bundle.id}" data-price="${b['Bundle Price']}" data-name="${b.Name}" data-qty="${b['Ticket Quantity']}" data-savings="${savings > 0 ? savings : 0}">
                        <label for="${bundle.id}">${b.Name} (${b['Ticket Quantity']} Tiket) - <strong>Rp ${b['Bundle Price'].toLocaleString('id-ID')}</strong></label>
                    </div>
                `;
            });

            // Render Form Input Data Diri
            let formHTML = '';
            const fields = formFieldsData.records.filter(record => record.fields.Event && record.fields.Event.includes(eventId));
            if (fields.length === 0) {
                formContainer.innerHTML = '<p>Formulir pendaftaran untuk event ini belum dikonfigurasi.</p>';
                return;
            }
            fields.forEach(record => {
                const field = record.fields;
                const fieldId = field['Field Label'].replace(/[^a-zA-Z0-9]/g, ''); 
                const fieldLabel = field['Field Label'];
                const fieldType = field['Field Type'].toLowerCase();
                const isRequired = field['Is Required'] ? 'required' : '';
                if (fieldType === 'tel') {
                    formHTML += `
                    <div class="form-group">
                        <label for="${fieldId}" class="static-label">${fieldLabel}</label>
                        <div class="phone-input-group">
                            <span class="phone-prefix">+62</span>
                            <input type="tel" id="${fieldId}" name="${fieldLabel}" ${isRequired}>
                        </div>
                        <span class="error-message"></span>
                    </div>`;
                } else if (fieldType === 'email') {
                    formHTML += `
                    <div class="form-group floating-label">
                        <input type="email" id="${fieldId}" name="${fieldLabel}" ${isRequired} placeholder=" ">
                        <label for="${fieldId}">${fieldLabel}</label>
                        <span class="error-message"></span>
                    </div>`;
                } else {
                    formHTML += `
                    <div class="form-group floating-label">
                        <input type="text" id="${fieldId}" name="${fieldLabel}" ${isRequired} placeholder=" ">
                        <label for="${fieldId}">${fieldLabel}</label>
                    </div>`;
                }
            });
            formContainer.innerHTML = formHTML;
    
            // Tambahkan event listener untuk mengupdate ringkasan
            document.querySelectorAll('input[name="ticket_choice"]').forEach(radio => {
                radio.addEventListener('change', () => updatePaymentOverview(adminFee));
            });
            updatePaymentOverview(adminFee); // Inisialisasi ringkasan
            attachDynamicValidators(formContainer);
    
        } catch (error) {
            console.error("Gagal membangun formulir:", error);
            formContainer.innerHTML = `<p>Gagal memuat formulir: ${error.message}. Coba lagi nanti.</p>`;
        }
    }

    // ## FUNGSI BARU UNTUK UPDATE RINGKASAN PEMBAYARAN ##
    function updatePaymentOverview(adminFee) {
        const selectedOption = document.querySelector('input[name="ticket_choice"]:checked');
        const subtotalEl = document.getElementById('summarySubtotal');
        const savingsEl = document.getElementById('summarySavings');
        const savingsRow = document.querySelector('.summary-row.savings');
        const adminFeeEl = document.getElementById('summaryAdminFee');
        const totalEl = document.getElementById('summaryTotal');
    
        if (!selectedOption) {
            subtotalEl.textContent = 'Rp 0';
            adminFeeEl.textContent = 'Rp 0';
            totalEl.textContent = 'Rp 0';
            savingsRow.style.display = 'none';
            return;
        }
    
        const subtotal = parseFloat(selectedOption.dataset.price);
        const savings = parseFloat(selectedOption.dataset.savings || 0);
        const total = subtotal + adminFee;
    
        subtotalEl.textContent = `Rp ${subtotal.toLocaleString('id-ID')}`;
        adminFeeEl.textContent = `Rp ${adminFee.toLocaleString('id-ID')}`;
        totalEl.textContent = `Rp ${total.toLocaleString('id-ID')}`;
    
        if (savings > 0) {
            savingsEl.textContent = `- Rp ${savings.toLocaleString('id-ID')}`;
            savingsRow.style.display = 'flex';
        } else {
            savingsRow.style.display = 'none';
        }
    }
    
    // ## FUNGSI UNTUK MENEMPELKAN VALIDATOR ##
    function attachDynamicValidators(form) {
        const emailInput = form.querySelector('input[type="email"]');
        const phoneInput = form.querySelector('input[type="tel"]');
        
        if (emailInput) {
            const emailError = emailInput.parentElement.querySelector('.error-message');
            emailInput.addEventListener('input', () => {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (emailInput.value === '' || emailRegex.test(emailInput.value)) {
                    emailInput.classList.remove('input-error');
                    if (emailError) emailError.classList.remove('visible');
                } else {
                    emailInput.classList.add('input-error');
                    if (emailError) {
                        emailError.textContent = 'Gunakan format email yang valid.';
                        emailError.classList.add('visible');
                    }
                }
            });
        }

        if (phoneInput) {
            const phoneError = phoneInput.parentElement.parentElement.querySelector('.error-message');
            phoneInput.addEventListener('input', () => {
                phoneInput.value = phoneInput.value.replace(/[^0-9]/g, '');
                const phoneGroup = phoneInput.closest('.phone-input-group');
                if (phoneInput.value.startsWith('0')) {
                    if (phoneError) {
                        phoneError.textContent = 'Gunakan format 8xx (tanpa 0 di depan)';
                        phoneError.classList.add('visible');
                    }
                    if (phoneGroup) phoneGroup.classList.add('input-error');
                } else {
                    if (phoneError) {
                        phoneError.textContent = '';
                        phoneError.classList.remove('visible');
                    }
                    if (phoneGroup) phoneGroup.classList.remove('input-error');
                }
            });
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
    const closeButton = modal ? modal.querySelector('.close-button') : null;
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
        modal.dataset.eventData = JSON.stringify(eventData); // Simpan semua data event
        modal.style.display = 'block';
        detailView.style.display = 'block';
        formView.style.display = 'none';
        registrationForm.innerHTML = '';
    };
    
    if (showFormButton) {
        showFormButton.addEventListener('click', () => {
            const eventId = modal.dataset.currentEventId;
            const eventData = JSON.parse(modal.dataset.eventData);
            if (eventId && eventData) {
                detailView.style.display = 'none';
                formView.style.display = 'block';
                generateFormFields(eventId, eventData);
            } else {
                alert("Terjadi kesalahan, ID event tidak ditemukan.");
            }
        });
    }

    const closeModal = () => { if (modal) modal.style.display = 'none'; };
    if (closeButton) closeButton.addEventListener('click', closeModal);
    window.addEventListener('click', (event) => { if (event.target === modal) closeModal(); });

    // --- LOGIKA PENGIRIMAN FORM BARU (UNTUK MIDTRANS) ---
    document.getElementById('payButton').addEventListener('click', async () => {
        const payButton = document.getElementById('payButton');
        // 1. Validasi form
        if (!registrationForm.checkValidity()) {
            registrationForm.reportValidity();
            return;
        }
    
        // 2. Ambil semua data yang diperlukan
        const selectedOption = document.querySelector('input[name="ticket_choice"]:checked');
        if (!selectedOption) {
            alert('Silakan pilih jenis tiket terlebih dahulu.');
            return;
        }
        
        payButton.disabled = true;
        payButton.textContent = 'Memproses...';
    
        const formData = new FormData(registrationForm);
        // Membuat objek dari FormData untuk kemudahan akses
        const formObject = Object.fromEntries(formData.entries());
        
        // Cari nama field dinamis untuk Nama, Email, dan Telepon
        const nameKey = Object.keys(formObject).find(k => k.toLowerCase().includes('nama')) || 'Nama Lengkap';
        const emailKey = Object.keys(formObject).find(k => k.toLowerCase().includes('email')) || 'Email';
        const phoneKey = Object.keys(formObject).find(k => k.toLowerCase().includes('telepon') || k.toLowerCase().includes('whatsapp')) || 'Nomor Telepon';

        const customerDetails = {
            first_name: formObject[nameKey],
            email: formObject[emailKey],
            phone: '+62' + formObject[phoneKey],
        };
        
        const summaryAdminFeeText = document.getElementById('summaryAdminFee').textContent;
        const summaryTotalText = document.getElementById('summaryTotal').textContent;

        const orderDetails = {
            event_name: document.getElementById('formEventTitle').textContent,
            item_name: selectedOption.dataset.name,
            quantity: parseInt(selectedOption.dataset.qty),
            price: parseFloat(selectedOption.dataset.price),
            admin_fee: parseFloat(summaryAdminFeeText.replace(/[^0-9]/g, '')),
            total: parseFloat(summaryTotalText.replace(/[^0-9]/g, ''))
        };
    
        // 3. Kirim ke Backend Anda untuk membuat transaksi Midtrans
        try {
            // GANTI DENGAN URL BACKEND ANDA YANG SUDAH DI-DEPLOY
            const response = await fetch('URL_BACKEND_ANDA/create-transaction', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderDetails, customerDetails })
            });

            if (!response.ok) {
                 const errorData = await response.json();
                 throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
    
            if (data.token) {
                // 4. Buka pop-up pembayaran Midtrans Snap
                window.snap.pay(data.token, {
                    onSuccess: function(result){
                      console.log('Payment successful!', result);
                      closeModal();
                      showFeedbackModal('success', 'Pembayaran Berhasil!', 'E-ticket akan segera dikirim ke email Anda.');
                      // Di sini Anda bisa menambahkan logika untuk mengirim data ke Google Apps Script
                      // setelah pembayaran dikonfirmasi.
                    },
                    onPending: function(result){
                      console.log('Payment pending.', result);
                      closeModal();
                      showFeedbackModal('pending', 'Menunggu Pembayaran', 'Selesaikan pembayaran Anda sebelum batas waktu berakhir.');
                    },
                    onError: function(result){
                      console.error('Payment error!', result);
                      closeModal();
                      showFeedbackModal('error', 'Pembayaran Gagal', 'Terjadi kesalahan saat memproses pembayaran.');
                    },
                    onClose: function(){
                        // Re-enable tombol jika user menutup popup tanpa membayar
                        payButton.disabled = false;
                        payButton.textContent = 'Bayar Sekarang';
                    }
                });
            } else {
                throw new Error('Token pembayaran tidak diterima dari server.');
            }
    
        } catch (error) {
            console.error('Error saat membuat transaksi:', error);
            showFeedbackModal('error', 'Gagal Terhubung', 'Tidak dapat terhubung ke server pembayaran. Coba lagi nanti.');
        } finally {
            // Biarkan tombol disable, akan di-handle oleh onClose callback dari Midtrans
        }
    });

    // --- Inisialisasi Aplikasi ---
    renderEvents();
}

