import { initializeApp } from "firebase/app";
// 💡 getAuth အစား initializeAuth နှင့် getReactNativePersistence ကို သုံးပါမည်
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import { initializeFirestore, memoryLocalCache } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";

const firebaseConfig = {
  apiKey: "AIzaSyCVKY4KFbw33pUQvW9tHCKf8Iz7kVIMTA4",
  authDomain: "mikroisp-kmo.firebaseapp.com",
  projectId: "mikroisp-kmo",
  storageBucket: "mikroisp-kmo.firebasestorage.app",
  messagingSenderId: "646981557684",
  appId: "1:646981557684:web:c011d2fcb676656d8fe6e1",
  measurementId: "G-FY7FTQPPL0",
};

const app = initializeApp(firebaseConfig);

// ✅ React Native အတွက် Login အမြဲဖြစ်နေစေမည့် Setting
// အရင်သုံးခဲ့သော 'getAuth(app)' နေရာတွင် ဤသည်ဖြင့် အစားထိုးပါ
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

const db = initializeFirestore(app, {
  localCache: memoryLocalCache(),
});

// 💡 အခြား js ဖိုင်များမှ ခေါ်သုံးနေသည့် အမည်များကို မပြောင်းလဲဘဲ export လုပ်ပါသည်
export { auth, db };
