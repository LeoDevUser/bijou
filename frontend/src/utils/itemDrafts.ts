// Product drafts kept in this browser only — never sent to the server. They exist so a
// failed save (expired session, flaky upload) doesn't cost the admin a filled-in form.
// IndexedDB rather than localStorage because drafts carry the queued image/video files.

export const MAX_ITEM_DRAFTS = 5;

export interface ItemDraft<F> {
  id: string;
  savedAt: number;
  /** The item this draft edits (or that a failed save already created); null for a new one. */
  itemId: number | null;
  form: F;
  weightUnit: 'g' | 'oz';
  files: { file: File; name: string }[];
  picks: { publicId: string; resourceType: string; secureUrl: string }[];
}

const DB_NAME = 'bijou-admin';
const STORE = 'itemDrafts';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function run<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T> | void): Promise<T> {
  return openDb().then(db => new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const req = fn(tx.objectStore(STORE));
    tx.oncomplete = () => { db.close(); resolve(req ? req.result : (undefined as T)); };
    tx.onerror = () => { db.close(); reject(tx.error); };
    tx.onabort = () => { db.close(); reject(tx.error); };
  }));
}

/** Newest first. */
export async function listItemDrafts<F>(): Promise<ItemDraft<F>[]> {
  const all = await run<ItemDraft<F>[]>('readonly', s => s.getAll());
  return all.sort((a, b) => b.savedAt - a.savedAt);
}

/**
 * Saves (or overwrites, by id) a draft. Only the newest MAX_ITEM_DRAFTS are kept, so
 * saving a sixth drops the oldest. Returns how many were dropped.
 */
export async function saveItemDraft<F>(draft: ItemDraft<F>): Promise<number> {
  const others = (await listItemDrafts<F>()).filter(d => d.id !== draft.id);
  const evicted = others.slice(MAX_ITEM_DRAFTS - 1);
  await run('readwrite', s => {
    s.put(draft);
    evicted.forEach(d => s.delete(d.id));
  });
  return evicted.length;
}

export async function deleteItemDraft(id: string): Promise<void> {
  await run('readwrite', s => { s.delete(id); });
}

export function newDraftId(): string {
  return crypto.randomUUID();
}
