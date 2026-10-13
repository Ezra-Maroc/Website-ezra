// Formulaire de contact d'ezra-maroc.com (fonction Cloudflare Workers, remplace Formspree).
// Recoit le JSON envoye par public/js/contact-form*.js, verifie l'anti-robot Turnstile cote serveur, puis envoie
// le message par e-mail. Le binding EMAIL (wrangler.jsonc) ne peut ecrire qu'a info@ezra-project.fr : meme
// detournee, la fonction ne peut pas servir a envoyer du courrier ailleurs. Rien n'est stocke.
// Reponses au format attendu par les scripts du site : 200 {"ok":true}, sinon {"message": "..."}.
// Envoi depuis le test d'eligibilite : pre-analyse interne (note + points forts / vigilance) en tete de l'e-mail,
// calculee dans preanalyse.js a partir des reponses brutes (champ cache _elig).

import { preAnalyse } from './preanalyse.js';

const ALLOWED_ORIGINS = ['https://ezra-maroc.com', 'https://www.ezra-maroc.com'];
const MAX_BODY_BYTES = 32 * 1024;
const MAX_FIELDS = 20;
// Champs connus : libelle dans l'e-mail + longueur maximale
const FIELDS = {
  name: ['Nom', 150],
  email: ['E-mail', 254],
  phone: ['Téléphone', 40],
  subject: ['Objet', 200],
  objet_demande: ['Objet', 200],
  other_subject_details: ["Précision sur l'objet", 200],
  message: ['Message', 5000],
};
const INTERNAL = new Set(['_gotcha', 'cf-turnstile-response', 'consent', '_subject', 'lang', '_elig']);
const EXTRA_NAME_MAX = 80;      // champs ajoutes par la page (ex. "Résultats du test d'éligibilité")
const EXTRA_VALUE_MAX = 6000;
const LANG_NAMES = { fr: 'français', en: 'anglais', es: 'espagnol', he: 'hébreu', ar: 'arabe' };

const MESSAGES = {
  invalid: {
    fr: 'Certaines informations sont manquantes ou invalides.',
    en: 'Some information is missing or invalid.',
    es: 'Falta información o no es válida.',
    he: 'חלק מהפרטים חסרים או אינם תקינים.',
    ar: 'بعض المعلومات ناقصة أو غير صحيحة.',
  },
  bot: {
    fr: "La vérification anti-robot n'a pas abouti. Merci de réessayer dans quelques secondes.",
    en: 'The anti-bot check did not succeed. Please try again in a few seconds.',
    es: 'La verificación anti-robot no se completó. Inténtelo de nuevo en unos segundos.',
    he: 'בדיקת האבטחה נגד רובוטים לא הושלמה. נא לנסות שוב בעוד מספר שניות.',
    ar: 'لم يكتمل التحقق من أنكم لستم روبوتًا. يرجى المحاولة مرة أخرى بعد بضع ثوانٍ.',
  },
  failed: {
    fr: "L'envoi a échoué temporairement.",
    en: 'Sending failed temporarily.',
    es: 'El envío falló temporalmente.',
    he: 'השליחה נכשלה באופן זמני.',
    ar: 'فشل الإرسال مؤقتًا.',
  },
};

function allowedOrigins(env) {
  const dev = (env.DEV_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
  return ALLOWED_ORIGINS.concat(dev);
}

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function json(status, body, origin) {
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

// Texte saisi : retours a la ligne normalises, caracteres de controle retires (sauf saut de ligne et tabulation)
function clean(value, max, singleLine) {
  // coupe d'abord (un champ enorme ne doit pas couter de calcul), puis nettoie en temps lineaire
  let s = String(value).slice(0, max * 2 + 100).replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, '');
  if (singleLine) s = s.split('\n').map((x) => x.trim()).filter(Boolean).join(' ');
  s = s.trim();
  return s.length > max ? s.slice(0, max) : s;
}

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:"]{2,}$/;

async function verifyTurnstile(token, ip, env) {
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

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const okOrigin = allowedOrigins(env).includes(origin) ? origin : null;

    if (request.method === 'OPTIONS') {
      return okOrigin ? new Response(null, { status: 204, headers: corsHeaders(okOrigin) }) : new Response(null, { status: 403 });
    }
    if (request.method !== 'POST') {
      return new Response('Méthode non autorisée', { status: 405, headers: { Allow: 'POST, OPTIONS' } });
    }
    if (!okOrigin) return json(403, { message: 'Origine non autorisée.' }, null);

    // Lecture bornee du corps (la taille annoncee peut etre absente ou fausse)
    const raw = await request.arrayBuffer();
    if (raw.byteLength > MAX_BODY_BYTES) return json(413, { message: MESSAGES.invalid.fr }, okOrigin);
    if (!(request.headers.get('Content-Type') || '').toLowerCase().startsWith('application/json')) {
      return json(415, { message: MESSAGES.invalid.fr }, okOrigin);
    }
    let data;
    try {
      data = JSON.parse(new TextDecoder().decode(raw));
    } catch {
      return json(400, { message: MESSAGES.invalid.fr }, okOrigin);
    }
    if (!data || typeof data !== 'object' || Array.isArray(data)) return json(400, { message: MESSAGES.invalid.fr }, okOrigin);

    const lang = LANG_NAMES[data.lang] ? data.lang : 'fr';
    const msg = (key) => MESSAGES[key][lang];
    const entries = Object.entries(data);
    if (entries.length > MAX_FIELDS || entries.some(([, v]) => typeof v !== 'string')) return json(400, { message: msg('invalid') }, okOrigin);

    // Champ piege rempli : robot. On repond comme si tout allait bien, sans rien envoyer.
    if (data._gotcha) return json(200, { ok: true }, okOrigin);

    if (!env.TURNSTILE_SECRET) {
      console.error('configuration : TURNSTILE_SECRET absent');
      return json(500, { message: msg('failed') }, okOrigin);
    }
    const ip = request.headers.get('CF-Connecting-IP') || '';
    const botProblem = await verifyTurnstile(data['cf-turnstile-response'], ip, env);
    if (botProblem) {
      console.warn('anti-robot : ' + botProblem);
      return json(403, { message: msg('bot') }, okOrigin);
    }

    // Validation (le site valide deja ; on revalide ici)
    const fields = {};
    for (const [key, [, max]] of Object.entries(FIELDS)) {
      if (data[key] !== undefined) fields[key] = clean(data[key], max, key !== 'message');
    }
    const extras = [];
    for (const [key, value] of entries) {
      if (FIELDS[key] || INTERNAL.has(key)) continue;
      const name = clean(key, EXTRA_NAME_MAX, true);
      const val = clean(value, EXTRA_VALUE_MAX, false);
      if (name && val) extras.push([name, val]);
    }
    const subjectChoice = fields.subject || fields.objet_demande || '';
    if (!fields.name || !EMAIL_RE.test(fields.email || '') || data.consent !== 'accepted' || !subjectChoice
      || (!fields.message && extras.length === 0)) {
      return json(400, { message: msg('invalid') }, okOrigin);
    }

    // E-mail
    const when = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', dateStyle: 'short', timeStyle: 'short' }).format(new Date());
    const langTag = lang === 'fr' ? '' : ` [${lang.toUpperCase()}]`;
    // Pre-analyse (envoi depuis le test d'eligibilite) : la note ouvre l'objet pour trier la boite de reception
    const pa = data._elig ? preAnalyse(data._elig.slice(0, 4000)) : null;
    const notePrefix = pa ? `[${pa.grade} · ${pa.score}/100] ` : '';
    const subject = clean(notePrefix + (data._subject ? data._subject + (data._subject.includes('[') ? '' : langTag) : `${subjectChoice} – ${fields.name}${langTag}`), 200, true);
    const rows = [];
    for (const key of ['name', 'email', 'phone']) if (fields[key]) rows.push([FIELDS[key][0], fields[key]]);
    rows.push(['Objet', subjectChoice + (fields.other_subject_details ? ` (${fields.other_subject_details})` : '')]);
    rows.push(['Langue du site', LANG_NAMES[lang]]);
    const blocks = [];
    if (fields.message) blocks.push(['Message', fields.message]);
    for (const extra of extras) blocks.push(extra);
    const footer = `Consentement à la politique de confidentialité : oui (envoi du ${when}, heure de Paris).`;
    const paHead = pa ? `PRÉ-ANALYSE AUTOMATIQUE (interne) : ${pa.grade} · ${pa.score}/100 — ${pa.label}` : '';
    const paNote = 'Note indicative, calculée uniquement à partir des réponses du visiteur : à confirmer à l’analyse des pièces.';
    const paLists = pa ? [['Points forts', '+', pa.strengths], ['Points de vigilance', '–', pa.warnings], ['À faire en premier', '→', pa.todo]].filter(([, , l]) => l.length) : [];
    const pts = (p, m) => `${p < 0 ? '−' + Math.abs(p) : p} / ${m}`;
    const paTotal = pa ? `${pa.score} / 100${pa.totalNote ? ` (${pa.totalNote})` : ''}` : '';
    const paText = pa ? [
      paHead,
      'Détail de la note :',
      ...pa.details.map(([k, v, p, m]) => `  • ${k} — ${v} : ${pts(p, m)}`),
      `  = Total : ${paTotal}`,
      ...paLists.flatMap(([t, mark, l]) => [`${t} :`, ...l.map((x) => `  ${mark} ${x}`)]),
      ...(pa.context ? [`Contexte : ${pa.context}`] : []),
      `(${paNote})`,
      '────────────────────────',
      '',
    ] : [];
    const paHtml = pa ? `<div style="border:2px solid ${pa.color};border-radius:8px;padding:12px 16px;margin:0 0 18px">
<p style="margin:0 0 8px"><span style="display:inline-block;background:${pa.color};color:#fff;font-weight:bold;border-radius:6px;padding:2px 10px;margin-right:8px">${pa.grade} · ${pa.score}/100</span><strong style="color:${pa.color}">${escapeHtml(pa.label)}</strong></p>
<p style="margin:10px 0 4px;color:#444;font-weight:bold">Détail de la note</p>
<table cellpadding="4" style="border-collapse:collapse;font-size:14px;width:100%">${pa.details.map(([k, v, p, m]) => `<tr style="border-bottom:1px solid #eee"><td style="color:#444;vertical-align:top">${escapeHtml(k)}</td><td style="color:#222;vertical-align:top">${escapeHtml(v)}</td><td style="text-align:right;white-space:nowrap;vertical-align:top;font-weight:bold;color:${p < 0 ? '#b42318' : p === 0 ? '#888' : '#222'}">${escapeHtml(pts(p, m))}</td></tr>`).join('')}<tr><td colspan="2" style="font-weight:bold;padding-top:6px">Total</td><td style="text-align:right;white-space:nowrap;font-weight:bold;padding-top:6px;color:${pa.color}">${escapeHtml(paTotal)}</td></tr></table>
${paLists.map(([t, mark, l]) => `<p style="margin:10px 0 2px;color:#444;font-weight:bold">${escapeHtml(t)}</p><ul style="margin:0;padding-left:18px">${l.map((x) => `<li>${escapeHtml(x)}</li>`).join('')}</ul>`).join('\n')}
${pa.context ? `<p style="margin:10px 0 0;color:#444">Contexte : ${escapeHtml(pa.context)}</p>` : ''}
<p style="margin:8px 0 0;color:#888;font-size:12px">${escapeHtml(paNote)}</p></div>` : '';

    const text = [
      ...paText,
      "Nouveau message depuis le formulaire de contact d'ezra-maroc.com",
      '',
      ...rows.map(([k, v]) => `${k} : ${v}`),
      ...blocks.flatMap(([k, v]) => ['', `${k} :`, v]),
      '',
      footer,
      'Pour répondre au visiteur, utilisez simplement « Répondre ».',
    ].join('\n');
    const html = `<!doctype html><html lang="fr"><body style="font-family:Arial,sans-serif;font-size:15px;color:#222;line-height:1.5">
${paHtml}
<p style="margin:0 0 12px;color:#c5281c;font-weight:bold">Nouveau message depuis le formulaire de contact d'ezra-maroc.com</p>
<table cellpadding="6" style="border-collapse:collapse">${rows.map(([k, v]) => `<tr><td style="color:#666;vertical-align:top;white-space:nowrap">${escapeHtml(k)}</td><td><strong>${escapeHtml(v)}</strong></td></tr>`).join('')}</table>
${blocks.map(([k, v]) => `<p style="margin:18px 0 4px;color:#666">${escapeHtml(k)} :</p><div style="white-space:pre-wrap;border-left:3px solid #c5281c;padding:4px 0 4px 12px" dir="auto">${escapeHtml(v)}</div>`).join('\n')}
<p style="margin-top:22px;color:#888;font-size:13px">${escapeHtml(footer)}<br>Pour répondre au visiteur, utilisez simplement « Répondre ».</p>
</body></html>`;

    try {
      await env.EMAIL.send({
        from: { email: env.FROM_ADDRESS, name: 'Site Ezra Maroc' },
        to: env.TO_ADDRESS,
        replyTo: fields.email,
        subject,
        text,
        html,
      });
    } catch (e) {
      console.error('envoi : ' + (e && e.code ? e.code : '') + ' ' + (e && e.message ? e.message : e));
      return json(502, { message: msg('failed') }, okOrigin);
    }
    return json(200, { ok: true }, okOrigin);
  },
};
