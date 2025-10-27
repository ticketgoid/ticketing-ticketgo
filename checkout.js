// GANTI SELURUH ISI FILE checkout.js DENGAN KODE FINAL INI
document.addEventListener('DOMContentLoaded', () => {
    const SCRIPT_URL = '/api/create-transaction';
    const checkoutMain = document.getElementById('checkout-main');
    let eventDetails = {}, ticketTypes = [], formFields = [], seatPrices = {}, sisaKuota = {};
    
    let pendingPaymentToken = null;
    let pendingPayload = null;

    // GANTI FUNGSI INI DI checkout.js
const generateStructuredData = () => {
    // Hapus structured data lama jika ada, untuk mencegah duplikasi
    const oldSchema = document.getElementById('event-structured-data');
    if (oldSchema) {
        oldSchema.remove();
    }

    const fields = eventDetails.fields;
    const eventId = new URLSearchParams(window.location.search).get('eventId');
    
    // Menemukan harga terendah dari semua jenis tiket yang tersedia
    const lowestPrice = ticketTypes.reduce((min, ticket) => {
        const price = parseInt(ticket.fields.Price?.toString().replace(/[^0-9]/g, '') || '0');
        return price > 0 && price < min ? price : min;
    }, Infinity);

    const schema = {
        "@context": "https://schema.org",
        "@type": "Event",
        "name": fields.NamaEvent,
        "startDate": fields.Waktu, // Format ISO 8601 (misal: "2025-12-15T19:00:00.000Z")
        "location": {
            "@type": "Place",
            "name": fields.Lokasi,
            "address": fields.Lokasi // Properti address bisa sama dengan nama jika tidak ada detail
        },
        // --- PERBAIKAN DI SINI ---
        // Cek apakah fields.Poster ada dan tidak kosong sebelum mengaksesnya
        "image": fields.Poster && fields.Poster.length > 0 ? [fields.Poster[0].url] : [],
        // --- AKHIR PERBAIKAN ---
        "description": fields.Deskripsi,
        "offers": {
            "@type": "Offer",
            "url": `https://ticketgo.my.id/checkout.html?eventId=${eventId}`, // GANTI DENGAN DOMAIN ANDA JIKA BERBEDA
            "price": lowestPrice === Infinity ? "0" : lowestPrice.toString(),
            "priceCurrency": "IDR",
            "availability": fields['Pendaftaran Dibuka'] ? "https://schema.org/InStock" : "https://schema.org/SoldOut",
            "validFrom": new Date().toISOString() // Biasanya tiket valid sejak sekarang
        }
    };

    const script = document.createElement('script');
    script.id = 'event-structured-data';
    script.type = 'application/ld+json';
    script.text = JSON.stringify(schema);
    document.head.appendChild(script);

    console.log("✅ Structured Data untuk SEO berhasil dibuat dan ditambahkan.");
};
    
    const saveDataToSheet = async (paymentResult, customerData, itemDetails) => {
      try {
        const payload = {
          order_id: paymentResult.order_id,
          transaction_status: paymentResult.transaction_status,
          gross_amount: paymentResult.gross_amount, 
          customer_details: customerData,
          eventId: eventDetails.id,
          rekapTableName: eventDetails.fields['Tabel Penjualan'],
          eventType: eventDetails.fields['Tipe Event'],
          item_details: {
              ...itemDetails,
              seatTableName: eventDetails.fields['Tabel Harga Kursi'],
          }
        };
        await fetch('/api/save-to-airtable', {
          method: 'POST',
          body: JSON.stringify(payload),
          headers: { 'Content-Type': 'application/json' },
        });
        console.log("✅ Data berhasil dikirim untuk rekap dan pelacakan kuota.");
      } catch (error) {
        console.error("❌ Gagal mengirim data ke Airtable:", error);
      }
    };
  
    const resumePayment = () => {
        if (!pendingPaymentToken || !pendingPayload) return;

        window.snap.pay(pendingPaymentToken, {
          onSuccess: res => {
            const email = pendingPayload.customer_details.email;
            const successMessage = `
                Konfirmasi E-Ticket telah dikirim ke email <strong>${email}</strong>.
                <br><br>
                Mohon cek folder Spam/Promosi secara berkala. Apabila dalam <strong>2x24 jam</strong> E-Ticket belum diterima, silakan hubungi kami melalui 
                <a href="https://instagram.com/ticketgo.id" target="_blank" rel="noopener noreferrer">Instagram (@ticketgo.id)</a> atau 
                <a href="https://wa.me/6287849679178" target="_blank" rel="noopener noreferrer">WhatsApp (+62 878-4967-9178)</a> 
                dengan menyertakan bukti transfer Anda.
            `;
            showFeedback('success', 'Pembayaran Berhasil!', successMessage);

            saveDataToSheet(res, pendingPayload.customer_details, pendingPayload.item_details);
            pendingPaymentToken = null;
            pendingPayload = null;
          },
          onPending: res => {
            showFeedback('pending', 'Menunggu Pembayaran', `Status: ${res.transaction_status}`);
          },
          onError: () => {
            pendingPaymentToken = null; 
            pendingPayload = null;
            showFeedback('error', 'Pembayaran Gagal', 'Silakan coba lagi.');
          },
          onClose: () => {
            showFeedback('pending', 'Anda menutup jendela pembayaran', 'Klik tombol di bawah untuk melanjutkan pembayaran Anda.');
          }
        });
    };

    const initiatePayment = async () => {
      if (pendingPaymentToken) {
          resumePayment();
          return;
      }

      const confirmButton = document.getElementById('confirmPaymentBtn');
      confirmButton.disabled = true;
      confirmButton.textContent = 'Memproses...';
      try {
        const selectedTicketInput = document.querySelector('input[name="ticket_choice"]:checked');
        const seatSelected = document.querySelector('input[name="Pilihan_Kursi"]:checked');
        const eventType = eventDetails.fields['Tipe Event'];
  
        if (eventType === 'Dengan Pilihan Kursi' && !seatSelected) throw new Error("Kursi belum dipilih.");
        if (!selectedTicketInput) throw new Error("Jenis tiket belum dipilih.");
  
        const { quantity } = calculatePrice();
        const selectedTicketRecord = ticketTypes.find(t => t.id === selectedTicketInput.value);
        const name = selectedTicketRecord?.fields?.Name || 'Tiket Tanpa Nama';
        
        let customerName = '', customerEmail = '', customerPhone = '';
        new FormData(document.getElementById('customer-data-form')).forEach((value, key) => {
          const lowerKey = key.toLowerCase();
          if (lowerKey.includes('nama')) customerName = value;
          else if (lowerKey.includes('email')) customerEmail = value;
          else if (lowerKey.includes('nomor')) customerPhone = value;
        });
  
        if (!customerName || !customerEmail || !customerPhone) throw new Error("Data pemesan tidak lengkap.");
  
        const transactionApiPayload = {
          order_id: `TICKETGO-${Date.now()}`,
          eventId: eventDetails.id,
          ticketTypeId: selectedTicketInput.value,
          seatName: seatSelected ? seatSelected.value : null,
          quantity: quantity,
          customer_details: { 
            first_name: customerName, 
            email: customerEmail, 
            phone: `+62${customerPhone.replace(/^0/, '')}` 
          }
        };
        
        const airtableSavePayload = {
            customer_details: transactionApiPayload.customer_details,
            item_details: {
                id: selectedTicketInput.value,
                ticketRecordId: selectedTicketInput.value,
                quantity: quantity,
                name: name,
                seatName: seatSelected ? seatSelected.value : null,
                seatRecordId: seatSelected ? seatSelected.dataset.recordId : null,
            }
        };
  
        const response = await fetch(SCRIPT_URL, { 
            method: 'POST', 
            body: JSON.stringify(transactionApiPayload), 
            headers: { 'Content-Type': 'application/json' } 
        });
        
        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || `Server error: ${response.status}`);
        }
        
        const result = await response.json();
        if (result.error || !result.token) throw new Error(result.error || "Token pembayaran tidak diterima.");
        
        pendingPaymentToken = result.token;
        pendingPayload = airtableSavePayload;

        resumePayment();

      } catch (error) {
        console.error('❌ Gagal memulai pembayaran:', error);
        showFeedback('error', 'Terjadi Kesalahan', `Detail: ${error.message}`);
        confirmButton.disabled = false;
        confirmButton.textContent = 'Lanjutkan Pembayaran';
      }
    };
  
    const showFeedback = (type, title, message) => {
      document.getElementById('reviewModal')?.classList.remove('visible');
      const feedbackModal = document.getElementById('feedbackModal');
      const iconWrapper = feedbackModal.querySelector('.feedback-icon');
      const icon = feedbackModal.querySelector('.fas');
      const closeBtn = document.getElementById('closeFeedbackBtn');
      
      iconWrapper.className = 'feedback-icon';
      icon.className = 'fas';
      
      if (type === 'success') { 
          icon.classList.add('fa-check-circle'); 
          iconWrapper.classList.add('success');
          closeBtn.textContent = 'Oke';
          closeBtn.onclick = () => window.location.href = 'index.html';
      } else if (type === 'pending') { 
          icon.classList.add('fa-hourglass-half'); 
          iconWrapper.classList.add('pending');
          closeBtn.textContent = 'Lanjutkan Pembayaran';
          closeBtn.onclick = () => {
              feedbackModal.classList.remove('visible');
              resumePayment();
          };
      } else { // error
          icon.classList.add('fa-times-circle'); 
          iconWrapper.classList.add('error');
          closeBtn.textContent = 'Oke';
          closeBtn.onclick = () => window.location.reload();
      }
      
      document.getElementById('feedbackTitle').textContent = title;
      document.getElementById('feedbackMessage').innerHTML = message;
      feedbackModal.classList.add('visible');
    };
  
    const injectStyles = () => {
        const style = document.createElement('style');
        style.textContent = `
          .ticket-option label { flex-wrap: wrap; cursor: pointer; } .quantity-selector-wrapper { display: none; width: 100%; padding-top: 1rem; margin-top: 0.75rem; border-top: 1px solid #f0f0f0; } .quantity-selector-wrapper.visible { display: block; } .quantity-selector { display: flex; align-items: center; gap: 0.5rem; justify-content: flex-end; } .quantity-selector p { margin-right: auto; font-weight: 600; font-size: 0.9rem; } .quantity-selector button { width: 32px; height: 32px; border-radius: 50%; border: 1px solid #e5e7eb; background-color: var(--white); font-size: 1.2rem; font-weight: 600; color: var(--gray-text); cursor: pointer; transition: all 0.2s; } .quantity-selector button:hover:not(:disabled) { background-color: var(--teal); border-color: var(--teal); color: var(--white); } .quantity-selector button:disabled { opacity: 0.5; cursor: not-allowed; } .quantity-selector input { width: 40px; height: 32px; text-align: center; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 1rem; font-weight: 600; -moz-appearance: textfield; } .checkout-body { display: flex; flex-wrap: wrap; gap: 32px; align-items: flex-start; } .event-details-column, .purchase-form-column { flex: 1; min-width: 320px; } .event-poster-container { width: 100%; aspect-ratio: 4 / 5; border-radius: 16px; overflow: hidden; margin-bottom: 24px; background-color: #f0f2f5; box-shadow: 0 4px 12px rgba(0,0,0,0.08); } .event-poster { width: 100%; height: 100%; object-fit: cover; display: block; } .ticket-option .ticket-label-content { display: flex; justify-content: space-between; align-items: center; width: 100%; } .ticket-option input[type="radio"] { display: none; } .seat-map-image { max-width: 100%; height: auto; display: block; border-radius: 8px; margin-top: 10px; } #buyButton, #confirmPaymentBtn { width: 100%; background-color: var(--orange); color: white; border: none; padding: 15px 20px; font-size: 16px; font-weight: bold; border-radius: 12px; cursor: pointer; text-align: center; transition: background-color: 0.3s ease, transform 0.1s ease; margin-top: 20px; } #buyButton:hover, #confirmPaymentBtn:hover { background-color: #EA580C; } #buyButton:active, #confirmPaymentBtn:active { transform: scale(0.98); } #buyButton:disabled { background-color: #cccccc; cursor: not-allowed; } .modal { display: none; align-items: center; justify-content: center; position: fixed; z-index: 1000; left: 0; top: 0; width: 100%; height: 100%; overflow-y: auto; background-color: rgba(0, 0, 0, 0.6); padding: 1rem; opacity: 0; visibility: hidden; transition: opacity 0.3s ease, visibility 0.3s ease; } .modal.visible { display: flex; opacity: 1; visibility: visible; } .feedback-modal { display: none; align-items: center; justify-content: center; position: fixed; z-index: 2000; left: 0; top: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.6); } .feedback-modal.visible { display: flex; }
          .ticket-option label.disabled { cursor: not-allowed; background-color: #f1f5f9; color: #94a3b8; } .ticket-option label.disabled:hover { border-color: #e5e7eb; box-shadow: none; } .sold-out-tag { font-weight: 700; color: #ef4444; margin-left: auto; white-space: nowrap; }
          #feedbackMessage { line-height: 1.6; }
          #feedbackMessage a { color: var(--teal); font-weight: 600; text-decoration: underline; }
          #closeFeedbackBtn { background-color: var(--orange); }
          #closeFeedbackBtn:hover { background-color: #EA580C; }
          .feedback-icon.success .fas { color: #28a745; }
          .feedback-icon.pending .fas { color: #007bff; }
          .feedback-icon.error .fas { color: #dc3545; }
          .validation-message { color: #dc3545; font-size: 0.8rem; margin-top: 0.25rem; display: none; }
          input.invalid { border-color: #dc3545 !important; }
          input.invalid:focus { box-shadow: 0 0 0 1px #dc3545 !important; }
        `;
        document.head.appendChild(style);
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
            eventDetails = data.eventDetails;
            ticketTypes = data.ticketTypes.records;
            formFields = data.formFields.records;
            sisaKuota = data.sisaKuota;
            seatPrices = data.seatPrices;
            
            if (!ticketTypes || ticketTypes.length === 0) {
                checkoutMain.innerHTML = `<p>Tiket belum tersedia untuk event ini.</p>`;
                return;
            }
            
            renderLayout();
            generateStructuredData(); // --- PANGGIL FUNGSI SEO DI SINI ---
        } catch (error) {
            console.error('Gagal membangun halaman:', error);
            checkoutMain.innerHTML = `<p>Gagal memuat detail event. Error: ${error.message}</p>`;
        }
    };
    
    // ... Sisa kode lainnya tetap sama persis ...
    const renderLayout = () => {
        const eventType = eventDetails.fields['Tipe Event'];
        let seatMapHTML = eventDetails.fields['Seat_Map'] ? `<div class="form-section seat-map-container"><h3>Peta Kursi</h3><img src="${eventDetails.fields['Seat_Map'][0].url}" alt="Peta Kursi" class="seat-map-image"></div>` : '';
        let seatSelectionHTML = '';
        if (eventType === 'Dengan Pilihan Kursi') {
            const seatOptions = eventDetails.fields['Pilihan_Kursi']?.split('\n').filter(opt => opt.trim() !== '') || [];
            const seatOptionsContent = seatOptions.map((option, index) => {
                const kuotaInfo = sisaKuota[option.trim().toLowerCase()];
                const isDisabled = !kuotaInfo || kuotaInfo.sisa <= 0;
                return `<div class="ticket-option">
                            <input type="radio" id="seat_option_${index}" name="Pilihan_Kursi" value="${option.trim()}" data-record-id="${kuotaInfo?.recordId || ''}" ${isDisabled ? 'disabled' : ''}>
                            <label for="seat_option_${index}" class="${isDisabled ? 'disabled' : ''}">
                                <div class="ticket-label-content">
                                    <span class="ticket-name">${option.trim()}</span>
                                    ${isDisabled ? '<span class="sold-out-tag">Habis</span>' : ''}
                                </div>
                            </label>
                        </div>`;
            }).join('');
            seatSelectionHTML = `<div class="form-section"><h3>1. Pilih Kursi</h3><div id="seatOptionsContainer">${seatOptionsContent}</div></div>`;
        }
        const ticketOptionsHTML = ticketTypes.map(record => {
          const { Name, Price, Admin_Fee, Show_Price, jumlahbeli, BundleQuantity } = record.fields;
          const name = Name || 'Tiket Tanpa Nama';
          const bundleQty = BundleQuantity > 1 ? BundleQuantity : 1;
          let isSoldOut = false;
          if (eventType === 'Tanpa Pilihan Kursi') {
            const kuotaInfo = sisaKuota[name.toLowerCase()];
            isSoldOut = !kuotaInfo || kuotaInfo.sisa < bundleQty;
          }
          let priceHTML = '&nbsp;';
          if (Show_Price) {
            const numericPrice = parseInt((Price || 0).toString().replace(/[^0-9]/g, '')) || 0;
            priceHTML = `Rp ${numericPrice.toLocaleString('id-ID')}`;
          }
          const quantitySelectorHTML = jumlahbeli ? `<div class="quantity-selector-wrapper" data-ticket-id="${record.id}"><div class="quantity-selector"><p>Jumlah Beli:</p><button type="button" class="decrease-qty-btn" disabled>-</button><input type="number" class="ticket-quantity-input" value="1" min="1" readonly><button type="button" class="increase-qty-btn">+</button></div></div>` : '';
          const soldOutTagHTML = eventType === 'Dengan Pilihan Kursi' 
                ? '<span class="sold-out-tag"></span>' 
                : (isSoldOut ? '<span class="sold-out-tag">Habis</span>' : '');
          return `<div class="ticket-option">
                      <input type="radio" id="${record.id}" name="ticket_choice" value="${record.id}" data-name="${name}" data-admin-fee="${parseInt((Admin_Fee || 0).toString().replace(/[^0-9]/g, '')) || 0}" data-can-choose-quantity="${!!jumlahbeli}" data-bundle-quantity="${bundleQty}" ${isSoldOut ? 'disabled' : ''}>
                      <label for="${record.id}" class="${isSoldOut ? 'disabled' : ''}">
                          <div class="ticket-label-content">
                              <span class="ticket-name">${name}</span>
                              ${soldOutTagHTML}
                          </div>
                          ${quantitySelectorHTML}
                      </label>
                  </div>`;
        }).join('');
        
        const formFieldsHTML = formFields.map(record => {
            const { FieldLabel, FieldType, Is_Required } = record.fields;
            if (!FieldLabel || !FieldType) return '';
            const fieldId = `form_${FieldLabel.replace(/[^a-zA-Z0-9]/g, '')}`;
            let placeholder = FieldLabel.toLowerCase().includes('nama') ? 'Sesuai Identitas (KTP, SIM, dsb)' : (FieldType.toLowerCase() === 'email' ? 'contoh@gmail.com' : FieldLabel);
            const isEmailField = FieldType.toLowerCase() === 'email';
            const isPhoneField = FieldType.toLowerCase() === 'tel';

            let fieldHTML = '';
            let validationMessage = '';

            if (isPhoneField) {
                fieldHTML = `<div class="phone-input-group"><span class="phone-prefix">+62</span><input type="tel" id="${fieldId}" name="${FieldLabel}" ${Is_Required ? 'required' : ''} placeholder="8123456789"></div>`;
            } else {
                fieldHTML = `<input type="${FieldType.toLowerCase()}" id="${fieldId}" name="${FieldLabel}" ${Is_Required ? 'required' : ''} placeholder="${placeholder}">`;
            }

            if(isEmailField){
                validationMessage = `<p id="${fieldId}-error" class="validation-message">Format email tidak valid (contoh: email@domain.com).</p>`;
            }

            return `<div class="form-group">
                        <label for="${fieldId}">${FieldLabel}</label>
                        ${fieldHTML}
                        ${validationMessage}
                    </div>`;
        }).join('');

        checkoutMain.innerHTML = `<div class="checkout-body"><div class="event-details-column"><div class="event-poster-container"><img src="${eventDetails.fields.Poster?.url || 'assets/default-poster.png'}" alt="${eventDetails.fields.Poster?.alt || eventDetails.fields.NamaEvent}" class="event-poster"></div><div class="event-info"><h1>${eventDetails.fields['NamaEvent'] || ''}</h1><p class="event-description">${eventDetails.fields.Deskripsi || ''}</p></div></div><div class="purchase-form-column"><div class="purchase-form">${seatMapHTML}<form id="customer-data-form" novalidate>${seatSelectionHTML}<div class="form-section"><h3>${eventType === 'Dengan Pilihan Kursi' ? '2.' : '1.'} Pilih Jenis Tiket</h3><div id="ticketOptionsContainer">${ticketOptionsHTML}</div></div><div class="form-section"><h3>${eventType === 'Dengan Pilihan Kursi' ? '3.' : '2.'} Isi Data Diri</h3>${formFieldsHTML}</div></form><div class="form-section price-review-section"><h3>Ringkasan Harga</h3><div id="price-review"><p>Pilih tiket untuk melihat harga.</p></div></div><button id="buyButton" class="btn-primary" disabled>Beli Tiket</button></div></div></div>`;
        const buyButton = document.getElementById('buyButton');
        if (eventDetails.fields['Pendaftaran Dibuka'] !== true) { buyButton.textContent = 'Sold Out'; }
        attachEventListeners();
    };
    const getCurrentQuantity = () => {
        const selectedTicket = document.querySelector('input[name="ticket_choice"]:checked');
        if (!selectedTicket) return 1;
        const ticketRecord = ticketTypes.find(t => t.id === selectedTicket.value);
        if(!ticketRecord) return 1;
        const bundleQty = parseInt(ticketRecord.fields.BundleQuantity) || 1;
        if (bundleQty > 1) return bundleQty;
        if (ticketRecord.fields.jumlahbeli) {
          const wrapper = selectedTicket.closest('.ticket-option').querySelector('.quantity-selector-wrapper');
          return parseInt(wrapper.querySelector('.ticket-quantity-input').value);
        }
        return 1;
    };
    const updateTicketAvailabilityForSeat = () => {
        const seatSelected = document.querySelector('input[name="Pilihan_Kursi"]:checked');
        if (!seatSelected) return;
        const seatName = seatSelected.value.trim().toLowerCase();
        const kuotaInfo = sisaKuota[seatName];
        const remainingQuota = kuotaInfo ? kuotaInfo.sisa : 0;
        document.querySelectorAll('input[name="ticket_choice"]').forEach(ticketRadio => {
            const bundleQty = parseInt(ticketRadio.dataset.bundleQuantity) || 1;
            const isDisabled = remainingQuota < bundleQty;
            ticketRadio.disabled = isDisabled;
            const label = document.querySelector(`label[for="${ticketRadio.id}"]`);
            if (label) {
                label.classList.toggle('disabled', isDisabled);
                const soldOutTag = label.querySelector('.sold-out-tag');
                if (soldOutTag) {
                    soldOutTag.textContent = isDisabled ? 'Habis' : '';
                }
            }
        });
    };
    const attachEventListeners = () => {
      const buyButton = document.getElementById('buyButton');
      const form = document.getElementById('customer-data-form');
      const validateEmail = (email) => {
          const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
          return re.test(String(email).toLowerCase());
      };
      const checkButtonState = () => {
        const seatSelected = document.querySelector('input[name="Pilihan_Kursi"]:checked');
        const ticketSelected = document.querySelector('input[name="ticket_choice"]:checked');
        const isEventOpen = eventDetails.fields['Pendaftaran Dibuka'] === true;
        const isSeatRequired = eventDetails.fields['Tipe Event'] === 'Dengan Pilihan Kursi';
        let isCustomValidationOk = true;
        const emailInput = form.querySelector('input[type="email"]');
        if (emailInput && emailInput.value && !validateEmail(emailInput.value)) {
            isCustomValidationOk = false;
        }
        const isFormValid = form.checkValidity();
        buyButton.disabled = (!ticketSelected || !isEventOpen || (isSeatRequired && !seatSelected) || !isFormValid || !isCustomValidationOk);
      };
      document.getElementById('checkout-main').addEventListener('change', e => {
        if (e.target.matches('input[name="Pilihan_Kursi"], input[name="ticket_choice"]')) {
          if (e.target.name === 'Pilihan_Kursi') {
              const selectedTicket = document.querySelector('input[name="ticket_choice"]:checked');
              if(selectedTicket) selectedTicket.checked = false;
              updateTicketAvailabilityForSeat();
          }
          document.querySelectorAll('.quantity-selector-wrapper').forEach(wrapper => wrapper.classList.remove('visible'));
          const selectedTicketRadio = document.querySelector('input[name="ticket_choice"]:checked');
          if (selectedTicketRadio) {
              const selectedTicketRecord = ticketTypes.find(t => t.id === selectedTicketRadio.value);
              if (selectedTicketRecord && selectedTicketRecord.fields.jumlahbeli) {
                  selectedTicketRadio.closest('.ticket-option').querySelector('.quantity-selector-wrapper')?.classList.add('visible');
              }
          }
          checkButtonState();
          updatePrice();
        }
      });
      form.addEventListener('input', e => {
          if (e.target.matches('input[type="email"]')) {
              const emailInput = e.target;
              const errorElement = document.getElementById(`${emailInput.id}-error`);
              if (emailInput.value && !validateEmail(emailInput.value)) {
                  emailInput.classList.add('invalid');
                  if (errorElement) errorElement.style.display = 'block';
              } else {
                  emailInput.classList.remove('invalid');
                  if (errorElement) errorElement.style.display = 'none';
              }
          }
          if (e.target.matches('input[type="tel"]')) {
              e.target.value = e.target.value.replace(/[^0-9]/g, '');
          }
          checkButtonState();
      });
      document.getElementById('ticketOptionsContainer')?.addEventListener('click', e => {
        const qtyInput = e.target.closest('.quantity-selector')?.querySelector('.ticket-quantity-input');
        if (!qtyInput) return;
        const selectedTicketRadio = document.querySelector('input[name="ticket_choice"]:checked');
        if (!selectedTicketRadio) return;
        const selectedTicketRecord = ticketTypes.find(t => t.id === selectedTicketRadio.value);
        if (!selectedTicketRecord) return;
        const eventType = eventDetails.fields['Tipe Event'];
        let maxQty = 0;
        if (eventType === 'Dengan Pilihan Kursi') {
            const seatSelected = document.querySelector('input[name="Pilihan_Kursi"]:checked');
            if(seatSelected) {
                const seatName = seatSelected.value.trim().toLowerCase();
                const kuotaInfo = sisaKuota[seatName];
                maxQty = kuotaInfo ? kuotaInfo.sisa : 0;
            }
        } else {
            const ticketName = selectedTicketRecord.fields.Name.toLowerCase();
            const kuotaInfo = sisaKuota[ticketName];
            maxQty = kuotaInfo ? kuotaInfo.sisa : 0;
        }
        const increaseBtn = e.target.closest('.quantity-selector').querySelector('.increase-qty-btn');
        const decreaseBtn = e.target.closest('.quantity-selector').querySelector('.decrease-qty-btn');
        let currentVal = parseInt(qtyInput.value);
        if (e.target.closest('.increase-qty-btn')) {
            if (currentVal < maxQty) {
                qtyInput.value = currentVal + 1;
            }
        } else if (e.target.closest('.decrease-qty-btn')) {
            if (currentVal > 1) {
                qtyInput.value = currentVal - 1;
            }
        }
        currentVal = parseInt(qtyInput.value);
        decreaseBtn.disabled = currentVal <= 1;
        increaseBtn.disabled = currentVal >= maxQty;
        updatePrice();
        checkButtonState();
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
      const eventType = eventDetails.fields['Tipe Event'];
      if (!selectedTicket) {
        return { finalTotal: 0, pricePerTicket: 0, quantity: 1, subtotal: 0, totalAdminFee: 0 };
      }
      if (eventType === 'Dengan Pilihan Kursi' && !seatSelected) {
          return { finalTotal: 0, pricePerTicket: 0, quantity: 1, subtotal: 0, totalAdminFee: 0 };
      }
      const quantity = getCurrentQuantity();
      const selectedTicketRecord = ticketTypes.find(t => t.id === selectedTicket.value);
      const fields = selectedTicketRecord?.fields || {};
      const isDiscountTicket = fields.Discount === true;
      const isBundleTicket = (fields.BundleQuantity || 1) > 1;
      let baseSeatPrice = 0;
      if (eventType === 'Dengan Pilihan Kursi' && seatSelected) {
          baseSeatPrice = seatPrices[seatSelected.value.toLowerCase()] || 0; 
      }
      const ticketPriceField = parseInt(fields.Price?.toString().replace(/[^0-9]/g, '') || 0);
      let subtotal = 0, pricePerTicket = 0;
      if (isBundleTicket && isDiscountTicket) {
        const totalBasePrice = baseSeatPrice * quantity;
        subtotal = totalBasePrice - ticketPriceField;
        pricePerTicket = subtotal > 0 ? subtotal / quantity : 0;
      } else if (isDiscountTicket) {
        pricePerTicket = baseSeatPrice - ticketPriceField;
        subtotal = pricePerTicket * quantity;
      } else {
        pricePerTicket = baseSeatPrice > 0 ? baseSeatPrice : ticketPriceField;
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
      const eventType = eventDetails.fields['Tipe Event'];
      if (!selectedTicket || (eventType === 'Dengan Pilihan Kursi' && !document.querySelector('input[name="Pilihan_Kursi"]:checked'))) {
        reviewContainer.innerHTML = '<p>Pilih tiket untuk melihat harga.</p>';
        return;
      }
      const { subtotal, totalAdminFee, finalTotal, quantity } = calculatePrice();
      const isBundle = quantity > 1 && selectedTicket.dataset.canChooseQuantity !== 'true';
      const displayText = isBundle ? selectedTicket.dataset.name : `${selectedTicket.dataset.name} x ${quantity}`;
      reviewContainer.innerHTML = `<div class="review-row"><span>${displayText}</span><span>Rp ${subtotal.toLocaleString('id-ID')}</span></div><div class="review-row"><span>Biaya Admin</span><span>Rp ${totalAdminFee.toLocaleString('id-ID')}</span></div><hr><div class="review-row total"><span><strong>Total</strong></span><span><strong>Rp ${finalTotal.toLocaleString('id-ID')}</strong></span></div>`;
    };
    const showReviewModal = () => {
      const form = document.getElementById('customer-data-form');
      if (!form.checkValidity()) {
        const firstInvalidField = form.querySelector(':invalid');
        firstInvalidField?.focus();
        form.reportValidity();
        return;
      }
      const selectedTicketInput = document.querySelector('input[name="ticket_choice"]:checked');
      if (!selectedTicketInput) return;
      const quantity = getCurrentQuantity();
      const selectedTicketRecord = ticketTypes.find(t => t.id === selectedTicketInput.value);
      const isBundleTicket = (selectedTicketRecord.fields.BundleQuantity || 1) > 1;
      const { subtotal, totalAdminFee, finalTotal, pricePerTicket } = calculatePrice();
      const name = selectedTicketInput.dataset.name;
      const displayText = isBundleTicket ? name : `${name} x ${quantity}`;
      let formDataHTML = '';
      for (const [key, originalValue] of new FormData(form).entries()) {
        let label = key;
        let displayValue = originalValue;
        if (key === 'ticket_choice') {
            continue; 
        } 
        else if (key.toLowerCase().includes('nomor')) {
            displayValue = `+62${originalValue.replace(/^0/, '')}`;
        } 
        else if (key === 'Pilihan_Kursi') {
            label = 'Pilihan Kursi';
        }
        formDataHTML += `<div class="review-row"><span>${label}</span><span>${displayValue}</span></div>`;
      }
      document.getElementById('reviewDetails').innerHTML = `<h4>Detail Pesanan:</h4><div class="review-row"><span>Tiket</span><span>${displayText}</span></div><div class="review-row"><span>${isBundleTicket ? 'Harga Paket' : 'Harga per Tiket'}</span><span>Rp ${isBundleTicket ? subtotal.toLocaleString('id-ID') : pricePerTicket.toLocaleString('id-ID')}</span></div><div class="review-row"><span>Subtotal Tiket</span><span>Rp ${subtotal.toLocaleString('id-ID')}</span></div><div class="review-row"><span>Biaya Admin</span><span>Rp ${totalAdminFee.toLocaleString('id-ID')}</span></div><hr><div class="review-row total"><span><strong>Total Pembayaran</strong></span><span><strong>Rp ${finalTotal.toLocaleString('id-ID')}</strong></span></div><hr><h4>Data Pemesan:</h4>${formDataHTML}`;
      document.getElementById('reviewModal').classList.add('visible');
    };
    buildPage();
});



