import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit as fbLimit,
  type QueryConstraint,
  type WhereFilterOp,
} from "firebase/firestore";
import { getDb } from "./firebase";

export type DocItem = Record<string, unknown> & { id: string };

/** Live connectivity / sync state, surfaced to apps via `db.onStatus`. */
export interface SyncStatus {
  /** Whether the browser currently has a network connection. */
  online: boolean;
  /**
   * Whether this app has local writes that haven't been acknowledged by the
   * server yet (i.e. changes are queued and waiting to sync).
   */
  pending: boolean;
}

/**
 * Fire a write without blocking the caller on the server's acknowledgement.
 *
 * Firestore updates its local cache synchronously, so reads reflect the change
 * immediately; the returned SDK promise only settles once the server confirms
 * it. While offline that never happens, so awaiting it would hang the app —
 * instead we let writes queue and surface real failures (e.g. permission
 * denied) to the console.
 */
function fireWrite(p: Promise<unknown>): void {
  p.catch((err) => console.error("[mayapps] write failed to sync:", err));
}

export interface ListOptions {
  /** [field, op, value] tuples, e.g. ["done", "==", false]. */
  where?: [string, WhereFilterOp, unknown][];
  orderBy?: string | [string, "asc" | "desc"];
  limit?: number;
}

/**
 * The API injected into every mini-app as `db`. It is scoped to that app's own
 * subcollection (`appData/{appId}/items`), so one app can never read or write
 * another app's data, nor touch the `apps` registry.
 */
export interface ScopedDb {
  list(options?: ListOptions): Promise<DocItem[]>;
  get(id: string): Promise<DocItem | null>;
  create(data: Record<string, unknown>): Promise<string>;
  update(id: string, patch: Record<string, unknown>): Promise<void>;
  remove(id: string): Promise<void>;
  /**
   * Subscribe to online / sync status so an app can show a "syncing…" badge.
   * The callback fires immediately with the current status and again on every
   * change. Returns an unsubscribe function — call it when your app unmounts.
   */
  onStatus(callback: (status: SyncStatus) => void): () => void;
}

/** Deletes every item in an app's data subcollection. Returns how many were removed. */
export async function clearAppData(appId: string): Promise<number> {
  const items = collection(getDb(), "appData", appId, "items");
  const snap = await getDocs(items);
  await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
  return snap.size;
}

export function createScopedDb(appId: string): ScopedDb {
  const items = () => collection(getDb(), "appData", appId, "items");

  return {
    async list(options = {}) {
      const constraints: QueryConstraint[] = [];
      for (const [field, op, value] of options.where ?? []) {
        constraints.push(where(field, op, value));
      }
      if (options.orderBy) {
        const [field, dir] = Array.isArray(options.orderBy)
          ? options.orderBy
          : [options.orderBy, "asc" as const];
        constraints.push(orderBy(field, dir));
      }
      if (options.limit) constraints.push(fbLimit(options.limit));

      const snap = await getDocs(query(items(), ...constraints));
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as DocItem);
    },

    async get(id) {
      const snap = await getDoc(doc(items(), id));
      return snap.exists() ? ({ id: snap.id, ...snap.data() } as DocItem) : null;
    },

    async create(data) {
      // Generate the id client-side so it's available instantly offline; the
      // write itself queues and syncs in the background (see fireWrite).
      const ref = doc(items());
      fireWrite(setDoc(ref, data));
      return ref.id;
    },

    async update(id, patch) {
      fireWrite(updateDoc(doc(items(), id), patch));
    },

    async remove(id) {
      fireWrite(deleteDoc(doc(items(), id)));
    },

    onStatus(callback) {
      let online = typeof navigator === "undefined" ? true : navigator.onLine;
      let pending = false;
      const emit = () => callback({ online, pending });

      const goOnline = () => {
        online = true;
        emit();
      };
      const goOffline = () => {
        online = false;
        emit();
      };
      window.addEventListener("online", goOnline);
      window.addEventListener("offline", goOffline);

      // A metadata-aware snapshot tells us when this app's items have local
      // writes still waiting to reach the server.
      const unsubSnap = onSnapshot(
        query(items()),
        { includeMetadataChanges: true },
        (snap) => {
          pending = snap.metadata.hasPendingWrites;
          emit();
        },
        () => {
          /* ignore listen errors (e.g. transient offline states) */
        },
      );

      emit(); // deliver the initial status synchronously
      return () => {
        window.removeEventListener("online", goOnline);
        window.removeEventListener("offline", goOffline);
        unsubSnap();
      };
    },
  };
}
