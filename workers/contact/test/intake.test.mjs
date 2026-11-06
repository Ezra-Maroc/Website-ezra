// Essais du questionnaire approfondi (routes /intake/*) contre la fonction lancee en local
// (npm run dev, avec .dev.vars : cles de TEST + Turnstile de test). Rien n'est envoye : wrangler ecrit les
// e-mails dans des fichiers.
// Usage : node test/intake.test.mjs [url] [chemin/test_keys.json]
//   test_keys.json (facultatif) = { master, spki, pkcs8 } de TEST : permet de verifier le dechiffrement.
import { readFileSync } from 'node:fs';
import { webcrypto as wc } from 'node:crypto';
import { getKeys, makeInvite, deriveCode, b64uEncode, normalizeEmail, emailHash } from '../src/intake/crypto.js';

const URL_ = process.argv[2] || 'http://127.0.0.1:8787';
const KEYS_FILE = process.argv[3];
const ORIGIN = 'http://127.0.0.1:4455';
const DUMMY_TURNSTILE = 'XXXX.DUMMY.TOKEN.XXXX';

const devVars = Object.fromEntries(readFileSync(new URL('../.dev.vars', import.meta.url), 'utf8')
  .split(/\r?\n/).filter((l) => /^[A-Z_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]));
const keys = await getKeys(devVars.INTAKE_MASTER_KEY);
const testKeys = KEYS_FILE ? JSON.parse(readFileSync(KEYS_FILE, 'utf8')) : null;

let failures = 0;
const check = (ok, label) => { console.log(`${ok ? 'OK ' : 'ECHEC'}  ${label}`); if (!ok) failures++; };
const now = () => Math.floor(Date.now() / 1000);
const newId = () => b64uEncode(wc.getRandomValues(new Uint8Array(16)));

async function post(path, body, { origin = ORIGIN } = {}) {
  const res = await fetch(URL_ + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(origin ? { Origin: origin } : {}) },
    body: JSON.stringify(body),
  });
  let data = null; try { data = await res.json(); } catch { /* */ }
  return { status: res.status, data };
}

// Requete du logiciel : signature HMAC (cle admin derivee), horodatage, empreinte du corps
async function admin(method, path, body, { ts = now(), badSig = false } = {}) {
  const bodyStr = body === undefined ? '' : JSON.stringify(body);
  const hash = b64uEncode(new Uint8Array(await wc.subtle.digest('SHA-256', new TextEncoder().encode(bodyStr))));
  const msg = [method, path, String(ts), hash].join('\n');
  let sig = b64uEncode(new Uint8Array(await wc.subtle.sign('HMAC', keys.admin, new TextEncoder().encode(msg))));
  if (badSig) sig = sig.slice(0, -2) + (sig.endsWith('AA') ? 'BB' : 'AA');
  const res = await fetch(URL_ + path, {
    method,
    headers: { 'X-Intake-Ts': String(ts), 'X-Intake-Sig': sig, ...(bodyStr ? { 'Content-Type': 'application/json' } : {}) },
    body: bodyStr || undefined,
  });
  let data = null; try { data = await res.json(); } catch { /* */ }
  return { status: res.status, data };
}

const VALID = {
  nom: 'Benchimol', prenom: 'David', date_naissance: '1988-05-14', ville_naissance: 'Marseille', pays_naissance: 'france',
  nationalites: { sel: ['francaise', '__other__'], other: 'Marocaine (en cours)' }, autre_nationalite_passee: 'non',
  pays_residence: 'israel', date_residence: '2015-09-01', email: 'david.benchimol@example.com', telephone: '+972 54 123 4567',
  situation_familiale: 'marie', nationalite_conjoint: 'Marocaine', enfants: 'oui', secteur_pro: 'Informatique',
  motivations: { sel: ['origines'], other: '' }, ascendants_marocains: 'oui', lien_parente: { sel: ['mere'], other: '' },
  documents_anciens: 'oui_dispose', type_documents: { sel: ['livret_famille', 'acte_naissance'], other: '' },
  voyage_maroc: 'oui', residence_maroc: 'non', langues: { sel: ['francais', 'darija'], other: '' }, famille_maroc: 'oui',
  condamnation: 'non', naturalisation_ailleurs: 'non', connu_ezra: 'reseaux', influenceur: 'aucun',
  complements_libre: 'Ma mère est née à Fès en 1962.\nNous avons le livret de famille.', consent_contact: 'oui', consent_conservation: 'oui',
};

async function openSession(id, exp, lang = 'fr') {
  const token = await makeInvite(keys, id, exp, lang);
  const code = await deriveCode(keys, id);
  return { token, code, r: await post('/intake/verify', { token, code, turnstile: DUMMY_TURNSTILE }) };
}

// ---------- CORS ----------
{
  const ok = await fetch(URL_ + '/intake/verify', { method: 'OPTIONS', headers: { Origin: ORIGIN, 'Access-Control-Request-Method': 'POST' } });
  const bad = await fetch(URL_ + '/intake/verify', { method: 'OPTIONS', headers: { Origin: 'https://pirate.example', 'Access-Control-Request-Method': 'POST' } });
  const noOrigin = await post('/intake/verify', {}, { origin: null });
  check(ok.status === 204 && bad.status === 403 && noOrigin.status === 403, `CORS : site ${ok.status}, autre domaine ${bad.status}, sans origine ${noOrigin.status}`);
}

// ---------- liens ----------
{
  const r1 = await post('/intake/verify', { token: 'v1.abc.def', code: 'AAAA-AAAA', turnstile: DUMMY_TURNSTILE });
  const id = newId();
  const good = await makeInvite(keys, id, now() + 3600, 'fr');
  const [p, b, s] = good.split('.');
  const forgedBody = b64uEncode(new TextEncoder().encode(JSON.stringify({ i: id, e: now() + 999999, l: 'fr' })));
  const r2 = await post('/intake/verify', { token: `${p}.${forgedBody}.${s}`, code: await deriveCode(keys, id), turnstile: DUMMY_TURNSTILE });
  const expired = await makeInvite(keys, newId(), now() - 10, 'fr');
  const r3 = await post('/intake/verify', { token: expired, code: 'AAAA-AAAA', turnstile: DUMMY_TURNSTILE });
  check(r1.status === 401 && r1.data?.state === 'invalid', `lien fabrique refuse : ${r1.status} ${r1.data?.state}`);
  check(r2.status === 401 && r2.data?.state === 'invalid', `lien modifie (expiration prolongee) refuse : ${r2.status} ${r2.data?.state}`);
  check(r3.status === 410 && r3.data?.state === 'expired', `lien expire refuse : ${r3.status} ${r3.data?.state}`);
}

// ---------- anti-robot ----------
{
  const id = newId();
  const token = await makeInvite(keys, id, now() + 3600, 'fr');
  const r = await post('/intake/verify', { token, code: await deriveCode(keys, id) });
  check(r.status === 403 && r.data?.state === 'bot', `sans jeton anti-robot : ${r.status} ${r.data?.state}`);
}

// ---------- codes faux -> blocage ----------
{
  const id = newId();
  const token = await makeInvite(keys, id, now() + 3600, 'fr');
  const good = await deriveCode(keys, id);
  const bad = good.startsWith('0') ? '1' + good.slice(1) : '0' + good.slice(1);
  const remains = [];
  for (let i = 0; i < 4; i++) remains.push((await post('/intake/verify', { token, code: bad, turnstile: DUMMY_TURNSTILE })).data?.remaining);
  const fifth = await post('/intake/verify', { token, code: bad, turnstile: DUMMY_TURNSTILE });
  const afterGood = await post('/intake/verify', { token, code: good, turnstile: DUMMY_TURNSTILE });
  check(remains.join(',') === '4,3,2,1', `codes faux : essais restants ${remains.join(',')}`);
  check(fifth.status === 423 && fifth.data?.state === 'locked', `5e code faux -> bloque : ${fifth.status} ${fifth.data?.state}`);
  check(afterGood.status === 423, `bon code apres blocage toujours refuse : ${afterGood.status}`);
}

// ---------- parcours complet ----------
const mainId = newId();
const mainExp = now() + 7 * 86400;
let session;
{
  const token = await makeInvite(keys, mainId, mainExp, 'he');
  const code = await deriveCode(keys, mainId);
  // Saisie souple : minuscules, tiret, espaces
  const typed = (code.slice(0, 4) + '- ' + code.slice(4)).toLowerCase();
  const r = await post('/intake/verify', { token, code: typed, turnstile: DUMMY_TURNSTILE });
  session = r.data?.session;
  check(r.status === 200 && typeof session === 'string' && r.data?.lang === 'he', `bon code (saisie « ${typed} ») -> session : ${r.status}`);
}
{
  const r = await post('/intake/submit', { session: 's1.AAAA.BBBB', answers: VALID, lang: 'he' });
  check(r.status === 401 && r.data?.state === 'session', `session fabriquee refusee : ${r.status} ${r.data?.state}`);
}
{
  const r1 = await post('/intake/submit', { session, answers: { ...VALID, champ_pirate: 'x' }, lang: 'he' });
  const { nom, email, ...noName } = VALID;
  const r2 = await post('/intake/submit', { session, answers: noName, lang: 'he' });
  const r3 = await post('/intake/submit', { session, answers: { ...VALID, consent_contact: 'non' }, lang: 'he' });
  const r4 = await post('/intake/submit', { session, answers: { ...VALID, pays_naissance: 'atlantide' }, lang: 'he' });
  const r5 = await post('/intake/submit', { session, answers: { ...VALID, email: 'pas-un-email' }, lang: 'he' });
  const r6 = await post('/intake/submit', { session, answers: { ...VALID, date_naissance: '2999-01-01' }, lang: 'he' });
  const r7 = await post('/intake/submit', { session, answers: { ...VALID, nom: 'x'.repeat(5000) }, lang: 'he' });
  check(r1.status === 400 && r1.data?.state === 'invalid', `champ inconnu refuse : ${r1.status}`);
  check(r2.status === 400 && r2.data?.fields?.includes('nom') && r2.data?.fields?.includes('email'), `champs obligatoires manquants : ${JSON.stringify(r2.data?.fields)}`);
  check(r3.status === 400 && r3.data?.fields?.includes('consent_contact'), `sans consentement : ${r3.status} ${JSON.stringify(r3.data?.fields)}`);
  check(r4.status === 400 && r4.data?.fields?.includes('pays_naissance'), `option inconnue refusee : ${JSON.stringify(r4.data?.fields)}`);
  check(r5.status === 400 && r5.data?.fields?.includes('email'), `e-mail invalide refuse : ${JSON.stringify(r5.data?.fields)}`);
  check(r6.status === 400 && r6.data?.fields?.includes('date_naissance'), `date future refusee : ${JSON.stringify(r6.data?.fields)}`);
  check(r7.status === 400 && r7.data?.fields?.includes('nom'), `texte trop long refuse : ${JSON.stringify(r7.data?.fields)}`);
}
{
  // Question masquee (celibataire -> pas de conjoint) : la reponse fournie est ignoree, pas une erreur
  const r = await post('/intake/submit', { session, answers: { ...VALID, situation_familiale: 'celibataire', nationalite_conjoint: '<script>alert(1)</script>' }, lang: 'he' });
  check(r.status === 200 && r.data?.ok === true, `envoi valide : ${r.status} ${JSON.stringify(r.data)}`);
  const again = await post('/intake/submit', { session, answers: VALID, lang: 'he' });
  check(again.status === 409 && again.data?.state === 'used', `second envoi refuse (usage unique) : ${again.status} ${again.data?.state}`);
  const reopen = await post('/intake/verify', { token: await makeInvite(keys, mainId, mainExp, 'he'), code: await deriveCode(keys, mainId), turnstile: DUMMY_TURNSTILE });
  check(reopen.status === 409 && reopen.data?.state === 'used', `lien deja utilise -> « deja envoye » : ${reopen.status} ${reopen.data?.state}`);
}

// ---------- logiciel EZRA (admin) ----------
{
  const noSig = await fetch(URL_ + '/intake/admin/ping');
  const bad = await admin('GET', '/intake/admin/ping', undefined, { badSig: true });
  const old = await admin('GET', '/intake/admin/ping', undefined, { ts: now() - 3600 });
  const ok = await admin('GET', '/intake/admin/ping');
  check(noSig.status === 401 && bad.status === 401 && old.status === 401 && ok.status === 200,
    `admin : sans signature ${noSig.status}, signature fausse ${bad.status}, rejouee (1 h) ${old.status}, valide ${ok.status}`);
}
{
  const r = await admin('GET', '/intake/admin/submissions');
  const sub = r.data?.submissions?.find((s) => s.id === mainId);
  check(r.status === 200 && !!sub && sub.alg === 'RSA-OAEP-256+A256GCM', `copie chiffree disponible pour le logiciel : ${r.status}`);
  check(sub && !JSON.stringify(sub).includes('Benchimol'), 'aucune donnee en clair dans la base');
  if (sub && testKeys) {
    const priv = await wc.subtle.importKey('pkcs8', Buffer.from(testKeys.pkcs8, 'base64'), { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['decrypt']);
    const aesRaw = await wc.subtle.decrypt({ name: 'RSA-OAEP' }, priv, Buffer.from(sub.ek, 'base64'));
    const aes = await wc.subtle.importKey('raw', aesRaw, 'AES-GCM', false, ['decrypt']);
    const dec = async (aadId) => JSON.parse(new TextDecoder().decode(await wc.subtle.decrypt(
      { name: 'AES-GCM', iv: Buffer.from(sub.iv, 'base64'), additionalData: new TextEncoder().encode('ezra-intake:' + aadId) }, aes, Buffer.from(sub.ct, 'base64'))));
    const rec = await dec(mainId);
    check(rec.answers.nom === 'Benchimol' && rec.answers.nationalites.other === 'Marocaine (en cours)' && rec.lang === 'he',
      `dechiffrement avec la cle privee : ${rec.answers.prenom} ${rec.answers.nom}, ${rec.recap.length} sections`);
    check(rec.answers.nationalite_conjoint === undefined, 'reponse a une question masquee ecartee cote serveur');
    let wrongAad = false;
    try { await dec(newId()); } catch { wrongAad = true; }
    check(wrongAad, 'chiffre lie a son invitation (recolle sur une autre : refuse)');
  }
  const st = await admin('POST', '/intake/admin/status', { ids: [mainId] });
  check(st.status === 200 && st.data?.invites?.[0]?.status === 'submitted', `statut cote logiciel : ${st.data?.invites?.[0]?.status}`);
}
{
  // Revocation d'un lien encore jamais ouvert
  const id = newId();
  const exp = now() + 3600;
  const rv = await admin('POST', '/intake/admin/revoke', { id, exp });
  const r = await post('/intake/verify', { token: await makeInvite(keys, id, exp, 'fr'), code: await deriveCode(keys, id), turnstile: DUMMY_TURNSTILE });
  check(rv.status === 200 && r.status === 401 && r.data?.state === 'invalid', `lien revoque : revocation ${rv.status}, ouverture ${r.status} ${r.data?.state}`);
}
{
  const ack = await admin('POST', '/intake/admin/ack', { ids: [mainId] });
  const after = await admin('GET', '/intake/admin/submissions');
  check(ack.data?.deleted === 1 && !after.data?.submissions?.some((s) => s.id === mainId), `copie effacee de Cloudflare apres recuperation : ${ack.data?.deleted}`);
}

// ---------- Espace client : adresse e-mail + mot de passe ----------
async function register(email, { exp = now() + 86400, lang = 'fr' } = {}) {
  const id = newId();
  const eh = await emailHash(keys, normalizeEmail(email));
  const r = await admin('POST', '/intake/admin/register', { id, exp, lang, eh });
  return { id, exp, code: await deriveCode(keys, id), status: r.status };
}
const login = (email, code, turnstile = DUMMY_TURNSTILE) => post('/intake/login', { email, code, turnstile });
{
  const bad = await admin('POST', '/intake/admin/register', { id: newId(), exp: now() + 60, lang: 'fr', eh: 'trop-court' });
  check(bad.status === 400, `enregistrement refuse si l'empreinte e-mail est invalide : ${bad.status}`);

  const inv = await register('Noa.Levi@Example.com', { lang: 'he' });
  check(inv.status === 200, `invitation enregistree par le logiciel : ${inv.status}`);
  const typed = ' NOA.levi@example.COM ';
  const ok = await login(typed, (inv.code.slice(0, 4) + '-' + inv.code.slice(4)).toLowerCase());
  check(ok.status === 200 && typeof ok.data?.session === 'string' && ok.data?.lang === 'he',
    `connexion e-mail + mot de passe (casse et espaces ignores) : ${ok.status}`);
  const s = await post('/intake/submit', { session: ok.data?.session, answers: VALID, lang: 'he' });
  check(s.status === 200, `envoi du questionnaire apres connexion par l'Espace client : ${s.status}`);
  const used = await login('noa.levi@example.com', inv.code);
  const usedWrong = await login('noa.levi@example.com', 'ZZZZZZZZ');
  check(used.status === 409 && used.data?.state === 'used', `deja envoye : signale seulement avec le bon mot de passe (${used.status})`);
  check(usedWrong.status === 401 && usedWrong.data?.state === 'login', `deja envoye + mauvais mot de passe : rien ne fuit (${usedWrong.status})`);
}
{
  // Reponse IDENTIQUE pour une adresse connue (mauvais mot de passe) et une adresse inconnue
  const inv = await register('connu@example.com');
  const known = await login('connu@example.com', 'ZZZZZZZZ');
  const unknown = await login('inconnu@example.com', 'ZZZZZZZZ');
  check(known.status === 401 && JSON.stringify(known.data) === JSON.stringify(unknown.data) && known.status === unknown.status,
    `adresse connue ou inconnue : meme reponse (${JSON.stringify(known.data)})`);
  check(!('remaining' in (known.data || {})), 'aucun compteur d\'essais revele dans l\'Espace client');
  // Blocage invisible : 4 autres essais faux (5 au total), puis le bon mot de passe -> « bloque »
  for (let i = 0; i < 4; i++) await login('connu@example.com', 'ZZZZZZZZ');
  const locked = await login('connu@example.com', inv.code);
  check(locked.status === 423 && locked.data?.state === 'locked', `5 mots de passe faux -> bloque, annonce seulement au bon mot de passe : ${locked.status}`);
}
{
  const expired = await register('expire@example.com', { exp: now() - 60 });
  const r1 = await login('expire@example.com', expired.code);
  const r2 = await login('expire@example.com', 'ZZZZZZZZ');
  check(r1.status === 410 && r1.data?.state === 'expired' && r2.status === 401, `acces expire : ${r1.status} (bon mot de passe) / ${r2.status} (mauvais)`);
  const rv = await register('revoque@example.com');
  await admin('POST', '/intake/admin/revoke', { id: rv.id, exp: rv.exp });
  const r3 = await login('revoque@example.com', rv.code);
  check(r3.status === 401 && r3.data?.state === 'invalid', `acces revoque : ${r3.status} ${r3.data?.state}`);
  const r4 = await login('pas-un-email', 'ZZZZZZZZ');
  const r5 = await login('noa.levi@example.com', 'ZZZZZZZZ', '');
  check(r4.status === 400 && r5.status === 403 && r5.data?.state === 'bot', `format refuse ${r4.status} ; sans anti-robot ${r5.status}`);
}

// ---------- limite par IP (en dernier : elle bloque ensuite une minute) ----------
{
  const id = newId();
  const token = await makeInvite(keys, id, now() + 3600, 'fr');
  const statuses = [];
  for (let i = 0; i < 25; i++) statuses.push((await post('/intake/verify', { token, code: 'ZZZZZZZZ', turnstile: DUMMY_TURNSTILE })).status);
  const limited = statuses.filter((s) => s === 429).length;
  console.log(`${limited ? 'OK ' : 'INFO'}  limite par IP : ${limited} requete(s) sur 25 refusees (429)${limited ? '' : ' — limiteur non simule en local'}`);
}

console.log(failures ? `\n${failures} ECHEC(S)` : '\nTOUT PASSE');
process.exit(failures ? 1 : 0);
