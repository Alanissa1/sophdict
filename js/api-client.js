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
        if (cached && (cached.dictionary || cached.translation || (cached.isSentence && cached.verifiedWords))) {
            return cached;
        }

        const requestPromise = (async () => {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

            try {
                console.log(`[API] Fetching: ${cleanWord}`);

                const [dictData, thesData] = await Promise.all([
                    fetch(`${CONFIG.DICTIONARY_API_URL}?word=${encodeURIComponent(cleanWord)}`, { signal: controller.signal }).then(r => r.json()),
                    fetch(`${CONFIG.THESAURUS_API_URL}?word=${encodeURIComponent(cleanWord)}`, { signal: controller.signal }).then(r => r.json())
                ]);
                clearTimeout(timeoutId);

                const isDictEmpty = !Array.isArray(dictData) || dictData.length === 0 || typeof dictData[0] === 'string';

                if (isDictEmpty) {
                    const wordsCount = cleanWord.split(/\s+/).filter(w => w.length > 0).length;
                    if (wordsCount >= 2) {
                        try {
                            const target = window.TranslationManager?.targetLanguage || 'tr';
                            const isEnabled = window.TranslationManager?.isEnabled || false;
                            const cb = Date.now();

                            console.log(`[API] Fallback to sentence analysis: ${cleanWord}`);
                            const res = await fetch(`/api/sentence?q=${encodeURIComponent(cleanWord)}&target=${target}&enabled=${isEnabled}&_cb=${cb}`, { signal: controller.signal });
                            if (res.ok) {
                                const data = await res.json();
                                console.log(`[API] Sentence data received:`, data);
                                if (data && !data.error) {
                                    await DBManager.saveWord(cleanWord, data);
                                    return data;
                                }
                            }
                            console.warn(`[API] Sentence analysis failed or returned error`);
                            return { word: cleanWord, isSentence: true, error: 'Word not found' };
                        } catch (e) {
                            console.error("Sentence search fallback error:", e);
                            return { word: cleanWord, isSentence: true, error: 'Network error' };
                        }
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
