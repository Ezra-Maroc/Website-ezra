// Validation serveur des reponses du questionnaire approfondi + recapitulatif pour l'equipe.
// Le modele est le MEME fichier que celui de la page (src/data/intake/fr.json, integre au paquet de la
// fonction a la compilation) : une seule source de verite pour les questions, options et conditions.
// Rien de ce qu'envoie le navigateur n'est repris tel quel : identifiants verifies, textes bornes et
// nettoyes, questions masquees ignorees, recapitulatif reconstruit ici a partir des seules valeurs valides.

import FR from '../../../../src/data/intake/fr.json';

const QUESTIONS = FR.questions;
const LISTS = FR.optionLists;
const BY_ID = new Map(QUESTIONS.map((q) => [q.id, q]));
const OTHER = '__other__';

const MAX_LEN = { text: 150, paragraph: 3000, email: 254, tel: 40, other: 120 };
const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:"]{2,}$/;
const TEL_RE = /^[+()\-\s.0-9]{6,40}$/;
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

function optionsOf(q) {
  return q.optionsRef ? LISTS[q.optionsRef] : (q.options || []);
}

const ALLOWED = new Map(QUESTIONS.filter((q) => ['single', 'select', 'multi'].includes(q.type))
  .map((q) => [q.id, new Set(optionsOf(q).map((o) => o.id))]));

// Nettoyage d'un texte : caracteres de controle retires, espaces normalises, longueur bornee
function cleanText(value, max, multiline) {
  if (typeof value !== 'string') return null;
  let s = value.slice(0, max * 2 + 50).replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000B-\u001F\u007F‪-‮⁦-⁩]/g, '');
  s = multiline ? s.split('\n').map((l) => l.trimEnd()).join('\n').replace(/\n{3,}/g, '\n\n').trim() : s.replace(/\s+/g, ' ').trim();
  if (s.length > max) return null; // trop long : refuse (le formulaire limite deja la saisie)
  return s;
}

function validDate(value, todayIso) {
  const m = typeof value === 'string' ? DATE_RE.exec(value) : null;
  if (!m) return null;
  const [y, mo, d] = [+m[1], +m[2], +m[3]];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null;
  if (value < '1900-01-01' || value > todayIso) return null;
  return value;
}

// Visibilite d'une question selon les reponses DEJA validees (meme regle que la page)
function visible(q, clean) {
  if (!q.showIf) return true;
  const v = clean[q.showIf.q];
  if (v === undefined || v === null) return false;
  const vals = Array.isArray(v) ? v : (v && Array.isArray(v.sel) ? v.sel : [v]);
  return q.showIf.in.some((x) => vals.includes(x));
}

/**
 * @param raw   objet { idQuestion: valeur } recu du navigateur
 * @param today date du jour AAAA-MM-JJ (UTC)
 * @returns { clean, errors } : errors = identifiants des questions en defaut ('format' si structure invalide)
 */
export function validateAnswers(raw, today) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { clean: {}, errors: ['format'] };
  const keys = Object.keys(raw);
  if (keys.length > QUESTIONS.length) return { clean: {}, errors: ['format'] };
  for (const k of keys) if (!BY_ID.has(k)) return { clean: {}, errors: ['format'] };

  const clean = {};
  const errors = [];
  // Ordre du questionnaire : une question conditionnelle est jugee sur les reponses valides precedentes
  for (const q of QUESTIONS) {
    if (!visible(q, clean)) continue;
    const v = raw[q.id];
    const missing = v === undefined || v === null || v === '' ||
      (q.type === 'multi' && (!v || !Array.isArray(v.sel) || v.sel.length === 0));
    if (missing) {
      if (q.required) errors.push(q.id);
      continue;
    }
    let ok = null;
    switch (q.type) {
      case 'text': ok = cleanText(v, MAX_LEN.text, false); break;
      case 'paragraph': ok = cleanText(v, MAX_LEN.paragraph, true); break;
      case 'email': { const s = cleanText(v, MAX_LEN.email, false); ok = s && EMAIL_RE.test(s) ? s : null; break; }
      case 'tel': {
        const s = cleanText(v, MAX_LEN.tel, false);
        ok = s && TEL_RE.test(s) && (s.match(/\d/g) || []).length >= 6 ? s : null;
        break;
      }
      case 'date': ok = validDate(v, today); break;
      case 'single':
      case 'select': ok = typeof v === 'string' && ALLOWED.get(q.id).has(v) ? v : null; break;
      case 'multi': {
        if (!v || typeof v !== 'object' || !Array.isArray(v.sel)) break;
        const allowed = ALLOWED.get(q.id);
        const sel = [...new Set(v.sel)];
        if (sel.length > allowed.size + 1 || sel.some((x) => typeof x !== 'string' || !(allowed.has(x) || (q.other && x === OTHER)))) break;
        let other = '';
        if (sel.includes(OTHER)) {
          other = cleanText(v.other ?? '', MAX_LEN.other, false);
          if (!other) break;
        }
        ok = { sel, other };
        break;
      }
      default: break;
    }
    if (ok === '') { // que des espaces : equivaut a une absence de reponse
      if (q.required) errors.push(q.id);
      continue;
    }
    if (ok === null) { // valeur presente mais invalide (format, option inconnue, trop longue)
      errors.push(q.id);
      continue;
    }
    clean[q.id] = ok;
  }
  // Sans consentement explicite au contact et a l'evaluation, la demande n'est pas recevable
  if (clean.consent_contact !== 'oui' && !errors.includes('consent_contact')) errors.push('consent_contact');
  return { clean, errors };
}

function optionText(q, id) {
  const o = optionsOf(q).find((x) => x.id === id);
  return o ? o.text : id;
}

export function valueText(q, v) {
  if (v === undefined || v === null || v === '') return '';
  if (q.type === 'multi') {
    const parts = v.sel.filter((x) => x !== OTHER).map((x) => optionText(q, x));
    if (v.sel.includes(OTHER) && v.other) parts.push(`Autre : ${v.other}`);
    return parts.join(', ');
  }
  if (q.type === 'single' || q.type === 'select') return optionText(q, v);
  if (q.type === 'date') { const [y, m, d] = v.split('-'); return `${d}/${m}/${y}`; }
  return String(v);
}

// Recapitulatif par section, libelles francais : [{ section, lines: [[libelle, valeur], ...] }]
export function buildRecap(clean) {
  return FR.sections.map((sec) => ({
    section: `${sec.num}. ${sec.title}`,
    lines: QUESTIONS.filter((q) => q.section === sec.id && clean[q.id] !== undefined)
      .map((q) => [q.label, valueText(q, clean[q.id])]),
  })).filter((b) => b.lines.length);
}

// Points cles de la filiation, en tete de l'e-mail pour le tri
export function keyPoints(clean) {
  const pick = (id) => (clean[id] !== undefined ? valueText(BY_ID.get(id), clean[id]) : '');
  return [
    ['Ascendant(s) marocain(s)', pick('ascendants_marocains')],
    ['Lien de parenté', pick('lien_parente')],
    ['Documents de l\'ascendant', pick('documents_anciens')],
    ['Types de documents', pick('type_documents')],
    ['Pays de résidence', pick('pays_residence')],
    ['Nationalité(s)', pick('nationalites')],
  ].filter(([, v]) => v);
}

export function displayName(clean) {
  const nom = (clean.nom || '').toUpperCase();
  const prenom = clean.prenom || '';
  return `${nom} ${prenom}`.trim() || 'Prospect';
}
