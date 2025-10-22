// GANTI SELURUH ISI FILE checkout.js DENGAN KODE FINAL INI
document.addEventListener('DOMContentLoaded', () => {
    // --- KONFIGURASI PENTING ---
    const SCRIPT_URL = '/api/create-transaction';
    const saveDataToSheet = async (paymentResult, customerData, itemDetails) => {
      try {
        const payload = {
          order_id: paymentResult.order_id,
          transaction_status: paymentResult.transaction_status,
          gross_amount: paymentResult.gross_amount,
          customer_details: customerData,
          item_details: itemDetails
        };

        // Memanggil fungsi backend baru kita di Netlify
        await fetch('/api/save-to-airtable', {
          method: 'POST',
          body: JSON.stringify(payload),
          headers: { 'Content-Type': 'application/json' },
        });

        console.log("Data berhasil dikirim ke Airtable.");

      } catch (error) {
        console.error("Gagal mengirim data ke Airtable:", error);
      }
    };
    
    const checkoutMain = document.getElementById('checkout-main');
    let eventDetails = {};
    let ticketTypes = [];
    let formFields = [];

    const injectStyles = () => {
        const style = document.createElement('style');
        style.textContent = `
            .checkout-body { display: flex; flex-wrap: wrap; gap: 32px; align-items: flex-start; }
            .event-details-column { flex: 1; min-width: 320px; }
            .purchase-form-column { flex: 1; min-width: 320px; }
            .event-poster-container { width: 100%; aspect-ratio: 4 / 5; border-radius: 16px; overflow: hidden; margin-bottom: 24px; background-color: #f0f2f5; box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
            .event-poster { width: 100%; height: 100%; object-fit: cover; display: block; }
            .ticket-option label { display: flex; align-items: center; gap: 12px; width: 100%; cursor: pointer; }
            .ticket-label-content { display: flex; justify-content: space-between; align-items: center; width: 100%; }
            .ticket-option input[type="radio"] { display: none; }
            .seat-map-image { max-width: 100%; height: auto; display: block; border-radius: 8px; margin-top: 10px; }
            #buyButton.btn-primary { width: 100%; background-color: #007bff; color: white; border: none; padding: 15px 20px; font-size: 16px; font-weight: bold; border-radius: 12px; cursor: pointer; text-align: center; transition: background-color 0.3s ease, transform 0.1s ease; margin-top: 20px; }
            #buyButton.btn-primary:hover { background-color: #0056b3; }
            #buyButton.btn-primary:active { transform: scale(0.98); }
            #buyButton.btn-primary:disabled { background-color: #cccccc; cursor: not-allowed; }
            #confirmPaymentBtn { width: 100%; background-color: #007bff; color: white; border: none; padding: 15px 20px; font-size: 16px; font-weight: bold; border-radius: 12px; cursor: pointer; text-align: center; transition: background-color 0.3s ease, transform 0.1s ease; margin-top: 20px; }
            #confirmPaymentBtn:hover { background-color: #0056b3; }
            #confirmPaymentBtn:active { transform: scale(0.98); }
        `;
        document.head.appendChild(style);
    };

    const initiatePayment = async () => {
        const confirmButton = document.getElementById('confirmPaymentBtn');
        confirmButton.disabled = true;
        confirmButton.textContent = 'Memproses...';

        try {
            const selectedTicket = document.querySelector('input[name="ticket_choice"]:checked');
            const quantity = parseInt(document.getElementById('ticketQuantity').value);
            const price = parseFloat(selectedTicket.dataset.price);
            const adminFee = parseFloat(selectedTicket.dataset.adminFee) || 0;
            const finalTotal = (price + adminFee) * quantity;
            const form = document.getElementById('customer-data-form');
            const formData = new FormData(form);
            const customerData = Object.fromEntries(formData.entries());
            let customerName = '', customerEmail = '', customerPhone = '';
            for (const [key, value] of Object.entries(customerData)) {
                const lowerKey = key.toLowerCase();
                if (lowerKey.includes('nama')) customerName = value;
                else if (lowerKey.includes('email')) customerEmail = value;
                else if (lowerKey.includes('nomor') || lowerKey.includes('telp') || lowerKey.includes('hp')) customerPhone = value;
            }
            if (!customerName || !customerEmail || !customerPhone) {
                throw new Error("Data nama, email, atau nomor tidak ditemukan dalam formulir.");
            }
            const payload = {
                order_id: 'TICKETGO-' + Date.now() + Math.floor(Math.random() * 900 + 100),
                gross_amount: finalTotal,
                item_details: [{ id: selectedTicket.value, price: price + adminFee, quantity: quantity, name: selectedTicket.dataset.name }],
                customer_details: { first_name: customerName, email: customerEmail, phone: '+62' + customerPhone }
            };
            const response = await fetch(SCRIPT_URL, {
                method: 'POST',
                body: JSON.stringify(payload),
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            if (!response.ok) {
                throw new Error(`Server merespons dengan status error: ${response.status}`);
            }
            
            const result = await response.json();

            if (result.error) {
                throw new Error(result.error);
            }
            if (!result.token) {
                throw new Error("Token pembayaran tidak diterima dari server.");
            }

            window.snap.pay(result.token, {
                onSuccess: (paymentResult) => {
                    showFeedback('success', 'Pembayaran Berhasil!', 'Terima kasih! Tiket Anda akan segera dikirimkan.');
                    const customerDetailsForSheet = {
                        first_name: customerName,
                        email: customerEmail,
                        phone: '+62' + customerPhone
                    };
                    const itemDetailsForSheet = {
                        name: selectedTicket.dataset.name,
                        quantity: quantity
                    };
                    saveDataToSheet(paymentResult, customerDetailsForSheet, itemDetailsForSheet);
                },
                onPending: (result) => showFeedback('pending', 'Menunggu Pembayaran', `Selesaikan pembayaran Anda. Status: ${result.transaction_status}`),
                onError: (result) => showFeedback('error', 'Pembayaran Gagal', 'Silakan coba lagi atau gunakan metode pembayaran lain.'),
                onClose: () => {
                    confirmButton.disabled = false;
                    confirmButton.textContent = 'Lanjutkan Pembayaran';
                }
            });

        } catch (error) {
            console.error('Payment initiation error:', error);
            showFeedback('error', 'Terjadi Kesalahan', `Detail: ${error.message}`);
            confirmButton.disabled = false;
            confirmButton.textContent = 'Lanjutkan Pembayaran';
        }
    };

    const showFeedback = (type, title, message) => {
        document.getElementById('reviewModal').style.display = 'none';
        const feedbackModal = document.getElementById('feedbackModal');
        const icon = feedbackModal.querySelector('.fas');
        const content = feedbackModal.querySelector('.feedback-content');
        icon.className = 'fas';
        content.className = 'feedback-content';

        if (type === 'success') {
            icon.classList.add('fa-check-circle');
            content.classList.add('success');
        } else if (type === 'pending') {
            icon.classList.add('fa-hourglass-half');
            content.classList.add('pending');
        } else {
            icon.classList.add('fa-times-circle');
            content.classList.add('error');
        }
        document.getElementById('feedbackTitle').textContent = title;
        document.getElementById('feedbackMessage').textContent = message;
        feedbackModal.style.display = 'flex';
        document.getElementById('closeFeedbackBtn').onclick = () => feedbackModal.style.display = 'none';
    };

    const buildPage = async () => {
        injectStyles();
        const params = new URLSearchParams(window.location.search);
        const eventId = params.get('eventId');
        if (!eventId) {
            checkoutMain.innerHTML = `<p class="error-message">Error: Event ID tidak ditemukan.</p>`;
            return;
        }
        try {
            // Panggil Netlify Function untuk mendapatkan semua data sekaligus
            const response = await fetch(`/api/get-event-details?eventId=${eventId}`);
            const responseSeat = await fetch(`/api/get-event-price`);
            
            if (!response.ok) throw new Error(`Gagal memuat data event: ${response.statusText}`);
            if (!responseSeat.ok) throw new Error(`Gagal memuat seat event: ${responseSeat.statusText}`);
            
            const data = await response.json();
            const dataSeat = await responseSeat.json();
            
            eventDetails = data.eventDetails.fields;
            ticketTypes = data.ticketTypes.records;
            formFields = data.formFields.records;

            dataSeats = dataSeat.seats;

            if (ticketTypes.length === 0) {
                checkoutMain.innerHTML = `<p class="error-message">Tiket belum tersedia untuk event ini.</p>`;
                return;
            }

            renderLayout();
    // Periksa apakah pendaftaran event ditutup
    if (eventDetails['Pendaftaran Dibuka'] !== true) {
        const buyButton = document.getElementById('buyButton');
        if (buyButton) {
            buyButton.textContent = 'Sold Out';
            buyButton.disabled = true;
        }
    }
            attachEventListeners();
            updatePrice();
        } catch (error) {
            console.error('Gagal membangun halaman:', error);
            checkoutMain.innerHTML = `<p class="error-message">Gagal memuat detail event. Error: ${error.message}</p>`;
        }
    };

    const renderLayout = () => {
        let seatMapHTML = eventDetails['Seat_Map'] ? `<div class="form-section seat-map-container"><h3>Peta Kursi</h3><img src="${eventDetails['Seat_Map'][0].url}" alt="Peta Kursi" class="seat-map-image"></div>` : '';
        let seatSelectionHTML = '';
        const seatOptions = eventDetails['Pilihan_Kursi'] ? eventDetails['Pilihan_Kursi'].split('\n').filter(opt => opt.trim() !== '') : [];
        if (seatOptions.length > 0) {
            const seatOptionsContent = seatOptions.map((option, index) => `<div class="ticket-option"><input type="radio" id="seat_option_${index}" name="Pilihan_Kursi" value="${option.trim()}" required><label for="seat_option_${index}"><div class="ticket-label-content"><span class="ticket-name">${option.trim()}</span></div></label></div>`).join('');
            seatSelectionHTML = `<div class="form-section"><h3>1. Pilih Kursi</h3><div id="seatOptionsContainer">${seatOptionsContent}</div></div>`;
        }

        let ticketOptionsHTML = ticketTypes.map(record => `<div class="ticket-option"><input type="radio" id="${record.id}" name="ticket_choice" value="${record.id}" data-price="${record.fields.Price}" data-name="${record.fields.Name}" data-admin-fee="${record.fields.Admin_Fee || 0}"><label for="${record.id}"><div class="ticket-label-content"><span class="ticket-name">${record.fields.Name}</span><span class="ticket-price">Rp ${record.fields.Price.toLocaleString('id-ID')}</span></div></label></div>`).join('');

        let formFieldsHTML = formFields.map(record => {
            const { FieldLabel, FieldType, Is_Required } = record.fields;
            if (!FieldLabel || !FieldType) return '';
            const fieldId = `form_${FieldLabel.replace(/[^a-zA-Z0-9]/g, '')}`;
            let placeholder = FieldLabel;
            if (FieldLabel.toLowerCase().includes('nama')) placeholder = 'Sesuai Identitas (KTP, SIM, dsb)';
            else if (FieldType.toLowerCase() === 'email') placeholder = 'contoh@gmail.com';

            if (FieldType.toLowerCase() === 'tel') {
                return `<div class="form-group"><label for="${fieldId}">${FieldLabel}</label><div class="phone-input-group"><span class="phone-prefix">+62</span><input type="tel" id="${fieldId}" name="${FieldLabel}" ${Is_Required ? 'required' : ''} placeholder="8123456789"></div></div>`;
            }
            return `<div class="form-group"><label for="${fieldId}">${FieldLabel}</label><input type="${FieldType.toLowerCase()}" id="${fieldId}" name="${FieldLabel}" ${Is_Required ? 'required' : ''} placeholder="${placeholder}"></div>`;
        }).join('');

        const layoutHTML = `
            <div class="checkout-body">
                <div class="event-details-column">
                    <div class="event-poster-container"><img src="${eventDetails['Poster']?.[0]?.url || ''}" alt="Poster" class="event-poster"></div>
                    <div class="event-info"><h1>${eventDetails['NamaEvent'] || ''}</h1><p class="event-description">${eventDetails.Deskripsi || ''}</p></div>
                </div>
                <div class="purchase-form-column">
                    <div class="purchase-form">
                        ${seatMapHTML}
                        <form id="customer-data-form" novalidate>
                            ${seatSelectionHTML}
                            <div class="form-section"><h3>2. Pilih Jenis Tiket</h3><div id="ticketOptionsContainer">${ticketOptionsHTML}</div></div>
                            <div class="form-section"><h3>3. Pilih Jumlah Beli</h3><div class="quantity-selector"><button type="button" id="decreaseQty" disabled>-</button><input type="number" id="ticketQuantity" value="1" min="1" readonly><button type="button" id="increaseQty" disabled>+</button></div></div>
                            <div class="form-section"><h3>4. Isi Data Diri</h3>${formFieldsHTML}</div>
                        </form>
                        <div class="form-section price-review-section"><h3>Ringkasan Harga</h3><div id="price-review"><p>Pilih tiket untuk melihat harga.</p></div></div>
                        <button id="buyButton" class="btn-primary" disabled>Beli Tiket</button>
                    </div>
                </div>
            </div>`;
        checkoutMain.innerHTML = layoutHTML;
    };

    const attachEventListeners = () => {
        const buyButton = document.getElementById('buyButton');
        const checkButtonState = () => {
            const seatSelected = document.querySelector('input[name="Pilihan_Kursi"]:checked');
            const ticketSelected = document.querySelector('input[name="ticket_choice"]:checked');
            const seatOptionsExist = document.querySelector('input[name="Pilihan_Kursi"]');
            buyButton.disabled = seatOptionsExist ? !(seatSelected && ticketSelected) : !ticketSelected;
        };

        document.querySelectorAll('input[name="Pilihan_Kursi"], input[name="ticket_choice"]').forEach(r => r.addEventListener('change', () => { checkButtonState(); updatePrice(); }));
        document.querySelectorAll('input[name="ticket_choice"]').forEach(r => r.addEventListener('change', () => document.getElementById('increaseQty').disabled = false));
        
        const qtyInput = document.getElementById('ticketQuantity');
        document.getElementById('increaseQty').addEventListener('click', () => { qtyInput.value++; document.getElementById('decreaseQty').disabled = false; updatePrice(); });
        document.getElementById('decreaseQty').addEventListener('click', () => { if (qtyInput.value > 1) qtyInput.value--; if (qtyInput.value == 1) document.getElementById('decreaseQty').disabled = true; updatePrice(); });
        document.getElementById('buyButton').addEventListener('click', showReviewModal);

        const emailInput = document.querySelector('input[type="email"]');
        if (emailInput) {
            let errorEl = document.createElement('small');
            errorEl.style.cssText = 'color:#e53e3e; display:none; margin-top:4px;';
            emailInput.parentElement.appendChild(errorEl);
            emailInput.addEventListener('input', () => {
                const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput.value);
                emailInput.style.borderColor = (emailInput.value && !isValid) ? '#e53e3e' : '';
                errorEl.textContent = (emailInput.value && !isValid) ? 'Format email tidak valid.' : '';
                errorEl.style.display = (emailInput.value && !isValid) ? 'block' : 'none';
                if (emailInput.value && !isValid) buyButton.disabled = true; else checkButtonState();
            });
        }

        const phoneInput = document.querySelector('input[type="tel"]');
        if (phoneInput) phoneInput.addEventListener('input', e => e.target.value = e.target.value.replace(/[^0-9]/g, ''));
        
        const reviewModal = document.getElementById('reviewModal');
        if (reviewModal) {
            reviewModal.querySelector('.close-button')?.addEventListener('click', () => reviewModal.style.display = 'none');
            window.addEventListener('click', e => { if (e.target == reviewModal) reviewModal.style.display = 'none'; });
        }
        document.getElementById('confirmPaymentBtn').addEventListener('click', initiatePayment);
    };

    const updatePrice = () => {
        const selectedTicket = document.querySelector('input[name="ticket_choice"]:checked');
        const quantity = parseInt(document.getElementById('ticketQuantity').value);
        const reviewContainer = document.getElementById('price-review');
        if (!selectedTicket) {
            reviewContainer.innerHTML = '<p>Pilih tiket untuk melihat harga.</p>';
            return;
        }
        const total = parseFloat(selectedTicket.dataset.price) * quantity;
        reviewContainer.innerHTML = `<div class="review-row"><span>${selectedTicket.dataset.name} x ${quantity}</span><span>Rp ${total.toLocaleString('id-ID')}</span></div>`;
    };

    const showReviewModal = () => {
        const form = document.getElementById('customer-data-form');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        
        const selectedTicket = document.querySelector('input[name="ticket_choice"]:checked');
        const quantity = parseInt(document.getElementById('ticketQuantity').value);
        const hargaSeat = dataSeats.find(seat => seat.nama === selectedTicket);
        const price = parseFloat(selectedTicket.dataset.price);
        const adminFee = parseFloat(selectedTicket.dataset.adminFee) || 0;
        const subtotal = hargaSeat.price * quantity;
        const totalAdminFee = adminFee * quantity;
        const finalTotal = subtotal + totalAdminFee;

        let formDataHTML = '';
        for (let [key, value] of new FormData(form).entries()) {
            let label = key;
            if (key === 'ticket_choice') {
                label = 'Jenis Tiket'; value = selectedTicket.dataset.name;
            } else if (key.toLowerCase().includes('nomor')) {
                value = `+62${value}`;
            } else if (key === 'Pilihan_Kursi') {
                label = 'Pilihan Kursi';
            }
            formDataHTML += `<div class="review-row"><span>${label}</span><span>${value}</span></div>`;
        }

        document.getElementById('reviewDetails').innerHTML = `
            <h4>Detail Pesanan:</h4>
            <div class="review-row"><span>Tiket</span><span>${selectedTicket.dataset.name} x ${quantity}</span></div>
            <div class="review-row"><span>Subtotal Tiket</span><span>Rp ${subtotal.toLocaleString('id-ID')}</span></div>
            <div class="review-row"><span>Biaya Admin</span><span>Rp ${totalAdminFee.toLocaleString('id-ID')}</span></div>
            <div class="review-row total"><span>Total Pembayaran</span><span>Rp ${finalTotal.toLocaleString('id-ID')}</span></div>
            <hr><h4>Data Pemesan:</h4>${formDataHTML}`;
        
        document.getElementById('reviewModal').style.display = 'flex';
    };
    
    buildPage();
});












