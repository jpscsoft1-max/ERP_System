// js/login-check.js
(function checkLoginStatus() {
  const isLoggedIn = localStorage.getItem("isLoggedIn");
  const isLoginPage = window.location.pathname.includes("login.html");

  // Redirect to login.html if not logged in
  if (isLoggedIn !== "true" && !isLoginPage) {
    window.location.href = "login.html";
  }
})();
