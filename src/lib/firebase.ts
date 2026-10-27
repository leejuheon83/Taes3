import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyD14ph4HzsutXSgxCkzvCM7_rndZOSgZkU",
  authDomain: "taes-fc.firebaseapp.com",
  projectId: "taes-fc",
  storageBucket: "taes-fc.firebasestorage.app",
  messagingSenderId: "988274056719",
  appId: "1:988274056719:web:c267a1f5d77a912c700d7a"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const db = getFirestore(app);
export const storage = getStorage(app);
