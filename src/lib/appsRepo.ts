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

/** Turns a free-text name into a valid, readable document id (e.g. "My App" → "my-app"). */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

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

export async function createApp(id: string, draft: AppDraft): Promise<string> {
  const db = getDb();
  const ref = doc(db, COLLECTION, id);
  if ((await getDoc(ref)).exists()) {
    throw new Error(`An app with id "${id}" already exists.`);
  }
  const now = Date.now();
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
