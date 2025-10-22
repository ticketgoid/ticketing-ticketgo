// GANTI SELURUH ISI FILE checkout.js DENGAN KODE FINAL INI
document.addEventListener('DOMContentLoaded', () => {
  const SCRIPT_URL = '/api/create-transaction';
  const checkoutMain = document.getElementById('checkout-main');
  let eventDetails = {}, ticketTypes = [], formFields = [], seatPrices = {};

const saveDataToSheet = async (paymentResult, customerData, itemDetails) => {
    try {
      const payload = {
        // Data yang sudah ada
        order_id: paymentResult.order_id,
        transaction_status: paymentResult.transaction_status,
        gross_amount: paymentResult.gross_amount,
        customer_details: customerData,
        item_details: itemDetails,

        // --- DATA BARU YANG WAJIB DIKIRIM ---
        eventId: eventDetails.id, // ID dari event yang sedang dibuka
        rekapTableName: eventDetails.fields['Tabel Penjualan'] // Nama tabel rekap (misal: 'rona')
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

  const injectStyles = () => {
    const style = document.createElement('style');
    style.textContent = `
      .ticket-option label { flex-wrap: wrap; cursor: pointer; } .quantity-selector-wrapper { display: none; width: 100%; padding-top: 1rem; margin-top: 0.75rem; border-top: 1px solid #f0f0f0; } .quantity-selector-wrapper.visible { display: block; } .quantity-selector { display: flex; align-items: center; gap: 0.5rem; justify-content: flex-end; } .quantity-selector p { margin-right: auto; font-weight: 600; font-size: 0.9rem; } .quantity-selector button { width: 32px; height: 32px; border-radius: 50%; border: 1px solid #e5e7eb; background-color: var(--white); font-size: 1.2rem; font-weight: 600; color: var(--gray-text); cursor: pointer; transition: all 0.2s; } .quantity-selector button:hover:not(:disabled) { background-color: var(--teal); border-color: var(--teal); color: var(--white); } .quantity-selector button:disabled { opacity: 0.5; cursor: not-allowed; } .quantity-selector input { width: 40px; height: 32px; text-align: center; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 1rem; font-weight: 600; -moz-appearance: textfield; } .checkout-body { display: flex; flex-wrap: wrap; gap: 32px; align-items: flex-start; } .event-details-column, .purchase-form-column { flex: 1; min-width: 320px; } .event-poster-container { width: 100%; aspect-ratio: 4 / 5; border-radius: 16px; overflow: hidden; margin-bottom: 24px; background-color: #f0f2f5; box-shadow: 0 4px 12px rgba(0,0,0,0.08); } .event-poster { width: 100%; height: 100%; object-fit: cover; display: block; } .ticket-option .ticket-label-content { display: flex; justify-content: space-between; align-items: center; width: 100%; } .ticket-option input[type="radio"] { display: none; } .seat-map-image { max-width: 100%; height: auto; display: block; border-radius: 8px; margin-top: 10px; } #buyButton, #confirmPaymentBtn { width: 100%; background-color: var(--orange); color: white; border: none; padding: 15px 20px; font-size: 16px; font-weight: bold; border-radius: 12px; cursor: pointer; text-align: center; transition: background-color 0.3s ease, transform 0.1s ease; margin-top: 20px; } #buyButton:hover, #confirmPaymentBtn:hover { background-color: #EA580C; } #buyButton:active, #confirmPaymentBtn:active { transform: scale(0.98); } #buyButton:disabled { background-color: #cccccc; cursor: not-allowed; } .modal { display: none; align-items: center; justify-content: center; position: fixed; z-index: 1000; left: 0; top: 0; width: 100%; height: 100%; overflow-y: auto; background-color: rgba(0, 0, 0, 0.6); padding: 1rem; opacity: 0; visibility: hidden; transition: opacity 0.3s ease, visibility 0.3s ease; } .modal.visible { display: flex; opacity: 1; visibility: visible; } .feedback-modal { display: none; align-items: center; justify-content: center; position: fixed; z-index: 2000; left: 0; top: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.6); } .feedback-modal.visible { display: flex; }
    `;
    document.head.appendChild(style);
  };

  const initiatePayment = async () => {
    const confirmButton = document.getElementById('confirmPaymentBtn');
    confirmButton.disabled = true;
    confirmButton.textContent = 'Memproses...';
    try {
      const selectedTicketInput = document.querySelector('input[name="ticket_choice"]:checked');
      if (!selectedTicketInput || !document.querySelector('input[name="Pilihan_Kursi"]:checked')) {
        throw new Error("Kursi atau tiket belum dipilih.");
      }
      const { finalTotal, pricePerTicket, quantity } = calculatePrice();
      const selectedTicketRecord = ticketTypes.find(t => t.id === selectedTicketInput.value);
      const name = selectedTicketRecord?.fields.Name || 'Tiket Tanpa Nama';
      const form = document.getElementById('customer-data-form');
      let customerName = '', customerEmail = '', customerPhone = '';
      new FormData(form).forEach((value, key) => {
        const lowerKey = key.toLowerCase();
        if (lowerKey.includes('nama')) customerName = value;
        else if (lowerKey.includes('email')) customerEmail = value;
        else if (lowerKey.includes('nomor') || lowerKey.includes('telp') || lowerKey.includes('hp')) customerPhone = value;
      });
      if (!customerName || !customerEmail || !customerPhone) {
        throw new Error("Data nama, email, atau nomor telepon tidak lengkap.");
      }
      const adminFee = parseInt(selectedTicketRecord?.fields.Admin_Fee?.toString().replace(/[^0-9]/g, '') || '0');
      const payload = {
        order_id: 'TICKETGO-' + Date.now() + Math.floor(Math.random() * 900 + 100),
        gross_amount: finalTotal,
        item_details: [{ id: selectedTicketInput.value, price: pricePerTicket + adminFee, quantity, name }],
        customer_details: { first_name: customerName, email: customerEmail, phone: '+62' + customerPhone.replace(/^0/, '') }
      };
      const response = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify(payload), headers: { 'Content-Type': 'application/json' } });
      if (!response.ok) throw new Error(`Server error: ${response.status}`);
      const result = await response.json();
      if (result.error) throw new Error(result.error);
      if (!result.token) throw new Error("Token pembayaran tidak diterima.");
      window.snap.pay(result.token, {
        onSuccess: res => {
          showFeedback('success', 'Pembayaran Berhasil!', 'Terima kasih! Tiket Anda akan segera dikirimkan.');
          saveDataToSheet(res, payload.customer_details, { name, quantity });
        },
        onPending: res => showFeedback('pending', 'Menunggu Pembayaran', `Status: ${res.transaction_status}`),
        onError: () => showFeedback('error', 'Pembayaran Gagal', 'Silakan coba lagi.'),
        onClose: () => { confirmButton.disabled = false; confirmButton.textContent = 'Lanjutkan Pembayaran'; }
      });
    } catch (error) {
      console.error('❌ Payment initiation error:', error);
      showFeedback('error', 'Terjadi Kesalahan', `Detail: ${error.message}`);
      confirmButton.disabled = false;
      confirmButton.textContent = 'Lanjutkan Pembayaran';
    }
  };

  const showFeedback = (type, title, message) => {
    document.getElementById('reviewModal')?.classList.remove('visible');
    const feedbackModal = document.getElementById('feedbackModal');
    const icon = feedbackModal.querySelector('.fas');
    const content = feedbackModal.querySelector('.feedback-content');
    icon.className = 'fas';
    content.className = 'feedback-content';
    if (type === 'success') { icon.classList.add('fa-check-circle'); content.classList.add('success'); }
    else if (type === 'pending') { icon.classList.add('fa-hourglass-half'); content.classList.add('pending'); }
    else { icon.classList.add('fa-times-circle'); content.classList.add('error'); }
    document.getElementById('feedbackTitle').textContent = title;
    document.getElementById('feedbackMessage').textContent = message;
    feedbackModal.classList.add('visible');
    document.getElementById('closeFeedbackBtn').onclick = () => feedbackModal.classList.remove('visible');
  };

  const fetchAllSeatPrices = async () => {
    const seatOptions = eventDetails['Pilihan_Kursi']?.split('\n').filter(opt => opt.trim() !== '') || [];
    for (const seatName of seatOptions) {
      try {
        const response = await fetch(`/api/get-event-price?seat=${encodeURIComponent(seatName)}`);
        if (response.ok) {
          const data = await response.json();
          seatPrices[seatName.toLowerCase()] = data.price || 0;
        }
      } catch (error) {
        console.error(`Gagal mengambil harga untuk kursi ${seatName}:`, error);
      }
    }
  };

  const buildPage = async () => {
    injectStyles();
    const params = new URLSearchParams(window.location.search);
    const eventId = params.get('eventId');
    if (!eventId) { checkoutMain.innerHTML = `<p>Error: Event ID tidak ditemukan.</p>`; return; }
    try {
      const response = await fetch(`/api/get-event-details?eventId=${eventId}`);
      if (!response.ok) throw new Error(`Gagal memuat data: ${response.statusText}`);
      const data = await response.json();
      eventDetails = data.eventDetails.fields;
      ticketTypes = data.ticketTypes.records;
      formFields = data.formFields.records;
      if (!ticketTypes || ticketTypes.length === 0) {
        checkoutMain.innerHTML = `<p>Tiket belum tersedia untuk event ini.</p>`;
        return;
      }
      await fetchAllSeatPrices();
      renderLayout();
    } catch (error) {
      console.error('Gagal membangun halaman:', error);
      checkoutMain.innerHTML = `<p>Gagal memuat detail event. Error: ${error.message}</p>`;
    }
  };

  const renderLayout = () => {
    let seatMapHTML = eventDetails['Seat_Map'] ? `<div class="form-section seat-map-container"><h3>Peta Kursi</h3><img src="${eventDetails['Seat_Map'][0].url}" alt="Peta Kursi" class="seat-map-image"></div>` : '';
    const seatOptions = eventDetails['Pilihan_Kursi']?.split('\n').filter(opt => opt.trim() !== '') || [];
    let seatSelectionHTML = '';
    if (seatOptions.length > 0) {
      const seatOptionsContent = seatOptions.map((option, index) => `<div class="ticket-option"><input type="radio" id="seat_option_${index}" name="Pilihan_Kursi" value="${option.trim()}" required><label for="seat_option_${index}"><div class="ticket-label-content"><span class="ticket-name">${option.trim()}</span></div></label></div>`).join('');
      seatSelectionHTML = `<div class="form-section"><h3>1. Pilih Kursi</h3><div id="seatOptionsContainer">${seatOptionsContent}</div></div>`;
    }
    const ticketOptionsHTML = ticketTypes.map(record => {
      const { Name, Price, Admin_Fee, Show_Price, jumlahbeli, BundleQuantity } = record.fields;
      const name = Name || 'Tiket Tanpa Nama';
      const bundleQty = BundleQuantity > 1 ? BundleQuantity : 1;
      let priceHTML = '&nbsp;';
      if (Show_Price) {
        const numericPrice = parseInt((Price || 0).toString().replace(/[^0-9]/g, '')) || 0;
        priceHTML = `Rp ${numericPrice.toLocaleString('id-ID')}`;
      }
      const quantitySelectorHTML = jumlahbeli ? `<div class="quantity-selector-wrapper" data-ticket-id="${record.id}"><div class="quantity-selector"><p>Jumlah Beli:</p><button type="button" class="decrease-qty-btn" disabled>-</button><input type="number" class="ticket-quantity-input" value="1" min="1" readonly><button type="button" class="increase-qty-btn">+</button></div></div>` : '';
      return `<div class="ticket-option"><input type="radio" id="${record.id}" name="ticket_choice" value="${record.id}" data-name="${name}" data-admin-fee="${parseInt((Admin_Fee || 0).toString().replace(/[^0-9]/g, '')) || 0}" data-can-choose-quantity="${!!jumlahbeli}" data-bundle-quantity="${bundleQty}"><label for="${record.id}"><div class="ticket-label-content"><span class="ticket-name">${name}</span><span class="ticket-price">${priceHTML}</span></div>${quantitySelectorHTML}</label></div>`;
    }).join('');
    const formFieldsHTML = formFields.map(record => {
      const { FieldLabel, FieldType, Is_Required } = record.fields;
      if (!FieldLabel || !FieldType) return '';
      const fieldId = `form_${FieldLabel.replace(/[^a-zA-Z0-9]/g, '')}`;
      let placeholder = FieldLabel;
      if (FieldLabel.toLowerCase().includes('nama')) placeholder = 'Sesuai Identitas (KTP, SIM, dsb)';
      else if (FieldType.toLowerCase() === 'email') placeholder = 'contoh@gmail.com';
      if (FieldType.toLowerCase() === 'tel') return `<div class="form-group"><label for="${fieldId}">${FieldLabel}</label><div class="phone-input-group"><span class="phone-prefix">+62</span><input type="tel" id="${fieldId}" name="${FieldLabel}" ${Is_Required ? 'required' : ''} placeholder="8123456789"></div></div>`;
      return `<div class="form-group"><label for="${fieldId}">${FieldLabel}</label><input type="${FieldType.toLowerCase()}" id="${fieldId}" name="${FieldLabel}" ${Is_Required ? 'required' : ''} placeholder="${placeholder}"></div>`;
    }).join('');
    checkoutMain.innerHTML = `<div class="checkout-body"><div class="event-details-column"><div class="event-poster-container"><img src="${eventDetails['Poster']?.[0]?.url || ''}" alt="Poster" class="event-poster"></div><div class="event-info"><h1>${eventDetails['NamaEvent'] || ''}</h1><p class="event-description">${eventDetails.Deskripsi || ''}</p></div></div><div class="purchase-form-column"><div class="purchase-form">${seatMapHTML}<form id="customer-data-form" novalidate>${seatSelectionHTML}<div class="form-section"><h3>2. Pilih Jenis Tiket</h3><div id="ticketOptionsContainer">${ticketOptionsHTML}</div></div><div class="form-section"><h3>3. Isi Data Diri</h3>${formFieldsHTML}</div></form><div class="form-section price-review-section"><h3>Ringkasan Harga</h3><div id="price-review"><p>Pilih tiket untuk melihat harga.</p></div></div><button id="buyButton" class="btn-primary" disabled>Beli Tiket</button></div></div></div>`;
    const buyButton = document.getElementById('buyButton');
    if (eventDetails['Pendaftaran Dibuka'] !== true) { buyButton.textContent = 'Sold Out'; }
    attachEventListeners();
  };
  
  const getCurrentQuantity = () => {
    const selectedTicket = document.querySelector('input[name="ticket_choice"]:checked');
    if (!selectedTicket) return 1;
    const bundleQty = parseInt(selectedTicket.dataset.bundleQuantity);
    if (bundleQty > 1) return bundleQty;
    if (selectedTicket.dataset.canChooseQuantity === 'true') {
      const wrapper = selectedTicket.closest('.ticket-option').querySelector('.quantity-selector-wrapper');
      return parseInt(wrapper.querySelector('.ticket-quantity-input').value);
    }
    return 1;
  };

  const attachEventListeners = () => {
    const buyButton = document.getElementById('buyButton');
    const checkButtonState = () => {
      const seatSelected = document.querySelector('input[name="Pilihan_Kursi"]:checked');
      const ticketSelected = document.querySelector('input[name="ticket_choice"]:checked');
      const isEventOpen = eventDetails['Pendaftaran Dibuka'] === true;
      buyButton.disabled = !seatSelected || !ticketSelected || !isEventOpen;
    };
    document.getElementById('checkout-main').addEventListener('change', e => {
      if (e.target.matches('input[name="Pilihan_Kursi"], input[name="ticket_choice"]')) {
        if (e.target.name === 'ticket_choice') {
          document.querySelectorAll('.quantity-selector-wrapper').forEach(w => w.classList.remove('visible'));
          if (e.target.dataset.canChooseQuantity === 'true') {
            e.target.closest('.ticket-option').querySelector('.quantity-selector-wrapper')?.classList.add('visible');
          }
        }
        checkButtonState();
        updatePrice();
      }
    });
    document.getElementById('ticketOptionsContainer')?.addEventListener('click', e => {
      const qtyInput = e.target.closest('.quantity-selector')?.querySelector('.ticket-quantity-input');
      if (!qtyInput) return;
      const currentVal = parseInt(qtyInput.value);
      if (e.target.closest('.increase-qty-btn')) qtyInput.value = currentVal + 1;
      else if (e.target.closest('.decrease-qty-btn') && currentVal > 1) qtyInput.value = currentVal - 1;
      qtyInput.parentElement.querySelector('.decrease-qty-btn').disabled = parseInt(qtyInput.value) <= 1;
      updatePrice();
    });
    buyButton.addEventListener('click', showReviewModal);
    const reviewModal = document.getElementById('reviewModal');
    if (reviewModal) {
      reviewModal.querySelector('.close-button')?.addEventListener('click', () => reviewModal.classList.remove('visible'));
      window.addEventListener('click', e => { if (e.target === reviewModal) reviewModal.classList.remove('visible'); });
    }
    document.getElementById('confirmPaymentBtn')?.addEventListener('click', initiatePayment);
  };
  
  const calculatePrice = () => {
    const selectedTicket = document.querySelector('input[name="ticket_choice"]:checked');
    const seatSelected = document.querySelector('input[name="Pilihan_Kursi"]:checked');
    if (!selectedTicket || !seatSelected) return { finalTotal: 0, pricePerTicket: 0, quantity: 1, subtotal: 0, totalAdminFee: 0 };
    const quantity = getCurrentQuantity();
    const seatName = seatSelected.value.toLowerCase();
    const selectedTicketRecord = ticketTypes.find(t => t.id === selectedTicket.value);
    const fields = selectedTicketRecord?.fields || {};
    const isDiscountTicket = fields.Discount === true;
    const isBundleTicket = (fields.BundleQuantity || 1) > 1;
    const baseSeatPrice = seatPrices[seatName] || 0;
    const ticketPriceField = parseInt(fields.Price?.toString().replace(/[^0-9]/g, '') || '0');
    let subtotal = 0, pricePerTicket = 0;
    if (isBundleTicket && isDiscountTicket) {
      const totalBasePrice = baseSeatPrice * quantity;
      subtotal = totalBasePrice - ticketPriceField;
      pricePerTicket = subtotal / quantity;
    } else if (isDiscountTicket) {
      pricePerTicket = baseSeatPrice - ticketPriceField;
      subtotal = pricePerTicket * quantity;
    } else {
      pricePerTicket = baseSeatPrice;
      subtotal = pricePerTicket * quantity;
    }
    const adminFee = parseInt(fields.Admin_Fee?.toString().replace(/[^0-9]/g, '') || '0');
    const totalAdminFee = adminFee * quantity;
    const finalTotal = subtotal + totalAdminFee;
    return { subtotal, totalAdminFee, finalTotal, pricePerTicket, quantity };
  };

  const updatePrice = () => {
    const reviewContainer = document.getElementById('price-review');
    const selectedTicket = document.querySelector('input[name="ticket_choice"]:checked');
    if (!selectedTicket || !document.querySelector('input[name="Pilihan_Kursi"]:checked')) {
      reviewContainer.innerHTML = '<p>Pilih kursi dan jenis tiket untuk melihat harga.</p>';
      return;
    }
    const { subtotal, totalAdminFee, finalTotal, quantity } = calculatePrice();
    reviewContainer.innerHTML = `<div class="review-row"><span>${selectedTicket.dataset.name} x ${quantity}</span><span>Rp ${subtotal.toLocaleString('id-ID')}</span></div><div class="review-row"><span>Biaya Admin</span><span>Rp ${totalAdminFee.toLocaleString('id-ID')}</span></div><hr><div class="review-row total"><span><strong>Total</strong></span><span><strong>Rp ${finalTotal.toLocaleString('id-ID')}</strong></span></div>`;
  };

  const showReviewModal = () => {
    const form = document.getElementById('customer-data-form');
    if (!form.checkValidity()) { form.reportValidity(); return; }
    const selectedTicketInput = document.querySelector('input[name="ticket_choice"]:checked');
    if (!selectedTicketInput) return;
    const quantity = getCurrentQuantity();
    const isBundleTicket = quantity > 1 && selectedTicketInput.dataset.canChooseQuantity !== 'true';
    const { subtotal, totalAdminFee, finalTotal, pricePerTicket } = calculatePrice();
    const name = selectedTicketInput.dataset.name;
    let formDataHTML = '';
    for (const [key, value] of new FormData(form).entries()) {
      let label = key;
      if (key === 'ticket_choice') { label = 'Jenis Tiket'; value = name; } 
      else if (key.toLowerCase().includes('nomor')) { value = `+62${value.replace(/^0/, '')}`; } 
      else if (key === 'Pilihan_Kursi') { label = 'Pilihan Kursi'; }
      formDataHTML += `<div class="review-row"><span>${label}</span><span>${value}</span></div>`;
    }
    document.getElementById('reviewDetails').innerHTML = `<h4>Detail Pesanan:</h4><div class="review-row"><span>Tiket</span><span>${name} x ${quantity}</span></div><div class="review-row"><span>${isBundleTicket ? 'Harga Paket' : 'Harga per Tiket'}</span><span>Rp ${isBundleTicket ? subtotal.toLocaleString('id-ID') : pricePerTicket.toLocaleString('id-ID')}</span></div><div class="review-row"><span>Subtotal Tiket</span><span>Rp ${subtotal.toLocaleString('id-ID')}</span></div><div class="review-row"><span>Biaya Admin</span><span>Rp ${totalAdminFee.toLocaleString('id-ID')}</span></div><hr><div class="review-row total"><span><strong>Total Pembayaran</strong></span><span><strong>Rp ${finalTotal.toLocaleString('id-ID')}</strong></span></div><hr><h4>Data Pemesan:</h4>${formDataHTML}`;
    document.getElementById('reviewModal').classList.add('visible');
  };
  
  buildPage();
});

