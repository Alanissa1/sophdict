window.APIClient = {
    pending: new Map(),

    async fetchWordData(word) {
        const cleanWord = word.toLowerCase().trim();
        if (!cleanWord) return { error: 'Empty word' };

        // Check if already in-flight
        if (this.pending.has(cleanWord)) {
            console.log(`[API] Returning pending request for: ${cleanWord}`);
            return this.pending.get(cleanWord);
        }

        // Check cache first (Only return if it has actual results)
        const cached = await DBManager.getWord(cleanWord);
        if (cached && (cached.dictionary || cached.translation)) {
            return cached;
        }

        const requestPromise = (async () => {
            try {
                console.log(`[API] Fetching: ${cleanWord}`);

                const [dictData, thesData] = await Promise.all([
                    DictionaryAPI.fetch(cleanWord),
                    ThesaurusAPI.fetch(cleanWord)
                ]);

                const isDictEmpty = !Array.isArray(dictData) || dictData.length === 0 || typeof dictData[0] === 'string';

                if (isDictEmpty) {
                    const wordsCount = cleanWord.split(/\s+/).filter(w => w.length > 0).length;
                    if (wordsCount >= 2) {
                        try {
                            const target = window.TranslationManager?.targetLanguage || 'tr';
                            const isEnabled = window.TranslationManager?.isEnabled || false;
                            const cb = Date.now();

                            const res = await fetch(`/api/sentence?q=${encodeURIComponent(cleanWord)}&target=${target}&enabled=${isEnabled}&_cb=${cb}`);
                            if (res.ok) {
                                const data = await res.json();
                                if (data && !data.error) {
                                    await DBManager.saveWord(cleanWord, data);
                                    return data;
                                }
                            }
                            return { word: cleanWord, isSentence: true, error: 'Word not found' };
                        } catch (e) { console.error("Sentence search fallback error:", e); }
                    }

                    if (cleanWord.includes(' ')) {
                        return { word: cleanWord, isSentence: true, error: 'Word not found' };
                    }
                    return { error: 'Word not found', suggestions: dictData };
                }

                const data = {
                    word: cleanWord,
                    dictionary: dictData,
                    thesaurus: thesData,
                    timestamp: Date.now()
                };

                await DBManager.saveWord(cleanWord, data);
                return data;
            } catch (error) {
                console.error(`[API] Error:`, error);
                return { error: 'Network error' };
            } finally {
                this.pending.delete(cleanWord);
            }
        })();

        this.pending.set(cleanWord, requestPromise);
        return requestPromise;
    }
};
