export default async function handler(req, res) {
    const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
    const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;
    const origin = 'https://www.sophdict.com';
    const pageSize = 45000;
    const { page } = req.query;

    try {
        if (!upstashUrl || !upstashToken) {
            return res.status(500).end();
        }

        const cleanUrl = upstashUrl.replace(/\/$/, "");
        let words = new Set();

        // Fetch all words from both sources
        // Note: For truly "huge" sets (millions), this should be cached or pre-calculated
        // For dictionary purposes (up to ~300k words), this fits in memory.

        // 1. Get words from the explicit index
        const indexRes = await fetch(`${cleanUrl}/smembers/all_words_index`, {
            headers: { Authorization: `Bearer ${upstashToken}` }
        });
        const indexData = await indexRes.json();
        if (indexData && indexData.result) {
            indexData.result.forEach(w => words.add(w));
        }

        // 2. Scan for all dictionary keys
        let cursor = "0";
        do {
            const scanRes = await fetch(`${cleanUrl}/scan/${cursor}/MATCH/dict:*/COUNT/5000`, {
                headers: { Authorization: `Bearer ${upstashToken}` }
            });
            const scanData = await scanRes.json();
            if (scanData && scanData.result) {
                cursor = scanData.result[0];
                const keys = scanData.result[1];
                keys.forEach(key => words.add(key.replace(/^dict:/, '')));
            } else {
                cursor = "0";
            }
        } while (cursor !== "0");

        const wordsArray = Array.from(words).sort();
        const totalPages = Math.ceil(wordsArray.length / pageSize);

        // CASE 1: Sitemap Index requested (/sitemap.xml)
        if (page === undefined) {
            const sitemapIndex = `<?xml version="1.0" encoding="UTF-8"?>
            <sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
                ${Array.from({ length: Math.max(1, totalPages) }).map((_, i) => `
                <sitemap>
                    <loc>${origin}/sitemap-${i}.xml</loc>
                </sitemap>`).join('')}
            </sitemapindex>`;

            res.setHeader('Content-Type', 'text/xml');
            return res.send(sitemapIndex.trim());
        }

        // CASE 2: Specific Sitemap Part requested (/sitemap-N.xml)
        const pageNum = parseInt(page);
        const start = pageNum * pageSize;
        const pageWords = wordsArray.slice(start, start + pageSize);

        const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
        <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
            ${pageNum === 0 ? `<url><loc>${origin}/</loc><priority>1.0</priority></url>` : ''}
            ${pageWords.map(word => `
            <url>
                <loc>${origin}/${encodeURIComponent(word)}</loc>
                <changefreq>monthly</changefreq>
                <priority>0.6</priority>
            </url>`).join('')}
        </urlset>`;

        res.setHeader('Content-Type', 'text/xml');
        res.write(sitemap.trim());
        res.end();

    } catch (e) {
        console.error('Sitemap error:', e);
        res.status(500).send('Internal Server Error');
    }
}
