// js/faq-accordion.js
// Script ROBUSTE avec délégation, deep linking, basé sur les attributs ARIA.

document.addEventListener('DOMContentLoaded', () => {
    const accordionContainers = document.querySelectorAll('.faq-container');

    if (accordionContainers.length === 0) {
        // console.info("Aucun conteneur '.faq-container' trouvé.");
        return;
    }

    accordionContainers.forEach(faqContainer => {
        // --- Gestionnaire d'événements délégué pour les clics ---
        faqContainer.addEventListener('click', (event) => {
            const questionButton = event.target.closest('.faq-question');
            if (!questionButton) return; // Pas un bouton de question

            const controlledId = questionButton.getAttribute('aria-controls');
            const icon = questionButton.querySelector('.faq-icon'); // Icône chevron

            if (!controlledId || !icon) {
                console.warn('Bouton FAQ invalide (manque aria-controls ou .faq-icon):', questionButton);
                return;
            }

            const answerDiv = document.getElementById(controlledId);
            if (!answerDiv) {
                console.warn(`Réponse FAQ non trouvée pour l'ID "${controlledId}"`);
                return;
            }

            const isExpanded = questionButton.getAttribute('aria-expanded') === 'true';

            // --- Basculer l'état de l'accordéon cliqué ---
            questionButton.setAttribute('aria-expanded', !isExpanded);
            answerDiv.setAttribute('aria-hidden', isExpanded); // Basculer aria-hidden (le CSS réagit à ça)

            // --- Mettre à jour l'icône chevron ---
            icon.classList.toggle('fa-chevron-down', isExpanded); // Si était ouvert (isExpanded=true), mettre flèche bas
            icon.classList.toggle('fa-chevron-up', !isExpanded);  // Si devient ouvert (!isExpanded=true), mettre flèche haut

            /*
             * OPTIONNEL: Fermer les autres (copié de la version précédente)
             * Si vous voulez qu'un seul accordéon soit ouvert à la fois par section.
             */
            /*
            if (!isExpanded) { // Si on vient d'ouvrir celui-ci
                const currentFaqSection = questionButton.closest('.faq-section'); // Trouver la section parente
                if(currentFaqSection){
                    const allButtonsInSection = currentFaqSection.querySelectorAll('.faq-question');
                    allButtonsInSection.forEach(otherButton => {
                        if (otherButton !== questionButton) {
                            const otherControlledId = otherButton.getAttribute('aria-controls');
                            const otherIcon = otherButton.querySelector('.faq-icon');
                            if (otherControlledId && otherIcon) {
                                const otherAnswer = document.getElementById(otherControlledId);
                                if (otherAnswer && otherButton.getAttribute('aria-expanded') === 'true') { // Si l'autre est ouvert
                                    otherButton.setAttribute('aria-expanded', 'false');
                                    otherAnswer.setAttribute('aria-hidden', 'true');
                                    otherIcon.classList.remove('fa-chevron-up');
                                    otherIcon.classList.add('fa-chevron-down');
                                }
                            }
                        }
                    });
                }
            }
            */

        });
    });

    // --- Gestion du Deep Linking (Ouvrir via ancre # dans l'URL) ---
    const activateAccordionFromHash = () => {
        const hash = window.location.hash;
        if (!hash || hash.length <= 1) return; // Pas de hash ou juste '#'

        try {
            const targetId = hash.substring(1); // Retire le '#'
            // Cibler le bouton qui contrôle la réponse avec cet ID
            const targetButton = document.querySelector(`.faq-question[aria-controls="${targetId}"]`);

            if (targetButton) {
                const faqItem = targetButton.closest('.faq-item'); // Élément parent pour le scroll
                if (!faqItem) {
                    console.warn(`Élément parent .faq-item non trouvé pour le bouton avec aria-controls="${targetId}"`);
                    return;
                }

                // Simuler le clic SEULEMENT si l'accordéon est actuellement fermé
                if (targetButton.getAttribute('aria-expanded') === 'false') {
                     // Déclencher le même code que le gestionnaire de clic pour assurer la cohérence
                    const controlledId = targetButton.getAttribute('aria-controls');
                    const icon = targetButton.querySelector('.faq-icon');
                    const answerDiv = document.getElementById(controlledId);

                    if(answerDiv && icon){
                        targetButton.setAttribute('aria-expanded', 'true');
                        answerDiv.setAttribute('aria-hidden', 'false');
                        icon.classList.remove('fa-chevron-down');
                        icon.classList.add('fa-chevron-up');

                        // Fermer les autres si l'option est activée
                         /* Coller ici la logique optionnelle de fermeture des autres si besoin */
                    }
                }

                // Scroll vers l'élément après un délai (pour l'animation)
                setTimeout(() => {
                    const header = document.querySelector('.site-header'); // Header supposé fixe
                    const headerOffset = header ? header.offsetHeight + 20 : 100; // Hauteur header + marge
                    const elementPosition = faqItem.getBoundingClientRect().top;
                    const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

                    window.scrollTo({
                        top: offsetPosition,
                        behavior: 'smooth'
                    });
                }, 400); // Délai légèrement augmenté car animation CSS peut prendre 0.5s ou plus

            } else {
                // console.warn(`Aucun bouton d'accordéon trouvé pour l'ID de réponse: ${targetId}`);
            }
        } catch (e) {
            console.error("Erreur lors de l'activation de l'ancre FAQ:", e);
        }
    };

    // Activer au chargement
    activateAccordionFromHash();

    // Activer si l'ancre change (navigation interne ou bouton retour/précédent)
    window.addEventListener('hashchange', activateAccordionFromHash, false);

    // console.info('Accordéon FAQ initialisé avec deep linking.');

}); // Fin DOMContentLoaded