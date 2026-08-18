/**
 * IndexedDB storage service for PDF study annotations and page-linked notes.
 * Keeps PDF data local without bloating localStorage or sending files to any backend.
 */

const DB_NAME = 'StudySyncPDFDB';
const DB_VERSION = 1;
const ANNOTATION_STORE = 'annotations';
const NOTES_STORE = 'notes';

const openDB = () => {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error('IndexedDB is not supported in this browser environment.'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(ANNOTATION_STORE)) {
        db.createObjectStore(ANNOTATION_STORE, { keyPath: 'docFingerprint' });
      }
      if (!db.objectStoreNames.contains(NOTES_STORE)) {
        db.createObjectStore(NOTES_STORE, { keyPath: 'docFingerprint' });
      }
    };

    request.onsuccess = (event) => resolve(event.target.result);
    request.onerror = (event) => reject(event.target.error);
  });
};

export const pdfAnnotationStorage = {
  getAnnotations: async (docFingerprint) => {
    if (!docFingerprint) return [];
    try {
      const db = await openDB();
      return new Promise((resolve) => {
        const tx = db.transaction(ANNOTATION_STORE, 'readonly');
        const store = tx.objectStore(ANNOTATION_STORE);
        const req = store.get(docFingerprint);
        req.onsuccess = () => resolve(req.result?.items || []);
        req.onerror = () => resolve([]);
      });
    } catch (e) {
      console.warn('IndexedDB read error for annotations:', e);
      return [];
    }
  },

  saveAnnotations: async (docFingerprint, items) => {
    if (!docFingerprint) return;
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(ANNOTATION_STORE, 'readwrite');
        const store = tx.objectStore(ANNOTATION_STORE);
        const req = store.put({ docFingerprint, items, updatedAt: new Date().toISOString() });
        req.onsuccess = () => resolve(true);
        req.onerror = (err) => reject(err);
      });
    } catch (e) {
      console.warn('IndexedDB write error for annotations:', e);
    }
  },

  getNotes: async (docFingerprint) => {
    if (!docFingerprint) return [];
    try {
      const db = await openDB();
      return new Promise((resolve) => {
        const tx = db.transaction(NOTES_STORE, 'readonly');
        const store = tx.objectStore(NOTES_STORE);
        const req = store.get(docFingerprint);
        req.onsuccess = () => resolve(req.result?.items || []);
        req.onerror = () => resolve([]);
      });
    } catch (e) {
      console.warn('IndexedDB read error for notes:', e);
      return [];
    }
  },

  saveNotes: async (docFingerprint, items) => {
    if (!docFingerprint) return;
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(NOTES_STORE, 'readwrite');
        const store = tx.objectStore(NOTES_STORE);
        const req = store.put({ docFingerprint, items, updatedAt: new Date().toISOString() });
        req.onsuccess = () => resolve(true);
        req.onerror = (err) => reject(err);
      });
    } catch (e) {
      console.warn('IndexedDB write error for notes:', e);
    }
  }
};
