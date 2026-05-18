import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const viteEnv = typeof import.meta !== 'undefined' && import.meta?.env
    ? import.meta.env
    : {};

const firebaseConfig = {
    apiKey: viteEnv.VITE_FIREBASE_API_KEY || '',
    authDomain: viteEnv.VITE_FIREBASE_AUTH_DOMAIN || '',
    projectId: viteEnv.VITE_FIREBASE_PROJECT_ID || '',
    storageBucket: viteEnv.VITE_FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: viteEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: viteEnv.VITE_FIREBASE_APP_ID || ''
};
const gameRecordEndpoint = (viteEnv.VITE_FIREBASE_GAMES_ENDPOINT || '').trim();

const appName = 'timur-game-records';
let firebaseAppInstance = null;
let firestoreInstance = null;
let authInstance = null;
let anonymousAuthPromise = null;

export function isGameRecordUploadEnabled() {
    return viteEnv.VITE_FIREBASE_GAMES_ENABLED === 'true';
}

export function hasFirebaseGamesConfig() {
    return Boolean(
        isGameRecordUploadEnabled()
        && firebaseConfig.apiKey
        && firebaseConfig.projectId
        && firebaseConfig.appId
    );
}

export function getGameRecordEndpoint() {
    return gameRecordEndpoint;
}

export function hasGameRecordEndpoint() {
    return Boolean(
        isGameRecordUploadEnabled()
        && gameRecordEndpoint
        && /^https?:\/\//.test(gameRecordEndpoint)
    );
}

export function getFirebaseGamesApp() {
    if (!hasFirebaseGamesConfig()) return null;
    if (firebaseAppInstance) return firebaseAppInstance;

    const existingApp = getApps().find((app) => app.name === appName);
    firebaseAppInstance = existingApp || initializeApp(firebaseConfig, appName);
    return firebaseAppInstance;
}

export function getGamesFirestore() {
    if (firestoreInstance) return firestoreInstance;

    const app = getFirebaseGamesApp();
    if (!app) return null;

    firestoreInstance = getFirestore(app);
    return firestoreInstance;
}

export function getGamesAuth() {
    if (authInstance) return authInstance;

    const app = getFirebaseGamesApp();
    if (!app) return null;

    authInstance = getAuth(app);
    return authInstance;
}

export function getCurrentGamesAuthUid() {
    return getGamesAuth()?.currentUser?.uid || null;
}

export function isAnonymousGamesAuthReady() {
    return Boolean(getCurrentGamesAuthUid());
}

export async function ensureAnonymousGamesAuth() {
    const auth = getGamesAuth();
    if (!auth) return null;
    if (auth.currentUser) return auth.currentUser;
    if (anonymousAuthPromise) return anonymousAuthPromise;

    anonymousAuthPromise = signInAnonymously(auth)
        .then((result) => result.user)
        .finally(() => {
            anonymousAuthPromise = null;
        });

    return anonymousAuthPromise;
}

export function subscribeGamesAuthState(listener) {
    const auth = getGamesAuth();
    if (!auth || typeof listener !== 'function') {
        return () => {};
    }

    return onAuthStateChanged(auth, listener);
}
