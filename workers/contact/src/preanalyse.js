// Pre-analyse interne du dossier, calculee a partir des reponses brutes du test d'eligibilite (champ cache _elig).
// Elle n'apparait QUE dans l'e-mail de l'equipe (objet + bloc en tete), jamais chez le visiteur, et la grille reste
// privee (elle n'est pas dans le code public du site). Grille v1 (2026-10-13), a ajuster avec l'experience :
// tous les poids sont dans les tables ci-dessous.

const KNOWN = ['pere', 'mere', 'gp_pere', 'gp_mere', 'arriere'];
const ALLOWED = {
  ascendants: ['pere', 'mere', 'gp_pere', 'gp_mere', 'arriere', 'nsp', 'aucun'],
  principal: KNOWN,
  vivant: ['oui', 'non', 'nsp'],
  maroc: ['reste', 'apres1970', '1956_1970', 'avant1956', 'ailleurs', 'nsp'],
  documents: ['acte_naissance', 'livret', 'identite', 'consulaire', 'mariage', 'certificat', 'aucun'],
  famille: ['oui', 'non', 'nsp'],
  liens: ['tous', 'partie', 'non'],
  noms: ['oui', 'non', 'nsp'],
  maries: ['oui', 'non', 'nsp'],
  pour: ['moi', 'enfant', 'famille'],
  pays: ['fr', 'es', 'it', 'be', 'nl', 'de', 'ca', 'us', 'ma', 'autre'],
  objectif: ['papiers', 'enfants', 'projet', 'famille', 'autre'],
};
const MULTI = new Set(['ascendants', 'documents', 'objectif']);

// --- Grille (points) --- v2 (2026-10-13, avis de l'equipe) : l'acte de naissance marocain du parent regle
// quasiment le dossier, le livret de famille marocain est presque aussi important (il donne les numeros d'actes).
// Lien avec l'ascendant marocain retenu : direct (parent) > 2 generations > 3 generations
const LIEN = { pere: 30, mere: 30, gp_pere: 18, gp_mere: 18, arriere: 8 };
const PLUSIEURS_ASCENDANTS = 5;
// Documents marocains : le meilleur compte en entier, les autres pour 30 %, plafond 40 (premier critere de la note)
// (CIN du parent : preuve directe de nationalite et numero exploitable, au niveau du livret — avis de l'equipe)
const DOCS = { certificat: 40, acte_naissance: 40, livret: 38, identite: 38, consulaire: 15, mariage: 12 };
const DOCS_MAX = 40;
// Actes reliant les generations : pour un parent direct, l'acte de naissance du demandeur suffit le plus souvent
const LIENS_DIRECT = { tous: 12, partie: 10, non: 6 };
const LIENS_INDIRECT = { tous: 12, partie: 6, non: 0 };
const PRECEDENT = 8; // un proche a deja obtenu ses papiers grace au meme ascendant
const MAROC = { reste: 6, apres1970: 5, '1956_1970': 4, avant1956: 2, ailleurs: 1, nsp: 1 };
const VIVANT = 3;
const NOMS = { oui: 4, non: -4, nsp: 0 };
const MARIES = { oui: 2, non: -20, nsp: -3 }; // lignee paternelle seulement
const NON_MARIES_PLAFOND = 54; // parents non maries (lignee paternelle) : note plafonnee au niveau C
const GRADES = [
  [75, 'A', 'Dossier solide : à traiter en priorité', '#1b7f3b'],
  [55, 'B', 'Bon potentiel : quelques pièces à réunir', '#1d6fb8'],
  [35, 'C', 'À creuser : recherches documentaires à prévoir', '#b86e00'],
  [0, 'D', 'Faible à ce stade : beaucoup d’inconnues', '#b42318'],
];

const REF = { pere: 'père', mere: 'mère', gp_pere: 'grand-parent côté père', gp_mere: 'grand-parent côté mère', arriere: 'arrière-grand-parent' };
const DOC_FORT = {
  certificat: 'Certificat de nationalité de l’ascendant : preuve directe de sa nationalité',
  acte_naissance: 'Acte de naissance marocain de l’ascendant : excellent, l’acte est identifié et une copie récente peut être demandée',
  livret: 'Livret de famille marocain : très important, il donne les numéros d’actes de toute la famille pour les récupérer',
  identite: 'CIN ou ancien passeport marocain de l’ascendant : preuve directe de sa nationalité, numéro exploitable pour retrouver ses actes',
  consulaire: 'Immatriculation consulaire : un dossier existe au consulat',
  mariage: 'Acte de mariage marocain : mariage enregistré au Maroc',
};
const PAYS = { fr: 'France', es: 'Espagne', it: 'Italie', be: 'Belgique', nl: 'Pays-Bas', de: 'Allemagne', ca: 'Canada', us: 'États-Unis', ma: 'Maroc', autre: 'autre pays' };
const POUR = { moi: 'le demandeur seul', enfant: 'un enfant mineur', famille: 'plusieurs membres de la famille (plusieurs dossiers possibles)' };
const OBJECTIF = { papiers: 'passeport / CIN', enfants: 'transmission aux enfants', projet: 'projet au Maroc', famille: 'démarche familiale / identitaire', autre: 'autre' };
// Reponses du visiteur, telles qu'affichees dans le detail de la note
const DOC_TXT = { certificat: 'certificat de nationalité', acte_naissance: 'acte de naissance marocain', livret: 'livret de famille marocain', identite: 'CIN ou ancien passeport marocain', consulaire: 'immatriculation consulaire', mariage: 'acte de mariage' };
const LIENS_TXT = { tous: 'tous disponibles', partie: 'en partie', non: 'absents ou inconnus' };
const MAROC_TXT = { reste: 'naissance au Maroc, y a toujours vécu', apres1970: 'naissance au Maroc, départ après 1970', '1956_1970': 'naissance au Maroc, départ entre 1956 et 1970', avant1956: 'naissance au Maroc, départ avant 1956', ailleurs: 'naissance hors du Maroc', nsp: 'ne sait pas' };
const NOMS_TXT = { oui: 'identique sur tous les documents', non: 'différences entre documents', nsp: 'ne sait pas' };
const OUI_NON = { oui: 'oui', non: 'non', nsp: 'ne sait pas' };

// Reponses recues : on ne garde que les questions et valeurs connues (le champ vient du navigateur du visiteur)
function sanitize(raw) {
  let x;
  try { x = JSON.parse(raw); } catch { return null; }
  const a = x && typeof x === 'object' && x.a && typeof x.a === 'object' ? x.a : null;
  if (!a) return null;
  const out = {};
  for (const [q, allowed] of Object.entries(ALLOWED)) {
    const v = a[q];
    if (MULTI.has(q)) {
      if (Array.isArray(v)) {
        const ok = [...new Set(v.filter((s) => typeof s === 'string' && allowed.includes(s)))];
        if (ok.length) out[q] = ok;
      }
    } else if (typeof v === 'string' && allowed.includes(v)) out[q] = v;
  }
  return out.ascendants ? out : null;
}

export function preAnalyse(raw) {
  const a = sanitize(raw);
  if (!a) return null;
  const strengths = [], warnings = [], todo = [];
  const asc = a.ascendants;
  const ctx = [];
  if (a.pour) ctx.push('demande pour ' + POUR[a.pour]);
  if (a.pays) ctx.push('résidence : ' + PAYS[a.pays]);
  if (a.objectif) ctx.push('objectif : ' + a.objectif.map((o) => OBJECTIF[o]).join(', '));
  const context = ctx.join(' · ');

  if (asc.includes('aucun')) {
    return { score: 0, grade: 'X', label: 'Pas d’ascendant marocain déclaré', color: '#6b7280', strengths, warnings,
      todo: ['Réponse courtoise ; vérifier lors d’un éventuel échange s’il existe un ascendant non identifié'], context,
      details: [['Lien de filiation', 'aucun ascendant marocain déclaré', 0, LIEN.pere]], totalNote: '' };
  }
  const known = asc.filter((x) => KNOWN.includes(x));
  const p = known.length > 1 ? (a.principal || known[0]) : known[0];
  if (!p) {
    return { score: 5, grade: 'D', label: 'Ascendant marocain encore à identifier', color: GRADES[3][3], strengths,
      warnings: ['Le visiteur ne sait pas encore quel ascendant est marocain'],
      todo: ['Premier échange : reconstituer l’arbre familial et identifier la lignée marocaine'], context,
      details: [['Lien de filiation', 'ascendant marocain pas encore identifié (5 points forfaitaires)', 5, LIEN.pere]], totalNote: '' };
  }

  const direct = p === 'pere' || p === 'mere';
  // Detail de la note : [critere, reponse du visiteur, points obtenus, maximum]
  const details = [];
  let s = 0;
  const add = (k, v, pts, max) => { const r = Math.round(pts); s += pts; details.push([k, v, r, max]); };

  add('Lien de filiation', `${REF[p]} (${p === 'pere' || p === 'mere' ? 'lien direct' : p === 'arriere' ? '3 générations' : '2 générations'})`, LIEN[p], LIEN.pere);
  if (p === 'pere' || p === 'mere') strengths.push(`Lien direct : ${p === 'pere' ? 'père marocain' : 'mère marocaine'}`);
  else if (p === 'arriere') warnings.push('Filiation sur 3 générations : établir aussi la nationalité des deux générations intermédiaires');
  else warnings.push(`Filiation sur 2 générations (${REF[p]}) : établir aussi la nationalité du parent intermédiaire`);
  if (known.length > 1) {
    add('Plusieurs ascendants marocains', known.map((k) => REF[k]).join(', '), PLUSIEURS_ASCENDANTS, PLUSIEURS_ASCENDANTS);
    strengths.push(`Plusieurs ascendants marocains (${known.map((k) => REF[k]).join(', ')}) : lignée de secours possible`);
  }

  const docs = (a.documents || []).filter((d) => d !== 'aucun');
  if (docs.length) {
    const pts = docs.map((d) => DOCS[d]).sort((x, y) => y - x);
    const order = ['certificat', 'acte_naissance', 'livret', 'identite', 'consulaire', 'mariage'].filter((d) => docs.includes(d));
    add('Documents marocains', order.map((d) => DOC_TXT[d]).join(', ') + (docs.length > 1 ? ' (le meilleur compte en entier, les autres pour 30 %)' : ''),
      Math.min(DOCS_MAX, pts[0] + 0.3 * pts.slice(1).reduce((t, v) => t + v, 0)), DOCS_MAX);
    // Document mis en avant (ligne « quasi décisif » / « très fort ») : sa ligne standard n'est pas repetee
    const parent = p === 'pere' ? 'du père' : 'de la mère';
    let featured = null;
    if (direct && (docs.includes('acte_naissance') || docs.includes('certificat'))) {
      featured = docs.includes('acte_naissance') ? 'acte_naissance' : 'certificat';
      strengths.push(`Élément quasi décisif : ${featured === 'acte_naissance' ? 'acte de naissance marocain' : 'certificat de nationalité'} ${parent} disponible (acte identifié, copie récente demandable)`);
    } else if (direct && (docs.includes('livret') || docs.includes('identite'))) {
      featured = docs.includes('livret') ? 'livret' : 'identite';
      strengths.push(`Élément très fort : ${featured === 'livret' ? 'livret de famille marocain' : 'CIN ou ancien passeport marocain'} ${parent} disponible (${featured === 'livret' ? 'numéros d’actes de toute la famille' : 'preuve directe de nationalité, numéro exploitable'})`);
    }
    for (const d of order) if (d !== featured) strengths.push(DOC_FORT[d]);
    if (docs.includes('livret') && !docs.includes('acte_naissance')) todo.push('Relever les numéros d’actes dans le livret puis commander les actes (Watiqa)');
    if (docs.includes('acte_naissance')) todo.push('Demander une copie intégrale récente de l’acte de naissance marocain');
    if (docs.includes('identite')) todo.push('Obtenir une copie de l’ancienne CIN ou du passeport (numéro utile aux recherches)');
  } else if (a.documents) {
    add('Documents marocains', 'aucun pour l’instant', 0, DOCS_MAX);
    warnings.push('Aucun document marocain pour l’instant');
    todo.push('Recherche d’actes à prévoir (Watiqa, état civil marocain, archives consulaires)');
  }

  if (a.liens) {
    const L = direct ? LIENS_DIRECT : LIENS_INDIRECT;
    add('Actes de liaison entre générations', LIENS_TXT[a.liens] + (direct && a.liens !== 'tous' ? ' (lien direct : l’acte de naissance du demandeur suffit le plus souvent)' : ''), L[a.liens], L.tous);
    if (a.liens === 'tous') strengths.push('Tous les actes de liaison entre les générations sont disponibles');
    else if (a.liens === 'partie') warnings.push('Actes de liaison (naissances, mariages) incomplets');
    else warnings.push('Actes de liaison absents ou inconnus');
  }
  if (a.famille) {
    add('Précédent dans la famille', OUI_NON[a.famille], a.famille === 'oui' ? PRECEDENT : 0, PRECEDENT);
    if (a.famille === 'oui') strengths.push('Un proche a déjà obtenu ses papiers grâce au même ascendant : chaîne déjà reconnue');
  }
  if (a.maroc) {
    add('Parcours de l’ascendant', MAROC_TXT[a.maroc], MAROC[a.maroc], MAROC.reste);
    if (a.maroc === 'reste' || a.maroc === 'apres1970') strengths.push(a.maroc === 'reste' ? 'Ascendant toujours au Maroc' : 'Départ du Maroc après 1970 : actes et CIN plus faciles à retrouver');
    else if (a.maroc === 'avant1956') warnings.push('Départ avant 1956 : actes plus anciens, parfois plus difficiles à retrouver');
    else if (a.maroc === 'ailleurs') warnings.push('Ascendant né hors du Maroc : sa propre filiation marocaine est à établir');
  }
  if (a.vivant) {
    add('Ascendant en vie', OUI_NON[a.vivant], a.vivant === 'oui' ? VIVANT : 0, VIVANT);
    if (a.vivant === 'oui') strengths.push('Ascendant en vie : il peut demander lui-même ses actes ou sa CIN');
  }
  if (a.noms) {
    add('Orthographe des noms', NOMS_TXT[a.noms], NOMS[a.noms], NOMS.oui);
    if (a.noms === 'non') { warnings.push('Orthographes différentes selon les documents'); todo.push('Prévoir les attestations ou rectifications d’orthographe'); }
  }
  if (a.maries && (p === 'pere' || p === 'gp_pere')) {
    add('Parents mariés à la naissance (lignée paternelle)', OUI_NON[a.maries], MARIES[a.maries], MARIES.oui);
    if (a.maries === 'non') warnings.push('Parents non mariés à la naissance : filiation paternelle à examiner en priorité');
    else if (a.maries === 'nsp') warnings.push('Mariage des parents à vérifier (lignée paternelle)');
  }

  // Parents non maries en lignee paternelle : filiation paternelle a examiner, le dossier ne peut pas depasser C
  const capPaternel = a.maries === 'non' && (p === 'pere' || p === 'gp_pere') ? NON_MARIES_PLAFOND : 100;
  const score = Math.max(0, Math.min(100, capPaternel, Math.round(s)));
  const [, grade, label, color] = GRADES.find(([min]) => score >= min);
  if (!todo.length) todo.push(grade === 'A' ? 'Proposer rapidement l’analyse d’éligibilité (précontrat)' : 'Premier échange : faire l’inventaire des pièces');
  else if (grade === 'A') todo.unshift('Proposer rapidement l’analyse d’éligibilité (précontrat)');
  const total = details.reduce((t, d) => t + d[2], 0);
  let totalNote = '';
  if (capPaternel < 100 && total > capPaternel) totalNote = `${total} points, plafonnés à ${capPaternel} : parents non mariés en lignée paternelle`;
  else if (total > 100) totalNote = `${total} points, plafonnés à 100`;
  else if (total < 0) totalNote = `${total} points, ramenés à 0`;
  return { score, grade, label, color, strengths, warnings, todo, context, details, totalNote };
}
