import { Redis } from '@upstash/redis'

let url = process.env.UPSTASH_REDIS_REST_URL;
if (url && url.endsWith('/')) url = url.slice(0, -1);

const redis = (url && process.env.UPSTASH_REDIS_REST_TOKEN)
    ? new Redis({
        url: url,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

// Extract client IP address for rate limiting
function getClientIp(req) {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) return forwarded.split(',')[0].trim();
    return req.socket?.remoteAddress || '127.0.0.1';
}

// IP Rate Limiter to prevent brute-force / DDoS attacks
async function checkRateLimit(ip, maxRequests = 60, windowSeconds = 60) {
    try {
        const key = `ratelimit:${ip}`;
        const requests = await redis.incr(key);
        if (requests === 1) {
            await redis.expire(key, windowSeconds);
        }
        return requests <= maxRequests;
    } catch (e) {
        console.error('Rate limit error:', e);
        return true; // Fail open if rate limit check encounters error
    }
}

export default async function handler(req, res) {
    if (!redis) {
        return res.status(503).json({ error: 'Database configuration missing. Please set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in Vercel.' });
    }

    const clientIp = getClientIp(req);

    // Rate Limit: Max 60 requests per minute per IP
    const allowed = await checkRateLimit(clientIp, 60, 60);
    if (!allowed) {
        return res.status(429).json({ error: 'Too many requests. Please slow down and try again later.' });
    }

    const { method, query, body } = req;
    const name = query.name ? String(query.name).trim() : null;

    try {
        // ACTION: Check list availability
        if (method === 'GET' && query.action === 'check') {
            if (!name) return res.status(400).json({ error: 'List name required' });
            const exists = await redis.exists(`list:${name}`);
            return res.status(200).json({ available: !exists });
        }

        // ACTION: Explore public lists
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

        // ACTION: Get list data
        if (method === 'GET' && query.action === 'get') {
            if (!name) return res.status(400).json({ error: 'List name required' });
            let data = await redis.get(`list:${name}`);
            if (!data) return res.status(404).json({ error: 'Not found' });

            if (typeof data === 'string') {
                try { data = JSON.parse(data); } catch(e) {}
            }

            // Security: Never return the stored password in plain JSON to the browser
            if (data && typeof data === 'object') {
                const sanitizedData = { ...data };
                delete sanitizedData.password;
                return res.status(200).json(sanitizedData);
            }

            return res.status(200).json(data);
        }

        // ACTION: Create / Save list
        if (method === 'POST') {
            const listName = body?.name ? String(body.name).trim() : name;
            const listData = body?.data;

            if (!listName || !listData) {
                return res.status(400).json({ error: 'Invalid payload. Name and data required.' });
            }

            // Stricter Rate Limit for POST requests (15 requests/min per IP to stop spam/password brute-forcing)
            const postAllowed = await checkRateLimit(`post:${clientIp}`, 15, 60);
            if (!postAllowed) {
                return res.status(429).json({ error: 'Too many update attempts. Please wait a moment.' });
            }

            // Security: Password verification on edit/overwrite
            const existingRaw = await redis.get(`list:${listName}`);
            if (existingRaw) {
                let existing = typeof existingRaw === 'string' ? JSON.parse(existingRaw) : existingRaw;
                
                // If existing list is password protected, require matching password
                if (existing && existing.password) {
                    const providedPassword = body.password || listData.password || req.headers['x-list-password'];
                    if (providedPassword !== existing.password) {
                        return res.status(401).json({ error: 'Unauthorized: Incorrect list password.' });
                    }
                }
            }

            await redis.set(`list:${listName}`, listData);
            return res.status(200).json({ success: true });
        }

        res.status(405).json({ error: 'Method not allowed' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}
