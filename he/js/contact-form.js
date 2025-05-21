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

    // --- LISTE DES MOTS INTERDITS (Hébreu - PROPOSITION ÉTENDUE - VALIDATION HUMAINE CRUCIALE !) ---
    // !!! ATTENTION : CETTE LISTE EST GÉNÉRÉE PAR IA ET DOIT ÊTRE IMPÉRATIVEMENT VALIDÉE PAR UN LOCUTEUR NATIF !!!
    // !!! RISQUE TRÈS ÉLEVÉ DE FAUX POSITIFS ET D'ERREURS !!!
    const disallowedWords = [
        // === Insultes/Vulgarités Générales ===
        "זבל",         // Zével (ordure, déchet)
        "חרא",         // Khara (merde)
        "פיפי",        // Pipi (pipi - enfantin mais peut être utilisé péjorativement)
        "קקי",         // Kaki (caca - enfantin mais peut être utilisé péjorativement)
        "טינופת",      // Tinofet (saleté, ordure)
        "מגעיל",       // Mag'il (dégoutant)
        "דוחה",        // Dokhé (répugnant)
        "מטומטם",      // Metumtam (stupide, idiot)
        "אידיוט",      // Idiot (idiot - emprunt)
        "דביל",        // Debil (débile - emprunt)
        "מפגר",        // Mefager (retardé - très offensant)
        "טמבל",        // Tembel (crétin, imbécile - emprunt turc)
        "אימבציל",    // Imbecil (imbécile - emprunt)
        "ראש כרוב",   // Rosh Kruv (tête de chou - idiot)
        "סמרטוט",      // Smartout (serpillière, lavette - personne sans volonté)
        "אפס",         // Efes (zéro, nul - personne insignifiante)
        "כלומניק",    // Klumnik (vaurien, propre à rien)
        "עלוב",        // Alouv (minable, pitoyable)
        "מניאק",      // Manyak (salaud, enfoiré - emprunt)
        "נבלה",        // Nevéla (charogne - insulte forte)
        "בהמה",        // Behema (animal, brute - personne grossière)
        "חמור",        // Khamor (âne - idiot)
        "כלב",         // Kelev (chien - insulte)
        "כלבה",        // Kalba (chienne - insulte)
        "חזיר",        // Khazir (cochon - insulte)
        "קוף",         // Kof (singe - insulte)
        "פרצוף תחת",  // Partsouf Takhat (gueule de cul)
        "לכלך",        // Lekhlekh (salir, souiller - le verbe peut être utilisé agressivement)
        "זבלן",        // Zablan (éboueur - peut être utilisé péjorativement)

        // === Termes Sexuels Crus / Organes Génitaux ===
        "זין",         // Zayin (bite - très vulgaire)
        "בולבול",      // Bulbul (zizi - enfantin mais peut être détourné)
        "ביצים",       // Beitzim (couilles)
        // "כוס",      // Kos (chatte/con - très vulgaire) - EXTRÊMEMENT RISQUÉ car "כוס" = "verre". COMMENTÉ PAR DÉFAUT.
        "ציצים",       // Tsitsim (seins - familier, peut être vulgaire selon contexte)
        "תחת",         // Takhat (cul)
        "שדיים",       // Shadaim (seins - neutre, mais peut être utilisé vulgairement)
        "פטמה",        // Pitma (mamelon - neutre, mais contexte)
        "דגדגן",       // Dagdegan (clitoris - technique mais contexte)

        // === Actes Sexuels (si utilisés vulgairement) ===
        "לזיין",       // Lezayen (baiser/niquer - le verbe à l'infinitif)
        "מזדיין",      // Mizdayen (baise/nique - participe présent/forme argotique)
        "זיון",        // Ziyoun (baise, rapport sexuel - nom)
        "למצוץ",       // Limtsots (sucer - peut être sexuel et vulgaire)
        "אוננות",      // Onanoot (masturbation - nom)
        "לאונן",       // Le'onen (se masturber - verbe)

        // === Prostitution / Termes Dégradants (souvent envers les femmes) ===
        "זונה",        // Zona (prostituée, pute - très vulgaire)
        "שרמוטה",      // Sharmouta (salope, traînée - très vulgaire, emprunt arabe)
        "שרלילה",      // Sharlila (variante de sharmouta ?)
        "פרחה",        // Frekha (cagole, fille vulgaire et superficielle - stéréotype péjoratif)
        "סרסור",      // Sarsour (proxénète)

        // === Insultes Familiales ===
        "בן זונה",    // Ben Zona (fils de pute)
        "בת זונה",    // Bat Zona (fille de pute)
        "אמאשך זונה", // Imashkha Zona (ta mère est une pute)
        "כוסאמק",      // Kusamak (le con de ta mère - très vulgaire, emprunt arabe)
        "כוסאמאשך",  // Kusamashkha (variante)
        "כוסאמאמאשך",// Kusamamashkha (variante encore plus forte)
        "כוסאוחתק",  // Kusuukhtak (le con de ta sœur - très vulgaire, emprunt arabe)
        "אחושרמוטה",  // Akhusharmuta (contraction vulgaire)
        
        // === Insultes liées à l'origine / Racisme (EXTRÊMEMENT SENSIBLE, VÉRIFICATION CAPITALE) ===
        "כושי",        // Koushi (nègre - très offensant)
        "ערבוש",      // Arbush (terme péjoratif pour Arabe - offensant)

        // === Incitations à la violence / Menaces (si utilisées littéralement) ===
        // "להרוג",    // Laharog (tuer) - RISQUE DE FAUX POSITIF
        // "לרצוח",    // Lirtsokh (assassiner) - RISQUE DE FAUX POSITIF
        "תמות",        // Tamut (meurs !)
        "לך תמות",    // Lekh Tamut (va mourir !)
        // "אני אהרוג אותך", // Ani Eharog Ot'kha (je vais te tuer) - RISQUE DE FAUX POSITIF

        // === Expressions et Ordres Vulgaires ===
        "לך תזדיין",  // Lekh Tizdayen (va te faire foutre)
        "קיבינימט",    // Kibinimat (variante de "va te faire foutre")
        "עוף לי מהעיניים", // Ouf li meha'eynaim (dégage de ma vue)
        "סתום ת'פה",  // Stom ta'pé (ferme ta gueule)
        "תסתום",       // Tistom (la ferme / tais-toi - impératif)
        "זיבי",        // Zibi ("ma bite" - utilisé comme "mon cul !" / "rien à foutre !")
        "על הזין שלי",// Al ha'zayin sheli (sur ma bite - je m'en fous complètement)

        // === Termes liés aux excréments de manière vulgaire ===
        "לחרבן",      // Lekharben (chier - le verbe)
    ];


    // --- Fonctions de validation ---
    const validators = {
        required: (value) => value.trim() !== '',
        email: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()),
        checked: (element) => element.checked,
        tel: (value) => /^\+?[0-9\s\-()]{7,20}$/.test(value.trim()),

        noDisallowedWords: (value) => {
            if (disallowedWords.length === 0) return true;
            if (!value) return true;
            
            const lowerCaseValue = value.toLowerCase(); 
            const normalizedValue = lowerCaseValue
                .replace(/[.,!?;"']/g, '') 
                .replace(/\s+/g, ' '); 

            const wordsInValue = normalizedValue.split(/\s+/).filter(word => word.length > 0);

            return !disallowedWords.some(disallowedWord => {
                return wordsInValue.includes(disallowedWord.toLowerCase()); // Comparaison en "minuscules"
            });
        },

        minValidWords: (value, minCount = 15, minWordLength = 2) => { // Seuil de 15 mots, ajuster si besoin
            if (!value) return false;
            const words = value.match(/(\b\p{L}+(['-]\p{L}+)*\b)/gu) || [];
            let validWordCount = 0;
            for (const word of words) {
                if (word.length >= minWordLength) {
                    if (/^(\p{L})\1{3,}$/u.test(word)) continue;
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
            // Valider minValidWords seulement si pas déjà en erreur pour mots interdits (si la liste disallowedWords est active)
            if (isValid && !validators.minValidWords(value, 15, 2)) { 
                isValid = false; errorMessage = errorMessages.minValidWords;
            }
        }
        setFieldError(field, errorMessage);
        return isValid;
    };

    const charCounterBaseText = charCounterDisplay ? (charCounterDisplay.textContent.split(':')[0] || "תווים שנותרו").trim() : "תווים שנותרו";

    const updateCharCounter = () => {
        if(!charCounterDisplay || !messageTextarea) return;
        const currentLength = messageTextarea.value.length;
        const remaining = MAX_MESSAGE_LENGTH - currentLength;
        charCounterDisplay.textContent = `${charCounterBaseText}: ${remaining}`;
        
        if (remaining < 0) charCounterDisplay.classList.add("error");
        else charCounterDisplay.classList.remove("error");
    };

    const phoneOptionalBaseText = phoneOptionalText ? phoneOptionalText.textContent : "(מומלץ למעקב מהיר)";

    const handleSubjectChange = () => {
        if(!subjectSelect || !phoneField || !otherSubjectGroup || !otherSubjectDetailsInput) return;
        const selectedSubject = subjectSelect.value; 

        phoneField.removeAttribute('required');
        if(phoneRequiredIndicator) phoneRequiredIndicator.style.display = 'none';
        if (phoneOptionalText) phoneOptionalText.textContent = phoneOptionalBaseText;
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
                setFieldError(messageTextarea, null); 
            }
        });
        messageTextarea.addEventListener('blur', () => validateField(messageTextarea));
    }
    if(subjectSelect) {
        subjectSelect.addEventListener('change', () => {
            handleSubjectChange();
            validateField(subjectSelect); // Valider le select lui-même
            if (phoneField.hasAttribute('required')) validateField(phoneField); // Revalider téléphone si devenu requis
            else setFieldError(phoneField, null); // Sinon, nettoyer erreurs téléphone
            if (otherSubjectDetailsInput && otherSubjectDetailsInput.hasAttribute('required')) validateField(otherSubjectDetailsInput);
            else if (otherSubjectDetailsInput) setFieldError(otherSubjectDetailsInput, null);
        });
    }

    if (charCounterDisplay) updateCharCounter();
    handleSubjectChange();

    const submitButtonBaseText = buttonText ? buttonText.textContent : "שלח את בקשתי";

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (submitButton.disabled && buttonText && buttonText.textContent.includes("המתן")) {
            return; 
        }

        let isFormValid = true;
        formMessage.className = "form-message";
        formMessage.textContent = "";

        form.querySelectorAll("input, select, textarea").forEach(field => {
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
                form.reset(); 
                if (charCounterDisplay) updateCharCounter(); 
                handleSubjectChange(); 

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
                try { 
                    const errorData = await response.json(); 
                    errorText = `שגיאה: ${errorData.message || errorData.error || response.statusText || 'לא ידוע'}`; 
                } catch (jsonError) { 
                    try { 
                        const plainTextError = await response.text(); 
                        if (plainTextError) errorText = `שגיאה: ${plainTextError}`; 
                    } catch (textError) { /* Ignore secondary error */ } 
                }
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
                if (formMessage.classList.contains('success')) {
                    buttonText.textContent = "תודה! המתן 2 דקות...";
                    setTimeout(() => {
                        if (submitButton.disabled && formMessage.classList.contains('success') && buttonText.textContent.includes("המתן")) {
                            submitButton.disabled = false;
                            buttonText.textContent = submitButtonBaseText;
                        }
                    }, 120000); 
                } else {
                    submitButton.disabled = false; 
                    buttonText.textContent = submitButtonBaseText;
                }
            } else { 
                 submitButton.disabled = false;
            }
        }
    });
});