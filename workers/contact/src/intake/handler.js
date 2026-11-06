// Questionnaire approfondi des prospects : routes /intake/* de la fonction ezra-formulaire.
//
// Parcours du prospect (depuis la page Espace client du site, origine verifiee) :
//   POST /intake/login   { email, code, turnstile }  -> identifiants (e-mail + mot de passe) -> session (4 h)
//   POST /intake/verify  { token, code, turnstile }  -> lien personnel signe + mot de passe -> session (4 h)
//   POST /intake/submit  { session, answers, lang }  -> validation serveur -> copie chiffree (D1) -> e-mail recap
// Logiciel EZRA (requetes signees HMAC, jamais depuis un navigateur) :
//   GET  /intake/admin/ping | /intake/admin/submissions
//   POST /intake/admin/register | /ack | /revoke | /status
//
// Garde-fous : 5 codes faux -> lien bloque ; une seule soumission par lien (cle primaire) ; Turnstile ; limite
// par IP ; rien du prospect dans les journaux (identifiant tronque seulement) ; aucune adresse IP conservee.

import {
  getKeys, verifyInvite, makeSession, verifySession, deriveCode, normalizeCode, safeEqual, verifyAdmin, sealForCrm, LANGS,
  normalizeEmail, emailHash,
} from './crypto.js';
import { validateAnswers, buildRecap, keyPoints, displayName } from './schema.js';
import { allowedOrigins, corsHeaders, json, escapeHtml, verifyTurnstile } from '../shared.js';

const MAX_ATTEMPTS = 5;
const SESSION_TTL = 4 * 3600;
const LIMITS = { verify: 4 * 1024, submit: 64 * 1024, admin: 16 * 1024 };
const ID_RE = /^[A-Za-z0-9_-]{22}$/;
const EH_RE = /^[A-Za-z0-9_-]{43}$/; // empreinte HMAC-SHA256 base64url d'une adresse e-mail
const LANG_NAMES = { fr: 'français', en: 'anglais', es: 'espagnol', he: 'hébreu', ar: 'arabe' };

const short = (id) => String(id).slice(0, 6);

async function readJson(request, limit) {
  if (!(request.headers.get('Content-Type') || '').toLowerCase().startsWith('application/json')) return { error: 415 };
  const raw = await request.arrayBuffer();
  if (raw.byteLength > limit) return { error: 413 };
  try {
    const data = JSON.parse(new TextDecoder().decode(raw));
    if (!data || typeof data !== 'object' || Array.isArray(data)) return { error: 400 };
    return { data };
  } catch {
    return { error: 400 };
  }
}

// Limite par adresse IP (binding INTAKE_LIMITER, s'il est configure). L'IP n'est ni journalisee ni stockee.
async function rateLimited(env, request, scope) {
  if (!env.INTAKE_LIMITER) return false;
  const ip = request.headers.get('CF-Connecting-IP') || 'inconnue';
  try {
    const { success } = await env.INTAKE_LIMITER.limit({ key: scope + ':' + ip });
    return !success;
  } catch {
    return false;
  }
}

export async function handleIntake(request, env, ctx) {
  const url = new URL(request.url);
  if (url.pathname.startsWith('/intake/admin/')) {
    try {
      return await handleAdmin(request, env, url);
    } catch (e) {
      console.error('intake admin : erreur inattendue : ' + (e && e.message));
      return adminJson(500, { ok: false });
    }
  }

  const origin = request.headers.get('Origin') || '';
  const okOrigin = allowedOrigins(env).includes(origin) ? origin : null;
  if (request.method === 'OPTIONS') {
    return okOrigin ? new Response(null, { status: 204, headers: corsHeaders(okOrigin) }) : new Response(null, { status: 403 });
  }
  if (request.method !== 'POST') return new Response('Méthode non autorisée', { status: 405, headers: { Allow: 'POST, OPTIONS' } });
  if (!okOrigin) return json(403, { ok: false, state: 'error' }, null);
  if (!env.INTAKE_DB || !env.INTAKE_MASTER_KEY) {
    console.error('intake : configuration incomplete (INTAKE_DB / INTAKE_MASTER_KEY)');
    return json(500, { ok: false, state: 'error' }, okOrigin);
  }
  try {
    if (url.pathname === '/intake/verify') return await verify(request, env, okOrigin);
    if (url.pathname === '/intake/login') return await login(request, env, okOrigin);
    if (url.pathname === '/intake/submit') return await submit(request, env, okOrigin, ctx);
  } catch (e) {
    // Jamais de page d'erreur brute ni de detail technique cote navigateur
    console.error('intake : erreur inattendue : ' + (e && e.message));
    return json(500, { ok: false, state: 'error' }, okOrigin);
  }
  return json(404, { ok: false, state: 'error' }, okOrigin);
}

async function verify(request, env, origin) {
  if (await rateLimited(env, request, 'verify')) return json(429, { ok: false, state: 'rate' }, origin);
  const { data, error } = await readJson(request, LIMITS.verify);
  if (error) return json(error, { ok: false, state: 'error' }, origin);

  const nowSec = Math.floor(Date.now() / 1000);
  const keys = await getKeys(env.INTAKE_MASTER_KEY);
  const inv = await verifyInvite(keys, data.token, nowSec);
  if (inv.error) return json(inv.error === 'expired' ? 410 : 401, { ok: false, state: inv.error }, origin);

  // Anti-robot avant tout essai de code : un automate ne peut pas tester des codes en serie
  const bot = await verifyTurnstile(data.turnstile, request.headers.get('CF-Connecting-IP') || '', env);
  if (bot) {
    console.warn(`intake ${short(inv.id)} anti-robot : ${bot}`);
    return json(403, { ok: false, state: 'bot' }, origin);
  }

  const db = env.INTAKE_DB;
  const iso = new Date().toISOString();
  await db.prepare("INSERT INTO invites (id, status, attempts, exp, lang, created_at, updated_at) VALUES (?1, 'open', 0, ?2, ?3, ?4, ?4) ON CONFLICT(id) DO NOTHING")
    .bind(inv.id, inv.exp, inv.lang, iso).run();
  const row = await db.prepare('SELECT status, attempts FROM invites WHERE id = ?1').bind(inv.id).first();
  if (!row) return json(500, { ok: false, state: 'error' }, origin);
  if (row.status === 'submitted') return json(409, { ok: false, state: 'used' }, origin);
  if (row.status === 'revoked') return json(401, { ok: false, state: 'invalid' }, origin);
  if (row.status === 'locked') return json(423, { ok: false, state: 'locked' }, origin);

  const code = normalizeCode(data.code);
  const expected = await deriveCode(keys, inv.id);
  if (!code || !safeEqual(code, expected)) {
    const upd = await db.prepare(
      "UPDATE invites SET attempts = attempts + 1, status = CASE WHEN attempts + 1 >= ?1 THEN 'locked' ELSE status END, updated_at = ?2 WHERE id = ?3 AND status = 'open' RETURNING attempts, status",
    ).bind(MAX_ATTEMPTS, iso, inv.id).first();
    console.warn(`intake ${short(inv.id)} code faux (${upd ? upd.attempts : '?'}/${MAX_ATTEMPTS})`);
    if (!upd || upd.status === 'locked') return json(423, { ok: false, state: 'locked' }, origin);
    return json(401, { ok: false, state: 'wrong', remaining: Math.max(0, MAX_ATTEMPTS - upd.attempts) }, origin);
  }

  await db.prepare('UPDATE invites SET attempts = 0, opened_at = COALESCE(opened_at, ?1), updated_at = ?1 WHERE id = ?2').bind(iso, inv.id).run();
  const exp = nowSec + SESSION_TTL;
  const session = await makeSession(keys, inv.id, exp);
  console.log(`intake ${short(inv.id)} acces ouvert`);
  return json(200, { ok: true, session, exp, lang: inv.lang }, origin);
}

// Espace client : adresse e-mail + mot de passe (le code de 8 caracteres de l'invitation).
// Tant que le mot de passe n'est pas le bon, la reponse est TOUJOURS la meme ("identifiants incorrects") :
// impossible de savoir si une adresse est celle d'un prospect d'EZRA, ni si son acces est bloque ou expire.
// Un mot de passe faux sur une adresse connue compte pour le blocage a 5 essais (sans le signaler).
async function login(request, env, origin) {
  if (await rateLimited(env, request, 'login')) return json(429, { ok: false, state: 'rate' }, origin);
  const { data, error } = await readJson(request, LIMITS.verify);
  if (error) return json(error, { ok: false, state: 'error' }, origin);
  const email = normalizeEmail(data.email);
  const code = normalizeCode(data.code);
  if (!email || !code) return json(400, { ok: false, state: 'format' }, origin);

  const bot = await verifyTurnstile(data.turnstile, request.headers.get('CF-Connecting-IP') || '', env);
  if (bot) {
    console.warn('intake connexion anti-robot : ' + bot);
    return json(403, { ok: false, state: 'bot' }, origin);
  }

  const nowSec = Math.floor(Date.now() / 1000);
  const keys = await getKeys(env.INTAKE_MASTER_KEY);
  const db = env.INTAKE_DB;
  const { results } = await db.prepare('SELECT id, status, attempts, exp, lang FROM invites WHERE email_hash = ?1 ORDER BY created_at DESC LIMIT 5')
    .bind(await emailHash(keys, email)).all();

  for (const inv of results) {
    if (!safeEqual(code, await deriveCode(keys, inv.id))) continue;
    // Bon mot de passe : l'etat de l'acces peut maintenant etre indique
    if (inv.status === 'submitted') return json(409, { ok: false, state: 'used' }, origin);
    if (inv.status === 'revoked') return json(401, { ok: false, state: 'invalid' }, origin);
    if (inv.status === 'locked') return json(423, { ok: false, state: 'locked' }, origin);
    if (inv.exp <= nowSec) return json(410, { ok: false, state: 'expired' }, origin);
    const iso = new Date().toISOString();
    await db.prepare('UPDATE invites SET attempts = 0, opened_at = COALESCE(opened_at, ?1), updated_at = ?1 WHERE id = ?2').bind(iso, inv.id).run();
    const exp = nowSec + SESSION_TTL;
    console.log(`intake ${short(inv.id)} acces ouvert (espace client)`);
    return json(200, { ok: true, session: await makeSession(keys, inv.id, exp), exp, lang: inv.lang }, origin);
  }

  // Mot de passe faux. La requete d'ecriture est faite dans TOUS les cas (sans effet pour une adresse inconnue :
  // l'identifiant '-' n'existe jamais) : la duree de la reponse ne trahit pas si l'adresse est connue.
  const open = results.find((r) => r.status === 'open' && r.exp > nowSec);
  const upd = await db.prepare(
    "UPDATE invites SET attempts = attempts + 1, status = CASE WHEN attempts + 1 >= ?1 THEN 'locked' ELSE status END, updated_at = ?2 WHERE id = ?3 AND status = 'open' RETURNING attempts",
  ).bind(MAX_ATTEMPTS, new Date().toISOString(), open ? open.id : '-').first();
  if (open) console.warn(`intake ${short(open.id)} mot de passe faux (${upd ? upd.attempts : '?'}/${MAX_ATTEMPTS})`);
  return json(401, { ok: false, state: 'login' }, origin);
}

async function submit(request, env, origin, ctx) {
  if (await rateLimited(env, request, 'submit')) return json(429, { ok: false, state: 'rate' }, origin);
  const { data, error } = await readJson(request, LIMITS.submit);
  if (error) return json(error, { ok: false, state: 'error' }, origin);

  const nowSec = Math.floor(Date.now() / 1000);
  const keys = await getKeys(env.INTAKE_MASTER_KEY);
  const sess = await verifySession(keys, data.session, nowSec);
  if (!sess) return json(401, { ok: false, state: 'session' }, origin);

  const db = env.INTAKE_DB;
  const row = await db.prepare('SELECT status FROM invites WHERE id = ?1').bind(sess.id).first();
  if (!row) return json(401, { ok: false, state: 'session' }, origin);
  if (row.status === 'submitted') return json(409, { ok: false, state: 'used' }, origin);
  if (row.status === 'revoked') return json(401, { ok: false, state: 'invalid' }, origin);
  if (row.status !== 'open') return json(423, { ok: false, state: 'locked' }, origin);

  const today = new Date().toISOString().slice(0, 10);
  const { clean, errors } = validateAnswers(data.answers, today);
  if (errors.length) {
    console.warn(`intake ${short(sess.id)} reponses refusees : ${errors.slice(0, 10).join(',')}`);
    return json(400, { ok: false, state: 'invalid', fields: errors.slice(0, 40) }, origin);
  }

  const lang = LANGS.includes(data.lang) ? data.lang : 'fr';
  const iso = new Date().toISOString();
  const recap = buildRecap(clean);
  const record = { v: 1, id: sess.id, receivedAt: iso, lang, answers: clean, recap };
  let sealed;
  try {
    sealed = await sealForCrm(env.INTAKE_PUBLIC_KEY, sess.id, JSON.stringify(record));
  } catch (e) {
    console.error('intake chiffrement : ' + (e && e.message));
    return json(500, { ok: false, state: 'error' }, origin);
  }

  // Une seule soumission par lien : la cle primaire de submissions refuse un second envoi (transaction)
  try {
    await db.batch([
      db.prepare("INSERT INTO submissions (id, created_at, lang, alg, ek, iv, ct, email_status) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 'pending')")
        .bind(sess.id, iso, lang, sealed.alg, sealed.ek, sealed.iv, sealed.ct),
      db.prepare("UPDATE invites SET status = 'submitted', submitted_at = ?1, updated_at = ?1 WHERE id = ?2").bind(iso, sess.id),
    ]);
  } catch (e) {
    if (/UNIQUE|PRIMARY/i.test(String(e && e.message))) return json(409, { ok: false, state: 'used' }, origin);
    console.error('intake stockage : ' + (e && e.message));
    return json(500, { ok: false, state: 'error' }, origin);
  }

  // E-mail recap : un echec n'annule pas l'envoi (la copie chiffree attend le logiciel)
  let emailStatus = 'sent';
  try {
    await sendRecapEmail(env, sess.id, lang, clean, recap, iso);
  } catch (e) {
    emailStatus = 'failed';
    console.error(`intake ${short(sess.id)} e-mail : ` + (e && e.code ? e.code + ' ' : '') + (e && e.message));
  }
  ctx.waitUntil(db.prepare('UPDATE submissions SET email_status = ?1 WHERE id = ?2').bind(emailStatus, sess.id).run());
  console.log(`intake ${short(sess.id)} questionnaire recu (e-mail ${emailStatus})`);
  return json(200, { ok: true }, origin);
}

// --- e-mail a l'equipe ---

async function sendRecapEmail(env, id, lang, clean, recap, iso) {
  const when = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso));
  const ref = id.slice(0, 8);
  const langTag = lang === 'fr' ? '' : ` [${lang.toUpperCase()}]`;
  const footer = `Réf. du lien : ${ref} · reçu le ${when} (heure de Paris) · langue : ${LANG_NAMES[lang]}. `
    + 'Une copie chiffrée est conservée jusqu’à sa récupération par le logiciel EZRA.';

  // Mode "notify" (variable INTAKE_EMAIL_MODE) : aucune donnee personnelle dans l'e-mail
  if (env.INTAKE_EMAIL_MODE === 'notify') {
    const text = `Un questionnaire approfondi a été reçu.\nRécupérez-le dans le logiciel EZRA (Questionnaires).\n\n${footer}`;
    await env.EMAIL.send({
      from: { email: env.FROM_ADDRESS, name: env.INTAKE_FROM_NAME || 'Questionnaire Ezra Maroc' },
      to: env.TO_ADDRESS,
      subject: `Questionnaire approfondi reçu (réf. ${ref})`,
      text,
      html: `<!doctype html><html lang="fr"><body style="font-family:Arial,sans-serif;font-size:15px;color:#222"><p>${escapeHtml(text).replace(/\n/g, '<br>')}</p></body></html>`,
    });
    return;
  }

  const name = displayName(clean);
  const points = keyPoints(clean);
  const subject = `Questionnaire approfondi – ${name}${langTag}`.replace(/[\r\n]+/g, ' ').slice(0, 200);
  const text = [
    `Questionnaire approfondi reçu – ${name}`,
    '',
    ...(points.length ? ['POINTS CLÉS', ...points.map(([k, v]) => `  ${k} : ${v}`), ''] : []),
    ...recap.flatMap((b) => [b.section.toUpperCase(), ...b.lines.map(([k, v]) => `  ${k} : ${v}`), '']),
    footer,
    'Pour répondre au prospect, utilisez simplement « Répondre ».',
  ].join('\n');
  const row = ([k, v]) => `<tr><td style="color:#666;vertical-align:top;padding:5px 12px 5px 0;width:38%">${escapeHtml(k)}</td><td style="vertical-align:top;padding:5px 0" dir="auto"><strong>${escapeHtml(v).replace(/\n/g, '<br>')}</strong></td></tr>`;
  const html = `<!doctype html><html lang="fr"><body style="font-family:Arial,sans-serif;font-size:15px;color:#222;line-height:1.5">
<p style="margin:0 0 14px;color:#c5281c;font-weight:bold;font-size:17px">Questionnaire approfondi reçu – ${escapeHtml(name)}</p>
${points.length ? `<div style="border:2px solid #c5281c;border-radius:8px;padding:10px 14px;margin:0 0 18px"><p style="margin:0 0 6px;font-weight:bold;color:#c5281c">Points clés (filiation)</p><table cellpadding="0" style="border-collapse:collapse;width:100%">${points.map(row).join('')}</table></div>` : ''}
${recap.map((b) => `<p style="margin:18px 0 6px;font-weight:bold;color:#2c1810;border-bottom:1px solid #eee;padding-bottom:4px">${escapeHtml(b.section)}</p><table cellpadding="0" style="border-collapse:collapse;width:100%">${b.lines.map(row).join('')}</table>`).join('\n')}
<p style="margin-top:22px;color:#888;font-size:13px">${escapeHtml(footer)}<br>Pour répondre au prospect, utilisez simplement « Répondre ».</p>
</body></html>`;

  await env.EMAIL.send({
    from: { email: env.FROM_ADDRESS, name: env.INTAKE_FROM_NAME || 'Questionnaire Ezra Maroc' },
    to: env.TO_ADDRESS,
    replyTo: clean.email,
    subject,
    text,
    html,
  });
}

// --- logiciel EZRA (signature HMAC obligatoire) ---

function adminJson(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
  });
}

function idsFrom(body, max) {
  const ids = body && Array.isArray(body.ids) ? body.ids : null;
  if (!ids || ids.length === 0 || ids.length > max || ids.some((x) => typeof x !== 'string' || !ID_RE.test(x))) return null;
  return [...new Set(ids)];
}

async function handleAdmin(request, env, url) {
  if (!env.INTAKE_DB || !env.INTAKE_MASTER_KEY) return adminJson(500, { ok: false, error: 'configuration' });
  const raw = new Uint8Array(await request.arrayBuffer());
  if (raw.byteLength > LIMITS.admin) return adminJson(413, { ok: false });
  const nowSec = Math.floor(Date.now() / 1000);
  const keys = await getKeys(env.INTAKE_MASTER_KEY);
  if (!(await verifyAdmin(keys, request, raw, nowSec))) {
    console.warn('intake admin : signature refusee');
    return adminJson(401, { ok: false });
  }
  const db = env.INTAKE_DB;
  let body = null;
  if (raw.byteLength) {
    try { body = JSON.parse(new TextDecoder().decode(raw)); } catch { return adminJson(400, { ok: false }); }
  }
  const route = `${request.method} ${url.pathname}`;

  if (route === 'GET /intake/admin/ping') return adminJson(200, { ok: true });

  if (route === 'GET /intake/admin/submissions') {
    const { results } = await db.prepare('SELECT id, created_at, lang, alg, ek, iv, ct, email_status FROM submissions ORDER BY created_at LIMIT 50').all();
    return adminJson(200, { ok: true, submissions: results });
  }

  if (route === 'POST /intake/admin/ack') {
    // Recuperees et dechiffrees par le logiciel : la copie chiffree est effacee de Cloudflare
    const ids = idsFrom(body, 50);
    if (!ids) return adminJson(400, { ok: false });
    const res = await db.batch(ids.map((id) => db.prepare('DELETE FROM submissions WHERE id = ?1').bind(id)));
    return adminJson(200, { ok: true, deleted: res.reduce((n, r) => n + (r.meta ? r.meta.changes : 0), 0) });
  }

  if (route === 'POST /intake/admin/register') {
    // Invitation creee par le logiciel : ouverte des maintenant a la connexion par l'Espace client.
    // eh = empreinte HMAC de l'adresse e-mail du prospect (calculee par le logiciel : l'adresse ne transite pas)
    const { id, exp, lang, eh } = body || {};
    if (typeof id !== 'string' || !ID_RE.test(id) || !Number.isInteger(exp) || !LANGS.includes(lang)
      || typeof eh !== 'string' || !EH_RE.test(eh)) return adminJson(400, { ok: false });
    const iso = new Date().toISOString();
    await db.prepare(
      "INSERT INTO invites (id, status, attempts, exp, lang, email_hash, created_at, updated_at) VALUES (?1, 'open', 0, ?2, ?3, ?4, ?5, ?5) "
      + 'ON CONFLICT(id) DO UPDATE SET email_hash = excluded.email_hash, updated_at = excluded.updated_at',
    ).bind(id, exp, lang, eh, iso).run();
    return adminJson(200, { ok: true });
  }

  if (route === 'POST /intake/admin/revoke') {
    const id = body && body.id;
    const exp = body && body.exp;
    if (typeof id !== 'string' || !ID_RE.test(id) || !Number.isInteger(exp)) return adminJson(400, { ok: false });
    const iso = new Date().toISOString();
    await db.prepare(
      "INSERT INTO invites (id, status, attempts, exp, lang, created_at, updated_at) VALUES (?1, 'revoked', 0, ?2, NULL, ?3, ?3) "
      + "ON CONFLICT(id) DO UPDATE SET status = CASE WHEN status = 'submitted' THEN status ELSE 'revoked' END, updated_at = excluded.updated_at",
    ).bind(id, exp, iso).run();
    return adminJson(200, { ok: true });
  }

  if (route === 'POST /intake/admin/status') {
    const ids = idsFrom(body, 100);
    if (!ids) return adminJson(400, { ok: false });
    const placeholders = ids.map((_, i) => `?${i + 1}`).join(',');
    const { results } = await db.prepare(`SELECT id, status, attempts, opened_at, submitted_at FROM invites WHERE id IN (${placeholders})`).bind(...ids).all();
    return adminJson(200, { ok: true, invites: results });
  }

  return adminJson(404, { ok: false });
}

// --- menage quotidien (cron) : rien ne reste plus longtemps que necessaire ---

export async function scheduledPurge(env) {
  if (!env.INTAKE_DB) return;
  const nowSec = Math.floor(Date.now() / 1000);
  const cutoff = new Date(Date.now() - 60 * 86400 * 1000).toISOString();
  const [subs, invs] = await env.INTAKE_DB.batch([
    env.INTAKE_DB.prepare('DELETE FROM submissions WHERE created_at < ?1').bind(cutoff),
    env.INTAKE_DB.prepare('DELETE FROM invites WHERE exp < ?1').bind(nowSec - 90 * 86400),
  ]);
  console.log(`intake menage : ${subs.meta.changes} copie(s) chiffree(s) et ${invs.meta.changes} invitation(s) expiree(s) supprimees`);
}
