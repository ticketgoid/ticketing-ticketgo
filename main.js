// File: main.js
document.addEventListener("DOMContentLoaded", () => {
    // Fungsi untuk memuat komponen HTML
    const loadComponent = (selector, filePath) => {
        fetch(filePath)
            .then(response => {
                if (!response.ok) throw new Error(`Gagal memuat ${filePath}`);
                return response.text();
            })
            .then(data => {
                const element = document.querySelector(selector);
                if (element) element.innerHTML = data;
            })
            .catch(error => console.error(error));
    };

    // Memuat footer ke dalam elemen <footer id="footer-placeholder">
    loadComponent("footer#footer-placeholder", "footer.html");

    // --- LOGIKA BARU UNTUK MENU HEADER ---
    const menuToggle = document.getElementById('menu-toggle');
    const closeMenuBtn = document.getElementById('close-menu-btn'); // Tombol close baru
    const navMenu = document.getElementById('nav-menu');
    const dropdownToggle = document.getElementById('dropdown-toggle');
    const dropdownContent = document.getElementById('dropdown-content');

    if (menuToggle && navMenu && closeMenuBtn) {
        // Tampilkan menu
        menuToggle.addEventListener('click', () => {
            navMenu.classList.add('active');
        });

        // Sembunyikan menu
        closeMenuBtn.addEventListener('click', () => {
            navMenu.classList.remove('active');
        });

        // Tampilkan/sembunyikan submenu
        if (dropdownToggle && dropdownContent) {
            dropdownToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                dropdownContent.classList.toggle('show');
            });
        }
    }
});
