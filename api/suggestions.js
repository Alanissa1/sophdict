export default async function handler(req, res) {
    const { q } = req.query;
    if (!q) return res.status(200).json([]);

    const cleanQ = q.trim();
    const words = cleanQ.split(/\s+/);

    let upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
    const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (upstashUrl) {
        if (!upstashUrl.startsWith('http')) upstashUrl = `https://${upstashUrl}`;
        if (upstashUrl.endsWith('/')) upstashUrl = upstashUrl.slice(0, -1);
    }

    try {
        let translationInfo = null;
        let dictionaryWords = [];

        // 1. Language Detection & Translation for ANY input that might not be English
        const azureKey = process.env.AZURE_TRANSLATOR_KEY;
        if (azureKey) {
            const azureRegion = process.env.AZURE_TRANSLATOR_REGION || 'global';
            const azureEndpoint = process.env.AZURE_TRANSLATOR_ENDPOINT || 'https://api.cognitive.microsofttranslator.com';

            const transRes = await fetch(`${azureEndpoint.replace(/\/$/, '')}/translate?api-version=3.0&to=en&textType=plain`, {
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
                    const translatedText = result.translations?.[0]?.text;

                    if (detected !== 'en' && translatedText && translatedText.toLowerCase() !== cleanQ.toLowerCase()) {
                        translationInfo = {
                            original: cleanQ,
                            translated: translatedText,
                            type: 'translation'
                        };
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

            // If it's a single non-English word, check if the translation is in MW
            if (translationInfo && upstashUrl && upstashToken) {
                const transWord = translationInfo.translated.toLowerCase().replace(/[^a-z0-9]/g, '');
                try {
                    const cacheRes = await fetch(`${upstashUrl}/pipeline`, {
                        method: 'POST',
                        headers: { Authorization: `Bearer ${upstashToken}` },
                        body: JSON.stringify([["SISMEMBER", "all_words_index", transWord]])
                    });
                    const cacheData = await cacheRes.json();
                    if (cacheData[0]?.result === 1) {
                        results.push({ word: translationInfo.translated, type: 'dictionary' });
                    }
                } catch (e) {}
            }

            return res.status(200).json(results);
        } else {
            // Multi-word: Sentence analysis
            const results = [];
            if (translationInfo) results.push(translationInfo);
            results.push({ word: cleanQ, type: 'sentence' });

            // Extract words and check dictionary index
            const uniqueWords = [...new Set(words.map(w => w.toLowerCase().replace(/[^a-z0-9]/g, '')))]
                .filter(w => w.length > 2)
                .slice(0, 15);

            if (upstashUrl && upstashToken && uniqueWords.length > 0) {
                try {
                    const pipelineUrl = upstashUrl.endsWith('/pipeline') ? upstashUrl : `${upstashUrl}/pipeline`;
                    const cacheRes = await fetch(pipelineUrl, {
                        method: 'POST',
                        headers: { Authorization: `Bearer ${upstashToken}` },
                        body: JSON.stringify(uniqueWords.map(w => ["SISMEMBER", "all_words_index", w]))
                    });
                    const cacheData = await cacheRes.json();

                    if (Array.isArray(cacheData)) {
                        cacheData.forEach((r, idx) => {
                            if (r.result === 1) dictionaryWords.push({ word: uniqueWords[idx], type: 'dictionary' });
                        });
                    }
                } catch (e) {}
            }

            // If we have a translation, also check words from the translated text
            if (translationInfo && translationInfo.translated) {
                const transWords = translationInfo.translated.split(/\s+/).map(w => w.toLowerCase().replace(/[^a-z0-9]/g, '')).filter(w => w.length > 2);
                const transUnique = [...new Set(transWords)].filter(w => !uniqueWords.includes(w));

                if (upstashUrl && upstashToken && transUnique.length > 0) {
                    try {
                        const pipelineUrl = upstashUrl.endsWith('/pipeline') ? upstashUrl : `${upstashUrl}/pipeline`;
                        const cacheRes = await fetch(pipelineUrl, {
                            method: 'POST',
                            headers: { Authorization: `Bearer ${upstashToken}` },
                            body: JSON.stringify(transUnique.map(w => ["SISMEMBER", "all_words_index", w]))
                        });
                        const cacheData = await cacheRes.json();
                        if (Array.isArray(cacheData)) {
                            cacheData.forEach((r, idx) => {
                                if (r.result === 1) dictionaryWords.push({ word: transUnique[idx], type: 'dictionary' });
                            });
                        }
                    } catch (e) {}
                }
            }

            results.push(...dictionaryWords);
            return res.status(200).json(results);
        }
    } catch (error) {
        console.error('[Suggestions] Error:', error);
        return res.status(500).json([]);
    }
}
