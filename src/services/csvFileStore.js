// Keeps each Data Profiling record's CSV file in the browser (IndexedDB), so a
// record can still run after a page reload. localStorage cannot hold files.
// Every call resolves (never throws): if storage is unavailable, callers fall
// back to the in-memory copy.

const DB_NAME = 'datamba-profiling';
const STORE = 'csv-files';

let dbPromise = null;

function openDb() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 2);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(STORE)) {
          request.result.createObjectStore(STORE);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    }).catch((error) => {
      dbPromise = null;
      throw error;
    });
  }
  return dbPromise;
}

async function run(mode, action) {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE, mode);
      const request = action(transaction.objectStore(STORE));
      transaction.oncomplete = () => resolve(request.result);
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } catch (error) {
    console.warn('CSV file store unavailable:', error);
    return undefined;
  }
}

export async function saveCsvFile(profileId, file) {
  await run('readwrite', (store) => store.put(file, profileId));
}

export async function loadCsvFile(profileId) {
  const file = await run('readonly', (store) => store.get(profileId));
  return file instanceof Blob ? file : null;
}

export async function deleteCsvFile(profileId) {
  await run('readwrite', (store) => store.delete(profileId));
}
