// Scroll-to-top button
const scrollTopBtn = document.getElementById("scrollTopBtn");

window.onscroll = function () {
  if (document.body.scrollTop > 200 || document.documentElement.scrollTop > 200) {
    scrollTopBtn.style.display = "block";
  } else {
    scrollTopBtn.style.display = "none";
  }
};

scrollTopBtn.addEventListener("click", function () {
  window.scrollTo({ top: 0, behavior: "smooth" });
});

// Lightbox for images
function enableImageLightbox(selector) {
  const images = document.querySelectorAll(selector);
  images.forEach((img) => {
    img.addEventListener("click", () => {
      const overlay = document.createElement("div");
      overlay.style.position = "fixed";
      overlay.style.top = 0;
      overlay.style.left = 0;
      overlay.style.width = "100%";
      overlay.style.height = "100%";
      overlay.style.background = "rgba(0, 0, 0, 0.8)";
      overlay.style.display = "flex";
      overlay.style.alignItems = "center";
      overlay.style.justifyContent = "center";
      overlay.style.zIndex = 10000;

      const fullImage = document.createElement("img");
      fullImage.src = img.src;
      fullImage.style.maxWidth = "90%";
      fullImage.style.maxHeight = "80%";
      fullImage.style.border = "4px solid #d4af37";
      fullImage.style.borderRadius = "10px";

      overlay.appendChild(fullImage);
      document.body.appendChild(overlay);

      overlay.addEventListener("click", () => {
        document.body.removeChild(overlay);
      });
    });
  });
}

enableImageLightbox(".portfolio-grid img");
enableImageLightbox(".service-grid img");
enableImageLightbox(".product-grid img");

// ===== Side Drawer Mobile Menu Toggle =====
const menuButton = document.getElementById("menu-toggle");
const mobileMenu = document.getElementById("navbar");
const overlay = document.getElementById("menu-overlay");

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