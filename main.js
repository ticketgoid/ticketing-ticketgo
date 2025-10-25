// File: main.js
document.addEventListener("DOMContentLoaded", () => {
    // Fungsi untuk memuat komponen HTML
    const loadComponent = (selector, filePath) => {
        fetch(filePath)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Gagal memuat ${filePath}`);
                }
                return response.text();
            })
            .then(data => {
                const element = document.querySelector(selector);
                if (element) {
                    element.innerHTML = data;
                }
            })
            .catch(error => console.error(error));
    };

    // Memuat footer ke dalam elemen <footer id="footer-placeholder"></footer>
    loadComponent("footer#footer-placeholder", "footer.html");
});
