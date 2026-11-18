// Politique de securite du contenu (CSP) de TOUTES les pages, ajoutee APRES le build
// (npm run build = astro build && node scripts/site-csp.mjs).
// GitHub Pages ne permet pas d'en-tetes HTTP : la CSP passe par <meta http-equiv>, placee en tete de <head>.
// Les scripts inline sont autorises par leur empreinte SHA-256, calculee ici sur le HTML reellement produit :
// jamais de 'unsafe-inline' pour les scripts. Sorties reseau : le site lui-meme, Turnstile (anti-robot) sur les seules
// pages qui l'utilisent, et la fonction Cloudflare des formulaires sur les seules pages qui lui envoient quelque chose.
// Espace client (questionnaire) : en plus, aucun envoi de formulaire HTML (form-action 'none').
// Le build s'ARRETE si une page charge un script ou envoie vers une adresse non prevue : rien n'est publie.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST = fileURLToPath(new URL('../dist/', import.meta.url));
const SITE = 'https://ezra-maroc.com';
const TURNSTILE = 'https://challenges.cloudflare.com';
// La fonction Cloudflare des formulaires (contact, questionnaire) : seule adresse exterieure ou l'on envoie
const API_ORIGIN = /^https:\/\/ezra-formulaire\.[a-z0-9-]+\.workers\.dev$/;
// Memes adresses que hiddenPages.intake (src/i18n/nav.ts)
const INTAKE = new Set(['espace-client.html', 'en/client-area.html', 'es/area-cliente.html', 'he/client-area.html',
  'ara/client-area.html']);

function fail(message) {
  console.error(`site-csp : ${message}`);
  process.exit(1);
}

function htmlFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return htmlFiles(path);
    return entry.name.endsWith('.html') ? [path] : [];
  });
}

const sha256 = (text) => `'sha256-${createHash('sha256').update(text, 'utf8').digest('base64')}'`;
let done = 0;
let intakeDone = 0;
let inlineTotal = 0;

for (const file of htmlFiles(DIST)) {
  const rel = relative(DIST, file).split(sep).join('/');
  let html = readFileSync(file, 'utf8');
  html = html.replace(/<meta http-equiv="Content-Security-Policy"[^>]*>\n?/gi, ''); // relance sans doublon

  const hashes = new Set();
  let turnstile = false;
  for (const m of html.matchAll(/<script(?<attrs>[^>]*)>(?<body>[\s\S]*?)<\/script>/g)) {
    const { attrs, body } = m.groups;
    if (/type="application\/(?:ld\+)?json"/.test(attrs)) continue; // donnees, jamais executees
    const src = (attrs.match(/\bsrc="([^"]+)"/) || [])[1];
    if (src) {
      const origin = new URL(src, SITE + '/').origin;
      if (origin === TURNSTILE) turnstile = true;
      else if (origin !== SITE) fail(`script exterieur non prevu dans ${rel} : ${src}`);
      continue;
    }
    hashes.add(sha256(body));
  }
  inlineTotal += hashes.size;

  // Adresses ou la page envoie : action de ses formulaires, serveur du questionnaire
  const apis = new Set();
  const forms = [...html.matchAll(/<form\b[^>]*>/g)].map((m) => m[0]);
  for (const form of forms) {
    const action = (form.match(/\baction="([^"]*)"/) || [])[1];
    if (!action) continue;
    const origin = new URL(action, SITE + '/').origin;
    if (origin !== SITE) apis.add(origin);
  }
  for (const m of html.matchAll(/data-endpoint="([^"]+)"/g)) apis.add(new URL(m[1]).origin);
  for (const origin of apis) {
    if (!API_ORIGIN.test(origin)) fail(`envoi vers une adresse non prevue dans ${rel} : ${origin}`);
  }
  const intake = INTAKE.has(rel);
  if (intake && !/data-endpoint="https:/.test(html)) fail(`adresse du serveur introuvable dans ${rel}`);
  const outbound = [...apis].join(' ');

  const csp = [
    "default-src 'self'",
    `script-src 'self'${turnstile ? ' ' + TURNSTILE : ''} ${[...hashes].join(' ')}`.trim(),
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    // data: : le build incruste les plus petits fichiers de polices dans le CSS (sans risque : une police ne sort rien)
    "font-src 'self' data:",
    `connect-src 'self' ${outbound}`.trim(),
    `frame-src ${turnstile ? TURNSTILE : "'none'"}`,
    "worker-src 'none'",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'none'",
    intake ? "form-action 'none'" : (forms.length ? `form-action 'self' ${outbound}`.trim() : "form-action 'none'"),
    'upgrade-insecure-requests',
  ].join('; ');

  if (!/<meta charset="UTF-8">/i.test(html)) fail(`<meta charset> introuvable dans ${rel}`);
  html = html.replace(/<meta charset="UTF-8">/i, (s) => s + `<meta http-equiv="Content-Security-Policy" content="${csp}">`);
  writeFileSync(file, html);
  done++;
  if (intake) intakeDone++;
}

if (intakeDone !== INTAKE.size) fail(`${intakeDone} page(s) Espace client sur ${INTAKE.size} trouvee(s) dans le build`);
console.log(`site-csp : ${done} page(s) protegee(s) (dont ${intakeDone} Espace client), ${inlineTotal} script(s) inline autorise(s) par empreinte`);
