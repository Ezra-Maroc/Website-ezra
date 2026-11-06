// Outils communs au formulaire de contact (index.js) et au questionnaire approfondi (intake/).

const ALLOWED_ORIGINS = ['https://ezra-maroc.com', 'https://www.ezra-maroc.com'];

export function allowedOrigins(env) {
  const dev = (env.DEV_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
  return ALLOWED_ORIGINS.concat(dev);
}

export function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

export function json(status, body, origin) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      ...(origin ? corsHeaders(origin) : {}),
    },
  });
}

export function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Verification serveur du jeton anti-robot Cloudflare Turnstile. Renvoie null si valide, sinon la raison.
export async function verifyTurnstile(token, ip, env) {
  if (!token || typeof token !== 'string' || token.length > 2048) return 'jeton absent';
  const body = new FormData();
  body.append('secret', env.TURNSTILE_SECRET);
  body.append('response', token);
  if (ip) body.append('remoteip', ip);
  body.append('idempotency_key', crypto.randomUUID());
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body });
  if (!res.ok) return `siteverify HTTP ${res.status}`;
  const data = await res.json();
  if (!data.success) return 'refuse : ' + (data['error-codes'] || []).join(',');
  const hostnames = (env.TURNSTILE_HOSTNAMES || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (hostnames.length && !hostnames.includes(data.hostname)) return 'domaine inattendu : ' + data.hostname;
  return null;
}
