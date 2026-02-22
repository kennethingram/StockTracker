// Cloudflare Pages Function — Gemini API Proxy
// Keeps the Gemini API key server-side. The browser never sees it.
//
// GET  /api/gemini           → lists available Gemini models
// POST /api/gemini?model=... → generates content (text or vision)

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';

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
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    };
}

export async function onRequest(context) {
    const { request, env } = context;

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders(request) });
    }

    if (!isAllowedOrigin(request)) {
        return new Response('Forbidden', { status: 403 });
    }

    if (!env.GEMINI_API_KEY) {
        return new Response('Server misconfigured: missing GEMINI_API_KEY', { status: 500 });
    }

    const url = new URL(request.url);

    // GET /api/gemini — list available models
    if (request.method === 'GET') {
        const response = await fetch(
            `${GEMINI_BASE}/models?key=${env.GEMINI_API_KEY}`
        );
        const data = await response.json();
        return Response.json(data, {
            status: response.status,
            headers: corsHeaders(request),
        });
    }

    // POST /api/gemini?model=models/gemini-... — generate content
    if (request.method === 'POST') {
        const model = url.searchParams.get('model');
        if (!model) {
            return new Response('Missing model parameter', { status: 400 });
        }

        const body = await request.arrayBuffer();
        const response = await fetch(
            `${GEMINI_BASE}/${model}:generateContent?key=${env.GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body,
            }
        );
        const data = await response.json();
        return Response.json(data, {
            status: response.status,
            headers: corsHeaders(request),
        });
    }

    return new Response('Method not allowed', { status: 405 });
}
