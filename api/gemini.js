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
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-goog-api-key, x-sophdict-client');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    res.setHeader('X-Robots-Tag', 'noindex');

    const authKey = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : null;
    if (!authKey) {
        return res.status(500).json({ error: 'Gemini API key not configured' });
    }

    let upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
    const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (upstashUrl) {
        if (!upstashUrl.startsWith('http')) upstashUrl = `https://${upstashUrl}`;
        try {
            const urlObj = new URL(upstashUrl);
            upstashUrl = `${urlObj.protocol}//${urlObj.host}`;
        } catch (e) { upstashUrl = upstashUrl.replace(/\/$/, ''); }
    }

    try {
        let contents = [];
        let systemInstruction = null;
        let model = "gemini-1.5-flash";
        let cacheKey = null;

        let body = {};
        if (req.method === 'POST') {
            try {
                body = (req.body && typeof req.body === 'object') ? req.body : (typeof req.body === 'string' ? JSON.parse(req.body) : {});
            } catch (e) { console.error('Body Parse Error:', e); }

            if (body.contents) {
                // SANITIZE: Remove thought/thought_signature and other unsupported internal fields
                // that cause decoding errors when sent back as history.
                contents = body.contents.map(c => ({
                    role: c.role === 'assistant' ? 'model' : c.role,
                    parts: (c.parts || []).map(p => {
                        const sanitizedPart = {};
                        if (p.text) sanitizedPart.text = p.text;
                        if (p.inline_data) sanitizedPart.inline_data = p.inline_data;
                        if (p.file_data) sanitizedPart.file_data = p.file_data;
                        if (p.function_call) sanitizedPart.function_call = p.function_call;
                        if (p.function_response) sanitizedPart.function_response = p.function_response;
                        return sanitizedPart;
                    }).filter(p => Object.keys(p).length > 0)
                })).filter(c => c.parts.length > 0);
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

        if (upstashUrl && upstashToken && contents.length > 0) {
            try {
                const contentHash = Buffer.from(JSON.stringify({ contents, systemInstruction, model })).toString('hex').substring(0, 80);
                cacheKey = `ai:gemini:${model}:${contentHash}`;
                const cacheRes = await fetch(upstashUrl, {
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
            } catch (e) {}
        }

        if (contents.length === 0) return res.status(400).json({ error: 'No content provided' });

        const geminiPayload = { contents };
        if (systemInstruction) geminiPayload.system_instruction = systemInstruction;

        const modelId = model.includes('/') ? model.split('/').pop() : model;
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent`;

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-goog-api-key': authKey
            },
            body: JSON.stringify(geminiPayload)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown API error' }));
            console.error('[Gemini API Error]:', JSON.stringify(errorData), 'Status:', response.status);
            return res.status(response.status).json(errorData);
        }

        const data = await response.json();

        if (cacheKey && upstashUrl && upstashToken) {
            fetch(upstashUrl, {
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
