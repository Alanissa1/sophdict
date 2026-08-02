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
                    const wordsCount = cleanWord.split(/\s+/).filter(w => w.length > 0).length;

                    if (wordsCount >= 2) {
                        try {
                            const target = window.TranslationManager?.targetLanguage || 'tr';
                            const isTransEnabled = localStorage.getItem('translation_enabled') === 'true';

                            // 1. Try to translate to English (to see if it's NOT English)
                            const toEnRes = await fetch(`/api/translate?lang=en&text=${encodeURIComponent(cleanWord)}`);
                            if (toEnRes.ok) {
                                const toEnData = await toEnRes.json();
                                let toEnText = "";
                                if (toEnData && toEnData[0]) toEnData[0].forEach(p => { if (p[0]) toEnText += p[0]; });

                                if (toEnText && toEnText.toLowerCase().trim() !== cleanWord.toLowerCase().trim()) {
                                    return {
                                        word: cleanWord,
                                        isSentence: true,
                                        translation: toEnText,
                                        targetLangName: 'English',
                                        sourceLang: target, // Best guess
                                        targetLang: 'en',
                                        error: null
                                    };
                                }
                            }

                            // 2. Fallback: If it's English (or the above failed to return a *different* text),
                            // and Translation is enabled, translate to System Language
                            if (isTransEnabled && target !== 'en') {
                                const toTargetRes = await fetch(`/api/translate?lang=${target}&text=${encodeURIComponent(cleanWord)}`);
                                if (toTargetRes.ok) {
                                    const toTargetData = await toTargetRes.json();
                                    let toTargetText = "";
                                    if (toTargetData && toTargetData[0]) toTargetData[0].forEach(p => { if (p[0]) toTargetText += p[0]; });

                                    if (toTargetText && toTargetText.toLowerCase().trim() !== cleanWord.toLowerCase().trim()) {
                                        const langObj = window.TranslationManager?.languages?.find(l => l.code === target);
                                        return {
                                            word: cleanWord,
                                            isSentence: true,
                                            translation: toTargetText,
                                            targetLangName: langObj?.name || target.toUpperCase(),
                                            sourceLang: 'en',
                                            targetLang: target,
                                            error: null
                                        };
                                    }
                                }
                            }
                        } catch (e) { console.error("Sentence search handler error:", e); }
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
