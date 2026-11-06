// Politique de securite du contenu (CSP) stricte pour les pages Espace client (questionnaire), ajoutee APRES le build
// (npm run build = astro build && node scripts/intake-csp.mjs).
// GitHub Pages ne permet pas d'en-tetes HTTP : la CSP passe par <meta http-equiv>. Les scripts inline de
// la page (menu repliable compile par Astro, selecteur de langue) sont autorises par leur empreinte
// SHA-256, calculee ici sur le HTML reellement produit : aucun 'unsafe-inline' pour les scripts.
// Seules sorties reseau permises : le site lui-meme, la fonction Cloudflare du questionnaire, Turnstile.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';

// Memes adresses que hiddenPages.intake (src/i18n/nav.ts)
const PAGES = ['espace-client.html', 'en/client-area.html', 'es/area-cliente.html', 'he/client-area.html', 'ara/client-area.html'];
const TURNSTILE = 'https://challenges.cloudflare.com';
let done = 0;

for (const rel of PAGES) {
  const file = new URL('../dist/' + rel, import.meta.url);
  if (!existsSync(file)) {
    console.error(`intake-csp : page absente du build : ${rel}`);
    process.exit(1);
  }
  let html = readFileSync(file, 'utf8');
  html = html.replace(/<meta http-equiv="Content-Security-Policy"[^>]*>\n?/i, ''); // relance sans doublon
  const hashes = [];
  for (const m of html.matchAll(/<script(?<attrs>[^>]*)>(?<body>[\s\S]*?)<\/script>/g)) {
    const { attrs, body } = m.groups;
    if (/\bsrc=/.test(attrs) || /type="application\/(?:ld\+)?json"/.test(attrs)) continue;
    hashes.push(`'sha256-${createHash('sha256').update(body, 'utf8').digest('base64')}'`);
  }
  const endpoint = (html.match(/data-endpoint="([^"]+)"/) || [])[1];
  if (!endpoint) {
    console.error(`intake-csp : adresse du serveur introuvable dans ${rel}`);
    process.exit(1);
  }
  const api = new URL(endpoint);
  const csp = [
    "default-src 'self'",
    `script-src 'self' ${TURNSTILE} ${hashes.join(' ')}`.trim(),
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    // data: : le build incruste les plus petits fichiers de polices dans le CSS (sans risque : une police ne sort rien)
    "font-src 'self' data:",
    `connect-src 'self' ${api.origin}`,
    `frame-src ${TURNSTILE}`,
    "worker-src 'none'",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
    ...(api.protocol === 'https:' ? ['upgrade-insecure-requests'] : []),
  ].join('; ');
  const tag = `<meta http-equiv="Content-Security-Policy" content="${csp}">`;
  if (!/<meta charset="UTF-8">/i.test(html)) {
    console.error(`intake-csp : <meta charset> introuvable dans ${rel}`);
    process.exit(1);
  }
  html = html.replace(/<meta charset="UTF-8">/i, (s) => s + tag);
  writeFileSync(file, html);
  done++;
  console.log(`intake-csp : ${rel} (${hashes.length} script(s) inline autorise(s), API ${api.origin})`);
}
console.log(`intake-csp : ${done} page(s) protegee(s)`);
