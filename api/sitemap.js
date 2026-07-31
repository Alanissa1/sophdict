import { Redis } from '@upstash/redis'

export default async function handler(req, res) {
    let url = process.env.UPSTASH_REDIS_REST_URL;
    if (url && !url.startsWith('http')) url = `https://${url}`;
    if (url && url.endsWith('/')) url = url.slice(0, -1);

    const redis = (url && process.env.UPSTASH_REDIS_REST_TOKEN)
        ? new Redis({
            url: url,
            token: process.env.UPSTASH_REDIS_REST_TOKEN,
        })
        : null;

    const origin = 'https://www.sophdict.com';
    let wordsSet = new Set();
    let publicListsSet = new Set(); // Collection for public list names

    try {
        if (redis) {
            // 1. Get words from the main index (most efficient)
            const indexedWords = await redis.smembers('all_words_index');
            if (Array.isArray(indexedWords)) {
                indexedWords.forEach(w => {
                    if (w && typeof w === 'string') wordsSet.add(w.toLowerCase().trim());
                });
            }

            // 2. Discover words and public list names from public lists
            const listKeys = await redis.keys('list:*');
            if (listKeys && listKeys.length > 0) {
                // Fetch in chunks to avoid large payloads
                const chunkSize = 50;
                for (let i = 0; i < listKeys.length; i += chunkSize) {
                    const chunk = listKeys.slice(i, i + chunkSize);
                    const listDatas = await redis.mget(...chunk);
                    listDatas.forEach((data, index) => {
                        if (!data) return;
                        // Handle both stringified and parsed JSON
                        const list = (typeof data === 'string') ? JSON.parse(data) : data;
                        if (list && list.visibility === 'public') {
                            const listName = chunk[index].replace('list:', '');
                            publicListsSet.add(listName); // Add public list name

                            if (Array.isArray(list.words)) {
                                list.words.forEach(w => {
                                    const wordStr = (typeof w === 'string') ? w : w?.word;
                                    if (wordStr) wordsSet.add(wordStr.toLowerCase().trim());
                                });
                            }
                        }
                    });
                }
            }
        }
    } catch (e) {
        console.error('Sitemap fetch error:', e);
    }

    // Filter out invalid entries, sort alphabetically, and limit to stay within Vercel/Google limits
    const words = Array.from(wordsSet)
        .filter(w => w && w.length > 0)
        .sort();

    // Limit to 45,000 URLs to avoid Vercel's 4.5MB response limit and Google's 50k URL limit
    const displayWords = words.slice(0, 45000);
    const publicLists = Array.from(publicListsSet).sort();

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url>
        <loc>${origin}/</loc>
        <priority>1.0</priority>
    </url>
    ${publicLists.map(listName => `
    <url>
        <loc>${origin}/listname/${encodeURIComponent(listName)}</loc>
        <changefreq>weekly</changefreq>
        <priority>0.8</priority>
    </url>`).join('')}
    ${displayWords.map(word => `
    <url>
        <loc>${origin}/${encodeURIComponent(word)}</loc>
        <changefreq>monthly</changefreq>
        <priority>0.6</priority>
    </url>`).join('')}
</urlset>`;

    res.setHeader('Content-Type', 'text/xml');
    // Cache for 1 hour, serve stale for 10 mins while revalidating
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=600');
    res.send(sitemap.trim());
}
