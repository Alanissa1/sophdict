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

        // Check cache first
        const cached = await DBManager.getWord(cleanWord);
        if (cached) return cached;

        const requestPromise = (async () => {
            try {
                console.log(`[API] Fetching: ${cleanWord}`);

                const [dictData, thesData] = await Promise.all([
                    DictionaryAPI.fetch(cleanWord),
                    ThesaurusAPI.fetch(cleanWord)
                ]);

                if (!Array.isArray(dictData) || (dictData.length > 0 && typeof dictData[0] === 'string')) {
                    // Word not found. Check if it's a sentence or non-English word and try to translate
                    try {
                        // Translate to English to detect if it's not English or if it's a phrase
                        const transRes = await fetch(`/api/translate?lang=en&text=${encodeURIComponent(cleanWord)}`);
                        if (transRes.ok) {
                            const transData = await transRes.json();
                            let translatedText = "";
                            if (transData && transData[0]) {
                                transData[0].forEach(part => { if (part[0]) translatedText += part[0]; });
                            }

                            if (translatedText && translatedText.toLowerCase() !== cleanWord.toLowerCase()) {
                                return {
                                    word: cleanWord,
                                    isSentence: true, // We treat non-English single words as a "sentence" to trigger translation UI
                                    translation: translatedText,
                                    error: null
                                };
                            }
                        }
                    } catch (e) { console.error("Search translation error:", e); }

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
