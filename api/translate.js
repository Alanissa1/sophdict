export default async function handler(req, res) {
    const { text, lang, cacheOnly } = req.query;
    let upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
    const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!text || !lang) {
        return res.status(400).json({ error: 'Missing parameters' });
    }

    if (upstashUrl && upstashUrl.endsWith('/')) upstashUrl = upstashUrl.slice(0, -1);

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
                const cacheData = await cacheRes.json();
                if (cacheData && cacheData.result) {
                    return res.status(200).json(JSON.parse(cacheData.result));
                }
            } catch (e) {
                console.error('[Cache] Read error:', e);
            }
        }

        // If cacheOnly is requested and we reached here, it means it's not in cache
        if (cacheOnly === 'true') {
            return res.status(404).json({ error: 'Not in cache' });
        }

        // 2. Fetch from Google
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${lang}&dt=t&q=${encodeURIComponent(text)}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Translation API failed');
        const data = await response.json();

        // 3. Save to Upstash Cache (1 year)
        if (upstashUrl && upstashToken && data) {
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

        res.setHeader('Cache-Control', 'public, s-maxage=31536000, immutable');
        res.status(200).json(data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Translation failed' });
    }
}
