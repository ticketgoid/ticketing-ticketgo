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

    // Memuat footer
    loadComponent("footer#footer-placeholder", "footer.html");

    // --- LOGIKA HEADER DIPERBARUI ---
    const menuToggle = document.getElementById('menu-toggle');
    const navMenu = document.getElementById('nav-menu');
    const dropdownToggle = document.getElementById('dropdown-toggle');
    const dropdownContent = document.getElementById('dropdown-content');

    if (menuToggle && navMenu) {
        // Tampilkan/sembunyikan menu utama dengan mengubah tombol
        menuToggle.addEventListener('click', () => {
            navMenu.classList.toggle('active');
            menuToggle.classList.toggle('active'); // <-- Tambahan: Toggle kelas pada tombol
        });

        // Tampilkan/sembunyikan submenu
        if (dropdownToggle && dropdownContent) {
            dropdownToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                dropdownContent.classList.toggle('show');
            });
        }
        
        // Sembunyikan menu jika klik di luar
        document.addEventListener('click', (e) => {
            if (!navMenu.contains(e.target) && !menuToggle.contains(e.target)) {
                navMenu.classList.remove('active');
                menuToggle.classList.remove('active'); // <-- Tambahan: Hapus kelas aktif dari tombol juga
                if (dropdownContent) {
                    dropdownContent.classList.remove('show');
                }
            }
        });
    }
});
