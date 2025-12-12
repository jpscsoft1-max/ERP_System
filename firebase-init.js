// firebase-init.js

// Import Firebase SDK modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAKU70Qs8feJxgG6hEp8Vfywa6Prw0FIHU",
  authDomain: "erpsoftware-ad263.firebaseapp.com",
  projectId: "erpsoftware-ad263",
  storageBucket: "erpsoftware-ad263.appspot.com",
  messagingSenderId: "942427398078",
  appId: "1:942427398078:web:02dba330293cb7b93be3ef",
  measurementId: "G-GQL3ZE37H8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
const db = getFirestore(app);

// Export both Firebase app and Firestore DB
export { app, db };
