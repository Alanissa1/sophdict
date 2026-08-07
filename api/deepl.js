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

    const authKey = process.env.DEEPL_API_KEY;
    if (!authKey) {
        return res.status(500).json({ error: 'DeepL API key not configured' });
    }

    const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
    const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

    try {
        let params = {};
        if (req.method === 'POST') {
            params = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        } else {
            params = {
                text: [req.query.text],
                target_lang: req.query.lang?.toUpperCase(),
                source_lang: req.query.from?.toUpperCase(),
                formality: req.query.formality
            };
        }

        if (!params.text || !params.target_lang) {
            return res.status(400).json({ error: 'Missing required parameters: text and target_lang' });
        }

        // Ensure text is an array as DeepL expects
        if (!Array.isArray(params.text)) {
            params.text = [params.text];
        }

        let cacheKey = null;
        if (upstashUrl && upstashToken) {
            const paramHash = Buffer.from(JSON.stringify(params)).toString('hex').substring(0, 120);
            cacheKey = `deepl:gen:${paramHash}`;

            const cacheRes = await fetch(upstashUrl.startsWith('http') ? upstashUrl : `https://${upstashUrl}`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${upstashToken}` },
                body: JSON.stringify(["GET", cacheKey])
            }).catch(() => null);

            if (cacheRes?.ok) {
                const cacheData = await cacheRes.json();
                if (cacheData?.result) {
                    res.setHeader('Cache-Control', 'public, s-maxage=31536000, immutable');
                    return res.status(200).json(JSON.parse(cacheData.result));
                }
            }
        }

        const isFree = authKey.endsWith(':fx');
        const url = isFree ? 'https://api-free.deepl.com/v2/translate' : 'https://api.deepl.com/v2/translate';

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `DeepL-Auth-Key ${authKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(params)
        });

        if (!response.ok) {
            const error = await response.text();
            return res.status(response.status).json({ error: 'DeepL API failed', details: error });
        }

        const data = await response.json();

        if (cacheKey && upstashUrl && upstashToken && data) {
            fetch(upstashUrl.startsWith('http') ? upstashUrl : `https://${upstashUrl}`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${upstashToken}` },
                body: JSON.stringify(["SET", cacheKey, JSON.stringify(data), "EX", 31536000])
            }).catch(() => null);
        }

        res.setHeader('Cache-Control', 'public, s-maxage=31536000, immutable');
        return res.status(200).json(data);
    } catch (error) {
        console.error('[DeepL Error]:', error.message);
        return res.status(500).json({ error: 'Internal server error', message: error.message });
    }
}
