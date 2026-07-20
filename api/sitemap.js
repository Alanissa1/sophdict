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
            if (data && data.result) words = data.result;
        }
    } catch (e) {
        console.error('Sitemap fetch error:', e);
    }

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
        <url><loc>${origin}/</loc><priority>1.0</priority></url>
        ${words.map(word => `
        <url>
            <loc>${origin}/${encodeURIComponent(word)}</loc>
            <changefreq>monthly</changefreq>
            <priority>0.6</priority>
        </url>`).join('')}
    </urlset>`;

    res.setHeader('Content-Type', 'text/xml');
    res.write(sitemap);
    res.end();
}