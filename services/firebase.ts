import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyD_qVRzPGYgf6fdxsNMnwwqTWk8Hphtiuk",
  authDomain: "registro-jefe-de-turno-2026.firebaseapp.com",
  projectId: "registro-jefe-de-turno-2026",
  storageBucket: "registro-jefe-de-turno-2026.firebasestorage.app",
  messagingSenderId: "135445352312",
  appId: "1:135445352312:web:0dc221e5e8bd748280428d"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Offline persistence removed per requirement. 
// App will now require an active connection to function.