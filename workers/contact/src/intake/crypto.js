// Cryptographie du questionnaire approfondi (WebCrypto, aucune dependance).
//
// Une seule cle maitresse partagee avec le logiciel EZRA (secret INTAKE_MASTER_KEY, 32 octets base64url).
// Chaque usage a sa propre sous-cle : HMAC-SHA256(maitresse, etiquette). Une fuite d'une signature d'un
// usage ne sert a rien pour un autre usage.
//   lien    : signe le lien d'invitation (v1.<charge>.<signature>)
//   code    : derive le code d'acces a 8 caracteres de l'identifiant d'invitation
//   session : signe le jeton de session remis apres un code correct (s1.<charge>.<signature>)
//   admin   : authentifie les requetes du logiciel (liste / acquittement / revocation)
// Le meme calcul est fait cote logiciel (webapp/services/intake_service.py) : vecteurs de test communs.
//
// Les reponses sont chiffrees pour le logiciel seul : AES-256-GCM (cle aleatoire par envoi) + cle AES
// chiffree en RSA-OAEP-256 avec la cle PUBLIQUE (INTAKE_PUBLIC_KEY). La cle privee ne quitte jamais le PC.

const te = new TextEncoder();
const td = new TextDecoder();

export function b64uEncode(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function b64uDecode(str) {
  if (typeof str !== 'string' || !/^[A-Za-z0-9_-]*$/.test(str)) throw new Error('base64url invalide');
  let s = str.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function b64Encode(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

function b64Decode(str) {
  const bin = atob(str);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

const LABELS = {
  link: 'ezra-intake/link/v1',
  code: 'ezra-intake/code/v1',
  session: 'ezra-intake/session/v1',
  admin: 'ezra-intake/admin/v1',
  email: 'ezra-intake/email/v1',
};

async function hmacRaw(keyBytes, message) {
  const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, typeof message === 'string' ? te.encode(message) : message));
}

// Sous-cles importees une fois par instance (la cle maitresse ne change qu'au redeploiement)
const cache = new Map();

export async function getKeys(masterB64u) {
  if (!masterB64u) throw new Error('INTAKE_MASTER_KEY absente');
  if (cache.has(masterB64u)) return cache.get(masterB64u);
  const master = b64uDecode(masterB64u);
  if (master.length < 32) throw new Error('INTAKE_MASTER_KEY trop courte (32 octets minimum)');
  const keys = {};
  for (const [name, label] of Object.entries(LABELS)) {
    const raw = await hmacRaw(master, label);
    keys[name + 'Raw'] = raw;
    keys[name] = await crypto.subtle.importKey('raw', raw, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
  }
  cache.set(masterB64u, keys);
  return keys;
}

// --- jetons signes : <prefixe>.<charge base64url>.<signature base64url> ---

const INV_ID_RE = /^[A-Za-z0-9_-]{22}$/;
export const LANGS = ['fr', 'en', 'es', 'he', 'ar'];

async function signToken(key, prefix, payload) {
  const body = b64uEncode(te.encode(JSON.stringify(payload)));
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, te.encode(prefix + '.' + body)));
  return prefix + '.' + body + '.' + b64uEncode(sig);
}

// Renvoie la charge si signature valide (comparaison a temps constant par crypto.subtle.verify), sinon null
async function openToken(key, prefix, token) {
  if (typeof token !== 'string' || token.length > 400) return null;
  const parts = token.split('.');
  if (parts.length !== 3 || parts[0] !== prefix) return null;
  let sig, payload;
  try {
    sig = b64uDecode(parts[2]);
    if (sig.length !== 32) return null;
    const ok = await crypto.subtle.verify('HMAC', key, sig, te.encode(prefix + '.' + parts[1]));
    if (!ok) return null;
    payload = JSON.parse(td.decode(b64uDecode(parts[1])));
  } catch {
    return null;
  }
  return payload && typeof payload === 'object' && !Array.isArray(payload) ? payload : null;
}

// Lien d'invitation : { i: identifiant 22 car., e: expiration (s unix), l: langue }
export async function verifyInvite(keys, token, nowSec) {
  const p = await openToken(keys.link, 'v1', token);
  if (!p) return { error: 'invalid' };
  if (typeof p.i !== 'string' || !INV_ID_RE.test(p.i) || !Number.isInteger(p.e) || !LANGS.includes(p.l)) return { error: 'invalid' };
  if (p.e <= nowSec) return { error: 'expired' };
  return { id: p.i, exp: p.e, lang: p.l };
}

export async function makeInvite(keys, id, exp, lang) {
  return signToken(keys.link, 'v1', { i: id, e: exp, l: lang });
}

export async function makeSession(keys, id, exp) {
  return signToken(keys.session, 's1', { i: id, e: exp });
}

export async function verifySession(keys, token, nowSec) {
  const p = await openToken(keys.session, 's1', token);
  if (!p || typeof p.i !== 'string' || !INV_ID_RE.test(p.i) || !Number.isInteger(p.e)) return null;
  if (p.e <= nowSec) return null;
  return { id: p.i, exp: p.e };
}

// --- code d'acces : 8 caracteres base32 Crockford (40 bits), sans I L O U ---

const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

export async function deriveCode(keys, invId) {
  const mac = await hmacRaw(keys.codeRaw, 'code:' + invId);
  let n = 0n;
  for (let i = 0; i < 5; i++) n = (n << 8n) | BigInt(mac[i]);
  let out = '';
  for (let i = 7; i >= 0; i--) out += ALPHABET[Number((n >> BigInt(i * 5)) & 31n)];
  return out;
}

// Saisie du visiteur : majuscules, sans espaces ni tirets ; O->0, I/L->1 (confusions courantes)
export function normalizeCode(input) {
  if (typeof input !== 'string') return null;
  const s = input.toUpperCase().replace(/[\s-]/g, '').replace(/O/g, '0').replace(/[IL]/g, '1');
  if (s.length !== 8) return null;
  for (const c of s) if (!ALPHABET.includes(c)) return null;
  return s;
}

// --- identifiant de l'Espace client : adresse e-mail, jamais stockee en clair ---
// Empreinte HMAC (sous-cle dediee) de l'adresse normalisee : Cloudflare peut verifier une adresse saisie
// mais ne peut pas retrouver les adresses a partir de la base. Meme calcul dans le logiciel (intake_service.py).

export function normalizeEmail(input) {
  if (typeof input !== 'string') return null;
  const s = input.normalize('NFC').trim().toLowerCase();
  if (s.length < 6 || s.length > 254 || !/^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:"]{2,}$/.test(s)) return null;
  return s;
}

export async function emailHash(keys, email) {
  return b64uEncode(await hmacRaw(keys.emailRaw, 'email:' + email));
}

// Comparaison a temps constant de deux chaines de meme longueur
export function safeEqual(a, b) {
  const x = te.encode(a);
  const y = te.encode(b);
  if (x.length !== y.length) return false;
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

// --- authentification des requetes du logiciel ---
// Signature = HMAC(admin, METHODE \n chemin?requete \n horodatage \n sha256(corps) base64url), fenetre 5 min

export async function verifyAdmin(keys, request, bodyBytes, nowSec) {
  const ts = request.headers.get('X-Intake-Ts') || '';
  const sigHeader = request.headers.get('X-Intake-Sig') || '';
  if (!/^\d{9,11}$/.test(ts) || Math.abs(nowSec - parseInt(ts, 10)) > 300) return false;
  let sig;
  try { sig = b64uDecode(sigHeader); } catch { return false; }
  if (sig.length !== 32) return false;
  const url = new URL(request.url);
  const bodyHash = b64uEncode(new Uint8Array(await crypto.subtle.digest('SHA-256', bodyBytes)));
  const message = [request.method.toUpperCase(), url.pathname + url.search, ts, bodyHash].join('\n');
  return crypto.subtle.verify('HMAC', keys.admin, sig, te.encode(message));
}

// --- chiffrement pour le logiciel (enveloppe hybride) ---

const pubCache = new Map();

export async function sealForCrm(publicKeySpkiB64, invId, plaintext) {
  if (!publicKeySpkiB64) throw new Error('INTAKE_PUBLIC_KEY absente');
  let pub = pubCache.get(publicKeySpkiB64);
  if (!pub) {
    pub = await crypto.subtle.importKey('spki', b64Decode(publicKeySpkiB64), { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['encrypt']);
    pubCache.set(publicKeySpkiB64, pub);
  }
  const aes = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt']);
  const rawAes = new Uint8Array(await crypto.subtle.exportKey('raw', aes));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  // Donnees associees : le chiffre est lie a son invitation (impossible de le recoller sur une autre)
  const aad = te.encode('ezra-intake:' + invId);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: aad }, aes, te.encode(plaintext)));
  const ek = new Uint8Array(await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, pub, rawAes));
  rawAes.fill(0);
  return { alg: 'RSA-OAEP-256+A256GCM', ek: b64Encode(ek), iv: b64Encode(iv), ct: b64Encode(ct) };
}
