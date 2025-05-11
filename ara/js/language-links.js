// --- START OF FILE language-links.js ---

document.addEventListener('DOMContentLoaded', () => {
    const languageSelect = document.getElementById('lang-select');
    if (!languageSelect) {
        console.warn('Sélecteur #lang-select non trouvé.');
        return;
    }

    // --- Mappage des noms de fichier (FRANÇAIS RACINE -> AUTRES LANGUES AVEC NOM DIFFÉRENT) ---
    // Clé: nom de fichier français à la racine
    // Valeur: objet avec les noms de fichiers spécifiques par langue
    const pageMappings = {
        // Nom FR (racine) : { es: nom_es, en: nom_en (si différent), ... }
        'index.html'                 : { es: 'inicio.html' },
        'avantages.html'             : { es: 'ventajas.html' },
        'services.html'              : { es: 'servicios.html' },
        'processus.html'             : { es: 'proceso.html' }, // Nom FR racine -> ES
        'temoignages.html'           : { es: 'testimonios.html' },// Nom FR racine -> ES
        'a-propos.html'              : { es: 'sobre-nosotros.html' },// Nom FR racine -> ES
        'contact.html'               : { es: 'contacto.html' },
        'faq.html'                   : { es: 'faq.html' }, // ES a le même nom
        // PAGES LÉGALES - Noms FR à la racine -> Noms ES
        'mentions-legales.html'      : { es: 'aviso-legal.html' },
        'politique-confidentialite.html': { es: 'politica-privacidad.html' },
        'conditions-utilisation.html': { es: 'condiciones-uso.html' },
        'politique-cookies.html'     : { es: 'politica-cookies.html' }
        // Pour EN, HE, ARA, si les noms sont identiques au FR, pas besoin de les lister ici.
        // Si par exemple about.html en EN s'appelait about-us.html:
        // 'a-propos.html'            : { es: 'sobre-nosotros.html', en: 'about-us.html' },
    };

    // --- Obtenir information de la page actuelle ---
    const currentPathname = window.location.pathname;
    let currentLang = 'fr'; // Par défaut (racine)
    let currentRawFilename = ''; // Nom de fichier tel quel dans l'URL
    const pathParts = currentPathname.split('/').filter(part => part !== '');

    if (pathParts.length === 0) { // Raíz exacta "/"
        currentRawFilename = 'index.html';
        currentLang = 'fr';
    } else if (['en', 'es', 'he', 'ara'].includes(pathParts[0])) {
        currentLang = pathParts[0];
        currentRawFilename = pathParts[pathParts.length - 1] || (currentLang === 'es' ? 'inicio.html' : 'index.html');
    } else { // Racine, mais avec un nom de fichier (ex: /contact.html)
        currentLang = 'fr';
        currentRawFilename = pathParts[pathParts.length - 1] || 'index.html';
    }

    // --- Déterminer le nom de fichier "base" (FRANÇAIS RACINE) ---
    let baseFilenameFR = currentRawFilename;
    if (currentLang !== 'fr') {
        // Essayer de trouver le nom FR à partir du nom actuel et de la langue actuelle
        let found = false;
        for (const frName in pageMappings) {
            if (pageMappings[frName][currentLang] === currentRawFilename) {
                baseFilenameFR = frName;
                found = true;
                break;
            }
        }
        if (!found) { // Si pas dans les mappings, on assume que le nom est le même que le FR
            baseFilenameFR = currentRawFilename;
        }
    }
    // Cas spécial pour la page d'accueil si on est sur inicio.html
    if (currentRawFilename === 'inicio.html' && currentLang === 'es') {
        baseFilenameFR = 'index.html';
    }


    // --- Actualiser les 'value' de chaque option ---
    const options = languageSelect.options;

    for (let i = 0; i < options.length; i++) {
        const option = options[i];
        const targetLang = option.getAttribute('lang');
        if (!targetLang) continue;

        let targetFilename = baseFilenameFR; // Par défaut, le nom FR
        if (pageMappings[baseFilenameFR] && pageMappings[baseFilenameFR][targetLang]) {
            targetFilename = pageMappings[baseFilenameFR][targetLang]; // Utiliser le nom mappé si disponible
        }
        // Si targetLang est 'es' et baseFilenameFR est 'index.html', s'assurer que targetFilename est 'inicio.html'
        if (targetLang === 'es' && baseFilenameFR === 'index.html') {
            targetFilename = pageMappings['index.html']?.es || 'inicio.html';
        }


        let relativePath = '';

        if (currentLang === 'fr') { // Depuis la racine (FR)
            if (targetLang === 'fr') {
                relativePath = targetFilename;
            } else {
                relativePath = `${targetLang}/${targetFilename}`;
            }
        } else { // Depuis un sous-dossier de langue (/en/, /es/, /he/, /ara/)
            if (targetLang === 'fr') {
                relativePath = `../${targetFilename}`; // Vers la racine (FR)
            } else {
                relativePath = `../${targetLang}/${targetFilename}`; // Vers un autre dossier langue
            }
        }
        option.value = relativePath;

        if (targetLang === currentLang) {
            option.selected = true;
        } else {
            option.selected = false;
        }
    }
});
// --- FIN DU ARCHIVO language-links.js ---