import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';

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
const app = config ? (getApps().length ? getApp() : initializeApp(config)) : null;

/** Public Firebase web configuration only; authorization is enforced by Auth claims and Firestore rules. */
export const firebaseConfigured = config !== null;
export const auth = app ? getAuth(app) : null;
export const firestore = app ? getFirestore(app) : null;
export const functions = app ? getFunctions(app, 'us-central1') : null;
