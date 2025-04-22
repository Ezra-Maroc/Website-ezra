document.addEventListener('DOMContentLoaded', () => {
    const faqContainer = document.querySelector('.faq-container');

    if (!faqContainer) {
        console.warn("Conteneur '.faq-container' non trouvé pour l'accordéon FAQ.");
        return;
    }

    // --- Gestionnaire d'événements pour les clics (Délégation) ---
    faqContainer.addEventListener('click', (event) => {
        const questionButton = event.target.closest('.faq-question');
        if (!questionButton) return; // Ignorer si ce n'est pas un bouton de question

        const faqItem = questionButton.closest('.faq-item');
        if (!faqItem) return;

        const answerDiv = faqItem.querySelector('.faq-answer');
        const icon = questionButton.querySelector('.faq-icon');

        if (!answerDiv || !icon) {
            console.warn('Structure HTML invalide pour l\'item FAQ:', faqItem);
            return;
        }

        const isExpanded = questionButton.getAttribute('aria-expanded') === 'true';

        // --- Ouvrir / Fermer l'accordéon cliqué ---
        questionButton.setAttribute('aria-expanded', !isExpanded);
        answerDiv.classList.toggle('is-open', !isExpanded);
        icon.classList.toggle('fa-chevron-down', isExpanded);
        icon.classList.toggle('fa-chevron-up', !isExpanded);

        // Note: La partie pour fermer les autres est volontairement omise ici.
        // Note: La partie pour le scroll doux automatique est volontairement omise ici.
    });

    // --- Gestion du Deep Linking (Ouvrir via ancre # dans l'URL) ---
    const activateAccordionFromHash = () => {
        const hash = window.location.hash;
        if (hash) {
            try {
                // On cible directement le bouton dont l'attribut 'aria-controls' correspond au hash (sans le '#')
                const targetButton = document.querySelector(`.faq-question[aria-controls="${hash.substring(1)}"]`);

                if (targetButton) {
                    const faqItem = targetButton.closest('.faq-item');
                    if (!faqItem) return;

                    const targetAnswer = faqItem.querySelector('.faq-answer'); // Cibler via l'item parent
                    const icon = targetButton.querySelector('.faq-icon');

                    if (targetAnswer && icon && targetButton.getAttribute('aria-expanded') === 'false') {
                         // Ouvre seulement s'il est fermé
                        targetButton.setAttribute('aria-expanded', 'true');
                        targetAnswer.classList.add('is-open');
                        icon.classList.remove('fa-chevron-down');
                        icon.classList.add('fa-chevron-up');

                        // Scroll immédiat vers le haut de l'item pour le voir entièrement
                        // 'block: start' amène le haut de l'item au haut du viewport
                        setTimeout(() => {
                           const headerOffset = 80; // Hauteur approximative du header fixe + marge
                           const elementPosition = faqItem.getBoundingClientRect().top;
                           const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

                            window.scrollTo({
                                top: offsetPosition,
                                behavior: 'smooth' // Ou 'auto' pour un saut direct
                            });
                         }, 100); // Petit délai pour s'assurer que l'élément est prêt
                    }
                }
            } catch (e) {
                console.error("Erreur lors de la recherche ou activation de l'ancre FAQ:", e);
            }
        }
    };

    // Appeler la fonction de deep linking au chargement initial
    activateAccordionFromHash();

    // (Optionnel mais recommandé) Écouter les changements de hash si l'utilisateur navigue sur la page elle-même
    // window.addEventListener('hashchange', activateAccordionFromHash);

}); // Fin DOMContentLoaded