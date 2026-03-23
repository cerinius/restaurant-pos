type OfflineActionType = 'ADD_ITEMS' | 'FIRE_ORDER';

export interface OfflineAction {
  id: string;
  type: OfflineActionType;
  payload: Record<string, any>;
  createdAt: number;
}

const DB_NAME = 'restaurant-pos-offline';
const STORE_NAME = 'actions';
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  handler: (store: IDBObjectStore) => IDBRequest<T>,
) {
  const db = await openDB();

  return new Promise<T>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, mode);
    const store = transaction.objectStore(STORE_NAME);
    const request = handler(store);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => db.close();
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function enqueueOfflineAction(type: OfflineActionType, payload: Record<string, any>) {
  if (typeof window === 'undefined' || typeof indexedDB === 'undefined') return;

  await withStore('readwrite', (store) =>
    store.put({
      id: `${type}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      type,
      payload,
      createdAt: Date.now(),
    }),
  );
}

export async function getOfflineActions() {
  if (typeof window === 'undefined' || typeof indexedDB === 'undefined') return [] as OfflineAction[];
  const actions = await withStore('readonly', (store) => store.getAll());
  return (actions as OfflineAction[]).sort((left, right) => left.createdAt - right.createdAt);
}

export async function removeOfflineAction(id: string) {
  if (typeof window === 'undefined' || typeof indexedDB === 'undefined') return;
  await withStore('readwrite', (store) => store.delete(id));
}

export async function flushOfflineActions(processor: (action: OfflineAction) => Promise<void>) {
  const actions = await getOfflineActions();

  for (const action of actions) {
    await processor(action);
    await removeOfflineAction(action.id);
  }
}
