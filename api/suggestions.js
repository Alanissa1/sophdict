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
        let isEnglishInput = false; 

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

                    // تحديد إذا كانت الجملة المدخلة هي الإنجليزية
                    if (detected === 'en') {
                        isEnglishInput = true;
                    }

                    if (targetLang === 'en') {
                         // IF SYSTEM IS EN: Do not show translation suggestions 
                    } else if (detected !== 'en' && toEn && toEn.toLowerCase() !== cleanQ.toLowerCase()) {
                        translatedToEn = toEn;
                        translationInfo = { original: cleanQ, translated: toEn, type: 'translation' };
                    } else if (detected === 'en' && toTarget && toTarget.toLowerCase() !== cleanQ.toLowerCase() && isTransEnabled && words.length >= 2) {
                        translationInfo = { original: cleanQ, translated: toTarget, type: 'translation' };
                    }
                }
            }
        }

        // 2. معالجة الكلمات لاستخراج البطاقات
        if (words.length === 1) {
            // حالة الكلمة الواحدة
            const datamuseRes = await fetch(`https://api.datamuse.com/sug?s=${encodeURIComponent(cleanQ)}&max=7`);
            const datamuseData = await datamuseRes.json();
            const suggestions = datamuseData.map(s => ({ word: s.word, type: 'completion' }));

            const results = [];
            if (translationInfo) results.push(translationInfo);
            results.push(...suggestions);

            // تحديد الكلمة الإنجليزية (من الإدخال المباشر أو من الترجمة)
            const wordForCard = isEnglishInput ? cleanQ : translatedToEn;

            if (wordForCard && upstashUrl && upstashToken) {
                const transWord = wordForCard.toLowerCase().replace(/[^a-z0-9']/g, '').replace(/^'|'$/g, '');
                try {
                    const cacheRes = await fetch(`${upstashUrl}/pipeline`, {
                        method: 'POST',
                        headers: { Authorization: `Bearer ${upstashToken}` },
                        body: JSON.stringify([["SISMEMBER", "all_words_index", transWord]])
                    });
                    const cacheData = await cacheRes.json();
                    if (cacheData[0]?.result === 1) {
                        results.push({ word: wordForCard, type: 'dictionary' });
                    }
                } catch (e) {}
            }

            return res.status(200).json(results);
        } else {
            // حالة الجمل والكلمات المتعددة
            const results = [];
            if (translationInfo) results.push(translationInfo);
            results.push({ word: cleanQ, type: 'sentence' });

            // تحديد قائمة الكلمات الإنجليزية فقط لاستخراج البطاقات
            let englishWordsRaw = [];
            if (isEnglishInput) {
                englishWordsRaw = words; // أخذ الكلمات الأصلية لأن الإدخال إنجليزي
            } else if (translatedToEn) {
                englishWordsRaw = translatedToEn.split(/\s+/); // أخذ الكلمات من الترجمة الإنجليزية
            }

            // تنظيف الكلمات وحذف المكرر
            const uniqueEnglishWords = [...new Set(englishWordsRaw.map(w => w.replace(/[^a-zA-Z0-9']/g, '').replace(/^'|'$/g, '')))]
                .filter(w => w.length > 0)
                .slice(0, 15);

            // فحص الكلمات الإنجليزية في قاعدة البيانات لإظهارها كبطاقات
            if (upstashUrl && upstashToken && uniqueEnglishWords.length > 0) {
                try {
                    const pipelineUrl = upstashUrl.endsWith('/pipeline') ? upstashUrl : `${upstashUrl}/pipeline`;
                    const cacheRes = await fetch(pipelineUrl, {
                        method: 'POST',
                        headers: { Authorization: `Bearer ${upstashToken}` },
                        body: JSON.stringify(uniqueEnglishWords.map(w => ["SISMEMBER", "all_words_index", w.toLowerCase()]))
                    });
                    const cacheData = await cacheRes.json();

                    if (Array.isArray(cacheData)) {
                        cacheData.forEach((r, idx) => {
                            if (r.result === 1) {
                                dictionaryWords.push({ word: uniqueEnglishWords[idx], type: 'dictionary' });
                            }
                        });
                    }
                } catch (e) {}
            } else if (!upstashUrl && uniqueEnglishWords.length > 0) {
                // في حال عدم توفر اتصال بقاعدة البيانات، اعرض الكلمات مباشرة
                uniqueEnglishWords.forEach(w => {
                    dictionaryWords.push({ word: w, type: 'dictionary' });
                });
            }

            results.push(...dictionaryWords);
            return res.status(200).json(results);
        }
    } catch (error) {
        console.error('[Suggestions] Error:', error);
        return res.status(500).json([]);
    }
}
