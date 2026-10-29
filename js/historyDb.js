/**
 * CodexWithAnil — IndexedDB History Database (js/historyDb.js)
 * Stores converted PDFs permanently so you can re-download them anytime from the Dashboard!
 */

const DB_NAME = 'CodexWithAnil_PDF_DB';
const DB_VERSION = 1;
const STORE_NAME = 'conversion_history';

let dbInstance = null;

function openHistoryDb() {
  return new Promise((resolve, reject) => {
    if (dbInstance) {
      resolve(dbInstance);
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
    req.onsuccess = (e) => {
      dbInstance = e.target.result;
      resolve(dbInstance);
    };
    req.onerror = (e) => reject(e.target.error);
  });
}

/**
 * Save a converted PDF record with its Blob
 */
async function saveToHistory(record) {
  try {
    const db = await openHistoryDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_NAME], 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put({
        id: record.id || 'rec_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
        name: record.name,
        pages: record.pages || 1,
        size: record.size || 0,
        date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
        timestamp: Date.now(),
        pdfBlob: record.pdfBlob, // Actual binary PDF blob
      });
      tx.oncomplete = () => resolve(true);
      tx.onerror = (e) => reject(e.target.error);
    });
  } catch (err) {
    console.warn('History save error:', err);
    return false;
  }
}

/**
 * Fetch all history items sorted by newest first
 */
async function getConversionHistory() {
  try {
    const db = await openHistoryDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_NAME], 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => {
        const items = req.result || [];
        items.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        resolve(items);
      };
      req.onerror = (e) => reject(e.target.error);
    });
  } catch (err) {
    console.warn('History fetch error:', err);
    return [];
  }
}

/**
 * Delete a specific record from history
 */
async function deleteFromHistory(id) {
  try {
    const db = await openHistoryDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_NAME], 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete(id);
      tx.oncomplete = () => resolve(true);
      tx.onerror = (e) => reject(e.target.error);
    });
  } catch (err) {
    console.warn('History delete error:', err);
  }
}

/**
 * Clear all history
 */
async function clearAllHistory() {
  try {
    const db = await openHistoryDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_NAME], 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.clear();
      tx.oncomplete = () => resolve(true);
      tx.onerror = (e) => reject(e.target.error);
    });
  } catch (err) {
    console.warn('History clear error:', err);
  }
}
