const userRole = localStorage.getItem("userRole");

const allowedRoutes = {
  admin: ["Home", "Departments", "Work Order", "Purchasing", "Sales", "Inventory", "Finance", "Employees", "Generate Login Details", "Company Info"],
  hr: ["Home", "Departments", "Work Order", "Employees", "Generate Login Details", "Company Info"],
  technical: ["Home", "Work Order", "Purchasing", "Inventory", "Company Info"],
  production: ["Home", "Work Order", "Inventory", "Company Info"],
  sales: ["Home", "Work Order", "Sales", "Inventory", "Company Info"],
  store: ["Home", "Purchasing", "Inventory", "Company Info"]
};

document.querySelectorAll(".sidebar ul li a").forEach(link => {
  const text = link.textContent.trim();
  if (!allowedRoutes[userRole]?.includes(text)) {
    link.parentElement.style.display = "none";
  }
});

// Optional: Update top-right name
const profileText = document.querySelector(".profile-icon");
if (profileText && userRole) {
profileText.innerHTML = `👤 ${userRole.charAt(0).toUpperCase() + userRole.slice(1)}`;
}
