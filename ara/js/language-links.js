// --- START OF FILE language-links.js (Version Recodée) ---

document.addEventListener('DOMContentLoaded', () => {
    const languageSelect = document.getElementById('lang-select');
    if (!languageSelect) {
        // console.warn('Le sélecteur de langue #lang-select n\'a pas été trouvé sur cette page.');
        return;
    }

    /**
     * Configuration des langues et de leurs spécificités.
     * - defaultFilename: Nom de fichier par défaut pour la page d'accueil de cette langue.
     * - pathPrefix: Préfixe du chemin (ex: 'en/'). Laisser vide pour la langue racine (français).
     * - pageNameOverrides: Mappage des noms de fichiers "base" (français) vers les noms de cette langue.
     */
    const langConfig = {
        'fr': {
            defaultFilename: 'index.html',
            pathPrefix: '', // Français est à la racine
            pageNameOverrides: {} // Pas de changement de nom pour le français par rapport à lui-même
        },
        'en': {
            defaultFilename: 'index.html',
            pathPrefix: 'en/',
            pageNameOverrides: {} // Supposons que les noms EN sont les mêmes que FR
        },
        'es': {
            defaultFilename: 'inicio.html', // Page d'accueil spécifique pour l'espagnol
            pathPrefix: 'es/',
            pageNameOverrides: {
                'index.html'                 : 'inicio.html',
                'avantages.html'             : 'ventajas.html',
                'services.html'              : 'servicios.html',
                'processus.html'             : 'proceso.html',
                'temoignages.html'           : 'testimonios.html',
                'a-propos.html'              : 'sobre-nosotros.html',
                'contact.html'               : 'contacto.html',
                'faq.html'                   : 'faq.html',
                'mentions-legales.html'      : 'aviso-legal.html',
                'politique-confidentialite.html': 'politica-privacidad.html',
                'conditions-utilisation.html': 'condiciones-uso.html',
                'politique-cookies.html'     : 'politica-cookies.html'
            }
        },
        'he': {
            defaultFilename: 'index.html',
            pathPrefix: 'he/',
            pageNameOverrides: {} // Supposons que les noms HE sont les mêmes que FR
        },
        'ara': {
            defaultFilename: 'index.html',
            pathPrefix: 'ara/',
            pageNameOverrides: {} // Supposons que les noms ARA sont les mêmes que FR
        }
    };

    // 1. Déterminer la langue et le nom de fichier "base" (français) de la page actuelle.
    const getCurrentPageInfo = () => {
        const pathname = window.location.pathname;
        const pathSegments = pathname.split('/').filter(segment => segment !== ''); // Retire les segments vides

        let currentLang = 'fr';
        let rawFilename = langConfig.fr.defaultFilename;

        if (pathSegments.length > 0) {
            const firstSegment = pathSegments[0];
            if (langConfig[firstSegment]) { // C'est un code de langue connu
                currentLang = firstSegment;
                rawFilename = pathSegments[pathSegments.length - 1] || langConfig[currentLang].defaultFilename;
            } else { // Pas un code de langue, donc on est en français (racine) et le segment est un nom de fichier
                currentLang = 'fr';
                rawFilename = pathSegments[pathSegments.length - 1] || langConfig.fr.defaultFilename;
            }
        }
        // Si on est à la racine exacte (ex: https://domaine.com/), pathSegments sera vide
        // et rawFilename sera 'index.html' et currentLang 'fr' par défaut.

        // Convertir rawFilename en nom de fichier "base" (français)
        let baseFilenameFR = rawFilename;
        if (currentLang !== 'fr') {
            // Chercher si rawFilename est une valeur dans les overrides de la langue actuelle
            const overrides = langConfig[currentLang].pageNameOverrides;
            for (const frName in overrides) {
                if (overrides[frName] === rawFilename) {
                    baseFilenameFR = frName;
                    break;
                }
            }
            // Si non trouvé dans les overrides, on suppose que rawFilename est déjà le nom de base FR
        }
        // Gérer le cas où la page d'accueil d'une langue a un nom spécifique (ex: inicio.html pour es)
        // mais que son équivalent "base FR" est index.html
        if (rawFilename === langConfig[currentLang]?.defaultFilename && langConfig[currentLang]?.defaultFilename !== langConfig.fr.defaultFilename) {
             if (currentLang === 'es' && rawFilename === 'inicio.html') baseFilenameFR = 'index.html';
             // Ajouter d'autres cas si nécessaire pour d'autres langues
        }


        return { currentLang, baseFilenameFR };
    };

    const { currentLang, baseFilenameFR } = getCurrentPageInfo();
    // console.log(`Langue Actuelle: ${currentLang}, Fichier Base FR: ${baseFilenameFR}`);

    // 2. Mettre à jour les attributs 'value' de chaque option du sélecteur.
    Array.from(languageSelect.options).forEach(option => {
        const targetLang = option.getAttribute('lang');
        if (!targetLang || !langConfig[targetLang]) {
            // console.warn(`Attribut lang manquant ou langue cible non configurée pour l'option : ${option.textContent}`);
            return;
        }

        // Déterminer le nom de fichier pour la langue cible
        let targetFilename = langConfig[targetLang].pageNameOverrides[baseFilenameFR] || baseFilenameFR;
        
        // Cas spécifique pour la page d'accueil de la langue cible
        if (baseFilenameFR === langConfig.fr.defaultFilename) {
            targetFilename = langConfig[targetLang].defaultFilename;
        }

        let newPathValue = '';

        if (currentLang === 'fr') {
            // Depuis la racine (FR)
            if (targetLang === 'fr') {
                newPathValue = targetFilename; // Reste à la racine
            } else {
                newPathValue = `${langConfig[targetLang].pathPrefix}${targetFilename}`; // Va vers un dossier langue
            }
        } else {
            // Depuis un dossier de langue (ex: /ara/)
            if (targetLang === 'fr') {
                newPathValue = `../${targetFilename}`; // Remonte et va à la racine (FR)
            } else {
                newPathValue = `../${langConfig[targetLang].pathPrefix}${targetFilename}`; // Remonte et va vers un autre dossier langue
            }
        }

        option.value = newPathValue;

        // Mettre à jour l'état 'selected'
        option.selected = (targetLang === currentLang);
    });

    // console.log('Liens du sélecteur de langue mis à jour.');
});

// --- FIN DU FICHIER language-links.js (Version Recodée) ---