// =====================================================================
// 🔥 FIREBASE INITIALIZATION MODULE
// Owns Firebase App / Auth / Firestore / Analytics setup for the
// Creator & Business Dashboard. Hardcoded production config — the app
// connects to Firestore directly, no setup/placeholder fallback UI.
// =====================================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";
import { getAnalytics, isSupported as analyticsIsSupported } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-analytics.js";
import {
  getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup,
  signOut, setPersistence, browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
import {
  getFirestore, doc, setDoc, onSnapshot, serverTimestamp,
  collection, arrayUnion
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCIiTE42jmrnILw6sLo9xJt20Gjc49HUfM",
  authDomain: "creator-dashboard-466ad.firebaseapp.com",
  projectId: "creator-dashboard-466ad",
  storageBucket: "creator-dashboard-466ad.firebasestorage.app",
  messagingSenderId: "104966782824",
  appId: "1:104966782824:web:83f6eca6b832f04dd620dd",
  measurementId: "G-F00HK5PDM7"
};

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);
const firebaseReady = true;
const googleProvider = new GoogleAuthProvider();

setPersistence(auth, browserLocalPersistence).catch(err => console.warn("Auth persistence setup failed:", err));
analyticsIsSupported().then(supported => {
  if(supported){ try { getAnalytics(firebaseApp); } catch(e){ console.warn("Analytics init skipped:", e); } }
}).catch(() => {});

export {
  firebaseApp, auth, db, firebaseReady, googleProvider,
  onAuthStateChanged, signInWithPopup, signOut,
  doc, setDoc, onSnapshot, serverTimestamp, collection, arrayUnion
};
