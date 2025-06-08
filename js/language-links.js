// --- language-links.js (unifié, commun à TOUTES les langues) ----------------------------------
// Génère dynamiquement les URLs du sélecteur de langue en partant toujours du
// fichier racine FR. Utilise un objet de correspondance avec :
//   - les noms spécifiques par langue  (es, en, he, ara, …)
//   - l'attribut facultatif "default"  (utilisé quand la langue cible n'a pas
//     d'entrée explicite : typiquement en/he/ara partagent le même nom EN)
// ------------------------------------------------------------------------------------------------

/*
 * Structure du mapping :
 *   'nom-fr.html': {
 *        es     : 'nom-es.html',   // obligatoire si différent
 *        default: 'nom-en.html'    // facultatif. Servira pour en/he/ara, etc.
 *   }
 * Si l'attribut n'existe pas pour une langue donnée ET pas de "default",
 * on considère que le fichier porte le même nom que la version française.
 */
const pageMappings = {
  // --------- Pages principales ---------
  'index.html'                : { es: 'inicio.html',        default: 'index.html' },
  'avantages.html'            : { es: 'ventajas.html',      default: 'advantages.html' },
  'services.html'             : { es: 'servicios.html',     default: 'services.html' },
  'processus.html'            : { es: 'proceso.html',       default: 'process.html' },
  'temoignages.html'          : { es: 'testimonios.html',   default: 'testimonials.html' },
  'a-propos.html'             : { es: 'sobre-nosotros.html',default: 'about.html' },
  'contact.html'              : { es: 'contacto.html',      default: 'contact.html' },
  'faq.html'                  : { es: 'faq.html',           default: 'faq.html' },
  // --------- Pages légales ---------
  'mentions-legales.html'     : { es: 'aviso-legal.html',   default: 'legal-notice.html' },
  'politique-confidentialite.html': { es: 'politica-privacidad.html', default: 'privacy-policy.html' },
  'conditions-utilisation.html':   { es: 'condiciones-uso.html',      default: 'terms-of-use.html' },
  'politique-cookies.html'    : { es: 'politica-cookies.html', default: 'cookies-policy.html' }
};

const SUPPORTED_LANGS = ['fr', 'en', 'es', 'he', 'ara'];

// ----------------------------------------------------------------------------------------------
// HELPER : renvoie le nom de fichier pour une page FR donnée dans la langue cible
// ----------------------------------------------------------------------------------------------
function getTargetFilename(baseFR, targetLang) {
  // même page en FR
  if (targetLang === 'fr') return baseFR;

  const map = pageMappings[baseFR];
  if (!map) return baseFR;                 // pas de mapping → même nom partout

  if (map[targetLang]) return map[targetLang];
  if (map.default)      return map.default;

  return baseFR;                           // fallback ultime
}

// ----------------------------------------------------------------------------------------------
// HELPER : détermine, à partir de l'URL courante, quel est le fichier FR d'origine
// ----------------------------------------------------------------------------------------------
function detectBaseFR(pathname) {
  const parts = pathname.split('/').filter(Boolean); // enlève ""

  // Racine exacte → index.html
  if (parts.length === 0) return { lang: 'fr', file: 'index.html' };

  const first = parts[0];
  let lang   = SUPPORTED_LANGS.includes(first) ? first : 'fr';
  let file   = parts.pop() || 'index.html';

  // Cas particulier : page d'accueil ES = inicio.html
  if (lang === 'es' && file === 'inicio.html') file = 'index.html';

  // Si on est déjà en FR → retour immédiat
  if (lang === 'fr') return { lang, file };

  // Sinon, retrouver le nom FR de référence via le mapping.
  for (const frName in pageMappings) {
    const map = pageMappings[frName];
    if (map[lang] === file || map.default === file) {
      return { lang, file: frName };
    }
  }

  // Fallback : considérons que c'est le même nom.
  return { lang, file };
}

// ----------------------------------------------------------------------------------------------
// MAIN : met à jour les valeurs du sélecteur de langue
// ----------------------------------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
  const select = document.getElementById('lang-select');
  if (!select) {
    console.warn('[language-links] #lang-select introuvable');
    return;
  }

  const { lang: currentLang, file: baseFR } = detectBaseFR(window.location.pathname);

  Array.from(select.options).forEach(opt => {
    const targetLang = opt.getAttribute('lang');
    if (!targetLang) return;

    const targetFile   = getTargetFilename(baseFR, targetLang);
    let   relativePath;

    // Construction du chemin relatif
    if (currentLang === 'fr') {
      // On est à la racine
      relativePath = targetLang === 'fr' ? targetFile : `${targetLang}/${targetFile}`;
    } else {
      // On est déjà dans /en/ /es/ /he/ /ara/
      relativePath = targetLang === 'fr' ? `../${targetFile}` : (targetLang === currentLang ? targetFile : `../${targetLang}/${targetFile}`);
    }

    opt.value    = relativePath;
    opt.selected = targetLang === currentLang;
  });
});

// --- END OF FILE language-links.js ------------------------------------------------------------
