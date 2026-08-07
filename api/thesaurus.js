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

    const { word } = req.query;
    const key = process.env.THESAURUS_KEY;
    const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
    const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!word) {
        return res.status(400).json({ error: 'Word is required' });
    }

    if (upstashUrl && upstashUrl.endsWith('/')) upstashUrl = upstashUrl.slice(0, -1);

    const cacheKey = `thes:${word.toLowerCase().trim()}`;

    try {
        // 1. Try to get from Upstash Cache
        if (upstashUrl && upstashToken) {
            try {
                const cacheRes = await fetch(upstashUrl, {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${upstashToken}` },
                    body: JSON.stringify(["GET", cacheKey])
                });
                const cacheData = await cacheRes.json();
                if (cacheData && cacheData.result) {
                    return res.status(200).json(JSON.parse(cacheData.result));
                }
            } catch (e) {
                console.error('[Cache] Read error:', e);
            }
        }

        // 2. Fetch from Merriam-Webster
        if (!key) {
            return res.status(500).json({ error: 'API key not configured' });
        }
        const url = `https://www.dictionaryapi.com/api/v3/references/thesaurus/json/${encodeURIComponent(word)}?key=${key}`;
        const response = await fetch(url);
        const data = await response.json();

        // 3. Save to Upstash Cache (1 year expiry)
        if (upstashUrl && upstashToken && data && !data.error && Array.isArray(data) && data.length > 0 && typeof data[0] !== 'string') {
            try {
                await fetch(upstashUrl, {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${upstashToken}` },
                    body: JSON.stringify(["SET", cacheKey, JSON.stringify(data), "EX", 31536000])
                });
            } catch (e) {
                console.error('[Cache] Write error:', e);
            }
        }

        const isNotFound = !data || (Array.isArray(data) && (data.length === 0 || typeof data[0] === 'string'));
        if (isNotFound) {
            res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=600');
        } else {
            res.setHeader('Cache-Control', 'public, s-maxage=31536000, stale-while-revalidate=604800, immutable');
        }
        res.status(200).json(data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch data' });
    }
}
