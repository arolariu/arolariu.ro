import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const app = initializeApp(firebaseConfig);

// TODO: Implement logging via Firebase Analytics
// Reference: https://firebase.google.com/docs/analytics/get-started?platform=web&authuser=0&hl=en#start_logging_events_2
const analytics = getAnalytics(app);

// TODO: Implement Firebase authentication
// Reference: https://firebase.google.com/docs/auth/web/start?authuser=0&hl=en#add-initialize-sdk
const auth = getAuth(app);

const firestore = getFirestore();
export { firestore };
