// --- START OF FILE language-links.js ---

document.addEventListener('DOMContentLoaded', () => {
    const languageSelect = document.getElementById('lang-select');
    if (!languageSelect) {
        // console.warn('Elemento select#lang-select no encontrado.');
        return;
    }

    // --- Mapeo de nombres de archivo (EN/FR base -> ES) ---
    // Asegúrate de que estas correspondencias sean EXACTAS y completas
    const pageMappings = {
        // EN/FR Filename : ES Filename
        'index.html': 'inicio.html',
        'advantages.html': 'ventajas.html', // Asume 'avantages.html' en FR raíz
        'services.html': 'servicios.html',
        'process.html': 'proceso.html', // Asume 'processus.html' en FR raíz
        'testimonials.html': 'testimonios.html', // Asume 'temoignages.html' en FR raíz
        'about.html': 'sobre-nosotros.html', // Asume 'a-propos.html' en FR raíz
        'contact.html': 'contacto.html',
        'faq.html': 'faq.html', // Mismo nombre
        'legal-notice.html': 'aviso-legal.html', // Asume este nombre en FR/EN
        'privacy-policy.html': 'politica-privacidad.html' // Asume este nombre en FR/EN
        // Añade aquí cualquier otra página raíz que tenga equivalente
    };

    // --- Crear mapa inverso para encontrar EN/FR desde ES ---
    const reversePageMappings = {};
    for (const key in pageMappings) {
        if (Object.hasOwnProperty.call(pageMappings, key)) {
            reversePageMappings[pageMappings[key]] = key;
        }
    }

    // --- Obtener información de la página actual ---
    const currentPathname = window.location.pathname;
    let currentLang = 'fr'; // Por defecto (raíz)
    let currentFilename = '';
    const pathParts = currentPathname.split('/').filter(part => part !== ''); // Elimina partes vacías

    if (pathParts.length > 0) {
        if (['en', 'es', 'he'].includes(pathParts[0])) {
            currentLang = pathParts[0];
            currentFilename = pathParts[pathParts.length - 1] || 'index.html'; // O 'inicio.html' si ya estás en ES? Mejor usar index.html como defecto universal
        } else {
            // Estamos en raíz (FR)
            currentFilename = pathParts[pathParts.length - 1] || 'index.html';
        }
    } else {
        // Estamos en la raíz exacta "/" -> index.html
        currentFilename = 'index.html';
        currentLang = 'fr'; // Asumimos que la raíz es FR
    }

    // --- Determinar el nombre de archivo "base" (versión EN/FR) ---
    let baseFilename = currentFilename;
    if (currentLang === 'es') {
        baseFilename = reversePageMappings[currentFilename] || currentFilename; // Si no está en el mapa inverso, usa el nombre actual (puede ser error)
    }
     // Asegurarse que si el filename actual es por defecto (tipo index) usemos el base correcto
    if (currentFilename === 'inicio.html' && currentLang === 'es') baseFilename = 'index.html';
    if (currentFilename === 'index.html' && currentLang === 'en') baseFilename = 'index.html';


    // --- Actualizar los 'value' de cada opción ---
    const options = languageSelect.options;

    for (let i = 0; i < options.length; i++) {
        const option = options[i];
        const targetLang = option.getAttribute('lang');
        if (!targetLang) continue;

        let targetFilename = baseFilename;
        if (targetLang === 'es') {
            targetFilename = pageMappings[baseFilename] || baseFilename; // Si no hay mapeo, usa el base (podría ser error o una página sin traducción de nombre)
             // Caso especial: si el base es index, el target ES es inicio
            if (baseFilename === 'index.html') targetFilename = 'inicio.html';
        }
         // Caso especial inverso: si estamos en ES y vamos a EN/FR, usar index si el target ES era inicio
        if ((targetLang === 'en' || targetLang === 'fr') && baseFilename === 'index.html') {
             targetFilename = 'index.html';
        }


        let relativePath = '';

        // Calcular ruta relativa desde la ubicación ACTUAL
        if (currentLang === 'en' || currentLang === 'es' || currentLang === 'he') {
            // Estamos dentro de una carpeta de idioma (/en/, /es/, /he/)
            if (targetLang === 'fr') { // Hacia la raíz (FR)
                relativePath = `../${targetFilename}`;
            } else { // Hacia otra carpeta de idioma (/en/, /es/, /he/)
                relativePath = `../${targetLang}/${targetFilename}`;
            }
        } else {
            // Estamos en la raíz (FR)
            if (targetLang === 'fr') { // Hacia la raíz (misma página)
                relativePath = targetFilename;
            } else { // Hacia una carpeta de idioma (/en/, /es/, /he/)
                relativePath = `${targetLang}/${targetFilename}`;
            }
        }

        option.value = relativePath;

        // Actualizar estado 'selected' y 'disabled' (opcional pero bueno)
         if(targetLang === currentLang) {
             option.selected = true;
         } else {
             option.selected = false;
         }
         // Habilitar opción si antes estaba deshabilitada (excepto si realmente no existe)
         // Para este ejemplo, habilitaremos todas excepto las que tengan 'disabled' en HTML
         // if (option.disabled && pageMappings[baseFilename]) {
         //     option.disabled = false; // Habilita si existe mapeo (simple)
         // }
    }

});

// --- FIN DEL ARCHIVO language-links.js ---