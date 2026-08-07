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

                    try {
                        const target = window.TranslationManager?.targetLanguage || 'tr';
                        const isTransEnabled = localStorage.getItem('translation_enabled') === 'true';

                        // 1. Try to translate to English (auto-detect source)
                        const toEnRes = await fetch(`/api/translate?lang=en&text=${encodeURIComponent(cleanWord)}`);
                        if (toEnRes.ok) {
                            const toEnData = await toEnRes.json();
                            let toEnText = "";
                            if (toEnData && toEnData[0]) toEnData[0].forEach(p => { if (p[0]) toEnText += p[0]; });

                            // If the translation result is significantly different, assume it was NOT English
                            if (toEnText && toEnText.toLowerCase().trim() !== cleanWord.toLowerCase().trim()) {
                                // Fetch verified dictionary words for the translation
                                let verifiedWords = [];
                                try {
                                    const sugRes = await fetch(`/api/suggestions?q=${encodeURIComponent(toEnText)}&target=en`);
                                    if (sugRes.ok) {
                                        const sugData = await sugRes.json();
                                        verifiedWords = sugData.filter(i => i.type === 'dictionary').map(i => i.word);
                                    }
                                } catch (e) {}

                                const result = {
                                    word: cleanWord,
                                    isSentence: true,
                                    translation: toEnText,
                                    targetLangName: 'English',
                                    sourceLang: target,
                                    targetLang: 'en',
                                    verifiedWords: verifiedWords,
                                    error: null
                                };
                                await DBManager.saveWord(cleanWord, result);
                                return result;
                            }
                        }

                        // 2. If it's English (or same as En), and Translation is enabled, translate to System Language
                        if (isTransEnabled && target !== 'en' && wordsCount >= 2) {
                            const toTargetRes = await fetch(`/api/translate?lang=${target}&text=${encodeURIComponent(cleanWord)}`);
                            if (toTargetRes.ok) {
                                const toTargetData = await toTargetRes.json();
                                let toTargetText = "";
                                if (toTargetData && toTargetData[0]) toTargetData[0].forEach(p => { if (p[0]) toTargetText += p[0]; });

                                if (toTargetText && toTargetText.toLowerCase().trim() !== cleanWord.toLowerCase().trim()) {
                                    // Fetch verified dictionary words for the ORIGINAL English sentence
                                    let verifiedWords = [];
                                    try {
                                        const sugRes = await fetch(`/api/suggestions?q=${encodeURIComponent(cleanWord)}&target=${target}`);
                                        if (sugRes.ok) {
                                            const sugData = await sugRes.json();
                                            verifiedWords = sugData.filter(i => i.type === 'dictionary').map(i => i.word);
                                        }
                                    } catch (e) {}

                                    const langObj = window.TranslationManager?.languages?.find(l => l.code === target);
                                    const result = {
                                        word: cleanWord,
                                        isSentence: true,
                                        translation: toTargetText,
                                        targetLangName: langObj?.name || target.toUpperCase(),
                                        sourceLang: 'en',
                                        targetLang: target,
                                        verifiedWords: verifiedWords,
                                        error: null
                                    };
                                    await DBManager.saveWord(cleanWord, result);
                                    return result;
                                }
                            }
                        }

                        // 3. If no translation was found but it's a multi-word search,
                        // treat it as a sentence with no translation (error UI handles it)
                        if (wordsCount >= 2) {
                            let verifiedWords = [];
                            try {
                                const sugRes = await fetch(`/api/suggestions?q=${encodeURIComponent(cleanWord)}&target=en`);
                                if (sugRes.ok) {
                                    const sugData = await sugRes.json();
                                    verifiedWords = sugData.filter(i => i.type === 'dictionary').map(i => i.word);
                                }
                            } catch (e) {}
                            return { word: cleanWord, isSentence: true, sourceLang: 'en', verifiedWords: verifiedWords, error: 'Word not found' };
                        }
                    } catch (e) { console.error("Sentence search handler error:", e); }

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
