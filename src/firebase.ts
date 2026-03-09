import { initializeApp } from "firebase/app";
import { initializeFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDKww6DEmxgdeaCfhjP3JcZg-9cwGcNHgA",
  authDomain: "ai-chat-bot-c9d90.firebaseapp.com",
  databaseURL: "https://ai-chat-bot-c9d90-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "ai-chat-bot-c9d90",
  storageBucket: "ai-chat-bot-c9d90.firebasestorage.app",
  messagingSenderId: "1053271785803",
  appId: "1:1053271785803:web:59502232109d92bbfb68ce",
  measurementId: "G-YLC7L1FNWQ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore with long-polling to bypass potential network blocks
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
});

export const auth = getAuth(app);
