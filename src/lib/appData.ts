import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit as fbLimit,
  type QueryConstraint,
  type WhereFilterOp,
} from "firebase/firestore";
import { getDb } from "./firebase";

export type DocItem = Record<string, unknown> & { id: string };

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
      const ref = await addDoc(items(), data);
      return ref.id;
    },

    async update(id, patch) {
      await updateDoc(doc(items(), id), patch);
    },

    async remove(id) {
      await deleteDoc(doc(items(), id));
    },
  };
}
