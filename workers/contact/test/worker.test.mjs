// Essais de la fonction en local (npm run dev dans un autre terminal, avec .dev.vars) : rien n'est envoye,
// wrangler ecrit les e-mails dans des fichiers. Usage : node test/worker.test.mjs [url]
const URL_ = process.argv[2] || 'http://127.0.0.1:8787';
const ORIGIN = 'http://127.0.0.1:4402';
let failures = 0;
const check = (ok, label) => { console.log(`${ok ? 'OK ' : 'ECHEC'}  ${label}`); if (!ok) failures++; };
const base = {
  _gotcha: '', name: 'Test Essai', email: 'visiteur.test@example.com', phone: '+33 6 00 00 00 00',
  subject: 'Question générale sur vos services', message: 'Message de test : ma grand-mère est née à Fès en 1950.',
  consent: 'accepted', 'cf-turnstile-response': 'XXXX.DUMMY.TOKEN.XXXX', lang: 'fr',
};
async function post(body, { origin = ORIGIN, type = 'application/json', raw } = {}) {
  const res = await fetch(URL_, { method: 'POST', headers: { 'Content-Type': type, Accept: 'application/json', ...(origin ? { Origin: origin } : {}) }, body: raw ?? JSON.stringify(body) });
  let data = null; try { data = await res.json(); } catch { /* corps non JSON */ }
  return { status: res.status, data, cors: res.headers.get('Access-Control-Allow-Origin') };
}

// Pre-requete CORS
{
  const ok = await fetch(URL_, { method: 'OPTIONS', headers: { Origin: ORIGIN, 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type' } });
  const bad = await fetch(URL_, { method: 'OPTIONS', headers: { Origin: 'https://pirate.example', 'Access-Control-Request-Method': 'POST' } });
  check(ok.status === 204 && ok.headers.get('Access-Control-Allow-Origin') === ORIGIN && bad.status === 403, `pre-requete CORS : site ${ok.status}, autre domaine ${bad.status}`);
}
// Envoi normal
{
  const r = await post(base);
  check(r.status === 200 && r.data?.ok === true && r.cors === ORIGIN, `envoi normal (FR) : ${r.status} ${JSON.stringify(r.data)}`);
}
// Envoi depuis le test d'eligibilite, en anglais
{
  const { subject, ...rest } = base;
  const r = await post({ ...rest, lang: 'en', message: '', objet_demande: 'Évaluation préliminaire de mon éligibilité',
    "Résultats du test d'éligibilité": "Résultat : Situation favorable\nAscendants marocains : Ma mère\nPays de résidence : Israël",
    _subject: "Test d'éligibilité – Situation favorable (mère marocaine) [EN]" });
  check(r.status === 200 && r.data?.ok === true, `envoi depuis le test d'eligibilite (EN, message vide) : ${r.status}`);
}
// Refus attendus
const cases = [
  ['autre domaine (Origin)', post(base, { origin: 'https://pirate.example' }), 403],
  ['sans Origin (script hors navigateur)', post(base, { origin: null }), 403],
  ['sans jeton anti-robot', post({ ...base, 'cf-turnstile-response': '' }), 403],
  ['e-mail invalide', post({ ...base, email: 'pas-un-email' }), 400],
  ['injection d en-tete dans l e-mail', post({ ...base, email: 'a@b.com\r\nBcc: victime@example.com' }), 400],
  ['consentement refuse', post({ ...base, consent: 'declined' }), 400],
  ['nom vide', post({ ...base, name: '   ' }), 400],
  ['message et resultats vides', post({ ...base, message: '' }), 400],
  ['valeur non texte', post({ ...base, name: { x: 1 } }), 400],
  ['JSON casse', post(null, { raw: '{"name":' }), 400],
  ['mauvais type de contenu', post(base, { type: 'text/plain' }), 415],
  ['corps trop gros (40 Ko)', post({ ...base, message: 'x'.repeat(40000) }), 413],
  ['trop de champs', post({ ...base, ...Object.fromEntries(Array.from({ length: 25 }, (_, i) => ['f' + i, 'v'])) }), 400],
];
for (const [label, promise, expected] of cases) {
  const r = await promise;
  check(r.status === expected, `refus : ${label} -> ${r.status}${r.data?.message ? ' « ' + r.data.message + ' »' : ''}`);
}
// Champ piege rempli : reponse 200 mais rien envoye (verifie dans le journal de wrangler)
{
  const r = await post({ ...base, _gotcha: 'http://spam.example', name: 'ROBOT-PIEGE' });
  check(r.status === 200, `champ piege rempli -> ${r.status} (aucun e-mail attendu pour « ROBOT-PIEGE »)`);
}
// Message d'erreur dans la langue du visiteur
{
  const r = await post({ ...base, lang: 'he', email: 'faux' });
  check(r.status === 400 && /[֐-׿]/.test(r.data?.message || ''), `message d'erreur en hebreu : « ${r.data?.message} »`);
}
// Methode GET
{
  const r = await fetch(URL_);
  check(r.status === 405, `GET -> ${r.status}`);
}
console.log(failures ? `${failures} ECHEC(S)` : 'TOUTES LES VERIFICATIONS PASSENT');
