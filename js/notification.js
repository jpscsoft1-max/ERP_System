    // 🔔 Notification icon click toggle
    const notificationIcon = document.getElementById("notificationIcon");
    const notificationPanel = document.getElementById("notificationPanel");

    if (notificationIcon && notificationPanel) {
      notificationIcon.addEventListener("click", () => {
        notificationPanel.classList.toggle("show");
      });

      // Optional: hide the panel when clicking outside
      document.addEventListener("click", (event) => {
        // If the click is not on the bell or inside the panel, then hide it
        if (
          !notificationPanel.contains(event.target) &&
          !notificationIcon.contains(event.target)
        ) {
          notificationPanel.classList.remove("show");
        }
      });
      // ==================================================
// CHANGE: Hide notification panel only when user scrolls
// AFTER it is already open (prevents instant close on click)
// ==================================================

let lastScrollPosition = window.scrollY;

window.addEventListener("scroll", function () {
  const notificationPanel = document.getElementById("notificationPanel");

  if (!notificationPanel) return;

  const currentScrollPosition = window.scrollY;

  // Hide panel ONLY if page is actually scrolling
  if (
    notificationPanel.classList.contains("show") &&
    Math.abs(currentScrollPosition - lastScrollPosition) > 5
  ) {
    notificationPanel.classList.remove("show");
  }

  lastScrollPosition = currentScrollPosition;
});

    }