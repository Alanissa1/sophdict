export default async function handler(req, res) {
    const secFetchSite = req.headers['sec-fetch-site'];
    const origin = req.headers['origin'] || req.headers['referer'];
    const userAgent = req.headers['user-agent'] || '';

    const isSophDictSite = ['same-origin', 'same-site'].includes(secFetchSite);
    const isAndroidApp = (
        (origin === 'null' || !origin || origin.includes('appassets.androidplatform.net')) &&
        userAgent.includes('Android')
    );

    if (!isSophDictSite && !isAndroidApp) {
        console.warn(`Access Denied. Origin: ${origin}`);
        return res.status(403).json({ error: 'Access denied' });
    }

    res.setHeader('Access-Control-Allow-Origin', origin && origin !== 'null' ? origin : '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-goog-api-key, x-sophdict-client');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    res.setHeader('X-Robots-Tag', 'noindex');

    const authKey = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : null;
    if (!authKey) {
        return res.status(500).json({ error: 'Gemini API key not configured' });
    }

    const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
    const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

    try {
        let contents = [];
        let systemInstruction = null;
        let model = "gemini-1.5-flash";
        let cacheKey = null;

        // 1. Parse Request Body
        let body = {};
        if (req.method === 'POST') {
            try {
                body = (req.body && typeof req.body === 'object') ? req.body : (typeof req.body === 'string' ? JSON.parse(req.body) : {});
            } catch (e) {
                console.error('Body Parse Error:', e);
            }

            if (body.contents) {
                contents = body.contents;
            } else if (body.messages) {
                body.messages.forEach(msg => {
                    if (msg.role === 'system') {
                        systemInstruction = { parts: [{ text: msg.content }] };
                    } else {
                        contents.push({
                            role: msg.role === 'assistant' ? 'model' : 'user',
                            parts: [{ text: msg.content }]
                        });
                    }
                });
            }
            if (body.model) model = body.model.replace('models/', '').trim();
        } else {
            const { prompt, system, model: qModel } = req.query;
            if (!prompt) return res.status(400).json({ error: 'Prompt is required' });
            if (system) systemInstruction = { parts: [{ text: system }] };
            if (qModel) model = qModel.trim();
            contents.push({ role: 'user', parts: [{ text: prompt }] });
        }

        // 2. Caching (Safe-Failure)
        if (upstashUrl && upstashToken) {
            try {
                const contentHash = Buffer.from(JSON.stringify({ contents, systemInstruction, model })).toString('hex').substring(0, 80);
                cacheKey = `ai:gemini:${model}:${contentHash}`;

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
            } catch (cacheErr) {
                console.warn('Upstash error:', cacheErr.message);
            }
        }

        if (contents.length === 0) {
            return res.status(400).json({ error: 'No content provided' });
        }

        // 3. Call Google API (v1 + Header Authentication)
        const geminiPayload = { contents };
        if (systemInstruction) geminiPayload.system_instruction = systemInstruction;

        const modelId = model.includes('/') ? model.split('/').pop() : model;
        const apiUrl = `https://generativelanguage.googleapis.com/v1/models/${modelId}:generateContent`;

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': authKey
            },
            body: JSON.stringify(geminiPayload)
        });

        if (!response.ok) {
            const error = await response.text();
            console.error('[Gemini API Error]:', error, 'Status:', response.status);
            return res.status(response.status).json({
                error: 'Gemini API error',
                details: error,
                status: response.status
            });
        }

        const data = await response.json();

        // 4. Save to Cache (Background)
        if (cacheKey && upstashUrl && upstashToken && data) {
            fetch(upstashUrl.startsWith('http') ? upstashUrl : `https://${upstashUrl}`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${upstashToken}` },
                body: JSON.stringify(["SET", cacheKey, JSON.stringify(data), "EX", 31536000])
            }).catch(() => null);
        }

        return res.status(200).json(data);

    } catch (error) {
        console.error('[Function Internal Error]:', error.message);
        return res.status(500).json({ error: 'Internal server error', message: error.message });
    }
}
