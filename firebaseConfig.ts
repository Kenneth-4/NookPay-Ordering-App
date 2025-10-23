import { initializeApp, FirebaseApp, getApps } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { getDatabase } from 'firebase/database';
import { getFunctions, Functions } from 'firebase/functions';

// Your web app's Firebase configuration
export const firebaseConfig = {
  apiKey: "AIzaSyDsCFZcZfTD3M804Muh5kL-P9tiS1w6ExY",
  authDomain: "noooknest.firebaseapp.com",
  databaseURL: "https://noooknest-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "noooknest",
  storageBucket: "noooknest.appspot.com",
  messagingSenderId: "785540904852",
  appId: "1:785540904852:web:4f6e5c5a3d0f7d0a6f5e7c"
};

// Initialize Firebase
let app: FirebaseApp;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

// Initialize Firebase services
export const db: Firestore = getFirestore(app);
export const auth: Auth = getAuth(app);
export const storage: FirebaseStorage = getStorage(app);
export const database = getDatabase(app);
export const functions: Functions = getFunctions(app);

export default app;
