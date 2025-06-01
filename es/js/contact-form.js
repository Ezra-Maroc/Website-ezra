// ============================================================
// ===   JS Formulario Contacto Ezra Maroc (Español)        ===
// ===   (Versión v4.3 ES - Filtro palabras + Lista Ext.)   ===
// ============================================================

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
        console.error("Uno o más elementos esenciales del formulario faltan. Verifique los IDs y clases.");
        if (formMessage) {
             formMessage.textContent = "Error: No se pudo inicializar completamente el formulario.";
             formMessage.className = "form-message error show";
        }
        if (submitButton) submitButton.disabled = true;
        return;
    }

    // --- LISTA DE PALABRAS NO PERMITIDAS (en minúsculas) ---
    // Traducir o adaptar esta lista para el español según sea necesario.
    // Esta es una lista extensa como ejemplo. Revisar y adaptar cuidadosamente.
    const disallowedWords = [
        // EJEMPLOS EN ESPAÑOL (ampliar según necesidad)
        "mierda", "joder", "puta", "puto", "cabron", "cabrona", "gilipollas", "cojones", "polla", "coño",
        "hijueputa", "malparido", "pendejo", "pendeja", "chinga", "chingar", "culero", "culera",
        "marica", "maricon", "maricón", "zorra", "perra",
        "nazi", "hitler", "racista", "xenofobo", // Palabras sensibles
        "matar", "violar", "asesinar", "bomba", "terrorista", // Palabras violentas
        // ... (la lista francesa era muy extensa, adaptar y traducir las más relevantes para el contexto español)
        // Añadir insultos comunes, términos ofensivos, racistas, sexistas, etc., en español.
        // Por ejemplo:
        "capullo", "imbécil", "estúpido", "estúpida", "idiota", "tarado", "tarada", "subnormal",
        "negrata", "sudaca", "moro", // Términos despectivos
        "droga", "cocaína", "heroína", "marihuana", "porro",
        // Abreviaturas ofensivas comunes en español
        "hdp", "lpmqtp", "ctm"
    ];


    // --- Funciones de validación ---
    const validators = {
        required: (value) => value.trim() !== '',
        email: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()),
        checked: (element) => element.checked,
        tel: (value) => /^\+?[0-9\s\-()]{7,20}$/.test(value.trim()),
        noDisallowedWords: (value) => {
            if (!value) return true;
            const lowerCaseValue = value.toLowerCase();
            const normalizedValue = lowerCaseValue
                .replace(/[áäâàãåāăą]/g, "a")
                .replace(/[éëêèēĕėęě]/g, "e")
                .replace(/[íïîìįīĭ]/g, "i")
                .replace(/[óöôòõøōŏő]/g, "o")
                .replace(/[úüûùųūŭůű]/g, "u")
                .replace(/[çćĉċč]/g, "c")
                .replace(/[ñńņňŉ]/g, "n")
                .replace(/[^a-z0-9\s\-_']/g, '');

            const wordsInValue = normalizedValue.split(/[\s\-_']+/).filter(word => word.length > 0);

            return !disallowedWords.some(disallowedWord => {
                // Normalizar también las palabras prohibidas si contienen acentos o caracteres especiales
                // (Aunque se recomienda que la lista 'disallowedWords' ya esté normalizada)
                const normalizedDisallowedWord = disallowedWord.toLowerCase()
                    .replace(/[áäâàãåāăą]/g, "a")
                    .replace(/[éëêèēĕėęě]/g, "e")
                    .replace(/[íïîìįīĭ]/g, "i")
                    .replace(/[óöôòõøōŏő]/g, "o")
                    .replace(/[úüûùųūŭůű]/g, "u")
                    .replace(/[çćĉċč]/g, "c")
                    .replace(/[ñńņňŉ]/g, "n");
                return wordsInValue.includes(normalizedDisallowedWord);
            });
        },
        minValidWords: (value, minCount = 15, minWordLength = 2) => {
            if (!value) return false;
            const words = value.match(/(\b\p{L}+(['-]\p{L}+)*\b)/gu) || [];
            let validWordCount = 0;
            for (const word of words) {
                if (word.length >= minWordLength) {
                    if (/^(\p{L})\1{3,}$/u.test(word)) continue;
                    const consonants = word.match(/[bcdfghjklmnpqrstvwxyzBCDFGHJKLMNPQRSTUVWXYZ]{5,}/g); // Incluye 'y' y 'z' como consonantes
                    if (consonants) continue;
                    validWordCount++;
                }
            }
            return validWordCount >= minCount;
        }
    };

    // Mensajes de error estándar
    const errorMessages = {
        required: "Este campo es obligatorio.",
        email: "Por favor, proporciona una dirección de correo electrónico válida.",
        checked: "Debes aceptar esta condición.",
        tel: "Formato de teléfono inválido.",
        disallowedWords: "Tu mensaje contiene términos inapropiados. Por favor, modifícalo.",
        minValidWords: "Tu mensaje parece demasiado corto o no contiene suficientes palabras inteligibles. Por favor, detalla más."
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
            if (isValid && !validators.noDisallowedWords(value)) {
                isValid = false; errorMessage = errorMessages.disallowedWords;
            }
            if (isValid && !validators.minValidWords(value, 15, 2)) {
                isValid = false; errorMessage = errorMessages.minValidWords;
            }
        }
        setFieldError(field, errorMessage);
        return isValid;
    };

    const updateCharCounter = () => {
        if(!charCounterDisplay || !messageTextarea) return;
        const currentLength = messageTextarea.value.length;
        const remaining = MAX_MESSAGE_LENGTH - currentLength;
        // Traducir el texto del contador
        charCounterDisplay.textContent = `Caracteres restantes: ${remaining}`;
        if (remaining < 0) charCounterDisplay.classList.add("error");
        else charCounterDisplay.classList.remove("error");
    };

    const handleSubjectChange = () => {
        if(!subjectSelect || !phoneField || !otherSubjectGroup || !otherSubjectDetailsInput) return;
        const selectedSubject = subjectSelect.value;

        phoneField.removeAttribute('required');
        if(phoneRequiredIndicator) phoneRequiredIndicator.style.display = 'none';
        if (phoneOptionalText) phoneOptionalText.textContent = "(Recomendado para seguimiento rápido)"; // TRADUCIR
        setFieldError(phoneField, null);

        otherSubjectGroup.style.display = 'none';
        otherSubjectDetailsInput.removeAttribute('required');
        setFieldError(otherSubjectDetailsInput, null);

        // Usar los valores traducidos del 'select' de la página española
        if (selectedSubject === "Solicitud de devolución de llamada telefónica") { // TRADUCIR EXACTAMENTE COMO EN EL HTML
            phoneField.setAttribute('required', 'true');
            if(phoneRequiredIndicator) phoneRequiredIndicator.style.display = 'inline';
            if (phoneOptionalText) phoneOptionalText.textContent = "(Obligatorio para una devolución de llamada)"; // TRADUCIR
        } else if (selectedSubject === "Otro asunto") { // TRADUCIR EXACTAMENTE COMO EN EL HTML
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
                if (!validators.noDisallowedWords(messageTextarea.value)) {
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
            validateField(subjectSelect);
            if (phoneField.hasAttribute('required')) validateField(phoneField);
            else setFieldError(phoneField, null);
            if (otherSubjectDetailsInput && otherSubjectDetailsInput.hasAttribute('required')) validateField(otherSubjectDetailsInput);
            else if (otherSubjectDetailsInput) setFieldError(otherSubjectDetailsInput, null);
        });
    }

    updateCharCounter();
    handleSubjectChange();

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        // Traducir el texto de espera
        if (submitButton.disabled && buttonText.textContent.includes("Por favor espera")) {
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
        loader.classList.add("show");
        // Traducir texto del loader y botón
        loader.querySelector('i').nextSibling.textContent = " Enviando..."; // Ajustar si la estructura del loader cambia
        buttonText.classList.add("hide");


        try {
            const rawFormData = new FormData(form);
            const formData = Object.fromEntries(rawFormData.entries());
            if(consentCheckbox) formData.consent = consentCheckbox.checked ? 'accepted' : 'declined';
            if(termsConsentCheckbox) formData.terms_consent = termsConsentCheckbox.checked ? 'accepted' : 'declined';

            // Usar los valores traducidos del 'select'
            if (subjectSelect.value !== "Otro asunto" || (otherSubjectDetailsInput && !otherSubjectDetailsInput.value.trim())) {
                delete formData.other_subject_details;
            }

            const response = await fetch(form.action, {
                method: "POST",
                headers: { "Content-Type": "application/json", "Accept": "application/json" },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                // Traducir mensaje de éxito
                formMessage.textContent = "Tu solicitud ha sido enviada con éxito. Nos pondremos en contacto contigo pronto. ✅";
                formMessage.className = "form-message success show";
                form.reset();
                updateCharCounter();
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
                // Traducir mensaje de error
                let errorText = `Ocurrió un error (${response.status}). Por favor, inténtalo de nuevo más tarde.`;
                try { const errorData = await response.json(); errorText = `Error: ${errorData.message || response.statusText}`; }
                catch (jsonError) { try { const plainTextError = await response.text(); if (plainTextError) errorText = `Error: ${plainTextError}`; } catch (textError) {} }
                formMessage.textContent = errorText + " ❌";
                formMessage.className = "form-message error show";
            }
        } catch (error) {
            console.error("Error de red o JS durante el envío:", error);
            // Traducir mensaje de error de red
            formMessage.textContent = "No se pudo contactar con el servidor. Por favor, comprueba tu conexión a internet e inténtalo de nuevo. 🌐";
            formMessage.className = "form-message error show";
        } finally {
            loader.classList.remove("show");
            buttonText.classList.remove("hide"); 
            const originalButtonText = "Enviar Mi Solicitud"; // TRADUCIR

            if (formMessage.classList.contains('success')) {
                // Traducir texto del botón después de éxito
                buttonText.textContent = "¡Gracias! Espera 2 min...";
                setTimeout(() => {
                    if (submitButton.disabled && formMessage.classList.contains('success') && buttonText.textContent.includes("Espera")) {
                        submitButton.disabled = false;
                        buttonText.textContent = originalButtonText;
                    }
                }, 120000); // 2 minutes
            } else {
                submitButton.disabled = false;
                buttonText.textContent = originalButtonText;
            }
        }
    });
});