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
        let translatedToEn = null;

        // 1. Initial Dictionary Check for Original Words
        const uniqueWords = [...new Set(words.map(w => w.toLowerCase().replace(/[^a-z0-9]/g, '')))]
            .filter(w => w.length > 0)
            .slice(0, 25);

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

        // 2. Conditional Translation & Second Dictionary Check
        const threshold = Math.ceil(words.length / 4) * 2;
        const needsTranslation = dictionaryWords.length < threshold;
        const azureKey = process.env.AZURE_TRANSLATOR_KEY;

        if (needsTranslation && azureKey) {
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

                    if (targetLang !== 'en') {
                        if (detected === targetLang && toEn && toEn.toLowerCase() !== cleanQ.toLowerCase()) {
                            translatedToEn = toEn;
                            translationInfo = { original: cleanQ, translated: toEn, type: 'translation' };
                        } else if (detected === 'en' && toTarget && toTarget.toLowerCase() !== cleanQ.toLowerCase() && isTransEnabled && words.length >= 2) {
                            translationInfo = { original: cleanQ, translated: toTarget, type: 'translation' };
                        }
                    }
                }
            }

            if (translatedToEn) {
                const transWords = translatedToEn.split(/\s+/).map(w => w.toLowerCase().replace(/[^a-z0-9]/g, '')).filter(w => w.length > 0);
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
        }

        // 3. Final Assembly
        if (words.length === 1) {
            const datamuseRes = await fetch(`https://api.datamuse.com/sug?s=${encodeURIComponent(cleanQ)}&max=7`);
            const datamuseData = await datamuseRes.json();
            const suggestions = datamuseData.map(s => ({ word: s.word, type: 'completion' }));

            const results = [];
            if (translationInfo) results.push(translationInfo);
            results.push(...suggestions);
            results.push(...dictionaryWords);
            return res.status(200).json(results);
        } else {
            const results = [];
            if (translationInfo) results.push(translationInfo);
            results.push({ word: cleanQ, type: 'sentence' });
            results.push(...dictionaryWords);
            return res.status(200).json(results);
        }
    } catch (error) {
        console.error('[Suggestions] Error:', error);
        return res.status(500).json([]);
    }
}
