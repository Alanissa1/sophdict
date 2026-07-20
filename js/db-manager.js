/**
 * IndexedDB Manager - Permanent Storage
 */

const DB_NAME = 'SophDictCachePermanentV1';
const STORE_NAME = 'wordData';
const PIN_STORE = 'pinnedWords';

window.DBManager = {
    db: null,

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, 1);

            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME, { keyPath: 'word' });
                }
                if (!db.objectStoreNames.contains(PIN_STORE)) {
                    db.createObjectStore(PIN_STORE, { keyPath: 'word' });
                }
            };

            request.onsuccess = (e) => {
                this.db = e.target.result;
                console.log('[DB] IndexedDB initialized');
                resolve(this.db);
            };

            request.onerror = (e) => {
                console.error('[DB] Failed to open IndexedDB', e);
                reject(e);
            };
        });
    },

    async getWord(word) {
        return this.get(STORE_NAME, word.toLowerCase());
    },

    async saveWord(word, data) {
        return this.put(STORE_NAME, { word: word.toLowerCase(), ...data });
    },

    async getPinned() {
        return this.getAll(PIN_STORE);
    },

    async addPin(word) {
        return this.put(PIN_STORE, { word: word.toLowerCase() });
    },

    async removePin(word) {
        return this.delete(PIN_STORE, word.toLowerCase());
    },

    async isPinned(word) {
        const pin = await this.get(PIN_STORE, word.toLowerCase());
        return !!pin;
    },

    get(storeName, key) {
        return new Promise((resolve) => {
            if (!this.db) return resolve(null);
            const tx = this.db.transaction(storeName, 'readonly');
            const req = tx.objectStore(storeName).get(key);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => resolve(null);
        });
    },

    put(storeName, data) {
        return new Promise((resolve) => {
            if (!this.db) return resolve(null);
            const tx = this.db.transaction(storeName, 'readwrite');
            const req = tx.objectStore(storeName).put(data);
            req.onsuccess = () => resolve(true);
            req.onerror = () => resolve(false);
        });
    },

    delete(storeName, key) {
        return new Promise((resolve) => {
            if (!this.db) return resolve(null);
            const tx = this.db.transaction(storeName, 'readwrite');
            const req = tx.objectStore(storeName).delete(key);
            req.onsuccess = () => resolve(true);
            req.onerror = () => resolve(false);
        });
    },

    getAll(storeName) {
        return new Promise((resolve) => {
            if (!this.db) return resolve([]);
            const tx = this.db.transaction(storeName, 'readonly');
            const req = tx.objectStore(storeName).getAll();
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => resolve([]);
        });
    }
};
