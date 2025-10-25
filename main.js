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
    const navMenu = document.getElementById('nav-menu');
    const dropdownToggle = document.getElementById('dropdown-toggle');
    const dropdownContent = document.getElementById('dropdown-content');

    if (menuToggle && navMenu) {
        // Tampilkan/sembunyikan menu utama
        menuToggle.addEventListener('click', (e) => {
            e.stopPropagation(); // Mencegah klik menyebar ke document
            navMenu.classList.toggle('active');
        });

        // Tampilkan/sembunyikan submenu
        if (dropdownToggle && dropdownContent) {
            dropdownToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                dropdownContent.classList.toggle('show');
            });
        }

        // Sembunyikan menu jika klik di luar area menu
        document.addEventListener('click', (e) => {
            if (!navMenu.contains(e.target) && !menuToggle.contains(e.target)) {
                navMenu.classList.remove('active');
                if (dropdownContent) {
                    dropdownContent.classList.remove('show');
                }
            }
        });
    }
});
