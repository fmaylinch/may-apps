import {
  initializeApp,
  getApps,
  getApp,
  type FirebaseApp,
  type FirebaseOptions,
} from "firebase/app";
import {
  initializeFirestore,
  getFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from "firebase/firestore";

const STORAGE_KEY = "mayapps:firebaseConfig";

/**
 * The Firebase client config is a *publishable* object (apiKey, projectId, ...),
 * not a secret. Real access control lives in Firestore Security Rules. That's why
 * persisting it in localStorage is acceptable here.
 */
export function loadConfig(): FirebaseOptions | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as FirebaseOptions;
  } catch {
    return null;
  }
}

export function saveConfig(config: FirebaseOptions): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function clearConfig(): void {
  window.localStorage.removeItem(STORAGE_KEY);
}

let cachedDb: Firestore | null = null;

/** Returns a Firestore instance, initializing the Firebase app once. */
export function getDb(): Firestore {
  if (cachedDb) return cachedDb;
  const config = loadConfig();
  if (!config) throw new Error("No Firebase config saved. Connect first.");
  const app: FirebaseApp = getApps().length ? getApp() : initializeApp(config);
  // Offline-first: persist reads and queue writes in IndexedDB so mini-apps keep
  // working without a connection and sync automatically when it returns. Multi-tab
  // support keeps several open tabs consistent against the one shared cache.
  try {
    cachedDb = initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    });
  } catch {
    // Persistence may be unavailable (e.g. private browsing, or Firestore was
    // already initialized for this app) — fall back to the in-memory default.
    cachedDb = getFirestore(app);
  }
  return cachedDb;
}
