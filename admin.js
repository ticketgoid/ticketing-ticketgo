document.addEventListener('DOMContentLoaded', () => {
    if (!sessionStorage.getItem('isAdminAuthenticated')) {
        const password = prompt("Sesi admin tidak ditemukan. Masukkan password:");
        if (password === "uns2025") {
            sessionStorage.setItem('isAdminAuthenticated', 'true');
        } else {
            alert("Password salah. Mengalihkan ke halaman utama.");
            window.location.href = 'index.html';
            return;
        }
    }

    const eventForm = document.getElementById('eventForm');
    const formTitle = document.getElementById('formTitle');
    const submitButton = document.getElementById('submitButton');
    const cancelButton = document.getElementById('cancelButton');
    const eventIndexInput = document.getElementById('eventIndex');
    const publishedEventsList = document.getElementById('publishedEventsList');
    const imageInput = document.getElementById('image');

    let events = JSON.parse(localStorage.getItem('events')) || [];

    function saveEvents() {
        localStorage.setItem('events', JSON.stringify(events));
    }

    function renderEvents() {
        publishedEventsList.innerHTML = '';
        if (events.length === 0) {
            publishedEventsList.innerHTML = '<p>Belum ada event yang ditambahkan.</p>';
            return;
        }
        events.forEach((event, index) => {
            const eventItem = document.createElement('div');
            eventItem.className = 'event-item';
            eventItem.innerHTML = `
                <img src="${event.image}" alt="${event.title}">
                <div class="event-info">
                    <h3>${event.title}</h3>
                    <p>${event.location} - ${event.date}</p>
                </div>
                <div class="event-actions">
                    <button class="edit-btn" data-index="${index}">Edit</button>
                    <button class="delete-btn" data-index="${index}">Hapus</button>
                </div>
            `;
            publishedEventsList.appendChild(eventItem);
        });
    }

    function resetForm() {
        eventForm.reset();
        eventIndexInput.value = '';
        formTitle.textContent = 'Tambah Event Baru';
        submitButton.textContent = 'Tambah Event';
        cancelButton.style.display = 'none';
        updateDropZoneThumbnail(null); // Hapus thumbnail
    }

    publishedEventsList.addEventListener('click', (e) => {
        const index = e.target.dataset.index;
        if (e.target.classList.contains('delete-btn')) {
            if (confirm(`Apakah Anda yakin ingin menghapus event "${events[index].title}"?`)) {
                events.splice(index, 1);
                saveEvents();
                renderEvents();
            }
        } else if (e.target.classList.contains('edit-btn')) {
            const event = events[index];
            document.getElementById('title').value = event.title;
            imageInput.value = event.image;
            document.getElementById('location').value = event.location;
            document.getElementById('date').value = event.date;
            document.getElementById('time').value = event.time;
            document.getElementById('price').value = event.price;
            document.getElementById('tag').value = event.tag;
            document.getElementById('description').value = event.description;
            
            updateDropZoneThumbnail(event.image); // Tampilkan gambar yang ada
            eventIndexInput.value = index;
            formTitle.textContent = 'Edit Event';
            submitButton.textContent = 'Simpan Perubahan';
            cancelButton.style.display = 'block';
            window.scrollTo(0, 0);
        }
    });

    eventForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const eventIndex = eventIndexInput.value;
        const eventData = {
            title: document.getElementById('title').value,
            image: imageInput.value,
            location: document.getElementById('location').value,
            date: document.getElementById('date').value,
            time: document.getElementById('time').value,
            price: document.getElementById('price').value,
            tag: document.getElementById('tag').value,
            description: document.getElementById('description').value,
        };

        if (eventIndex === '') {
            events.push(eventData);
            alert('Event berhasil ditambahkan!');
        } else {
            events[eventIndex] = eventData;
            alert('Event berhasil diperbarui!');
        }
        saveEvents();
        renderEvents();
        resetForm();
    });

    cancelButton.addEventListener('click', resetForm);

    // ## KODE BARU: FUNGSI DRAG & DROP GAMBAR ##
    const dropZone = document.getElementById('dropZone');
    const imageFileInput = document.getElementById('imageFile');
    const thumbnailElement = dropZone.querySelector(".drop-zone-thumb");

    function updateDropZoneThumbnail(dataUrl) {
        if (dataUrl) {
            dropZone.classList.add("drop-zone--thumb-visible");
            thumbnailElement.src = dataUrl;
        } else {
            dropZone.classList.remove("drop-zone--thumb-visible");
            thumbnailElement.src = "";
        }
    }

    dropZone.addEventListener("click", () => imageFileInput.click());
    imageFileInput.addEventListener("change", () => {
        if (imageFileInput.files.length) {
            handleFile(imageFileInput.files[0]);
        }
    });

    dropZone.addEventListener("dragover", e => {
        e.preventDefault();
        dropZone.classList.add("drop-zone--over");
    });

    ["dragleave", "dragend"].forEach(type => {
        dropZone.addEventListener(type, () => dropZone.classList.remove("drop-zone--over"));
    });

    dropZone.addEventListener("drop", e => {
        e.preventDefault();
        if (e.dataTransfer.files.length) {
            imageFileInput.files = e.dataTransfer.files;
            handleFile(e.dataTransfer.files[0]);
        }
        dropZone.classList.remove("drop-zone--over");
    });

    function handleFile(file) {
        // Tampilkan thumbnail dan ubah file gambar menjadi Base64
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const dataUrl = reader.result;
            updateDropZoneThumbnail(dataUrl);
            imageInput.value = dataUrl; // Masukkan data Base64 ke input URL
        };
    }

    renderEvents();
});