export default async function handler(req, res) {
    const secFetchSite = req.headers['sec-fetch-site'];
    const origin = req.headers['origin'];
    const userAgent = req.headers['user-agent'] || '';

    // 1. ALLOW LIST: Include the new Android app origin
    const isSophDictSite = ['same-origin', 'same-site'].includes(secFetchSite);
    const isAndroidApp = (
        (origin === 'null' || !origin || origin === 'https://appassets.androidplatform.net') && 
        userAgent.includes('Android')
    );

    if (!isSophDictSite && !isAndroidApp) {
        return res.status(403).json({ error: 'Access denied' });
    }

    // 2. CORS Headers: Dynamic origin to satisfy preflight checks
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('X-Robots-Tag', 'noindex');

    // 3. Handle Preflight Options
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const authKey = process.env.OPENAI_API_KEY;
    if (!authKey) {
        return res.status(500).json({ error: 'OpenAI API key not configured' });
    }

    const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
    const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

    try {
        let messages = [];
        let model = "gpt-4o-mini";
        let temperature = 0.7;
        let cacheKey = null;

        if (req.method === 'POST') {
            const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
            messages = body.messages || [];
            if (body.model) model = body.model;
            if (body.temperature !== undefined) temperature = body.temperature;

            if (messages.length > 0 && upstashUrl && upstashToken) {
                const msgHash = Buffer.from(JSON.stringify(messages)).toString('hex').substring(0, 120);
                cacheKey = `ai:openai:${model}:${msgHash}`;
            }
        } else {
            const { prompt, system } = req.query;
            if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

            if (system) {
                messages.push({ role: 'system', content: system });
            }
            messages.push({ role: 'user', content: prompt });

            if (upstashUrl && upstashToken) {
                const promptHash = Buffer.from(`${system || ''}:${prompt}`).toString('hex').substring(0, 120);
                cacheKey = `ai:openai:${model}:${promptHash}`;
            }
        }

        if (cacheKey && upstashUrl && upstashToken) {
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

        if (messages.length === 0) {
            return res.status(400).json({ error: 'No messages provided' });
        }

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model,
                messages,
                temperature
            })
        });

        if (!response.ok) {
            const error = await response.text();
            return res.status(response.status).json({ error: 'OpenAI API error', details: error });
        }

        const data = await response.json();

        if (cacheKey && upstashUrl && upstashToken && data) {
            fetch(upstashUrl.startsWith('http') ? upstashUrl : `https://${upstashUrl}`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${upstashToken}` },
                body: JSON.stringify(["SET", cacheKey, JSON.stringify(data), "EX", 31536000])
            }).catch(() => null);
        }

        return res.status(200).json(data);

    } catch (error) {
        console.error('[OpenAI Error]:', error.message);
        return res.status(500).json({ error: 'Internal server error', message: error.message });
    }
}