export default async function handler(req, res) {
    const { q, target, enabled } = req.query;
    if (!q) return res.status(200).json([]);

    const cleanQ = q.trim();
    const words = cleanQ.split(/\s+/);
    const targetLang = target || 'tr';
    const isTransEnabled = enabled === 'true';

    let upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
    const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (upstashUrl) {
        if (!upstashUrl.startsWith('http')) upstashUrl = `https://${upstashUrl}`;
        if (upstashUrl.endsWith('/')) upstashUrl = upstashUrl.slice(0, -1);
    }

    try {
        let translationInfo = null;
        let dictionaryWords = [];

        // 1. Language Detection & Translation
        const azureKey = process.env.AZURE_TRANSLATOR_KEY;
        let translatedToEn = null;
        if (azureKey) {
            const azureRegion = process.env.AZURE_TRANSLATOR_REGION || 'global';
            const azureEndpoint = process.env.AZURE_TRANSLATOR_ENDPOINT || 'https://api.cognitive.microsofttranslator.com';

            const transRes = await fetch(`${azureEndpoint.replace(/\/$/, '')}/translate?api-version=3.0&to=en&to=${targetLang}&textType=plain`, {
                method: 'POST',
                headers: {
                    'Ocp-Apim-Subscription-Key': azureKey,
                    'Ocp-Apim-Subscription-Region': azureRegion,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify([{ text: cleanQ }])
            });

            if (transRes.ok) {
                const transData = await transRes.json();
                const result = transData[0];
                if (result) {
                    const detected = result.detectedLanguage?.language;
                    const toEn = result.translations.find(t => t.to === 'en')?.text;
                    const toTarget = result.translations.find(t => t.to === targetLang)?.text;

                    if (detected === targetLang) {
                        // Input is System Language -> Translate to English
                        if (toEn && toEn.toLowerCase() !== cleanQ.toLowerCase()) {
                            translatedToEn = toEn;
                            translationInfo = { original: cleanQ, translated: toEn, type: 'translation' };
                        }
                    } else {
                        // Input is NOT System Language (e.g. English or other) -> Translate to System Language
                        if (toTarget && toTarget.toLowerCase() !== cleanQ.toLowerCase()) {
                            translationInfo = { original: cleanQ, translated: toTarget, type: 'translation' };
                        }
                        // Always capture English translation for dictionary tagging if available
                        if (toEn) {
                            translatedToEn = toEn;
                        }
                    }
                }
            }
        }

        if (words.length === 1) {
            // Single Word: Datamuse completions + Translation if found
            const datamuseRes = await fetch(`https://api.datamuse.com/sug?s=${encodeURIComponent(cleanQ)}&max=7`);
            const datamuseData = await datamuseRes.json();
            const suggestions = datamuseData.map(s => ({ word: s.word, type: 'completion' }));

            const results = [];
            if (translationInfo) results.push(translationInfo);
            results.push(...suggestions);

            // ONLY show English dictionary/thesaurus suggestions
            // If the input word is English (detected en) or translated to English
            const enWord = (translatedToEn || cleanQ).toLowerCase().replace(/[^a-z0-9']/g, '').replace(/^'|'$/g, '');

            if (upstashUrl && upstashToken && enWord) {
                try {
                    const cacheRes = await fetch(`${upstashUrl}/pipeline`, {
                        method: 'POST',
                        headers: { Authorization: `Bearer ${upstashToken}` },
                        body: JSON.stringify([["SISMEMBER", "all_words_index", enWord]])
                    });
                    const cacheData = await cacheRes.json();
                    if (cacheData[0]?.result === 1) {
                        const wordToAdd = translatedToEn || cleanQ;
                        // Avoid duplicates
                        if (!results.some(r => r.word.toLowerCase() === wordToAdd.toLowerCase() && r.type === 'dictionary')) {
                            results.push({ word: wordToAdd, type: 'dictionary' });
                            results.push({ word: wordToAdd, type: 'thesaurus' });
                        }
                    }
                } catch (e) {}
            }

            // Final de-duplication
            const seen = new Set();
            const finalResults = results.filter(item => {
                const word = item.word || item.translated || item.original;
                const key = `${word.toLowerCase()}-${item.type}`;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            });

            return res.status(200).json(finalResults);
        } else {
            // Multi-word: Sentence analysis
            const results = [];
            if (translationInfo) results.push(translationInfo);
            results.push({ word: cleanQ, type: 'sentence' });

            // Only generate word tags from the English version
            const englishSentence = translatedToEn || cleanQ;
            const enWords = englishSentence.split(/\s+/)
                .map(w => w.toLowerCase().replace(/[^a-z0-9']/g, '').replace(/^'|'$/g, ''))
                .filter(w => w.length > 0);

            const uniqueEnWords = [...new Set(enWords)];

            if (upstashUrl && upstashToken && uniqueEnWords.length > 0) {
                try {
                    const pipelineUrl = upstashUrl.endsWith('/pipeline') ? upstashUrl : `${upstashUrl}/pipeline`;
                    const cacheRes = await fetch(pipelineUrl, {
                        method: 'POST',
                        headers: { Authorization: `Bearer ${upstashToken}` },
                        body: JSON.stringify(uniqueEnWords.map(w => ["SISMEMBER", "all_words_index", w]))
                    });
                    const cacheData = await cacheRes.json();
                    if (Array.isArray(cacheData)) {
                        cacheData.forEach((r, idx) => {
                            if (r.result === 1) {
                                dictionaryWords.push({ word: uniqueEnWords[idx], type: 'dictionary' });
                                dictionaryWords.push({ word: uniqueEnWords[idx], type: 'thesaurus' });
                            }
                        });
                    }
                } catch (e) {}
            }

            results.push(...dictionaryWords);

            // Final de-duplication
            const seen = new Set();
            const finalResults = results.filter(item => {
                const key = `${item.word.toLowerCase()}-${item.type}`;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            });

            return res.status(200).json(finalResults);
        }
    } catch (error) {
        console.error('[Suggestions] Error:', error);
        return res.status(500).json([]);
    }
}