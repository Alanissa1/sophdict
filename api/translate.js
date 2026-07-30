export default async function handler(req, res) {
    const { text, lang, cacheOnly } = req.query;

    // Security: Block direct browser access and unauthorized domains
    const referer = req.headers.referer;
    const isLocalhost = process.env.NODE_ENV === 'development';
    if (!isLocalhost && referer && !referer.includes('sophdict.com')) {
        return res.status(403).json({ error: 'Access denied' });
    }
    if (!isLocalhost && !referer) {
        return res.status(403).json({ error: 'Direct access not allowed' });
    }

    let upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
    const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!text || !lang) {
        return res.status(400).json({ error: 'Missing parameters' });
    }

    if (upstashUrl) {
        if (!upstashUrl.startsWith('http')) upstashUrl = `https://${upstashUrl}`;
        if (upstashUrl.endsWith('/')) upstashUrl = upstashUrl.slice(0, -1);
    }

    // Use Hex encoding and limit length to ensure key is URL-safe and compatible with Redis
    const textHash = Buffer.from(text).toString('hex').substring(0, 120);
    const cacheKey = `trans:${lang}:${textHash}`;

    try {
        // 1. Try Upstash Cache using POST for both read/write (more reliable for long keys)
        if (upstashUrl && upstashToken) {
            try {
                const cacheRes = await fetch(upstashUrl, {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${upstashToken}` },
                    body: JSON.stringify(["GET", cacheKey])
                });
                if (cacheRes.ok) {
                    const cacheData = await cacheRes.json();
                    if (cacheData && cacheData.result) {
                        return res.status(200).json(JSON.parse(cacheData.result));
                    }
                }
            } catch (e) {
                console.error('[Cache] Read error:', e.message);
            }
        }

        // If cacheOnly is requested and we reached here, it means it's not in cache
        if (cacheOnly === 'true') {
            return res.status(404).json({ error: 'Not in cache' });
        }

        const azureKey = process.env.AZURE_TRANSLATOR_KEY;
        const azureRegion = process.env.AZURE_TRANSLATOR_REGION || 'global';
        const azureEndpoint = process.env.AZURE_TRANSLATOR_ENDPOINT || 'https://api.cognitive.microsofttranslator.com';

        if (!azureKey) {
            console.error('[Azure] Missing API Key in Environment Variables');
            return res.status(500).json({ error: 'Translation service not configured' });
        }

        // IMPROVEMENT: Force from=en and textType=plain for higher quality dictionary translations
        const url = `${azureEndpoint.replace(/\/$/, '')}/translate?api-version=3.0&from=en&to=${lang}&textType=plain`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Ocp-Apim-Subscription-Key': azureKey,
                'Ocp-Apim-Subscription-Region': azureRegion,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify([{ text: text }])
        }).catch(err => {
            console.error('[Azure] Fetch network error:', err.message);
            return null;
        });

        if (!response || !response.ok) {
            const status = response ? response.status : 'Network Error';
            const errorBody = response ? await response.text() : 'No response from Azure';
            console.error(`[Azure] API Error (${status}):`, errorBody);

            // Provide a very clear error to the user
            return res.status(status === 401 || status === 403 ? 401 : 502).json({
                error: 'Translation API failed',
                message: errorBody,
                suggestion: 'Check your AZURE_TRANSLATOR_KEY and AZURE_TRANSLATOR_REGION'
            });
        }

        const azureData = await response.json();

        // Safety check for Azure response structure
        const translatedText = azureData?.[0]?.translations?.[0]?.text;
        if (!translatedText) {
            console.error('[Azure] Invalid response structure:', azureData);
            return res.status(502).json({ error: 'Invalid response from Azure' });
        }

        const data = [[[translatedText, text]]];

        // 3. Save to Upstash Cache (1 year)
        if (upstashUrl && upstashToken && data) {
            try {
                await fetch(upstashUrl, {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${upstashToken}` },
                    body: JSON.stringify(["SET", cacheKey, JSON.stringify(data), "EX", 31536000])
                }).catch(() => null); // Silent fail for cache write
            } catch (e) {
                console.error('[Cache] Write error:', e.message);
            }
        }

        res.setHeader('Cache-Control', 'public, s-maxage=31536000, immutable');
        return res.status(200).json(data);
    } catch (error) {
        console.error('[Translate Error]:', error.message);
        return res.status(500).json({ error: 'Translation failed', message: error.message });
    }
}
