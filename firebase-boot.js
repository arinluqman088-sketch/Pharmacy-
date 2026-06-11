import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDCIgvPGdmIj8SZXczW8cSNubyBBp9GcKY".replace("SZXc", "SZX"),
  authDomain: "ar-group-pharmacy.firebaseapp.com",
  projectId: "ar-group-pharmacy",
  storageBucket: "ar-group-pharmacy.firebasestorage.app",
  messagingSenderId: "882271082343",
  appId: "1:882271082343:web:fbb96bfe1446e379f0c1c2"
};

firebaseConfig.apiKey = "AIzaSyDCIgvPGdmIj8sZXCzW8cSNubyBBp9GcKY";

const LOCAL_KEY = "AR_PHARMACY_POS_V1";
const ACCESS_COLLECTION = "pharmacy_access";
const DATA_COLLECTION = "pharmacy_data";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let activePharmacyId = null;

async function cloudLogin(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  const uid = cred.user.uid;

  const accessRef = doc(db, ACCESS_COLLECTION, uid);
  const accessSnap = await getDoc(accessRef);

if (!accessSnap.exists()) {
  throw new Error("No pharmacy_access document for UID: " + uid);
}

  const access = accessSnap.data();
  const pharmacyId = access.pharmacyId;

  if (!pharmacyId) {
    throw new Error("pharmacyId بۆ ئەم user ـە دانەنراوە");
  }

  activePharmacyId = pharmacyId;

  const dataRef = doc(db, DATA_COLLECTION, pharmacyId);
  const dataSnap = await getDoc(dataRef);

  if (dataSnap.exists() && dataSnap.data().data) {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(dataSnap.data().data));
  }

  return {
    uid,
    email: cred.user.email,
    pharmacyId,
    role: access.role || "admin",
    name: access.name || cred.user.email
  };
}

async function cloudSave(data) {
  if (!activePharmacyId || !data) return;

  const dataRef = doc(db, DATA_COLLECTION, activePharmacyId);
  await setDoc(dataRef, {
    pharmacyId: activePharmacyId,
    data,
    updatedAt: serverTimestamp()
  }, { merge: true });
}

async function cloudLogout() {
  activePharmacyId = null;
  await signOut(auth);
}

window.AR_PHARMACY_CLOUD = {
  login: cloudLogin,
  save: cloudSave,
  logout: cloudLogout,
  getActivePharmacyId: () => activePharmacyId
};

const script = document.createElement("script");
script.src = "app.js?v=3";
document.body.appendChild(script);