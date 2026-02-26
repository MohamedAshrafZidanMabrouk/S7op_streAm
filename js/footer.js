        // Load the footer from the external file
        document.addEventListener("DOMContentLoaded", function () {
            fetch("shared/footer.html")
                .then(response => response.text())
                .then(data => {
                    document.getElementById("footer-container").innerHTML = data;
                })
                .catch(error => console.error("Error loading footer:", error));
        });