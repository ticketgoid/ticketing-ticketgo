// GANTI SELURUH ISI FILE checkout.js DENGAN KODE FINAL INI
document.addEventListener('DOMContentLoaded', () => {
    // --- KONFIGURASI PENTING ---
    const AIRTABLE_API_KEY = 'patL6WezaL3PYo6wP.e1c40c7a7b38a305974867e3973993737d5ae8f5892e4498c3473f2774d3664c';
    const AIRTABLE_BASE_ID = 'appXLPTB00V3gUH2e';
    const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzDevdyhUaABFeN0_T-bY_D_oi7bEg12H7azjh7KuQY1l6uXn6z7fyHeTYG0j_bnpshhg/exec';

    const checkoutMain = document.getElementById('checkout-main');
    let eventDetails = {};
    let ticketTypes = [];
    let formFields = [];

    const injectStyles = () => {
        const style = document.createElement('style');
        style.textContent = `
            /* STRUKTUR LAYOUT UTAMA */
            .checkout-body { display: flex; flex-wrap: wrap; gap: 32px; align-items: flex-start; }
            .event-details-column { flex: 1; min-width: 320px; }
            .purchase-form-column { flex: 1; min-width: 320px; }

            /* STYLING POSTER 4x5 */
            .event-poster-container {
                width: 100%; aspect-ratio: 4 / 5; border-radius: 16px;
                overflow: hidden; margin-bottom: 24px; background-color: #f0f2f5;
                box-shadow: 0 4px 12px rgba(0,0,0,0.08);
            }
            .event-poster { width: 100%; height: 100%; object-fit: cover; display: block; }

            /* Tampilan Tombol Pilihan */
            .ticket-option label { display: flex; align-items: center; gap: 12px; width: 100%; cursor: pointer; }
            .ticket-label-content { display: flex; justify-content: space-between; align-items: center; width: 100%; }
            .ticket-option input[type="radio"] { display: none; }

            /* === PERBAIKAN 2: Memusatkan Tombol Hijau === */
            .ticket-option label::before {
                content: ''; width: 20px; height: 20px; border-radius: 50%;
                border: 2px solid #ddd; display: grid; place-content: center; /* Membantu centering */
                transition: all 0.2s ease; flex-shrink: 0;
                position: relative; /* Diperlukan agar ::after bisa diposisikan di dalamnya */
            }
            .ticket-option input[type="radio"]:checked + label::before { border-color: #00A97F; }

            .ticket-option label::after {
                content: ''; width: 12px; height: 12px; background-color: #00A97F;
                border-radius: 50%; position: absolute;
                top: 50%; left: 50%; /* Posisikan di tengah ::before */
                transform: translate(-50%, -50%) scale(0); /* Sembunyikan & pusatkan */
                transition: transform 0.2s ease-out;
            }
            .ticket-option input[type="radio"]:checked + label::after {
                transform: translate(-50%, -50%) scale(1); /* Tampilkan saat dipilih */
            }
            
            /* Style lainnya */
            .seat-map-image { max-width: 100%; height: auto; display: block; border-radius: 8px; margin-top: 10px; }
            #buyButton.btn-primary { width: 100%; background-color: #007bff; color: white; border: none; padding: 15px 20px; font-size: 16px; font-weight: bold; border-radius: 12px; cursor: pointer; text-align: center; transition: background-color 0.3s ease, transform 0.1s ease; margin-top: 20px; }
            #buyButton.btn-primary:hover { background-color: #0056b3; }
            #buyButton.btn-primary:active { transform: scale(0.98); }
            #buyButton.btn-primary:disabled { background-color: #cccccc; cursor: not-allowed; }
        `;
        document.head.appendChild(style);
    };

    const fetchData = async (url) => {
        const response = await fetch(url, { headers: { 'Authorization': `Bearer ${AIRTABLE_API_KEY}` } });
        if (!response.ok) throw new Error(`Airtable API Error: ${response.status}`);
        return await response.json();
    };

    const buildPage = async () => {
        injectStyles();
        const params = new URLSearchParams(window.location.search);
        const eventId = params.get('eventId');
        if (!eventId) {
            checkoutMain.innerHTML = `<p class="error-message">Error: Event ID tidak ditemukan di URL.</p>`;
            return;
        }
        try {
            const eventData = await fetchData(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Events/${eventId}`);
            eventDetails = eventData.fields;
            const ticketTypeIds = eventDetails.ticket_types || [];
            const formFieldIds = eventDetails.form_fields || [];
            
            if (ticketTypeIds.length === 0) {
                checkoutMain.innerHTML = `<p class="error-message">Tiket untuk event ini belum tersedia atau sudah habis.</p>`;
                return;
            }
            
            const createFilterFormula = (ids) => {
                if (ids.length === 0) return "RECORD_ID()='INVALID_ID'";
                const formulaParts = ids.map(id => `RECORD_ID()='${id}'`);
                return `OR(${formulaParts.join(',')})`;
            };

            const ticketFilter = encodeURIComponent(createFilterFormula(ticketTypeIds));
            const formFilter = encodeURIComponent(createFilterFormula(formFieldIds));

            const [ticketTypesData, formFieldsData] = await Promise.all([
                fetchData(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Ticket%20Types?filterByFormula=${ticketFilter}`),
                fetchData(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Form%20Fields?filterByFormula=${formFilter}&sort%5B0%5D%5Bfield%5D=Urutan&sort%5B0%5D%5Bdirection%5D=asc`)
            ]);
            
            ticketTypes = ticketTypesData.records;
            formFields = formFieldsData.records;
            
            renderLayout();
            attachEventListeners();
            updatePrice();
        } catch (error) {
            console.error('Gagal membangun halaman:', error);
            checkoutMain.innerHTML = `<p class="error-message">Gagal memuat detail event. Pastikan Event ID benar dan semua kolom di Airtable sudah diisi. Error: ${error.message}</p>`;
        }
    };

    const renderLayout = () => {
        let seatMapHTML = '';
        if (eventDetails['Seat_Map'] && eventDetails['Seat_Map'][0]?.url) {
            seatMapHTML = `<div class="form-section seat-map-container"><h3>Lihat Peta Kursi</h3><img src="${eventDetails['Seat_Map'][0].url}" alt="Peta Kursi" class="seat-map-image"></div>`;
        }

        let seatSelectionHTML = '';
        const seatOptions = eventDetails['Pilihan_Kursi'] ? eventDetails['Pilihan_Kursi'].split('\n').filter(opt => opt.trim() !== '') : [];
        if (seatOptions.length > 0) {
            const seatOptionsContent = seatOptions.map((option, index) => {
                const trimmedOption = option.trim();
                const optionId = `seat_option_${index}`;
                return `<div class="ticket-option"><input type="radio" id="${optionId}" name="Pilihan_Kursi" value="${trimmedOption}" required><label for="${optionId}"><div class="ticket-label-content"><span class="ticket-name">${trimmedOption}</span></div></label></div>`;
            }).join('');
            seatSelectionHTML = `<div class="form-section"><h3>1. Pilih Kursi</h3><div id="seatOptionsContainer">${seatOptionsContent}</div></div>`;
        }

        let ticketOptionsHTML = ticketTypes.map(record => {
            const adminFee = record.fields['Admin_Fee'] || 0;
            return `<div class="ticket-option"><input type="radio" id="${record.id}" name="ticket_choice" value="${record.id}" data-price="${record.fields.Price}" data-name="${record.fields.Name}" data-admin-fee="${adminFee}"><label for="${record.id}"><div class="ticket-label-content"><span class="ticket-name">${record.fields.Name}</span><span class="ticket-price">Rp ${record.fields.Price.toLocaleString('id-ID')}</span></div></label></div>`;
        }).join('');

        // === PERBAIKAN 1: Memastikan Form Fields ditampilkan ===
        let formFieldsHTML = formFields.map(record => {
            const field = record.fields;
            const fieldLabel = field['Field_Label'];
            const fieldType = field['Field_Type'];
            if (!fieldLabel || !fieldType) return '';
            const fieldId = `form_${fieldLabel.replace(/[^a-zA-Z0-9]/g, '')}`;
            const isRequired = field['Is_Required'] ? 'required' : '';
            if (fieldType.toLowerCase() === 'tel') {
                return `<div class="form-group"><label for="${fieldId}">${fieldLabel}</label><div class="phone-input-group"><span class="phone-prefix">+62</span><input type="tel" id="${fieldId}" name="${fieldLabel}" ${isRequired} placeholder="8123456789"></div></div>`;
            } else {
                return `<div class="form-group"><label for="${fieldId}">${fieldLabel}</label><input type="${fieldType.toLowerCase()}" id="${fieldId}" name="${fieldLabel}" ${isRequired} placeholder="${fieldLabel}"></div>`;
            }
        }).join('');

        const layoutHTML = `
            <div class="checkout-body">
                <div class="event-details-column">
                    <div class="event-poster-container">
                        <img src="${eventDetails['Poster']?.[0]?.url || ''}" alt="Poster Event" class="event-poster">
                    </div>
                    <div class="event-info">
                        <h1>${eventDetails['NamaEvent'] || 'Nama Event'}</h1>
                        <p class="event-description">${eventDetails.Deskripsi || 'Deskripsi tidak tersedia.'}</p>
                    </div>
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
                        <div class="form-section price-review-section"><h3>Ringkasan Harga</h3><div id="price-review"><p>Pilih jenis tiket untuk melihat harga.</p></div></div>
                        <button id="buyButton" class="btn-primary" disabled>Beli Tiket</button>
                    </div>
                </div>
            </div>`;
        checkoutMain.innerHTML = layoutHTML;
    };

    const attachEventListeners = () => {
        document.querySelectorAll('input[name="ticket_choice"]').forEach(radio => radio.addEventListener('change', () => {
            document.getElementById('increaseQty').disabled = false;
            document.getElementById('buyButton').disabled = false;
            updatePrice();
        }));
        document.getElementById('increaseQty').addEventListener('click', () => {
            const qtyInput = document.getElementById('ticketQuantity');
            qtyInput.value = parseInt(qtyInput.value) + 1;
            document.getElementById('decreaseQty').disabled = false;
            updatePrice();
        });
        document.getElementById('decreaseQty').addEventListener('click', () => {
            const qtyInput = document.getElementById('ticketQuantity');
            if (parseInt(qtyInput.value) > 1) qtyInput.value = parseInt(qtyInput.value) - 1;
            if (qtyInput.value == 1) document.getElementById('decreaseQty').disabled = true;
            updatePrice();
        });
        document.getElementById('buyButton').addEventListener('click', showReviewModal);
    };

    const updatePrice = () => {
        const selectedTicket = document.querySelector('input[name="ticket_choice"]:checked');
        const quantity = parseInt(document.getElementById('ticketQuantity').value);
        const reviewContainer = document.getElementById('price-review');
        if (!selectedTicket) {
            reviewContainer.innerHTML = '<p>Pilih jenis tiket untuk melihat harga.</p>';
            return;
        }
        const price = parseFloat(selectedTicket.dataset.price);
        const name = selectedTicket.dataset.name;
        const total = price * quantity;
        reviewContainer.innerHTML = `<div class="review-row"><span>${name} x ${quantity}</span><span>Rp ${total.toLocaleString('id-ID')}</span></div>`;
    };

    const showReviewModal = () => {
        const form = document.getElementById('customer-data-form');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }
        const selectedTicket = document.querySelector('input[name="ticket_choice"]:checked');
        const quantity = parseInt(document.getElementById('ticketQuantity').value);
        const price = parseFloat(selectedTicket.dataset.price);
        const adminFee = parseFloat(selectedTicket.dataset.adminFee);
        const subtotal = price * quantity;
        const totalAdminFee = adminFee * quantity;
        const finalTotal = subtotal + totalAdminFee;
        const formData = new FormData(form);
        let formDataHTML = '';
        const seatChoiceValue = formData.get('Pilihan_Kursi');
        if (seatChoiceValue) {
            formDataHTML += `<div class="review-row"><span>Pilihan Kursi</span><span>${seatChoiceValue}</span></div>`;
        }
        for (let [key, value] of formData.entries()) {
            if (key !== 'Pilihan_Kursi') {
                formDataHTML += `<div class="review-row"><span>${key}</span><span>${value}</span></div>`;
            }
        }
        const reviewDetailsContainer = document.getElementById('reviewDetails');
        if (reviewDetailsContainer) {
            reviewDetailsContainer.innerHTML = `<h4>Detail Pesanan:</h4><div class="review-row"><span>Tiket</span><span>${selectedTicket.dataset.name} x ${quantity}</span></div><div class="review-row"><span>Subtotal Tiket</span><span>Rp ${subtotal.toLocaleString('id-ID')}</span></div><div class="review-row"><span>Biaya Admin</span><span>Rp ${totalAdminFee.toLocaleString('id-ID')}</span></div><div class="review-row total"><span>Total Pembayaran</span><span>Rp ${finalTotal.toLocaleString('id-ID')}</span></div><hr><h4>Data Pemesan:</h4>${formDataHTML}`;
        }
        const reviewModal = document.getElementById('reviewModal');
        if (reviewModal) reviewModal.style.display = 'flex';
    };
    
    buildPage();
});
