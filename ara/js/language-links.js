// --- START OF FILE language-links.js ---

document.addEventListener('DOMContentLoaded', () => {
    const languageSelect = document.getElementById('lang-select');
    if (!languageSelect) {
        return;
    }

    // Mapeo de nombres de archivo (Base EN/FR -> ES)
    const pageMappings = {
        'index.html': 'inicio.html',
        'advantages.html': 'ventajas.html',
        'services.html': 'servicios.html',
        'process.html': 'proceso.html', // Nom FR peut être différent (processus.html) - S'assurer que la base est cohérente
        'testimonials.html': 'testimonios.html', // Nom FR peut être différent (temoignages.html)
        'about.html': 'sobre-nosotros.html', // Nom FR peut être différent (a-propos.html)
        'contact.html': 'contacto.html',
        'faq.html': 'faq.html',
        'legal-notice.html': 'aviso-legal.html',
        'privacy-policy.html': 'politica-privacidad.html'
        // Assurez-vous que les noms de fichiers "base" correspondent bien aux noms dans EN et FR (racine)
        // Si les noms FR sont différents, il faudra peut-être une logique plus complexe
        // ou standardiser les noms de fichiers FR pour correspondre à EN.
        // Pour l'instant, on suppose que EN/FR (racine) utilisent les mêmes noms listés ici comme clés.
        // Exemple: Si FR utilise a-propos.html, il faut ajuster ici ou dans la logique
        // Pour simplifier, assurons-nous que les fichiers FR à la racine correspondent aux clés ici.
    };

    // Mapa inverso ES -> Base EN/FR
    const reversePageMappings = {};
    for (const key in pageMappings) {
        if (Object.hasOwnProperty.call(pageMappings, key)) {
            reversePageMappings[pageMappings[key]] = key;
        }
    }

    // Obtener información de la página actual
    const currentPathname = window.location.pathname;
    let currentLang = 'fr'; // Défaut racine
    let currentFilename = 'index.html'; // Défaut
    const pathParts = currentPathname.split('/').filter(part => part !== '');

    // === CORRECTION 1: Inclure 'ara' dans la détection ===
    if (pathParts.length > 0) {
        // Vérifier si le premier segment est un code langue connu
        if (['en', 'es', 'he', 'ara'].includes(pathParts[0])) { // Ajout de 'ara'
            currentLang = pathParts[0];
            // Le nom du fichier est le dernier segment, ou index.html par défaut pour le dossier langue
            currentFilename = pathParts[pathParts.length - 1] || 'index.html';
             // Gérer le cas où on est sur /es/ et le fichier est inicio.html par défaut
             if (currentLang === 'es' && currentFilename === 'index.html') {
                const potentialSpanishIndex = currentPathname.endsWith('/') ? 'inicio.html' : '';
                // Si l'URL se termine par /es/, le fichier implicite est inicio.html
                if (potentialSpanishIndex) currentFilename = potentialSpanishIndex;
                // Si l'URL est /es/inicio.html, currentFilename est déjà correct.
             }

        } else {
            // Pas dans un dossier langue connu -> on est à la racine (FR)
            currentLang = 'fr';
            currentFilename = pathParts[pathParts.length - 1] || 'index.html';
        }
    } else {
        // Racine exacte "/" -> index.html en FR
        currentLang = 'fr';
        currentFilename = 'index.html';
    }

     // Déterminer le nom de fichier "base" (version EN/FR)
    let baseFilename = currentFilename;
    if (currentLang === 'es') {
        baseFilename = reversePageMappings[currentFilename] || currentFilename;
    }
    // S'assurer que si le nom de fichier courant est spécifique à ES (inicio), le base est index
    if (currentFilename === 'inicio.html' && currentLang === 'es') baseFilename = 'index.html';
     // Si on est dans EN/ARA/HE et le fichier est index.html, le base est index.html
     if (['en', 'ara', 'he'].includes(currentLang) && currentFilename === 'index.html') baseFilename = 'index.html';


    // Mettre à jour les 'value' de chaque option
    const options = languageSelect.options;

    for (let i = 0; i < options.length; i++) {
        const option = options[i];
        const targetLang = option.getAttribute('lang'); // Récupère 'fr', 'en', 'es', 'he', 'ara'
        if (!targetLang) continue;

        let targetFilename = baseFilename;
        // Ajuster le nom de fichier cible si on va vers l'espagnol
        if (targetLang === 'es') {
            targetFilename = pageMappings[baseFilename] || baseFilename;
             // Cas spécial index -> inicio
             if (baseFilename === 'index.html') targetFilename = 'inicio.html';
        } else {
             // S'assurer que si on va vers EN/FR/ARA/HE et que le base est index, le target est index
             if (['en', 'fr', 'ara', 'he'].includes(targetLang) && baseFilename === 'index.html') {
                  targetFilename = 'index.html';
             }
             // Gérer les autres noms FR différents si nécessaire ici, par exemple :
             // if (targetLang === 'fr' && baseFilename === 'about.html') targetFilename = 'a-propos.html';
             // etc. Ou standardiser les noms de fichiers FR.
             // Pour le moment, on suppose que les noms FR (racine) = noms EN/ARA/HE
        }


        let relativePath = '';

        // === CORRECTION 2: Adapter la logique de calcul de chemin ===
        if (['en', 'es', 'he', 'ara'].includes(currentLang)) {
            // --- Cas 1: On est DANS un dossier langue (en, es, he, ara) ---
            if (targetLang === 'fr') {
                // Aller vers la racine (FR) -> ../nom_fichier_base
                relativePath = `../${baseFilename}`; // Utiliser baseFilename ici
                 // Gérer cas spécial index.html pour la racine FR
                 if(baseFilename === 'index.html') relativePath = '../index.html';

            } else if (targetLang === currentLang) {
                // Rester dans la même langue -> nom_fichier_cible (pour cette langue)
                relativePath = targetFilename; // Nom de fichier peut être différent (ex: inicio.html si ES)

            } else {
                // Aller vers un AUTRE dossier langue -> ../lang_cible/nom_fichier_cible
                relativePath = `../${targetLang}/${targetFilename}`;
            }
        } else {
            // --- Cas 2: On est à la racine (currentLang === 'fr') ---
            if (targetLang === 'fr') {
                // Rester à la racine -> nom_fichier_base
                relativePath = baseFilename; // Utiliser baseFilename
            } else {
                // Aller vers un dossier langue -> lang_cible/nom_fichier_cible
                relativePath = `${targetLang}/${targetFilename}`;
            }
        }

        option.value = relativePath;

        // Mettre à jour 'selected' (Déjà fait par le HTML, mais redondance ok)
         if(targetLang === currentLang) {
             option.selected = true;
         } else {
             option.selected = false;
         }

        // // Gérer 'disabled' si besoin (ici on laisse le HTML décider)
        // if (option.disabled) {
        //    // Logique pour éventuellement l'activer s'il existe une page cible
        // }
    }

});
// --- FIN DEL ARCHIVO language-links.js ---