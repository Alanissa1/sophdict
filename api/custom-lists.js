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
        // --- action=check (name availability + protection info) ---
        if (method === 'GET' && query.action === 'check') {
            const key = `list:${name}`;
            const exists = await redis.exists(key);
            if (!exists) {
                return res.status(200).json({ available: true, passwordProtected: false });
            }

            let data = await redis.get(key);
            if (typeof data === 'string') {
                try { data = JSON.parse(data); } catch(e) {
                    return res.status(200).json({ available: false, passwordProtected: false });
                }
            }
            const hasPassword = !!(data && data.password);
            const hidden = !!(data && data.hidden);
            return res.status(200).json({
                available: false,           // name is taken
                passwordProtected: hasPassword,
                hidden
            });
        }

        // --- action=explore (public lists, no password needed) ---
        if (method === 'GET' && query.action === 'explore') {
            const keys = await redis.keys('list:*');
            const publicLists = [];
            for (const key of keys) {
                let data = await redis.get(key);
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

        // --- action=get (retrieve one list, password check for hidden lists) ---
        if (method === 'GET' && query.action === 'get') {
            const key = `list:${name}`;
            let data = await redis.get(key);
            if (!data) return res.status(404).json({ error: 'Not found' });

            if (typeof data === 'string') {
                try { data = JSON.parse(data); } catch(e) {
                    return res.status(500).json({ error: 'Invalid data' });
                }
            }

            // If the list is hidden AND has a password, validate it
            if (data.hidden && data.password) {
                const submittedPassword = query.password || '';
                if (submittedPassword !== data.password) {
                    return res.status(401).json({ error: 'Unauthorized' });
                }
            }

            return res.status(200).json(data);
        }

        // --- POST (create/update) ---
        if (method === 'POST') {
            const { name, data } = body;
            if (!name || !data) return res.status(400).json({ error: 'Missing name or data' });

            const key = `list:${name}`;
            const exists = await redis.exists(key);

            // If updating an existing list, check password if it has one
            if (exists) {
                let existing = await redis.get(key);
                if (typeof existing === 'string') {
                    try { existing = JSON.parse(existing); } catch(e) {
                        return res.status(500).json({ error: 'Invalid existing data' });
                    }
                }
                if (existing && existing.password) {
                    const incomingPassword = data.password || '';
                    if (incomingPassword !== existing.password) {
                        return res.status(403).json({ error: 'Forbidden: incorrect password' });
                    }
                }
            }

            await redis.set(key, data);
            return res.status(200).json({ success: true });
        }

        res.status(405).json({ error: 'Method not allowed' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}