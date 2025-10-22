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

      await fetch('/api/save-to-airtable', {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' },
      });

      console.log("✅ Data berhasil dikirim ke Airtable.");
    } catch (error) {
      console.error("❌ Gagal mengirim data ke Airtable:", error);
    }
  };

  const checkoutMain = document.getElementById('checkout-main');
  let eventDetails = {};
  let ticketTypes = [];
  let formFields = [];

  const injectStyles = () => {
    const style = document.createElement('style');
    style.textContent = `
      /* --- Gaya Tambahan untuk Quantity Selector per Tiket --- */
      .ticket-option label { flex-wrap: wrap; cursor: pointer; }
      .quantity-selector-wrapper { 
        display: none; /* Sembunyi secara default */
        width: 100%; 
        padding-top: 1rem; 
        margin-top: 0.75rem; 
        border-top: 1px solid #f0f0f0;
      }
      .quantity-selector-wrapper.visible {
        display: block; /* Tampil saat tiket dipilih */
      }
      .quantity-selector {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        justify-content: flex-end; /* Posisi di kanan */
      }
      .quantity-selector p {
        margin-right: auto;
        font-weight: 600;
        font-size: 0.9rem;
      }
       .quantity-selector button {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        border: 1px solid #e5e7eb;
        background-color: var(--white);
        font-size: 1.2rem;
        font-weight: 600;
        color: var(--gray-text);
        cursor: pointer;
        transition: all 0.2s;
    }
     .quantity-selector button:hover:not(:disabled) {
        background-color: var(--teal);
        border-color: var(--teal);
        color: var(--white);
    }
    .quantity-selector button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
     .quantity-selector input {
        width: 40px;
        height: 32px;
        text-align: center;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        font-size: 1rem;
        font-weight: 600;
        -moz-appearance: textfield;
    }
      
      /* --- Gaya Lainnya --- */
      .checkout-body { display: flex; flex-wrap: wrap; gap: 32px; align-items: flex-start; }
      .event-details-column { flex: 1; min-width: 320px; }
      .purchase-form-column { flex: 1; min-width: 320px; }
      .event-poster-container { width: 100%; aspect-ratio: 4 / 5; border-radius: 16px; overflow: hidden; margin-bottom: 24px; background-color: #f0f2f5; box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
      .event-poster { width: 100%; height: 100%; object-fit: cover; display: block; }
      .ticket-option .ticket-label-content { display: flex; justify-content: space-between; align-items: center; width: 100%; }
      .ticket-option input[type="radio"] { display: none; }
      .seat-map-image { max-width: 100%; height: auto; display: block; border-radius: 8px; margin-top: 10px; }
      #buyButton.btn-primary, #confirmPaymentBtn {
        width: 100%; background-color: #007bff; color: white; border: none;
        padding: 15px 20px; font-size: 16px; font-weight: bold; border-radius: 12px;
        cursor: pointer; text-align: center; transition: background-color 0.3s ease, transform 0.1s ease;
        margin-top: 20px;
      }
      #buyButton.btn-primary:hover, #confirmPaymentBtn:hover { background-color: #0056b3; }
      #buyButton.btn-primary:active, #confirmPaymentBtn:active { transform: scale(0.98); }
      #buyButton.btn-primary:disabled { background-color: #cccccc; cursor: not-allowed; }
    `;
    document.head.appendChild(style);
  };

  const initiatePayment = async () => {
    const confirmButton = document.getElementById('confirmPaymentBtn');
    confirmButton.disabled = true;
    confirmButton.textContent = 'Memproses...';

    try {
      const selectedTicketInput = document.querySelector('input[name="ticket_choice"]:checked');
      if (!selectedTicketInput) throw new Error("Tiket belum dipilih.");

      const quantity = getCurrentQuantity();
      const selectedTicketId = selectedTicketInput.value;
      const seatSelected = document.querySelector('input[name="Pilihan_Kursi"]:checked');
      const seatName = seatSelected ? seatSelected.value : null;

      const selectedTicketRecord = ticketTypes.find(t => t.id === selectedTicketId);
      const fields = selectedTicketRecord?.fields || {};
      const name = fields.Name || 'Tiket Tanpa Nama';
      const priceField = fields.Price || 0;
      const adminFeeField = fields.Admin_Fee || 0;
      const hasDiscount = fields.Discount === true;

      let seatData = { price: 0 };
      if (seatName) {
        try {
          const response = await fetch(`/api/get-event-price?seat=${encodeURIComponent(seatName)}&qty=${quantity}`);
          if (response.ok) {
            seatData = await response.json();
          } else {
            console.warn('⚠️ Gagal fetch harga kursi dari Airtable:', response.status);
          }
        } catch (err) {
          console.error('❌ Error fetching seat price:', err);
        }
      }

      const discountPrice = parseInt(priceField.toString().replace(/[^0-9]/g, '')) || 0;
      const adminFee = parseInt(adminFeeField.toString().replace(/[^0-9]/g, '')) || 0;

      let discountedPrice = 0;
      if (hasDiscount) {
        discountedPrice = Math.max(0, seatData.price - discountPrice);
      } else {
        discountedPrice = seatData.price;
      }

      const subtotal = discountedPrice * quantity;
      const totalAdminFee = adminFee * quantity;
      const finalTotal = subtotal + totalAdminFee;

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
        throw new Error("Data nama, email, atau nomor telepon tidak lengkap.");
      }

      const payload = {
        order_id: 'TICKETGO-' + Date.now() + Math.floor(Math.random() * 900 + 100),
        gross_amount: finalTotal,
        item_details: [{
          id: selectedTicketId,
          price: discountedPrice + adminFee,
          quantity: quantity,
          name: name
        }],
        customer_details: {
          first_name: customerName,
          email: customerEmail,
          phone: '+62' + customerPhone
        }
      };

      const response = await fetch(SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) throw new Error(`Server error: ${response.status}`);
      const result = await response.json();

      if (result.error) throw new Error(result.error);
      if (!result.token) throw new Error("Token pembayaran tidak diterima dari server.");

      window.snap.pay(result.token, {
        onSuccess: (paymentResult) => {
          showFeedback('success', 'Pembayaran Berhasil!', 'Terima kasih! Tiket Anda akan segera dikirimkan.');
          saveDataToSheet(paymentResult, {
            first_name: customerName,
            email: customerEmail,
            phone: '+62' + customerPhone
          }, { name, quantity });
        },
        onPending: (res) => showFeedback('pending', 'Menunggu Pembayaran', `Status: ${res.transaction_status}`),
        onError: () => showFeedback('error', 'Pembayaran Gagal', 'Silakan coba lagi.'),
        onClose: () => {
          confirmButton.disabled = false;
          confirmButton.textContent = 'Lanjutkan Pembayaran';
        }
      });

    } catch (error) {
      console.error('❌ Payment initiation error:', error);
      showFeedback('error', 'Terjadi Kesalahan', `Detail: ${error.message}`);
      const confirmButton = document.getElementById('confirmPaymentBtn');
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
      const response = await fetch(`/api/get-event-details?eventId=${eventId}`);
      if (!response.ok) throw new Error(`Gagal memuat data event: ${response.statusText}`);
      const data = await response.json();
      eventDetails = data.eventDetails.fields;
      ticketTypes = data.ticketTypes.records;
      formFields = data.formFields.records;

      if (ticketTypes.length === 0) {
        checkoutMain.innerHTML = `<p class="error-message">Tiket belum tersedia untuk event ini.</p>`;
        return;
      }
      renderLayout();
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

    let ticketOptionsHTML = ticketTypes.map(record => {
      const { Name, Price, Admin_Fee, Show_Price, Discount, jumlahbeli } = record.fields;
      const name = Name || 'Tiket Tanpa Nama';
      const priceField = Price || '';
      const adminFeeField = Admin_Fee || 0;
      const showPrice = Show_Price === true;
      const hasDiscount = Discount === true;
      const canChooseQuantity = jumlahbeli === true;

      const numericPrice = priceField ? parseInt(priceField.toString().replace(/[^0-9]/g, '')) : 0;
      const finalPrice = hasDiscount ? 0 : numericPrice;

      const formattedPrice = showPrice && numericPrice
        ? hasDiscount
          ? `<span style="text-decoration: line-through; color: #888;">Rp ${numericPrice.toLocaleString('id-ID')}</span> <span style="color: #e53935; font-weight: bold;">Rp ${finalPrice.toLocaleString('id-ID')}</span>`
          : `Rp ${numericPrice.toLocaleString('id-ID')}`
        : '&nbsp;';

      const quantitySelectorHTML = canChooseQuantity ? `
        <div class="quantity-selector-wrapper" data-ticket-id="${record.id}">
          <div class="quantity-selector">
            <p>Jumlah Beli:</p>
            <button type="button" class="decrease-qty-btn" disabled>-</button>
            <input type="number" class="ticket-quantity-input" value="1" min="1" readonly>
            <button type="button" class="increase-qty-btn">+</button>
          </div>
        </div>
      ` : '';

      return `
        <div class="ticket-option">
          <input 
            type="radio" 
            id="${record.id}" 
            name="ticket_choice" 
            value="${record.id}" 
            data-price="${finalPrice}" 
            data-name="${name}" 
            data-admin-fee="${adminFeeField ? parseInt(adminFeeField.toString().replace(/[^0-9]/g, '')) : 0}"
            data-can-choose-quantity="${canChooseQuantity}">
          <label for="${record.id}">
            <div class="ticket-label-content">
              <span class="ticket-name">${name}</span>
              <span class="ticket-price">${formattedPrice}</span>
            </div>
            ${quantitySelectorHTML}
          </label>
        </div>`;
    }).join('');

    let formFieldsHTML = formFields.map(record => {
      const { FieldLabel, FieldType, Is_Required } = record.fields;
      if (!FieldLabel || !FieldType) return '';
      const fieldId = `form_${FieldLabel.replace(/[^a-zA-Z0-9]/g, '')}`;
      let placeholder = FieldLabel;
      if (FieldLabel.toLowerCase().includes('nama')) placeholder = 'Sesuai Identitas (KTP, SIM, dsb)';
      else if (FieldType.toLowerCase() === 'email') placeholder = 'contoh@gmail.com';

      if (FieldType.toLowerCase() === 'tel') {
        return `
          <div class="form-group">
            <label for="${fieldId}">${FieldLabel}</label>
            <div class="phone-input-group">
              <span class="phone-prefix">+62</span>
              <input type="tel" id="${fieldId}" name="${FieldLabel}" ${Is_Required ? 'required' : ''} placeholder="8123456789">
            </div>
          </div>`;
      }

      return `
        <div class="form-group">
          <label for="${fieldId}">${FieldLabel}</label>
          <input type="${FieldType.toLowerCase()}" id="${fieldId}" name="${FieldLabel}" ${Is_Required ? 'required' : ''} placeholder="${placeholder}">
        </div>`;
    }).join('');

    const layoutHTML = `
      <div class="checkout-body">
        <div class="event-details-column">
          <div class="event-poster-container">
            <img src="${eventDetails['Poster']?.[0]?.url || ''}" alt="Poster" class="event-poster">
          </div>
          <div class="event-info">
            <h1>${eventDetails['NamaEvent'] || ''}</h1>
            <p class="event-description">${eventDetails.Deskripsi || ''}</p>
          </div>
        </div>
        <div class="purchase-form-column">
          <div class="purchase-form">
            ${seatMapHTML}
            <form id="customer-data-form" novalidate>
              ${seatSelectionHTML}
              <div class="form-section">
                <h3>2. Pilih Jenis Tiket</h3>
                <div id="ticketOptionsContainer">${ticketOptionsHTML}</div>
              </div>
              <div class="form-section">
                <h3>3. Isi Data Diri</h3>
                ${formFieldsHTML}
              </div>
            </form>
            <div class="form-section price-review-section">
              <h3>Ringkasan Harga</h3>
              <div id="price-review"><p>Pilih tiket untuk melihat harga.</p></div>
            </div>
            <button id="buyButton" class="btn-primary" disabled>Beli Tiket</button>
          </div>
        </div>
      </div>`;
    checkoutMain.innerHTML = layoutHTML;
  };
  
  const getCurrentQuantity = () => {
    const selectedTicket = document.querySelector('input[name="ticket_choice"]:checked');
    if (!selectedTicket) return 1;

    if (selectedTicket.dataset.canChooseQuantity === 'true') {
        const wrapper = selectedTicket.closest('.ticket-option').querySelector('.quantity-selector-wrapper');
        const qtyInput = wrapper.querySelector('.ticket-quantity-input');
        return parseInt(qtyInput.value);
    }
    
    return 1; // Default jika tidak bisa memilih jumlah
  };

  const attachEventListeners = () => {
    const buyButton = document.getElementById('buyButton');
    const checkButtonState = () => {
      const seatSelected = document.querySelector('input[name="Pilihan_Kursi"]:checked');
      const ticketSelected = document.querySelector('input[name="ticket_choice"]:checked');
      const seatOptionsExist = document.querySelector('input[name="Pilihan_Kursi"]');
      buyButton.disabled = seatOptionsExist ? !(seatSelected && ticketSelected) : !ticketSelected;
    };

    document.querySelectorAll('input[name="Pilihan_Kursi"]').forEach(r => r.addEventListener('change', () => { checkButtonState(); updatePrice(); }));

    document.querySelectorAll('input[name="ticket_choice"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            document.querySelectorAll('.quantity-selector-wrapper').forEach(wrapper => {
                wrapper.classList.remove('visible');
            });
            const selectedRadio = e.target;
            if (selectedRadio.dataset.canChooseQuantity === 'true') {
                const wrapper = selectedRadio.closest('.ticket-option').querySelector('.quantity-selector-wrapper');
                if (wrapper) {
                    wrapper.classList.add('visible');
                }
            }
            checkButtonState();
            updatePrice();
        });
    });

    const ticketOptionsContainer = document.getElementById('ticketOptionsContainer');
    ticketOptionsContainer.addEventListener('click', e => {
        const qtyInput = e.target.closest('.quantity-selector')?.querySelector('.ticket-quantity-input');
        if (!qtyInput) return;

        const currentVal = parseInt(qtyInput.value);
        const decreaseBtn = e.target.closest('.decrease-qty-btn');
        const increaseBtn = e.target.closest('.increase-qty-btn');
        
        if (increaseBtn) {
            qtyInput.value = currentVal + 1;
        } else if (decreaseBtn && currentVal > 1) {
            qtyInput.value = currentVal - 1;
        }

        const newDecreaseBtn = qtyInput.parentElement.querySelector('.decrease-qty-btn');
        newDecreaseBtn.disabled = parseInt(qtyInput.value) <= 1;
        
        updatePrice();
    });

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
    reviewModal.querySelector('.close-button')?.addEventListener('click', () => reviewModal.classList.remove('visible'));
    window.addEventListener('click', e => { if (e.target == reviewModal) reviewModal.classList.remove('visible'); });
    }
    document.getElementById('confirmPaymentBtn').addEventListener('click', initiatePayment);
  };

  const updatePrice = async () => {
    const selectedTicket = document.querySelector('input[name="ticket_choice"]:checked');
    const seatSelected = document.querySelector('input[name="Pilihan_Kursi"]:checked');
    const seatName = seatSelected ? seatSelected.value : null;
    const quantity = getCurrentQuantity();
    const reviewContainer = document.getElementById('price-review');

    if (!selectedTicket) {
      reviewContainer.innerHTML = '<p>Pilih tiket untuk melihat harga.</p>';
      return;
    }

    let seatData = { price: 0 };
    if (seatName) {
      try {
        const response = await fetch(`/api/get-event-price?seat=${encodeURIComponent(seatName)}&qty=${quantity}`);
        if (response.ok) {
          seatData = await response.json();
        } else {
          console.warn('Failed to fetch seat price from Airtable:', response.status);
        }
      } catch (err) {
        console.error('Error fetching seat price:', err);
      }
    }

    const selectedTicketId = selectedTicket.value;
    const selectedTicketRecord = ticketTypes.find(t => t.id === selectedTicketId);
    const fields = selectedTicketRecord?.fields || {};
    const discountPriceField = fields.Price || 0;
    const hasDiscount = fields.Discount === true;
    const adminFee = parseFloat(selectedTicket.dataset.adminFee) || 0;

    const discountPrice = parseInt(discountPriceField.toString().replace(/[^0-9]/g, '')) || 0;
    
    let discountedPrice = 0;
    if (hasDiscount) {
        discountedPrice = Math.max(0, seatData.price - discountPrice);
    } else {
        discountedPrice = seatData.price;
    }

    const subtotal = discountedPrice * quantity;
    const totalAdminFee = adminFee * quantity;
    const finalTotal = subtotal + totalAdminFee;

    reviewContainer.innerHTML = `
        <div class="review-row"><span>${selectedTicket.dataset.name} x ${quantity}</span><span>Rp ${subtotal.toLocaleString('id-ID')}</span></div>
        <div class="review-row"><span>Biaya Admin</span><span>Rp ${totalAdminFee.toLocaleString('id-ID')}</span></div>
        <hr>
        <div class="review-row total"><span><strong>Total</strong></span><span><strong>Rp ${finalTotal.toLocaleString('id-ID')}</strong></span></div>
    `;
  };

  // GANTIKAN SELURUH FUNGSI showReviewModal YANG LAMA DENGAN INI

const showReviewModal = async () => {
    const form = document.getElementById('customer-data-form');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const selectedTicketInput = document.querySelector('input[name="ticket_choice"]:checked');
    if (!selectedTicketInput) {
        return;
    }
    
    const quantity = getCurrentQuantity();
    const seatSelected = document.querySelector('input[name="Pilihan_Kursi"]:checked');
    const seatName = seatSelected ? seatSelected.value : null;
    const selectedTicketId = selectedTicketInput.value;

    const selectedTicketRecord = ticketTypes.find(t => t.id === selectedTicketId);
    const fields = selectedTicketRecord?.fields || {};

    const name = fields.Name || 'Tiket Tanpa Nama';
    const priceField = fields.Price || 0;
    const adminFeeField = fields.Admin_Fee || 0;
    const hasDiscount = fields.Discount === true;

    let seatData = { price: 0 };
    if (seatName) {
        try {
            const response = await fetch(`/api/get-event-price?seat=${encodeURIComponent(seatName)}&qty=${quantity}`);
            if (response.ok) {
                seatData = await response.json();
            } else {
                console.warn('Failed to fetch seat price from Airtable:', response.status);
            }
        } catch (err) {
            console.error('Error fetching seat price:', err);
        }
    }

    const discountPrice = parseInt(priceField.toString().replace(/[^0-9]/g, '')) || 0;
    const adminFee = parseInt(adminFeeField.toString().replace(/[^0-9]/g, '')) || 0;
    let discountedPrice = 0;
    
    if (hasDiscount) {
        discountedPrice = Math.max(0, seatData.price - discountPrice);
    } else {
        discountedPrice = seatData.price;
    }

    const subtotal = discountedPrice * quantity;
    const totalAdminFee = adminFee * quantity;
    const finalTotal = subtotal + totalAdminFee;

    // ### PERUBAHAN UTAMA ADA DI SINI ###
    let formDataHTML = '';
    const ticketName = selectedTicketInput.dataset.name || 'Tidak Dipilih';

    for (let [key, value] of new FormData(form).entries()) {
        let label = key;

        if (key === 'ticket_choice') {
            label = 'Jenis Tiket'; // Mengganti label
            value = ticketName;    // Mengganti value dari ID menjadi nama tiket
        } else if (key.toLowerCase().includes('nomor')) {
            value = `+62${value}`;
        } else if (key === 'Pilihan_Kursi') {
            label = 'Pilihan Kursi';
        }
        
        formDataHTML += `<div class="review-row"><span>${label}</span><span>${value}</span></div>`;
    }
    // ### AKHIR DARI PERUBAHAN ###

    document.getElementById('reviewDetails').innerHTML = `
        <h4>Detail Pesanan:</h4>
        <div class="review-row"><span>Tiket</span><span>${name} x ${quantity}</span></div>
        <div class="review-row"><span>Harga per Tiket</span><span>Rp ${discountedPrice.toLocaleString('id-ID')}</span></div>
        <div class="review-row"><span>Subtotal Tiket</span><span>Rp ${subtotal.toLocaleString('id-ID')}</span></div>
        <div class="review-row"><span>Biaya Admin</span><span>Rp ${totalAdminFee.toLocaleString('id-ID')}</span></div>
        <hr>
        <div class="review-row total"><span><strong>Total Pembayaran</strong></span><span><strong>Rp ${finalTotal.toLocaleString('id-ID')}</strong></span></div>
        <hr><h4>Data Pemesan:</h4>${formDataHTML}
    `;

    document.getElementById('reviewModal').classList.add('visible');
};
  
  buildPage();
});


