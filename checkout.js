// GANTI SELURUH ISI FILE checkout.js DENGAN KODE INI
document.addEventListener('DOMContentLoaded', () => {
    // --- KONFIGURASI PENTING ---
    const AIRTABLE_API_KEY = 'patL6WezaL3PYo6wP.e1c40c7a7b38a305974867e3973993737d5ae8f5892e4498c3473f2774d3664c';
    const AIRTABLE_BASE_ID = 'appXLPTB00V3gUH2e';
    const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzDevdyhUaABFeN0_T-bY_D_oi7bEg12H7azjh7KuQY1l6uXn6z7fyHeTYG0j_bnpshhg/exec';

    const checkoutMain = document.getElementById('checkout-main');
    let eventDetails = {};
    let ticketTypes = [];
    let formFields = [];

    const fetchData = async (url) => {
        const response = await fetch(url, { headers: { 'Authorization': `Bearer ${AIRTABLE_API_KEY}` } });
        if (!response.ok) throw new Error(`Airtable API Error: ${response.status}`);
        return await response.json();
    };

    const buildPage = async () => {
        const params = new URLSearchParams(window.location.search);
        const eventId = params.get('eventId');
        if (!eventId) {
            checkoutMain.innerHTML = '<p class="error-message">Error: Event ID tidak ditemukan di URL.</p>';
            return;
        }

        try {
            // Langkah 1: Ambil detail event utama berdasarkan ID-nya. Ini sudah benar.
            const eventData = await fetchData(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Events/${eventId}`);
            eventDetails = eventData.fields;

            // Langkah 2: Gunakan eventId (BUKAN eventName) untuk mengambil data terkait.
            const [ticketTypesData, formFieldsData] = await Promise.all([
                fetchData(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Ticket%20Types?filterByFormula=FIND(%22${eventId}%22%2C+ARRAYJOIN({Event}))`),
                fetchData(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Form%20Fields?filterByFormula=FIND(%22${eventId}%22%2C+ARRAYJOIN({Event}))&sort%5B0%5D%5Bfield%5D=Urutan&sort%5B0%5D%5Bdirection%5D=asc`)
            ]);

            ticketTypes = ticketTypesData.records;
            formFields = formFieldsData.records;

            if (ticketTypes.length === 0) {
                 checkoutMain.innerHTML = '<p class="error-message">Tiket untuk event ini belum tersedia atau sudah habis.</p>';
                 return;
            }

            renderLayout();
            attachEventListeners();
            updatePrice();

        } catch (error) {
            console.error('Gagal membangun halaman:', error);
            checkoutMain.innerHTML = `<p class="error-message">Gagal memuat detail event. Pastikan konfigurasi Airtable sudah benar. Pesan error: ${error.message}</p>`;
        }
    };

    // --- SISA KODE (renderLayout, attachEventListeners, dll.) TETAP SAMA ---
    // Pastikan sisa file Anda sama dengan kode di bawah ini

    const renderLayout = () => {
        let ticketOptionsHTML = ticketTypes.map(record => `
            <div class="ticket-option" data-ticket-id="${record.id}">
                <input type="radio" id="${record.id}" name="ticket_choice" value="${record.id}" data-price="${record.fields.Price}" data-name="${record.fields.Name}" data-admin-fee="${record.fields['Admin Fee'] || 0}">
                <label for="${record.id}">
                    <div class="ticket-label-content">
                        <span class="ticket-name">${record.fields.Name}</span>
                        <span class="ticket-price">Rp ${record.fields.Price.toLocaleString('id-ID')}</span>
                    </div>
                </label>
            </div>
        `).join('');

        let formFieldsHTML = formFields.map(record => {
            const field = record.fields;
            if (!field['Field Label'] || !field['Field Type']) return '';
            
            const fieldId = `form_${field['Field Label'].replace(/[^a-zA-Z0-9]/g, '')}`;
            const fieldLabel = field['Field Label'];
            const fieldType = field['Field Type'].toLowerCase();
            const isRequired = field['Is Required'] ? 'required' : '';

            if (fieldType === 'tel') {
                return `<div class="form-group"><label for="${fieldId}">${fieldLabel}</label><div class="phone-input-group"><span class="phone-prefix">+62</span><input type="tel" id="${fieldId}" name="${fieldLabel}" ${isRequired} placeholder="8123456789"></div></div>`;
            } else {
                return `<div class="form-group"><label for="${fieldId}">${fieldLabel}</label><input type="${fieldType}" id="${fieldId}" name="${fieldLabel}" ${isRequired} placeholder="${fieldLabel}"></div>`;
            }
        }).join('');

        const layoutHTML = `
            <div class="event-header">
                <img src="${eventDetails['Gambar Event']?.[0]?.url || ''}" alt="Poster Event" class="event-poster">
            </div>
            <div class="purchase-container">
                <div class="event-info">
                    <h1>${eventDetails['Nama Event'] || 'Nama Event'}</h1>
                    <p class="event-description">${eventDetails.Deskripsi || 'Deskripsi tidak tersedia.'}</p>
                </div>
                <div class="purchase-form">
                    <div class="form-section">
                        <h3>1. Pilih Jenis Tiket</h3>
                        <div id="ticketOptionsContainer">${ticketOptionsHTML}</div>
                    </div>
                    <div class="form-section">
                        <h3>2. Pilih Jumlah Beli</h3>
                        <div class="quantity-selector">
                            <button type="button" id="decreaseQty" disabled>-</button>
                            <input type="number" id="ticketQuantity" value="1" min="1" readonly>
                            <button type="button" id="increaseQty" disabled>+</button>
                        </div>
                    </div>
                    <div class="form-section">
                        <h3>3. Isi Data Diri</h3>
                        <form id="customer-data-form" novalidate>${formFieldsHTML}</form>
                    </div>
                    <div class="form-section price-review-section">
                        <h3>Ringkasan Harga</h3>
                        <div id="price-review"><p>Pilih jenis tiket untuk melihat harga.</p></div>
                    </div>
                    <button id="buyButton" class="btn-primary" disabled>Beli Tiket</button>
                </div>
            </div>`;
        checkoutMain.innerHTML = layoutHTML;
    };

    const attachEventListeners = () => {
        document.querySelectorAll('input[name="ticket_choice"]').forEach(radio => {
            radio.addEventListener('change', () => {
                document.getElementById('increaseQty').disabled = false;
                document.getElementById('buyButton').disabled = false;
                updatePrice();
            });
        });
        document.getElementById('increaseQty').addEventListener('click', () => {
            const qtyInput = document.getElementById('ticketQuantity');
            qtyInput.value = parseInt(qtyInput.value) + 1;
            document.getElementById('decreaseQty').disabled = false;
            updatePrice();
        });
        document.getElementById('decreaseQty').addEventListener('click', () => {
            const qtyInput = document.getElementById('ticketQuantity');
            if (parseInt(qtyInput.value) > 1) {
                qtyInput.value = parseInt(qtyInput.value) - 1;
            }
            if (qtyInput.value == 1) {
                document.getElementById('decreaseQty').disabled = true;
            }
            updatePrice();
        });
        document.getElementById('buyButton').addEventListener('click', showReviewModal);
        document.querySelector('#reviewModal .close-button')?.addEventListener('click', () => {
            document.getElementById('reviewModal').style.display = 'none';
        });
        document.getElementById('closeFeedbackBtn')?.addEventListener('click', () => {
            document.getElementById('feedbackModal').style.display = 'none';
        });
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
        for (let [key, value] of formData.entries()) {
            formDataHTML += `<div class="review-row"><span>${key}</span><span>${value}</span></div>`;
        }
        const reviewDetailsContainer = document.getElementById('reviewDetails');
        reviewDetailsContainer.innerHTML = `
            <h4>Detail Pesanan:</h4>
            <div class="review-row"><span>Tiket</span><span>${selectedTicket.dataset.name} x ${quantity}</span></div>
            <div class="review-row"><span>Subtotal Tiket</span><span>Rp ${subtotal.toLocaleString('id-ID')}</span></div>
            <div class="review-row"><span>Biaya Admin</span><span>Rp ${totalAdminFee.toLocaleString('id-ID')}</span></div>
            <div class="review-row total"><span>Total Pembayaran</span><span>Rp ${finalTotal.toLocaleString('id-ID')}</span></div>
            <hr>
            <h4>Data Pemesan:</h4>
            ${formDataHTML}`;
        document.getElementById('reviewModal').style.display = 'flex';
    };
    
    buildPage();
});
