import { Redis } from '@upstash/redis'

let url = process.env.UPSTASH_REDIS_REST_URL;
if (url && url.endsWith('/')) url = url.slice(0, -1);

const redis = (url && process.env.UPSTASH_REDIS_REST_TOKEN)
    ? new Redis({
        url: url,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

export default async function handler(req, res) {
    if (!redis) {
        return res.status(503).json({ error: 'Database configuration missing. Please set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in Vercel.' });
    }

    const { method, query, body } = req;
    const { name } = query;

    try {
        if (method === 'GET' && query.action === 'check') {
            const exists = await redis.exists(`list:${name}`);
            return res.status(200).json({ available: !exists });
        }

        if (method === 'GET' && query.action === 'explore') {
            const keys = await redis.keys('list:*');
            const publicLists = [];
            for (const key of keys) {
                let data = await redis.get(key);
                // Ensure data is an object
                if (typeof data === 'string') {
                    try { data = JSON.parse(data); } catch(e) { continue; }
                }
                if (data && data.visibility === 'public') {
                    publicLists.push({
                        name: key.replace('list:', ''),
                        wordCount: (data.words && Array.isArray(data.words)) ? data.words.length : 0
                    });
                }
            }
            return res.status(200).json(publicLists);
        }

        if (method === 'GET' && query.action === 'get') {
            const data = await redis.get(`list:${name}`);
            if (!data) return res.status(404).json({ error: 'Not found' });
            return res.status(200).json(data);
        }

        if (method === 'POST') {
            const { name, data } = body;
            await redis.set(`list:${name}`, data);
            return res.status(200).json({ success: true });
        }

        res.status(405).json({ error: 'Method not allowed' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}
