// ===============================================
// ===   JS Formulaire Contact Ezra Maroc      ===
// ===   (Version améliorée avec validation)   ===
// ===============================================

document.addEventListener("DOMContentLoaded", () => {
    // --- Récupération des éléments DOM ---
    const form = document.getElementById("contact-form");
    // Vérification initiale si le formulaire existe
    if (!form) {
        // console.error("Le formulaire avec l'ID 'contact-form' n'a pas été trouvé.");
        return; // Arrêter l'exécution si le formulaire n'est pas là
    }

    const submitButton = form.querySelector("button[type='submit']");
    const loader = submitButton?.querySelector(".btn-loader"); // Utilise optional chaining au cas où
    const buttonText = submitButton?.querySelector(".btn-text"); // Utilise optional chaining
    const formMessage = document.getElementById("form-message"); // Message global succès/erreur

    // Vérification que les éléments du bouton et le message existent
    if (!submitButton || !loader || !buttonText || !formMessage) {
        console.error("Des éléments essentiels (bouton, loader, texte bouton, message global) sont manquants dans le formulaire.");
        return; // Arrêter si des éléments cruciaux manquent
    }

    // --- Fonctions de validation ---
    const validators = {
        required: (value) => value.trim() !== '', // Vérifie si non vide après avoir retiré les espaces
        email: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()), // Format email simple
        checked: (element) => element.checked, // Vérifie si une checkbox est cochée
        // Optionnel : une validation plus poussée pour le téléphone pourrait être ajoutée ici
        // tel: (value) => /^\+?[0-9\s\-()]{7,20}$/.test(value.trim()) // Exemple simple
    };

    // Messages d'erreur standard pour chaque type de validation
    const errorMessages = {
        required: "Ce champ est obligatoire.",
        email: "Veuillez fournir une adresse email valide.",
        checked: "Vous devez accepter cette condition.",
        tel: "Format de téléphone invalide." // Si vous ajoutez la validation téléphone
    };

    /**
     * Affiche ou masque un message d'erreur pour un champ donné et met à jour les styles/ARIA.
     * @param {HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement} field - L'élément de champ à valider.
     * @param {string|null} message - Le message d'erreur à afficher, ou null pour effacer l'erreur.
     */
    const setFieldError = (field, message) => {
        const errorSpan = document.getElementById(`${field.id}-error`); // Trouve le span d'erreur associé
        const isCheckbox = field.type === 'checkbox';
        const groupContainer = isCheckbox ? field.closest('.checkbox-group') : field.closest('.form-group');

        if (message) {
            // Affiche l'erreur
            field.classList.add("error"); // Ajoute la classe CSS d'erreur au champ
            field.setAttribute("aria-invalid", "true"); // Indique l'invalidité pour l'accessibilité
            if (errorSpan) {
                errorSpan.textContent = message; // Affiche le message
                errorSpan.classList.add("visible"); // Rend le span visible (via CSS)
            }
            if (groupContainer && isCheckbox) groupContainer.classList.add("error"); // Met en évidence le groupe pour la checkbox

        } else {
            // Efface l'erreur
            field.classList.remove("error"); // Retire la classe CSS d'erreur
            field.setAttribute("aria-invalid", "false"); // Indique la validité
            if (errorSpan) {
                errorSpan.textContent = ""; // Efface le message
                errorSpan.classList.remove("visible"); // Cache le span
            }
             if (groupContainer && isCheckbox) groupContainer.classList.remove("error");
        }
    };

    /**
     * Valide un champ spécifique basé sur ses attributs (required, type...).
     * @param {HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement} field - Le champ à valider.
     * @returns {boolean} - True si le champ est valide, False sinon.
     */
    const validateField = (field) => {
        let isValid = true;
        let errorMessage = null;
        const value = field.value;
        const isCheckbox = field.type === 'checkbox';

        // 1. Validation "Required"
        if (field.required) {
            if (isCheckbox && !validators.checked(field)) {
                isValid = false;
                errorMessage = errorMessages.checked;
            } else if (!isCheckbox && !validators.required(value)) {
                isValid = false;
                errorMessage = errorMessages.required;
            }
        }

        // 2. Validation "Email" (si le champ est requis ou a une valeur)
        if (isValid && field.type === "email" && value && !validators.email(value)) {
            isValid = false;
            errorMessage = errorMessages.email;
        }

        // 3. Validation "Tel" (optionnelle, si le champ a une valeur)
        // if (isValid && field.type === "tel" && value && !validators.tel(value)) {
        //     isValid = false;
        //     errorMessage = errorMessages.tel;
        // }

        // Applique le résultat de la validation (affiche ou efface l'erreur)
        setFieldError(field, errorMessage);
        return isValid; // Retourne si le champ est valide ou non
    };

    // --- Ajout des écouteurs d'événements pour validation interactive ---

    // Pour les inputs, select, textarea : valider quand l'utilisateur quitte le champ (blur)
    form.querySelectorAll("input:not([type='checkbox']), select, textarea").forEach(field => {
        field.addEventListener("blur", () => validateField(field));

        // Optionnel: Validation pendant la saisie pour email/téléphone pour un feedback plus rapide
        // Cela peut être ajouté ici si désiré, par ex. sur l'événement 'input'
        // field.addEventListener("input", () => { /* logique de validation input */ });
    });

    // Pour la checkbox : valider quand son état change
    const consentCheckbox = form.querySelector('#consent');
    if (consentCheckbox) {
        consentCheckbox.addEventListener('change', () => validateField(consentCheckbox));
    }

    // --- Gestion de la soumission du formulaire ---

    form.addEventListener("submit", async (e) => {
        e.preventDefault(); // Empêcher la soumission HTML classique
        let isFormValid = true;

        // Réinitialiser le message global avant de revalider
        formMessage.className = "form-message"; // Retire 'show', 'success', 'error'
        formMessage.textContent = "";

        // Re-valider TOUS les champs requis avant d'envoyer
        form.querySelectorAll("input[required], select[required], textarea[required]").forEach(field => {
            // Si un seul champ est invalide, tout le formulaire l'est
            if (!validateField(field)) {
                isFormValid = false;
            }
        });

        // Si le formulaire n'est pas valide, arrêter ici
        if (!isFormValid) {
            // Mettre le focus sur le premier champ en erreur pour l'accessibilité et l'UX
            const firstErrorField = form.querySelector(".error");
            if (firstErrorField) {
                firstErrorField.focus({ preventScroll: true }); // Met le focus sans faire défiler brutalement
                // Défilement doux vers le champ en erreur (prend en compte le header fixe)
                const headerOffset = document.querySelector('.site-header')?.offsetHeight || 80; // Hauteur du header ou 80px par défaut
                const elementPosition = firstErrorField.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset - 20; // Ajouter 20px de marge
                window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
            }
            return; // Stopper la fonction submit
        }

        // --- Le formulaire est valide, procéder à l'envoi ---

        submitButton.disabled = true;       // Désactiver le bouton
        loader.classList.add("show");       // Afficher le loader
        buttonText.classList.add("hide");   // Cacher le texte normal

        try {
            // Préparer les données du formulaire pour l'envoi JSON
            const formData = Object.fromEntries(new FormData(form).entries());
            // Assurer que la valeur de la checkbox est cohérente ('accepted' ou 'declined')
            formData.consent = consentCheckbox?.checked ? 'accepted' : 'declined';

            // Envoyer les données au worker
            const response = await fetch(form.action, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json" // Indiquer qu'on préfère une réponse JSON
                },
                body: JSON.stringify(formData)
            });

            // Traiter la réponse du worker
            if (response.ok) {
                // Succès !
                formMessage.textContent = "Votre demande a été envoyée avec succès. Nous reviendrons vers vous rapidement. ✅";
                formMessage.className = "form-message success show"; // Style succès + afficher
                form.reset(); // Vider le formulaire

                // Nettoyer manuellement les états d'erreur restants après reset
                form.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
                form.querySelectorAll('[aria-invalid="true"]').forEach(el => el.setAttribute('aria-invalid', 'false'));
                form.querySelectorAll('.error-message.visible').forEach(el => {
                    el.textContent = '';
                    el.classList.remove('visible');
                });

                // Optionnel : Redirection ou autre action après succès
                // setTimeout(() => { window.location.href = '/merci'; }, 2000);

            } else {
                // Erreur côté serveur (worker ou SendGrid)
                let errorText = `Une erreur est survenue (${response.status}). Veuillez réessayer plus tard.`;
                try {
                    // Essayer de lire une réponse JSON d'erreur
                    const errorData = await response.json();
                    errorText = `Erreur : ${errorData.message || response.statusText}`;
                } catch (jsonError) {
                    // Si pas JSON, essayer texte brut
                    try {
                       const plainTextError = await response.text();
                       if (plainTextError) errorText = `Erreur : ${plainTextError}`;
                    } catch (textError) { /* Ignorer si même ça échoue */ }
                }
                formMessage.textContent = errorText + " ❌";
                formMessage.className = "form-message error show"; // Style erreur + afficher
            }

        } catch (error) {
            // Erreur réseau (fetch impossible)
            console.error("Erreur réseau ou JS lors de la soumission:", error);
            formMessage.textContent = "Impossible de contacter le serveur. Veuillez vérifier votre connexion internet et réessayer. 🌐";
            formMessage.className = "form-message error show"; // Style erreur + afficher

        } finally {
            // Quoi qu'il arrive (succès ou erreur), réactiver le bouton et cacher le loader
            // Pas besoin de délai ici, l'opération est terminée
            submitButton.disabled = false;
            loader.classList.remove("show");
            buttonText.classList.remove("hide");
        }
    }); // Fin de l'écouteur submit

}); // Fin de l'écouteur DOMContentLoaded