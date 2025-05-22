

// ===============================================
// ===   JS Formulaire Contact Ezra Maroc      ===
// ===   (Version v3 - Ajout Validation CGU)   ===
// ===============================================

document.addEventListener("DOMContentLoaded", () => {
    // --- Récupération des éléments DOM ---
    const form = document.getElementById("contact-form");
    // Vérification initiale si le formulaire existe
    if (!form) {
        // console.warn("Le formulaire avec l'ID 'contact-form' n'a pas été trouvé sur cette page.");
        return; // Arrêter l'exécution si le formulaire n'est pas là
    }

    const submitButton = form.querySelector("button[type='submit']");
    const loader = submitButton?.querySelector(".btn-loader");
    const buttonText = submitButton?.querySelector(".btn-text");
    const formMessage = document.getElementById("form-message");

    // Récupération des checkboxes spécifiques
    const consentCheckbox = form.querySelector('#consent');         // Checkbox Politique Conf.
    const termsConsentCheckbox = form.querySelector('#terms_consent'); // Checkbox CGU (NOUVELLE)

    // Vérification que TOUS les éléments cruciaux existent
    if (!submitButton || !loader || !buttonText || !formMessage || !consentCheckbox || !termsConsentCheckbox) {
        console.error("Un ou plusieurs éléments essentiels (bouton, loader, message global, checkboxes) sont manquants dans le formulaire. Vérifiez les ID et classes.");
        // Afficher une erreur plus visible pour l'utilisateur final serait une bonne idée ici
        if (formMessage) {
             formMessage.textContent = "Erreur : Impossible d'initialiser le formulaire. Veuillez contacter le support.";
             formMessage.className = "form-message error show";
        }
        if (submitButton) submitButton.disabled = true; // Désactiver l'envoi si initialisation échoue
        return; // Arrêter si des éléments cruciaux manquent
    }

    // --- Fonctions de validation ---
    const validators = {
        required: (value) => value.trim() !== '', // Vérifie si non vide après avoir retiré les espaces
        email: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()), // Format email simple
        checked: (element) => element.checked, // Vérifie si une checkbox est cochée
        // tel: (value) => /^\+?[0-9\s\-()]{7,20}$/.test(value.trim()) // Optionnel: Regex tél. simple
    };

    // Messages d'erreur standard
    const errorMessages = {
        required: "Ce champ est obligatoire.",
        email: "Veuillez fournir une adresse email valide.",
        checked: "Vous devez accepter cette condition.",
        tel: "Format de téléphone invalide." // Si validation tel ajoutée
    };

    /**
     * Affiche ou masque un message d'erreur pour un champ donné et met à jour les styles/ARIA.
     * @param {HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement} field - L'élément de champ.
     * @param {string|null} message - Le message d'erreur ou null pour effacer.
     */
    const setFieldError = (field, message) => {
        const errorSpan = document.getElementById(`${field.id}-error`);
        const isCheckbox = field.type === 'checkbox';
        // Trouve le conteneur parent approprié (.checkbox-group ou .form-group)
        const groupContainer = field.closest('.checkbox-group, .form-group');

        if (message) {
            // Affiche l'erreur
            field.classList.add("error");
            field.setAttribute("aria-invalid", "true");
            if (errorSpan) {
                errorSpan.textContent = message;
                errorSpan.classList.add("visible");
            }
            // Applique la classe d'erreur au conteneur pour un style global si besoin
            if (groupContainer) groupContainer.classList.add("error-group"); // Classe pour le groupe
            if (isCheckbox && groupContainer) groupContainer.classList.add("error-checkbox-group"); // Classe spécifique checkbox


        } else {
            // Efface l'erreur
            field.classList.remove("error");
            field.setAttribute("aria-invalid", "false");
            if (errorSpan) {
                errorSpan.textContent = "";
                errorSpan.classList.remove("visible");
            }
            // Retire les classes d'erreur du conteneur
            if (groupContainer) groupContainer.classList.remove("error-group", "error-checkbox-group");
        }
    };

    /**
     * Valide un champ spécifique basé sur ses attributs.
     * @param {HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement} field - Le champ à valider.
     * @returns {boolean} - True si le champ est valide, False sinon.
     */
    const validateField = (field) => {
        let isValid = true;
        let errorMessage = null;
        const value = field.value;
        const isCheckbox = field.type === 'checkbox';

        // 1. Validation "Required" (pour tous les types et les checkboxes)
        if (field.hasAttribute('required')) { // Vérifie explicitement l'attribut required
            if (isCheckbox && !validators.checked(field)) {
                isValid = false;
                errorMessage = errorMessages.checked;
            } else if (!isCheckbox && !validators.required(value)) {
                isValid = false;
                errorMessage = errorMessages.required;
            }
        }

        // 2. Validation "Email" (si c'est un champ email et qu'il a une valeur OU qu'il est requis)
        //    On valide même si vide s'il est required (il tombera dans required ci-dessus),
        //    mais on valide le format si une valeur est entrée.
        if (isValid && field.type === "email" && value && !validators.email(value)) {
             isValid = false;
             errorMessage = errorMessages.email;
        }

        // 3. Validation "Tel" (optionnelle, seulement si une valeur est entrée)
        // if (isValid && field.type === "tel" && value && !validators.tel(value)) {
        //     isValid = false;
        //     errorMessage = errorMessages.tel;
        // }

        // Applique le résultat de la validation (affiche ou efface l'erreur)
        setFieldError(field, errorMessage);
        return isValid;
    };

    // --- Ajout des écouteurs d'événements pour validation interactive ---

    // Inputs (non-checkbox), Select, Textarea : valider au "blur" (quand on quitte le champ)
    form.querySelectorAll("input:not([type='checkbox']), select, textarea").forEach(field => {
        field.addEventListener("blur", () => validateField(field));
        // Optionnel: Valider à l'input pour feedback immédiat sur email/tel si désiré
        // if (field.type === 'email' || field.type === 'tel') {
        //     field.addEventListener("input", () => validateField(field));
        // }
    });

    // Checkbox Politique de Confidentialité : valider au changement
    consentCheckbox.addEventListener('change', () => validateField(consentCheckbox));

    // Checkbox CGU : valider au changement (NOUVEAU)
    termsConsentCheckbox.addEventListener('change', () => validateField(termsConsentCheckbox));


    // --- Gestion de la soumission du formulaire ---

    form.addEventListener("submit", async (e) => {
        e.preventDefault(); // Empêcher la soumission HTML classique
        let isFormValid = true;

        // Réinitialiser le message global avant de revalider
        formMessage.className = "form-message";
        formMessage.textContent = "";

        // Re-valider TOUS les champs marqués comme requis avant d'envoyer
        // Cela inclut les deux checkboxes qui ont l'attribut 'required'
        form.querySelectorAll("[required]").forEach(field => {
            // On cumule les résultats : si un seul champ est invalide, tout le formulaire l'est
            if (!validateField(field)) {
                isFormValid = false;
            }
        });

        // Si le formulaire n'est pas valide, arrêter ici
        if (!isFormValid) {
            // Mettre le focus sur le premier champ en erreur
            const firstErrorField = form.querySelector(".error");
            if (firstErrorField) {
                firstErrorField.focus({ preventScroll: true });
                // Scroll doux vers le champ en erreur, en tenant compte du header
                const headerOffset = document.querySelector('.site-header')?.offsetHeight || 80;
                const elementPosition = firstErrorField.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset - 20; // Marge sup.
                window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
            }
            return; // Stopper la fonction submit
        }

        // --- Le formulaire est valide, procéder à l'envoi ---

        submitButton.disabled = true;
        loader.classList.add("show");
        buttonText.classList.add("hide");

        try {
            // Préparer les données pour l'envoi JSON
            // Object.fromEntries(new FormData(form)) gère bien les checkboxes cochées (clé=valeur)
            // et ignore celles non cochées. C'est le comportement standard des formulaires HTML.
            // Cependant, pour forcer 'accepted'/'declined' explicitement :
            const rawFormData = new FormData(form);
            const formData = Object.fromEntries(rawFormData.entries());

            // Assurer la valeur explicite 'accepted'/'declined' pour nos checkboxes spécifiques
            formData.consent = consentCheckbox.checked ? 'accepted' : 'declined';
            formData.terms_consent = termsConsentCheckbox.checked ? 'accepted' : 'declined'; // AJOUT EXPLICITE

            // Envoi des données (adapter l'URL 'form.action' si nécessaire)
            const response = await fetch(form.action, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                body: JSON.stringify(formData)
            });

            // Traiter la réponse du serveur/worker
            if (response.ok) {
                // Succès !
                formMessage.textContent = "Votre demande a été envoyée avec succès. Nous reviendrons vers vous rapidement. ✅";
                formMessage.className = "form-message success show";
                form.reset(); // Vider le formulaire

                // Nettoyer manuellement les indicateurs d'erreur après reset
                form.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
                form.querySelectorAll('[aria-invalid="true"]').forEach(el => el.setAttribute('aria-invalid', 'false'));
                form.querySelectorAll('.error-message.visible').forEach(el => {
                    el.textContent = '';
                    el.classList.remove('visible');
                });
                 form.querySelectorAll('.error-group').forEach(el => el.classList.remove('error-group', 'error-checkbox-group'));


                // Optionnel : Scroll vers le message de succès
                 const msgPosition = formMessage.getBoundingClientRect().top;
                 const headerOffsetSucc = document.querySelector('.site-header')?.offsetHeight || 80;
                 const offsetPosSucc = msgPosition + window.pageYOffset - headerOffsetSucc - 20;
                 window.scrollTo({ top: offsetPosSucc, behavior: 'smooth' });

                // Optionnel : Redirection après délai
                // setTimeout(() => { window.location.href = '/page-merci.html'; }, 3000);

            } else {
                // Erreur côté serveur
                let errorText = `Une erreur est survenue (${response.status}). Veuillez réessayer plus tard.`;
                try {
                    const errorData = await response.json(); // Tente de lire le JSON
                    errorText = `Erreur : ${errorData.message || response.statusText}`; // Utilise message si dispo
                } catch (jsonError) {
                    try { // Si pas JSON, tente texte brut
                       const plainTextError = await response.text();
                       if (plainTextError) errorText = `Erreur : ${plainTextError}`;
                    } catch (textError) { /* Ignorer si même ça échoue */ }
                }
                formMessage.textContent = errorText + " ❌";
                formMessage.className = "form-message error show";
            }

        } catch (error) {
            // Erreur réseau ou autre erreur JS inattendue
            console.error("Erreur réseau ou JS lors de la soumission:", error);
            formMessage.textContent = "Impossible de contacter le serveur. Veuillez vérifier votre connexion internet et réessayer. 🌐";
            formMessage.className = "form-message error show";

        } finally {
            // Quoi qu'il arrive, réactiver le bouton et masquer le loader
            submitButton.disabled = false;
            loader.classList.remove("show");
            buttonText.classList.remove("hide");
        }
    }); // Fin de l'écouteur submit

}); // Fin de l'écouteur DOMContentLoaded