export default async function handler(req, res) {
    const { q, target, enabled } = req.query;
    if (!q) return res.status(400).json({ error: 'Query required' });

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
        const azureKey = process.env.AZURE_TRANSLATOR_KEY;
        const azureRegion = process.env.AZURE_TRANSLATOR_REGION || 'global';
        const azureEndpoint = process.env.AZURE_TRANSLATOR_ENDPOINT || 'https://api.cognitive.microsofttranslator.com';

        let translation = null;
        let targetLangName = 'English';
        let sourceLangCode = 'auto';
        let targetLangCode = 'en';

        if (azureKey) {
            // Request translation to BOTH English and the Target Language
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

                    if (detected !== 'en' && toEn && toEn.toLowerCase() !== cleanQ.toLowerCase()) {
                        translation = toEn;
                        targetLangName = 'English';
                        sourceLangCode = detected;
                        targetLangCode = 'en';
                    } else if (detected === 'en' && toTarget && toTarget.toLowerCase() !== cleanQ.toLowerCase()) {
                        translation = toTarget;
                        const langNames = { 'tr': 'Turkish', 'es': 'Spanish', 'fr': 'French', 'de': 'German', 'it': 'Italian' };
                        targetLangName = langNames[targetLang] || targetLang.toUpperCase();
                        sourceLangCode = 'en';
                        targetLangCode = targetLang;
                    }
                }
            }
        }

        // Extract verified dictionary words
        const uniqueWords = [...new Set(searchWords.split(/\s+/).map(w => w.toLowerCase().replace(/[^a-z0-9]/g, '')))]
            .filter(w => w.length > 2)
            .slice(0, 20);

        let verifiedWords = [];
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
                    cacheData.forEach((r, idx) => { if (r.result === 1) verifiedWords.push(uniqueWords[idx]); });
                }
            } catch (e) {}
        }

        // Also check original words if they weren't checked (for non-English sentences)
        if (translation && targetLangCode === 'en') {
            const originalWords = [...new Set(cleanQ.split(/\s+/).map(w => w.toLowerCase().replace(/[^a-z0-9]/g, '')))]
                .filter(w => w.length > 2 && !uniqueWords.includes(w))
                .slice(0, 10);

            if (upstashUrl && upstashToken && originalWords.length > 0) {
                try {
                    const pipelineUrl = upstashUrl.endsWith('/pipeline') ? upstashUrl : `${upstashUrl}/pipeline`;
                    const cacheRes = await fetch(pipelineUrl, {
                        method: 'POST',
                        headers: { Authorization: `Bearer ${upstashToken}` },
                        body: JSON.stringify(originalWords.map(w => ["SISMEMBER", "all_words_index", w]))
                    });
                    const cacheData = await cacheRes.json();
                    if (Array.isArray(cacheData)) {
                        cacheData.forEach((r, idx) => { if (r.result === 1) verifiedWords.push(originalWords[idx]); });
                    }
                } catch (e) {}
            }
        }

        const isNotFound = !translation && (!verifiedWords || verifiedWords.length === 0);
        if (isNotFound) {
            res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=600');
        } else {
            res.setHeader('Cache-Control', 'public, s-maxage=31536000, immutable');
        }

        return res.status(200).json({
            word: cleanQ,
            isSentence: true,
            translation: translation,
            targetLangName: targetLangName,
            sourceLang: sourceLangCode,
            targetLang: targetLangCode,
            verifiedWords: verifiedWords
        });

    } catch (error) {
        console.error('[Sentence] Error:', error);
        return res.status(500).json({ error: 'Sentence analysis failed' });
    }
}
