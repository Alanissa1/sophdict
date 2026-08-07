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
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

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

        if (req.method === 'POST') {
            const body = (req.body && typeof req.body === 'object') ? req.body : (typeof req.body === 'string' ? JSON.parse(req.body) : {});

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

            if (body.model) {
                model = body.model.replace('models/', '');
            }

            if (contents.length > 0 && upstashUrl && upstashToken) {
                const contentHash = Buffer.from(JSON.stringify({ contents, systemInstruction, model })).toString('hex').substring(0, 120);
                cacheKey = `ai:gemini:${model}:${contentHash}`;
            }
        } else {
            const { prompt, system } = req.query;
            if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

            if (system) {
                systemInstruction = { parts: [{ text: system }] };
            }
            contents.push({ role: 'user', parts: [{ text: prompt }] });

            if (upstashUrl && upstashToken) {
                const promptHash = Buffer.from(`${system || ''}:${prompt}`).toString('hex').substring(0, 120);
                cacheKey = `ai:gemini:${model}:${promptHash}`;
            }
        }

        // Caching Logic
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

        if (contents.length === 0) {
            return res.status(400).json({ error: 'No content provided' });
        }

        const geminiPayload = { contents };
        if (systemInstruction) {
            geminiPayload.system_instruction = systemInstruction;
        }

        const modelId = model.includes('/') ? model.split('/').pop() : model;
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${authKey}`;

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(geminiPayload)
        });

        if (!response.ok) {
            const error = await response.text();
            console.error('[Gemini API Error]:', error, 'URL:', apiUrl.replace(authKey, 'HIDDEN'));
            return res.status(response.status).json({ error: 'Gemini API error', details: error });
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
        console.error('[Internal Error]:', error.message);
        return res.status(500).json({ error: 'Internal server error', message: error.message });
    }
}
