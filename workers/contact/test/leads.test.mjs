// Essais des copies chiffrees des demandes (formulaire de contact / test d'eligibilite) contre la fonction lancee en
// local : npx wrangler dev --var INTAKE_PUBLIC_KEY:<spki de test>  (cle maitresse : celle de .dev.vars).
// Usage : node test/leads.test.mjs <url> <chemin/test_keys.json>   (test_keys.json = { spki, pkcs8 } de TEST)
// Rien n'est envoye : wrangler ecrit les e-mails dans des fichiers.
import { readFileSync } from 'node:fs';
import { webcrypto as wc } from 'node:crypto';
import { getKeys, b64uEncode } from '../src/intake/crypto.js';

const URL_ = process.argv[2] || 'http://127.0.0.1:8787';
const testKeys = JSON.parse(readFileSync(process.argv[3], 'utf8'));
const devVars = Object.fromEntries(readFileSync(new URL('../.dev.vars', import.meta.url), 'utf8')
  .split(/\r?\n/).filter((l) => /^[A-Z_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]));
const keys = await getKeys(devVars.INTAKE_MASTER_KEY);
const ORIGIN = 'http://127.0.0.1:4402';
let failures = 0;
const check = (ok, label) => { console.log(`${ok ? 'OK ' : 'ECHEC'}  ${label}`); if (!ok) failures++; };
const base = {
  _gotcha: '', name: 'Zoé TEST-DEMANDE', email: 'zoe.demande@example.com', phone: '+33 6 11 22 33 44',
  subject: 'Question générale sur vos services', message: 'Message de test : ma grand-mère est née à Fès.',
  consent: 'accepted', 'cf-turnstile-response': 'XXXX.DUMMY.TOKEN.XXXX', lang: 'fr',
};

async function post(body) {
  const res = await fetch(URL_, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: ORIGIN }, body: JSON.stringify(body) });
  return res.status;
}

async function admin(method, path, body, { badSig = false } = {}) {
  const bodyStr = body === undefined ? '' : JSON.stringify(body);
  const ts = String(Math.floor(Date.now() / 1000));
  const hash = b64uEncode(new Uint8Array(await wc.subtle.digest('SHA-256', new TextEncoder().encode(bodyStr))));
  let sig = b64uEncode(new Uint8Array(await wc.subtle.sign('HMAC', keys.admin, new TextEncoder().encode([method, path, ts, hash].join('\n')))));
  if (badSig) sig = sig.slice(0, -2) + (sig.endsWith('AA') ? 'BB' : 'AA');
  const res = await fetch(URL_ + path, { method, headers: { 'X-Intake-Ts': ts, 'X-Intake-Sig': sig, ...(bodyStr ? { 'Content-Type': 'application/json' } : {}) }, body: bodyStr || undefined });
  let data = null; try { data = await res.json(); } catch { /* */ }
  return { status: res.status, data };
}

const privateKey = await wc.subtle.importKey('pkcs8', Buffer.from(testKeys.pkcs8, 'base64'), { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['decrypt']);
async function open(lead) {
  const raw = new Uint8Array(await wc.subtle.decrypt({ name: 'RSA-OAEP' }, privateKey, Buffer.from(lead.ek, 'base64')));
  const aes = await wc.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['decrypt']);
  const pt = await wc.subtle.decrypt({ name: 'AES-GCM', iv: Buffer.from(lead.iv, 'base64'), additionalData: new TextEncoder().encode('ezra-intake:lead:' + lead.id) }, aes, Buffer.from(lead.ct, 'base64'));
  return JSON.parse(new TextDecoder().decode(pt));
}

async function clear() {
  const r = await admin('GET', '/intake/admin/leads');
  const ids = (r.data?.leads || []).map((l) => l.id);
  if (ids.length) await admin('POST', '/intake/admin/leads/ack', { ids });
}

await clear();
check((await post(base)) === 200, 'demande de contact acceptee');
const _elig = JSON.stringify({ k: 'favorable', a: { ascendants: ['mere'], vivant: 'oui', maroc: 'reste', documents: ['acte_naissance', 'livret'], famille: 'non', liens: 'tous', noms: 'oui', pour: 'moi', pays: 'fr', objectif: ['papiers'] } });
const { subject, ...rest } = base;
check((await post({ ...rest, message: '', objet_demande: 'Évaluation préliminaire de mon éligibilité', "Résultats du test d'éligibilité": 'Résultat : Situation favorable', _subject: "Test d'éligibilité – Situation favorable (mère marocaine)", _elig })) === 200, "demande depuis le test d'eligibilite acceptee");
check((await post({ ...base, _gotcha: 'http://spam.example', name: 'ROBOT-PIEGE' })) === 200, 'robot (champ piege) : 200 sans rien garder');
check((await post({ ...base, email: 'pas-un-email' })) === 400, 'demande invalide refusee');

const list = await admin('GET', '/intake/admin/leads');
const leads = list.data?.leads || [];
check(list.status === 200 && leads.length === 2, `2 copies chiffrees en attente (recu ${leads.length})`);
check(leads.every((l) => /^[A-Za-z0-9_-]{22}$/.test(l.id) && l.alg === 'RSA-OAEP-256+A256GCM' && l.ek && l.iv && l.ct), 'format des copies (id, algorithme, champs chiffres)');
check(!JSON.stringify(leads).includes('zoe.demande') && !JSON.stringify(leads).includes('Fès'), 'rien de lisible en clair dans la copie');
const records = await Promise.all(leads.map(open));
const contact = records.find((r) => r.kind === 'contact');
const test = records.find((r) => r.kind === 'test');
check(contact && contact.id.startsWith('lead:') && contact.fields.name === 'Zoé TEST-DEMANDE' && contact.fields.email === 'zoe.demande@example.com'
  && contact.fields.phone === '+33 6 11 22 33 44' && contact.fields.message.includes('Fès') && contact.preanalyse === null, 'contenu de la demande de contact (dechiffre)');
check(test && test.preanalyse && test.preanalyse.grade && Number.isInteger(test.preanalyse.score)
  && test.extras.some(([k]) => k.startsWith('Résultats')), `test d'eligibilite : pre-analyse ${test?.preanalyse?.grade} · ${test?.preanalyse?.score}/100 + resultats`);
check((await admin('GET', '/intake/admin/leads', undefined, { badSig: true })).status === 401, 'liste refusee sans bonne signature');
check((await fetch(URL_ + '/intake/admin/leads')).status === 401, 'liste refusee sans signature');
const ack = await admin('POST', '/intake/admin/leads/ack', { ids: leads.map((l) => l.id) });
check(ack.status === 200 && ack.data?.deleted === 2, `effacement apres recuperation (${ack.data?.deleted})`);
check(((await admin('GET', '/intake/admin/leads')).data?.leads || []).length === 0, 'plus rien en attente');
check((await admin('POST', '/intake/admin/leads/ack', { ids: ['pas-un-id'] })).status === 400, 'acquittement : identifiant invalide refuse');
console.log(failures ? `${failures} ECHEC(S)` : 'TOUTES LES VERIFICATIONS PASSENT');
process.exit(failures ? 1 : 0);
