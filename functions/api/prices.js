// Cloudflare Pages Function — Stock Prices Proxy
// Forwards requests to Yahoo Finance. No API key required.
//
// GET /api/prices?symbol=AAPL
// GET /api/prices?symbol=LGEN.L
// GET /api/prices?symbol=RY.TO

function corsHeaders(request) {
    const origin = request.headers.get('Origin') || '*';
    return {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    };
}

export async function onRequest(context) {
    const { request } = context;

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders(request) });
    }

    if (request.method !== 'GET') {
        return new Response('Method not allowed', { status: 405 });
    }

    const url = new URL(request.url);
    const symbol = url.searchParams.get('symbol');

    if (!symbol) {
        return new Response('Missing symbol parameter', { status: 400 });
    }

    const apiUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;

    const response = await fetch(apiUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
    });

    const data = await response.json();
    return Response.json(data, {
        status: response.status,
        headers: corsHeaders(request),
    });
}
