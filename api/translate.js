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

    res.setHeader('X-Robots-Tag', 'noindex');

    const { text, lang, from, cacheOnly } = req.query;
    let upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
    const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!text || !lang) {
        return res.status(400).json({ error: 'Missing parameters' });
    }

    if (upstashUrl) {
        if (!upstashUrl.startsWith('http')) upstashUrl = `https://${upstashUrl}`;
        if (upstashUrl.endsWith('/')) upstashUrl = upstashUrl.slice(0, -1);
    }

    // Cache Key Logic
    const textHash = Buffer.from(text).toString('hex').substring(0, 120);
    const cacheKey = `trans:${lang}:${from || 'auto'}:${textHash}`;

    try {
        // 4. Try Upstash Cache
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
                        res.setHeader('Cache-Control', 'public, s-maxage=31536000, immutable');
                        return res.status(200).json(JSON.parse(cacheData.result));
                    }
                }
            } catch (e) {
                console.error('[Cache] Read error:', e.message);
            }
        }

        // If background prefetch (cacheOnly) didn't find a hit, stop here
        if (cacheOnly === 'true') {
            return res.status(404).json({ error: 'Not in cache' });
        }

        // 5. Azure Translation
        const azureKey = process.env.AZURE_TRANSLATOR_KEY;
        const azureRegion = process.env.AZURE_TRANSLATOR_REGION || 'global';
        const azureEndpoint = process.env.AZURE_TRANSLATOR_ENDPOINT || 'https://api.cognitive.microsofttranslator.com';

        if (!azureKey) {
            return res.status(500).json({ error: 'Translation service not configured' });
        }

        const sourceLang = from || '';
        const url = `${azureEndpoint.replace(/\/$/, '')}/translate?api-version=3.0${sourceLang ? `&from=${sourceLang}` : ''}&to=${lang}&textType=plain`;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Ocp-Apim-Subscription-Key': azureKey,
                'Ocp-Apim-Subscription-Region': azureRegion,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify([{ text: text }])
        }).catch(() => null);

        if (!response || !response.ok) {
            return res.status(502).json({ error: 'Translation API failed' });
        }

        const azureData = await response.json();
        const translatedText = azureData?.[0]?.translations?.[0]?.text;

        if (!translatedText) {
            return res.status(502).json({ error: 'Invalid response from Azure' });
        }

        // Format to match Google-style response expected by app
        const data = [[[translatedText, text]]];

        // 6. Save to Cache
        if (upstashUrl && upstashToken) {
            fetch(upstashUrl, {
                method: 'POST',
                headers: { Authorization: `Bearer ${upstashToken}` },
                body: JSON.stringify(["SET", cacheKey, JSON.stringify(data), "EX", 31536000])
            }).catch(() => null);
        }

        res.setHeader('Cache-Control', 'public, s-maxage=31536000, immutable');
        return res.status(200).json(data);

    } catch (error) {
        console.error('[Translate Error]:', error.message);
        return res.status(500).json({ error: 'Translation failed', message: error.message });
    }
}