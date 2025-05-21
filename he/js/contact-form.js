// =======================================================
// ===   JS Formulaire Contact Ezra Maroc (Hébreu)     ===
// ===   (Basé sur v4.3 FR - Adaptation HE Complète)   ===
// =======================================================

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("contact-form");
    if (!form) {
        return;
    }

    const submitButton = form.querySelector("button[type='submit']");
    const loader = submitButton?.querySelector(".btn-loader");
    const buttonText = submitButton?.querySelector(".btn-text");
    const formMessage = document.getElementById("form-message");

    const consentCheckbox = form.querySelector('#consent');
    const termsConsentCheckbox = form.querySelector('#terms_consent');

    const messageTextarea = form.querySelector('#message');
    const charCounterDisplay = form.querySelector('#char-counter');
    const subjectSelect = form.querySelector('#subject');
    const phoneField = form.querySelector('#phone');
    const phoneLabel = phoneField?.closest('.form-group')?.querySelector('label');
    const phoneRequiredIndicator = phoneLabel?.querySelector('.required-indicator');
    const phoneOptionalText = phoneLabel?.querySelector('.optional-text');

    const otherSubjectGroup = form.querySelector('#other-subject-group');
    const otherSubjectDetailsInput = form.querySelector('#other_subject_details');
    const MAX_MESSAGE_LENGTH = parseInt(messageTextarea?.getAttribute('maxlength') || "1000", 10);

    if (!submitButton || !loader || !buttonText || !formMessage || !consentCheckbox || !termsConsentCheckbox ||
        !messageTextarea || !charCounterDisplay || !subjectSelect || !phoneField || !phoneLabel ||
        !phoneRequiredIndicator || !phoneOptionalText || !otherSubjectGroup || !otherSubjectDetailsInput) {
        console.error("אחד או יותר מהאלמנטים החיוניים בטופס חסרים. אנא בדוק מזהים (ID) וסיווגים (classes).");
        if (formMessage) {
             formMessage.textContent = "שגיאה: לא ניתן לאתחל את הטופס במלואו.";
             formMessage.className = "form-message error show";
        }
        if (submitButton) submitButton.disabled = true;
        return;
    }

    // --- LISTE DES MOTS INTERDITS (Hébreu - À COMPLÉTER AVEC EXTRÊME PRUDENCE) ---
    // !!! ATTENTION : CETTE LISTE EST UN POINT DE DÉPART MINIMAL. ELLE DOIT ÊTRE REVUE, COMPLÉTÉE ET TESTÉE SOIGNEUSEMENT. !!!
    // !!! RISQUE ÉLEVÉ DE FAUX POSITIFS SI NON GÉRÉE CORRECTEMENT. !!!
    const disallowedWords = [
        // Exemples (à vérifier et compléter par un locuteur natif) :
        "זבל", "חרא", // (Ordures, merde - basiques)
        "זין", "כוס", // (Termes crus pour organes génitaux)
        "זונה", "שרמוטה", // (Prostituée, salope - très vulgaires)
        "בן זונה", // (Fils de pute)
        "מניאק", // (Connard/salaud - emprunt)
        // ... AJOUTEZ D'AUTRES TERMES INJURIEUX COURANTS ET NON AMBIGUS EN HÉBREU ...
        // ... SOYEZ TRÈS PRUDENT AVEC LES VARIATIONS, LES PLURIELS, LES FORMES FÉMININES/MASCULINES ...
        // ... ET LES MOTS QUI PEUVENT AVOIR UN DOUBLE SENS. ...
    ];

    // --- Fonctions de validation ---
    const validators = {
        required: (value) => value.trim() !== '',
        email: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()),
        checked: (element) => element.checked,
        tel: (value) => /^\+?[0-9\s\-()]{7,20}$/.test(value.trim()), // Valide pour la plupart des numéros internationaux

        noDisallowedWords: (value) => {
            if (disallowedWords.length === 0) return true;
            if (!value) return true;
            
            // Normalisation simple pour l'hébreu : minuscules (si applicable, bien que l'hébreu n'ait pas de casse), et suppression de certains signes.
            // L'hébreu n'a pas d'accents comme le français. La normalisation principale serait la gestion des formes de lettres (finales),
            // ce qui est complexe et dépasse le cadre d'une simple fonction ici.
            // On se contente de convertir en "pseudo-minuscules" pour la comparaison (si jamais la liste contient des formes avec casse)
            // et on enlève quelques signes de ponctuation pour une comparaison plus lâche des mots.
            const lowerCaseValue = value.toLowerCase(); // Peu d'effet sur l'hébreu mais bonne pratique
            const normalizedValue = lowerCaseValue
                .replace(/[.,!?;"']/g, '') // Enlève quelques ponctuations courantes
                .replace(/\s+/g, ' '); // Normalise les espaces multiples

            const wordsInValue = normalizedValue.split(/\s+/).filter(word => word.length > 0);

            return !disallowedWords.some(disallowedWord => {
                // Les mots interdits dans la liste doivent être en "forme de base" ou toutes leurs variations doivent y être.
                // Comparaison directe après mise en "pseudo-minuscules".
                return wordsInValue.includes(disallowedWord.toLowerCase());
            });
        },

        minValidWords: (value, minCount = 15, minWordLength = 2) => {
            if (!value) return false;
            // \p{L} inclut les lettres hébraïques.
            const words = value.match(/(\b\p{L}+(['-]\p{L}+)*\b)/gu) || [];
            let validWordCount = 0;
            for (const word of words) {
                if (word.length >= minWordLength) {
                    // Vérifie les répétitions de lettres (ex: אאאא)
                    if (/^(\p{L})\1{3,}$/u.test(word)) continue;
                    // La vérification des consonnes latines est supprimée.
                    validWordCount++;
                }
            }
            return validWordCount >= minCount;
        }
    };

    // Messages d'erreur standard (TRADUIT)
    const errorMessages = {
        required: "שדה זה הינו חובה.",
        email: "אנא ספק כתובת דוא\"ל חוקית.",
        checked: "עליך לאשר תנאי זה.",
        tel: "פורמט טלפון לא תקין.",
        disallowedWords: "ההודעה שלך מכילה מונחים שאינם הולמים. אנא שנה אותה.",
        minValidWords: "ההודעה שלך נראית קצרה מדי או שאינה מכילה מספיק מילים מובנות. אנא פרט יותר."
    };

    const setFieldError = (field, message) => {
        const errorSpanId = `${field.id}-error`;
        const errorSpan = document.getElementById(errorSpanId);
        const isCheckbox = field.type === 'checkbox';
        const groupContainer = field.closest('.checkbox-group, .form-group');

        if (message) {
            field.classList.add("error");
            field.setAttribute("aria-invalid", "true");
            if (errorSpan) {
                errorSpan.textContent = message;
                errorSpan.classList.add("visible");
            }
            if (groupContainer) groupContainer.classList.add("error-group");
            if (isCheckbox && groupContainer) groupContainer.classList.add("error-checkbox-group");
        } else {
            field.classList.remove("error");
            field.setAttribute("aria-invalid", "false");
            if (errorSpan) {
                errorSpan.textContent = "";
                errorSpan.classList.remove("visible");
            }
            if (groupContainer) groupContainer.classList.remove("error-group", "error-checkbox-group");
        }
    };

    const validateField = (field) => {
        let isValid = true;
        let errorMessage = null;
        const value = field.value;
        const isCheckbox = field.type === 'checkbox';

        if (field.hasAttribute('required')) {
            if (isCheckbox && !validators.checked(field)) {
                isValid = false; errorMessage = errorMessages.checked;
            } else if (!isCheckbox && !validators.required(value)) {
                isValid = false; errorMessage = errorMessages.required;
            }
        }

        if (isValid && field.type === "email" && value && !validators.email(value)) {
             isValid = false; errorMessage = errorMessages.email;
        }
        if (isValid && field.type === "tel" && value && !validators.tel(value)) {
            isValid = false; errorMessage = errorMessages.tel;
        }
        
        if (field.id === 'message' && value.trim() !== '') {
            if (isValid && disallowedWords.length > 0 && !validators.noDisallowedWords(value)) {
                isValid = false; errorMessage = errorMessages.disallowedWords;
            }
            if (isValid && !validators.minValidWords(value, 15, 2)) { // Ajuster 15 si besoin
                isValid = false; errorMessage = errorMessages.minValidWords;
            }
        }
        setFieldError(field, errorMessage);
        return isValid;
    };

    // Variable pour stocker le texte de base du compteur de caractères.
    // S'assurer que ce texte est bien dans l'élément HTML `div#char-counter` initialement.
    const charCounterBaseText = charCounterDisplay ? charCounterDisplay.textContent.split(':')[0].trim() : "תווים שנותרו";

    const updateCharCounter = () => {
        if(!charCounterDisplay || !messageTextarea) return;
        const currentLength = messageTextarea.value.length;
        const remaining = MAX_MESSAGE_LENGTH - currentLength;
        charCounterDisplay.textContent = `${charCounterBaseText}: ${remaining}`;
        
        if (remaining < 0) charCounterDisplay.classList.add("error");
        else charCounterDisplay.classList.remove("error");
    };

    // Variable pour stocker le texte de base du champ téléphone optionnel.
    const phoneOptionalBaseText = phoneOptionalText ? phoneOptionalText.textContent : "(מומלץ למעקב מהיר)";

    const handleSubjectChange = () => {
        if(!subjectSelect || !phoneField || !otherSubjectGroup || !otherSubjectDetailsInput) return;
        const selectedSubject = subjectSelect.value; // Les 'value' sont en français dans l'HTML

        phoneField.removeAttribute('required');
        if(phoneRequiredIndicator) phoneRequiredIndicator.style.display = 'none';
        if (phoneOptionalText) phoneOptionalText.textContent = phoneOptionalBaseText; // Rétablir le texte optionnel de base
        setFieldError(phoneField, null);

        otherSubjectGroup.style.display = 'none';
        otherSubjectDetailsInput.removeAttribute('required');
        setFieldError(otherSubjectDetailsInput, null);

        if (selectedSubject === "Demande de rappel téléphonique") {
            phoneField.setAttribute('required', 'true');
            if(phoneRequiredIndicator) phoneRequiredIndicator.style.display = 'inline';
            if (phoneOptionalText) phoneOptionalText.textContent = "(חובה לבקשת חזרה טלפונית)";
        } else if (selectedSubject === "Autre sujet") {
            otherSubjectGroup.style.display = 'block';
            otherSubjectDetailsInput.setAttribute('required', 'true');
        }
    };

    form.querySelectorAll("input:not([type='checkbox']), select, textarea").forEach(field => {
        if (field.id !== 'message' && field.id !== 'subject') {
            field.addEventListener("blur", () => validateField(field));
        }
    });
    if(consentCheckbox) consentCheckbox.addEventListener('change', () => validateField(consentCheckbox));
    if(termsConsentCheckbox) termsConsentCheckbox.addEventListener('change', () => validateField(termsConsentCheckbox));
    
    if(messageTextarea) {
        messageTextarea.addEventListener('input', () => {
            updateCharCounter();
            if (messageTextarea.value.trim() !== '') {
                if (disallowedWords.length > 0 && !validators.noDisallowedWords(messageTextarea.value)) {
                    setFieldError(messageTextarea, errorMessages.disallowedWords);
                } else {
                    const currentError = document.getElementById(`${messageTextarea.id}-error`)?.textContent;
                    if (currentError === errorMessages.disallowedWords) {
                        setFieldError(messageTextarea, null);
                    }
                }
            } else {
                setFieldError(messageTextarea, null); // Effacer les erreurs si le champ est vidé
            }
        });
        messageTextarea.addEventListener('blur', () => validateField(messageTextarea)); // Validation complète au blur
    }
    if(subjectSelect) {
        subjectSelect.addEventListener('change', () => {
            handleSubjectChange();
            validateField(subjectSelect);
            if (phoneField.hasAttribute('required')) validateField(phoneField);
            else setFieldError(phoneField, null);
            if (otherSubjectDetailsInput && otherSubjectDetailsInput.hasAttribute('required')) validateField(otherSubjectDetailsInput);
            else if (otherSubjectDetailsInput) setFieldError(otherSubjectDetailsInput, null);
        });
    }

    if (charCounterDisplay) updateCharCounter(); // Appel initial
    handleSubjectChange(); // Appel initial

    // Stocker le texte original du bouton de soumission
    const submitButtonBaseText = buttonText ? buttonText.textContent : "שלח את בקשתי";

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (submitButton.disabled && buttonText && buttonText.textContent.includes("המתן")) { // "Patientez" en hébreu
            return; 
        }

        let isFormValid = true;
        formMessage.className = "form-message";
        formMessage.textContent = "";

        form.querySelectorAll("input, select, textarea").forEach(field => {
            // Valider tous les champs requis, ET le champ message pour tous ses critères
            if (field.hasAttribute('required') || field.id === 'message') {
                if (!validateField(field)) {
                    isFormValid = false;
                }
            }
        });

        if (!isFormValid) {
            const firstErrorField = form.querySelector(".error:not(div), [aria-invalid='true']:not(div)");
            if (firstErrorField) {
                firstErrorField.focus({ preventScroll: true });
                const headerOffset = document.querySelector('.site-header')?.offsetHeight || 80;
                const elementPosition = firstErrorField.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset - 20;
                window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
            }
            return;
        }

        submitButton.disabled = true;
        if(loader) loader.classList.add("show");
        if(buttonText) buttonText.classList.add("hide");

        try {
            const rawFormData = new FormData(form);
            const formData = Object.fromEntries(rawFormData.entries());
            if(consentCheckbox) formData.consent = consentCheckbox.checked ? 'accepted' : 'declined';
            if(termsConsentCheckbox) formData.terms_consent = termsConsentCheckbox.checked ? 'accepted' : 'declined';

            if (subjectSelect.value !== "Autre sujet" || (otherSubjectDetailsInput && !otherSubjectDetailsInput.value.trim())) {
                delete formData.other_subject_details;
            }
            
            const response = await fetch(form.action, {
                method: "POST",
                headers: { "Content-Type": "application/json", "Accept": "application/json" },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                formMessage.textContent = "בקשתך נשלחה בהצלחה. אנו נחזור אליך בהקדם. ✅";
                formMessage.className = "form-message success show";
                form.reset(); // Important: reset avant de mettre à jour les UI dépendantes des valeurs
                if (charCounterDisplay) updateCharCounter(); // Mettre à jour après reset
                handleSubjectChange(); // Mettre à jour après reset

                // Nettoyer explicitement les indicateurs d'erreur visuels restants
                form.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
                form.querySelectorAll('[aria-invalid="true"]').forEach(el => el.setAttribute('aria-invalid', 'false'));
                form.querySelectorAll('.error-message.visible').forEach(el => { el.textContent = ''; el.classList.remove('visible'); });
                form.querySelectorAll('.error-group').forEach(el => el.classList.remove('error-group', 'error-checkbox-group'));

                const msgPosition = formMessage.getBoundingClientRect().top;
                const headerOffsetSucc = document.querySelector('.site-header')?.offsetHeight || 80;
                const offsetPosSucc = msgPosition + window.pageYOffset - headerOffsetSucc - 20;
                window.scrollTo({ top: offsetPosSucc, behavior: 'smooth' });
            } else {
                let errorText = `אירעה שגיאה (${response.status}). אנא נסה שנית מאוחר יותר.`;
                try { const errorData = await response.json(); errorText = `שגיאה: ${errorData.message || response.statusText || 'לא ידוע'}`; }
                catch (jsonError) { try { const plainTextError = await response.text(); if (plainTextError) errorText = `שגיאה: ${plainTextError}`; } catch (textError) {} }
                formMessage.textContent = errorText + " ❌";
                formMessage.className = "form-message error show";
            }
        } catch (error) {
            console.error("שגיאת רשת או JS במהלך השליחה:", error);
            formMessage.textContent = "לא ניתן ליצור קשר עם השרת. אנא בדוק את חיבור האינטרנט שלך ונסה שוב. 🌐";
            formMessage.className = "form-message error show";
        } finally {
            if(loader) loader.classList.remove("show");
            if(buttonText) {
                buttonText.classList.remove("hide");
                // Gérer le texte du bouton après soumission
                if (formMessage.classList.contains('success')) {
                    buttonText.textContent = "תודה! המתן 2 דקות...";
                    setTimeout(() => {
                        if (submitButton.disabled && formMessage.classList.contains('success') && buttonText.textContent.includes("המתן")) {
                            submitButton.disabled = false;
                            buttonText.textContent = submitButtonBaseText;
                        }
                    }, 120000); // 2 minutes
                } else {
                    submitButton.disabled = false; // Réactiver le bouton en cas d'erreur
                    buttonText.textContent = submitButtonBaseText;
                }
            } else { // Fallback si buttonText n'existe pas (ne devrait pas arriver avec les gardes initiales)
                 submitButton.disabled = false;
            }
        }
    });
});