export default async function handler(req, res) {
    const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
    const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;
    const origin = 'https://www.sophdict.com'; // Change to your actual domain

    let words = [];
    try {
        if (upstashUrl && upstashToken) {
            const cleanUrl = upstashUrl.replace(/\/$/, "");
            const response = await fetch(`${cleanUrl}/smembers/all_words_index`, {
                headers: { Authorization: `Bearer ${upstashToken}` }
            });
            const data = await response.json();
            if (data && data.result) {
                // Filter out invalid/empty entries and limit to avoid Vercel's 4.5MB response limit
                words = data.result.filter(w => w && typeof w === 'string' && w.length > 0);
                // Sort for determinism and better compression
                words.sort();
            }
        }
    } catch (e) {
        console.error('Sitemap fetch error:', e);
    }

    // Limit to 45,000 URLs to stay within Google's 50k limit and Vercel's response size limit
    const displayWords = words.slice(0, 45000);

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
        <url><loc>${origin}/</loc><priority>1.0</priority></url>
        ${displayWords.map(word => `
        <url>
            <loc>${origin}/${encodeURIComponent(word.trim().toLowerCase())}</loc>
            <changefreq>monthly</changefreq>
            <priority>0.6</priority>
        </url>`).join('')}
    </urlset>`;

    res.setHeader('Content-Type', 'text/xml');
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=600');
    res.write(sitemap);
    res.end();
}
