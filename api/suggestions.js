export default async function handler(req, res) {
    const { q } = req.query;
    const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
    const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!q) {
        return res.status(400).json({ error: 'Query parameter "q" is required' });
    }

    const query = q.toLowerCase().trim();
    const cacheKey = `sug:${query}`;

    try {
        // 1. Try Upstash Cache
        if (upstashUrl && upstashToken) {
            try {
                const cleanUrl = upstashUrl.replace(/\/$/, "");
                const cacheRes = await fetch(`${cleanUrl}/get/${cacheKey}`, {
                    headers: { Authorization: `Bearer ${upstashToken}` }
                });
                const cacheData = await cacheRes.json();
                if (cacheData && cacheData.result) {
                    return res.status(200).json(JSON.parse(cacheData.result));
                }
            } catch (e) {
                console.error('[Cache] Read error:', e);
            }
        }

        // 2. Fetch from Datamuse
        const response = await fetch(`https://api.datamuse.com/sug?s=${encodeURIComponent(query)}&max=7`);
        if (!response.ok) throw new Error('Datamuse API failed');
        const data = await response.json();
        const suggestions = data.map(item => item.word);

        // 3. Save to Upstash Cache (24 hours)
        if (upstashUrl && upstashToken && suggestions.length > 0) {
            try {
                const cleanUrl = upstashUrl.replace(/\/$/, "");
                await fetch(`${cleanUrl}/set/${cacheKey}/${encodeURIComponent(JSON.stringify(suggestions))}/EX/86400`, {
                    headers: { Authorization: `Bearer ${upstashToken}` }
                });
            } catch (e) {
                console.error('[Cache] Write error:', e);
            }
        }

        res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=43200');
        res.status(200).json(suggestions);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch suggestions' });
    }
}
