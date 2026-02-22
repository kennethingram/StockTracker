// Cloudflare Pages Function — Stock Prices Proxy
// Keeps Finnhub and Alpha Vantage API keys server-side. The browser never sees them.
//
// GET /api/prices?source=finnhub&symbol=AAPL
// GET /api/prices?source=alphavantage&symbol=LGEN.LON

// Only accept requests from our own domain
function isAllowedOrigin(request) {
    const origin = request.headers.get('Origin') || '';
    return (
        origin.endsWith('.pages.dev') ||
        origin.includes('localhost') ||
        origin.includes('127.0.0.1') ||
        origin === ''
    );
}

function corsHeaders(request) {
    const origin = request.headers.get('Origin') || '*';
    return {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    };
}

export async function onRequest(context) {
    const { request, env } = context;

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders(request) });
    }

    if (request.method !== 'GET') {
        return new Response('Method not allowed', { status: 405 });
    }

    if (!isAllowedOrigin(request)) {
        return new Response('Forbidden', { status: 403 });
    }

    const url = new URL(request.url);
    const source = url.searchParams.get('source');
    const symbol = url.searchParams.get('symbol');

    if (!source || !symbol) {
        return new Response('Missing source or symbol parameter', { status: 400 });
    }

    let apiUrl;

    if (source === 'finnhub') {
        if (!env.FINNHUB_API_KEY) {
            return new Response('Server misconfigured: missing FINNHUB_API_KEY', { status: 500 });
        }
        apiUrl = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${env.FINNHUB_API_KEY}`;

    } else if (source === 'alphavantage') {
        if (!env.ALPHA_VANTAGE_API_KEY) {
            return new Response('Server misconfigured: missing ALPHA_VANTAGE_API_KEY', { status: 500 });
        }
        apiUrl = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(symbol)}&apikey=${env.ALPHA_VANTAGE_API_KEY}`;

    } else {
        return new Response('Invalid source. Use "finnhub" or "alphavantage"', { status: 400 });
    }

    const response = await fetch(apiUrl);
    const data = await response.json();
    return Response.json(data, {
        status: response.status,
        headers: corsHeaders(request),
    });
}
