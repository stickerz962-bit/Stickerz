import { getApp, getApps, initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

type FirebaseWebConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
};

const env = import.meta.env;

function readFirebaseConfig(): FirebaseWebConfig | null {
  const config = {
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: env.VITE_FIREBASE_PROJECT_ID,
    appId: env.VITE_FIREBASE_APP_ID,
  };
  return Object.values(config).every(value => typeof value === 'string' && value.trim().length > 0)
    ? config as FirebaseWebConfig
    : null;
}

const config = readFirebaseConfig();

/** Firebase is optional until public web-app settings are supplied through environment variables. */
export const firebaseConfigured = config !== null;
export const firestore = config
  ? getFirestore(getApps().length ? getApp() : initializeApp(config))
  : null;
