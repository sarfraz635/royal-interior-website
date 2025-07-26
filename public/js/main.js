document.addEventListener("DOMContentLoaded", () => {
  // ==== Scroll-to-top button ====
  const scrollTopBtn = document.getElementById("scrollTopBtn");

  window.addEventListener("scroll", () => {
    if (document.body.scrollTop > 200 || document.documentElement.scrollTop > 200) {
      scrollTopBtn.style.display = "block";
    } else {
      scrollTopBtn.style.display = "none";
    }
  });

  if (scrollTopBtn) {
    scrollTopBtn.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  // ==== Side Drawer (Hamburger Menu) ====
  const menuButton = document.getElementById("menu-toggle");
  const mobileMenu = document.getElementById("side-drawer");
  const overlay = document.getElementById("overlay");

  if (menuButton && mobileMenu && overlay) {
    menuButton.addEventListener("click", () => {
      mobileMenu.classList.toggle("active");
      overlay.classList.toggle("active");
    });

    overlay.addEventListener("click", () => {
      mobileMenu.classList.remove("active");
      overlay.classList.remove("active");
    });
  }

  // ==== Delete Image (Without Reload) ====
  document.body.addEventListener("click", async (e) => {
    if (e.target.classList.contains("delete-btn")) {
      const card = e.target.closest(".card");
      const filename = e.target.dataset.filename;
      const folder = e.target.dataset.folder;

      if (!filename || !folder || !card) return;

      const confirmDelete = confirm(`Are you sure you want to delete "${filename}"?`);
      if (!confirmDelete) return;

      try {
        const res = await fetch("/delete-image", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ filename, folder }),
        });

        const data = await res.json();

        if (res.ok && data.success) {
          card.remove(); // 🧹 remove from DOM
          alert("Image deleted successfully.");
        } else {
          alert(data.message || "Failed to delete image.");
        }
      } catch (err) {
        console.error("Delete error:", err);
        alert("An error occurred during deletion.");
      }
    }
  });
});

// ==== Lightbox Functionality ====
function enableImageLightbox(selector) {
  const images = document.querySelectorAll(selector);
  images.forEach((img) => {
    if (!img.dataset.lightboxBound) {
      img.dataset.lightboxBound = "true"; // Prevent rebinding

      img.addEventListener("click", () => {
        const existing = document.getElementById("fullscreen-overlay");
        if (existing) existing.remove();

        const overlay = document.createElement("div");
        overlay.id = "fullscreen-overlay";
        Object.assign(overlay.style, {
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          background: "rgba(0, 0, 0, 0.85)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 10000,
        });

        const fullImage = document.createElement("img");
        fullImage.src = img.src;
        Object.assign(fullImage.style, {
          maxWidth: "90%",
          maxHeight: "85%",
          border: "4px solid #d4af37",
          borderRadius: "10px",
          boxShadow: "0 0 20px #d4af37",
        });

        overlay.appendChild(fullImage);
        document.body.appendChild(overlay);

        overlay.addEventListener("click", () => {
          overlay.remove();
        });
      });
    }
  });
}

// ==== Initialize Lightbox on Static and Dynamic Content ====
window.addEventListener("load", () => {
  // Static grids
  enableImageLightbox(".portfolio-grid img");
  enableImageLightbox(".service-grid img");
  enableImageLightbox(".product-grid img");

  // Observe for dynamically added content (e.g., uploaded gallery or portfolio images)
  const gridsToObserve = document.querySelectorAll(".portfolio-grid, .gallery-grid");
  gridsToObserve.forEach((grid) => {
    const observer = new MutationObserver(() => {
      enableImageLightbox(".portfolio-grid img");
      enableImageLightbox(".gallery-grid img");
    });
    observer.observe(grid, { childList: true, subtree: true });
  });
});