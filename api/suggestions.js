export default async function handler(req, res) {
    const secFetchSite = req.headers['sec-fetch-site'];
    const origin = req.headers['origin'] || req.headers['referer']; // Check both for maximum compatibility
    const userAgent = req.headers['user-agent'] || '';

    const isSophDictSite = ['same-origin', 'same-site'].includes(secFetchSite);

    // UPDATE: Include the new Android origin 'https://appassets.androidplatform.net/'
    const isAndroidApp = (
        (origin === 'null' || !origin || origin.includes('appassets.androidplatform.net')) &&
        userAgent.includes('Android')
    );

    if (!isSophDictSite && !isAndroidApp) {
        console.warn(`Access Denied. Origin: ${origin}`);
        return res.status(403).json({ error: 'Access denied' });
    }

    // Set CORS headers to allow the Android app to read the response
    res.setHeader('Access-Control-Allow-Origin', origin && origin !== 'null' ? origin : '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

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

            if (translatedToEn && upstashUrl && upstashToken) {
                const transWord = translatedToEn.toLowerCase().replace(/[^a-z0-9']/g, '').replace(/^'|'$/g, '');
                try {
                    const cacheRes = await fetch(`${upstashUrl}/pipeline`, {
                        method: 'POST',
                        headers: { Authorization: `Bearer ${upstashToken}` },
                        body: JSON.stringify([["SISMEMBER", "all_words_index", transWord]])
                    });
                    const cacheData = await cacheRes.json();
                    if (cacheData[0]?.result === 1) {
                        results.push({ word: translatedToEn, type: 'dictionary' });
                        results.push({ word: translatedToEn, type: 'thesaurus' });
                    }
                } catch (e) {}
            }

            return res.status(200).json(results);
        } else {
            // Multi-word: Sentence analysis
            const results = [];
            if (translationInfo) results.push(translationInfo);
            results.push({ word: cleanQ, type: 'sentence' });

            const uniqueWords = [...new Set(words.map(w => w.toLowerCase().replace(/[^a-z0-9']/g, '').replace(/^'|'$/g, '')))]
                .filter(w => w.length > 0);

            // Add all original words as tags without dictionary check
            uniqueWords.forEach(w => {
                dictionaryWords.push({ word: w, type: 'dictionary' });
                dictionaryWords.push({ word: w, type: 'thesaurus' });
            });

            // For translated words, keep the Upstash check
            if (translatedToEn) {
                const transWords = translatedToEn.split(/\s+/).map(w => w.toLowerCase().replace(/[^a-z0-9']/g, '').replace(/^'|'$/g, '')).filter(w => w.length > 0);
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
                                if (r.result === 1) {
                                    dictionaryWords.push({ word: transUnique[idx], type: 'dictionary' });
                                    dictionaryWords.push({ word: transUnique[idx], type: 'thesaurus' });
                                }
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