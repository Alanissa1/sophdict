export const config = {
    runtime: 'edge',
};

export default async function handler(req) {
    const url = new URL(req.url);
    const path = url.pathname.substring(1);

    // Safety check for empty path or files
    if (!path || path.includes('.')) {
        return fetch(new URL('/index.html', req.url));
    }

    const word = decodeURIComponent(path).toLowerCase().trim();
    const origin = `${url.protocol}//${url.host}`;

    try {
        // 1. Fetch index.html template from the origin to ensure it exists
        const templateResponse = await fetch(new URL('/index.html', req.url));
        if (!templateResponse.ok) {
            // If template fetch fails, return a simple error or just forward the request
            return new Response('Error loading template', { status: 500 });
        }
        let html = await templateResponse.text();

        // 2. Metadata defaults
        const capitalized = word.charAt(0).toUpperCase() + word.slice(1);
        let title = `${capitalized} Definition & Synonyms - SophDict`;
        let desc = `Discover the meaning, pronunciation, synonyms, and antonyms of "${word}" on SophDict. Your go-to sophisticated dictionary.`;

        // 3. Try to fetch specific word data from Upstash
        const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
        const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

        if (upstashUrl && upstashToken) {
            const cacheKey = `dict:${word}`;
            const cleanUpstashUrl = upstashUrl.replace(/\/$/, "");

            try {
                const cacheRes = await fetch(`${cleanUpstashUrl}/get/${cacheKey}`, {
                    headers: { Authorization: `Bearer ${upstashToken}` }
                });

                if (cacheRes.ok) {
                    const cacheData = await cacheRes.json();
                    if (cacheData && cacheData.result) {
                        const data = JSON.parse(cacheData.result);
                        if (Array.isArray(data) && data.length > 0 && data[0].shortdef) {
                            desc = `Meaning of ${word}: ${data[0].shortdef[0]}. Discover more definitions and synonyms on SophDict.`;
                        }
                    }
                }
            } catch (cacheErr) {
                console.error('Cache Fetch Error:', cacheErr);
            }
        }

        // 4. Inject metadata into HTML
        html = html.replace(/<title>.*?<\/title>/, `<title>${title}</title>`);

        // Use a more robust regex for description replacement
        if (/<meta[^>]*name=["']description["'][^>]*>/.test(html)) {
            html = html.replace(/<meta[^>]*name=["']description["'][^>]*content=["'][^"']*["'][^>]*>/, `<meta name="description" content="${desc}">`);
        }

        html = html.replace(/property="og:title" content=".*?"/g, `property="og:title" content="${title}"`);
        html = html.replace(/property="og:description" content=".*?"/g, `property="og:description" content="${desc}"`);
        html = html.replace(/property="og:url" content=".*?"/g, `property="og:url" content="${origin}/${encodeURIComponent(word)}"`);

        return new Response(html, {
            headers: { 'Content-Type': 'text/html' },
        });

    } catch (e) {
        console.error('Edge Render Error:', e);
        // Absolute fallback
        return fetch(new URL('/index.html', req.url));
    }
}
