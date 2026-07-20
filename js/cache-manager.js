import { DBManager } from './db-manager.js';

export const CacheManager = {
    async get(word) {
        const data = await DBManager.getWord(word);
        if (data) {
            console.log(`[Cache] Hit (DB): ${word}`);
            return data;
        }
        return null;
    },

    async set(word, data) {
        await DBManager.saveWord(word, data);
        console.log(`[Cache] Saved (DB): ${word}`);
    },

    async has(word) {
        const data = await DBManager.getWord(word);
        return !!data;
    }
};
