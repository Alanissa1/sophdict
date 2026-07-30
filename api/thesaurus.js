export default async function handler(req, res) {
    // Basic protection against direct browser visits and cross-site requests
    const secFetchSite = req.headers['sec-fetch-site'];
    if (req.headers['sec-fetch-mode'] === 'navigate' || (secFetchSite && !['same-origin', 'same-site'].includes(secFetchSite))) {
        return res.status(403).json({ error: 'Direct access not allowed' });
    }

    const { word } = req.query;
    const key = process.env.THESAURUS_KEY;
    let upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
    const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!word) {
        return res.status(400).json({ error: 'Word is required' });
    }

    if (upstashUrl) {
        if (!upstashUrl.startsWith('http')) upstashUrl = `https://${upstashUrl}`;
        if (upstashUrl.endsWith('/')) upstashUrl = upstashUrl.slice(0, -1);
    }

    const cacheKey = `thes:${word.toLowerCase().trim()}`;

    try {
        // 1. Try to get from Upstash Cache
        if (upstashUrl && upstashToken) {
            try {
                const pipelineUrl = upstashUrl.endsWith('/pipeline') ? upstashUrl : `${upstashUrl}/pipeline`;
                const cacheRes = await fetch(pipelineUrl, {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${upstashToken}` },
                    body: JSON.stringify([
                        ["GET", cacheKey],
                        ["SADD", "all_words_index", word.toLowerCase().trim()]
                    ])
                });
                const cacheData = await cacheRes.json();
                // When using pipeline, Upstash returns an array of responses: [{result: ...}, {result: ...}]
                if (Array.isArray(cacheData) && cacheData[0] && cacheData[0].result) {
                    return res.status(200).json(JSON.parse(cacheData[0].result));
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

        // 3. Save to Upstash Cache (1 year expiry) and Word Index
        if (upstashUrl && upstashToken && data && !data.error && Array.isArray(data) && data.length > 0 && typeof data[0] !== 'string') {
            try {
                const pipelineUrl = upstashUrl.endsWith('/pipeline') ? upstashUrl : `${upstashUrl}/pipeline`;
                await fetch(pipelineUrl, {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${upstashToken}` },
                    body: JSON.stringify([
                        ["SET", cacheKey, JSON.stringify(data), "EX", 31536000],
                        ["SADD", "all_words_index", word.toLowerCase().trim()]
                    ])
                });
            } catch (e) {
                console.error('[Cache] Write error:', e);
            }
        }

        res.setHeader('Cache-Control', 'public, s-maxage=31536000, stale-while-revalidate=604800, immutable');
        res.status(200).json(data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch data' });
    }
}
