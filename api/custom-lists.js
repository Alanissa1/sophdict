import { Redis } from '@upstash/redis'
import crypto from 'crypto'

let url = process.env.UPSTASH_REDIS_REST_URL;
if (url && url.endsWith('/')) url = url.slice(0, -1);

const redis = (url && process.env.UPSTASH_REDIS_REST_TOKEN)
    ? new Redis({
        url: url,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

// --- Password Hashing ---

function hashPassword(password, salt) {
    if (!salt) salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.createHash('sha256').update(salt + password).digest('hex');
    return { hash, salt };
}

function verifyPasswordHash(password, storedHash, storedSalt) {
    const { hash } = hashPassword(password, storedSalt);
    // timingSafeEqual prevents timing attacks
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(storedHash, 'hex'));
}

// --- Session Tokens (HMAC-signed, 1-hour expiry) ---

const AUTH_SECRET = process.env.LIST_AUTH_SECRET || process.env.UPSTASH_REDIS_REST_TOKEN || 'sophdict-fallback';
const TOKEN_EXPIRY_MS = 60 * 60 * 1000;

function createToken(listName) {
    const payload = JSON.stringify({ name: listName, exp: Date.now() + TOKEN_EXPIRY_MS });
    const payloadB64 = Buffer.from(payload).toString('base64url');
    const sig = crypto.createHmac('sha256', AUTH_SECRET).update(payloadB64).digest('base64url');
    return `${payloadB64}.${sig}`;
}

function verifyToken(token, listName) {
    try {
        const [payloadB64, sig] = token.split('.');
        if (!payloadB64 || !sig) return false;
        const expectedSig = crypto.createHmac('sha256', AUTH_SECRET).update(payloadB64).digest('base64url');
        if (!crypto.timingSafeEqual(Buffer.from(sig, 'utf8'), Buffer.from(expectedSig, 'utf8'))) return false;
        const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());
        if (payload.name !== listName) return false;
        if (Date.now() > payload.exp) return false;
        return true;
    } catch (e) {
        return false;
    }
}

// Extract bearer token from request
function extractToken(req) {
    const auth = req.headers['authorization'];
    return (auth && auth.startsWith('Bearer ')) ? auth.slice(7) : null;
}

// Parse redis data (may be object or JSON string)
function parseData(data) {
    if (!data) return null;
    if (typeof data === 'string') {
        try { return JSON.parse(data); } catch (e) { return null; }
    }
    return data;
}

// Migrate legacy plain-text password to hash (in-place, also persists to Redis)
async function migrateLegacyPassword(key, data) {
    if (data.password && !data.passwordHash) {
        const { hash, salt } = hashPassword(data.password);
        data.passwordHash = hash;
        data.passwordSalt = salt;
        delete data.password;
        await redis.set(key, data);
    }
}

// Check if list data is password-protected (handles both legacy and new format)
function isProtected(data) {
    return !!(data && (data.passwordHash || data.password));
}

// Strip all secret fields before sending to client
function sanitize(data) {
    if (!data) return data;
    const clean = { ...data };
    clean.hasPassword = !!(clean.passwordHash || clean.password);
    delete clean.passwordHash;
    delete clean.passwordSalt;
    delete clean.password;
    return clean;
}

export default async function handler(req, res) {
    if (!redis) {
        return res.status(503).json({ error: 'Database configuration missing. Please set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in Vercel.' });
    }

    const { method, query, body } = req;
    const { name } = query;

    try {
        // ===== GET =====

        if (method === 'GET' && query.action === 'check') {
            const exists = await redis.exists(`list:${name}`);
            return res.status(200).json({ available: !exists });
        }

        if (method === 'GET' && query.action === 'explore') {
            const keys = await redis.keys('list:*');
            const publicLists = [];
            for (const key of keys) {
                const data = parseData(await redis.get(key));
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
            const data = parseData(await redis.get(`list:${name}`));
            if (!data) return res.status(404).json({ error: 'Not found' });
            // NEVER return password hashes to the client
            return res.status(200).json(sanitize(data));
        }

        // ===== POST =====

        if (method === 'POST') {
            const action = query.action || body?.action;

            // --- VERIFY PASSWORD (returns session token) ---
            if (action === 'verify') {
                const { name: listName, password } = body;
                if (!listName || !password) return res.status(400).json({ error: 'Name and password required' });

                const key = `list:${listName}`;
                const data = parseData(await redis.get(key));
                if (!data) return res.status(404).json({ error: 'List not found' });

                // Auto-migrate legacy plain-text passwords
                await migrateLegacyPassword(key, data);

                if (!data.passwordHash) return res.status(400).json({ error: 'List has no password' });

                if (!verifyPasswordHash(password, data.passwordHash, data.passwordSalt)) {
                    return res.status(401).json({ error: 'Incorrect password' });
                }

                return res.status(200).json({ success: true, token: createToken(listName) });
            }

            // --- CHANGE PASSWORD (requires old password or valid token) ---
            if (action === 'change-password') {
                const { name: listName, oldPassword, newPassword } = body;
                if (!listName) return res.status(400).json({ error: 'Name required' });

                const key = `list:${listName}`;
                const data = parseData(await redis.get(key));
                if (!data) return res.status(404).json({ error: 'List not found' });

                await migrateLegacyPassword(key, data);

                // Authenticate: token OR old password
                const token = extractToken(req);
                let authenticated = token && verifyToken(token, listName);

                if (!authenticated && data.passwordHash) {
                    if (!oldPassword || !verifyPasswordHash(oldPassword, data.passwordHash, data.passwordSalt)) {
                        return res.status(401).json({ error: 'Incorrect old password' });
                    }
                    authenticated = true;
                }

                if (!authenticated && data.passwordHash) {
                    return res.status(401).json({ error: 'Authentication required' });
                }

                // Set or remove password
                if (newPassword) {
                    const { hash, salt } = hashPassword(newPassword);
                    data.passwordHash = hash;
                    data.passwordSalt = salt;
                } else {
                    delete data.passwordHash;
                    delete data.passwordSalt;
                }
                delete data.password;

                await redis.set(key, data);
                const newToken = newPassword ? createToken(listName) : null;
                return res.status(200).json({ success: true, token: newToken });
            }

            // --- SAVE / CREATE LIST ---
            {
                const { name: listName, data } = body || {};
                if (!listName || !data) return res.status(400).json({ error: 'Name and data required' });

                const key = `list:${listName}`;
                const existing = parseData(await redis.get(key));

                if (existing) {
                    await migrateLegacyPassword(key, existing);

                    // If list is protected, require a valid session token
                    if (isProtected(existing)) {
                        const token = extractToken(req);
                        if (!token || !verifyToken(token, listName)) {
                            return res.status(401).json({ error: 'Authentication required to modify this list' });
                        }
                    }

                    // ALWAYS preserve server-side credentials — client cannot overwrite them
                    if (existing.passwordHash) {
                        data.passwordHash = existing.passwordHash;
                        data.passwordSalt = existing.passwordSalt;
                    }
                    delete data.password;
                } else {
                    // New list — hash the password if one was provided
                    if (data.password) {
                        const { hash, salt } = hashPassword(data.password);
                        data.passwordHash = hash;
                        data.passwordSalt = salt;
                        delete data.password;
                    }
                }

                await redis.set(key, data);

                // Return token to the creator if the list is password-protected
                let token = null;
                if (data.passwordHash) {
                    token = createToken(listName);
                }

                return res.status(200).json({ success: true, token });
            }
        }

        res.status(405).json({ error: 'Method not allowed' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}
