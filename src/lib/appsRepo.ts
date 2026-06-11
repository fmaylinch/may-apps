import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  orderBy,
  query,
} from "firebase/firestore";
import { getDb } from "./firebase";
import type { AppDraft, MiniApp } from "./types";

const COLLECTION = "apps";

/** Lists every stored mini-app, most recently updated first. */
export async function listApps(): Promise<MiniApp[]> {
  const db = getDb();
  const snap = await getDocs(query(collection(db, COLLECTION), orderBy("updatedAt", "desc")));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<MiniApp, "id">) }));
}

export async function getApp_(id: string): Promise<MiniApp | null> {
  const db = getDb();
  const snap = await getDoc(doc(db, COLLECTION, id));
  return snap.exists() ? { id: snap.id, ...(snap.data() as Omit<MiniApp, "id">) } : null;
}

export async function createApp(draft: AppDraft): Promise<string> {
  const db = getDb();
  const now = Date.now();
  const ref = doc(collection(db, COLLECTION));
  await setDoc(ref, { ...draft, createdAt: now, updatedAt: now });
  return ref.id;
}

export async function updateApp(id: string, draft: AppDraft): Promise<void> {
  const db = getDb();
  await updateDoc(doc(db, COLLECTION, id), { ...draft, updatedAt: Date.now() });
}

export async function deleteApp(id: string): Promise<void> {
  const db = getDb();
  await deleteDoc(doc(db, COLLECTION, id));
}
