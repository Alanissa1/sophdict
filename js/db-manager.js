/**
 * IndexedDB Manager - Permanent Storage
 */

const DB_NAME = 'SophDictCachePermanentV1';
const STORE_NAME = 'wordData';
const PIN_STORE = 'pinnedWords';

window.DBManager = {
    db: null,
    _initPromise: null,

    async init() {
        if (this._initPromise) return this._initPromise;
        this._initPromise = new Promise((resolve, reject) => {
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
                this._initPromise = null;
                reject(e);
            };
        });
        return this._initPromise;
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

    async get(storeName, key) {
        if (!this.db) await this.init();
        return new Promise((resolve) => {
            const tx = this.db.transaction(storeName, 'readonly');
            const req = tx.objectStore(storeName).get(key);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => resolve(null);
        });
    },

    async put(storeName, data) {
        if (!this.db) await this.init();
        return new Promise((resolve) => {
            const tx = this.db.transaction(storeName, 'readwrite');
            const req = tx.objectStore(storeName).put(data);
            req.onsuccess = () => resolve(true);
            req.onerror = () => resolve(false);
        });
    },

    async delete(storeName, key) {
        if (!this.db) await this.init();
        return new Promise((resolve) => {
            const tx = this.db.transaction(storeName, 'readwrite');
            const req = tx.objectStore(storeName).delete(key);
            req.onsuccess = () => resolve(true);
            req.onerror = () => resolve(false);
        });
    },

    async getAll(storeName) {
        if (!this.db) await this.init();
        return new Promise((resolve) => {
            const tx = this.db.transaction(storeName, 'readonly');
            const req = tx.objectStore(storeName).getAll();
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => resolve([]);
        });
    }
};
