export const config = {
    runtime: 'edge',
};

export default async function handler(req) {
    const url = new URL(req.url);
    const origin = `${url.protocol}//${url.host}`;

    try {
        const templateResponse = await fetch(new URL('/index.html', req.url));
        if (!templateResponse.ok) {
            return new Response('Error loading template', { status: 500 });
        }
        let html = await templateResponse.text();

        const title = "Feedback & Support - SophDict";
        const desc = "Get in touch with the SophDict team for support or to provide feedback.";

        html = html.replace(/<title>.*?<\/title>/, `<title>${title}</title>`);
        if (/<meta[^>]*name=["']description["'][^>]*>/.test(html)) {
            html = html.replace(/<meta[^>]*name=["']description["'][^>]*content=["'][^"']*["'][^>]*>/, `<meta name="description" content="${desc}">`);
        }
        html = html.replace(/property="og:title" content=".*?"/g, `property="og:title" content="${title}"`);
        html = html.replace(/property="og:description" content=".*?"/g, `property="og:description" content="${desc}"`);
        html = html.replace(/property="og:url" content=".*?"/g, `property="og:url" content="${origin}/feedbackandsupport"`);

        return new Response(html, {
            headers: { 'Content-Type': 'text/html' },
        });
    } catch (e) {
        return fetch(new URL('/index.html', req.url));
    }
}
