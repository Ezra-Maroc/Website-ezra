// =======================================================
// ===   JS Contact Form Ezra Morocco                  ===
// ===   (English Version v4.3.2 - Extended Profanity Filter + Full Logic) ===
// =======================================================

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("contact-form");
    if (!form) {
        // console.warn("The form with ID 'contact-form' was not found on this page.");
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
        console.error("One or more essential form elements are missing. Check IDs and classes (e.g., submit button, loader, global message, checkboxes, message textarea, subject, phone, etc.).");
        if (formMessage) {
             formMessage.textContent = "Error: Form cannot be fully initialized. Please contact support.";
             formMessage.className = "form-message error show";
        }
        if (submitButton) submitButton.disabled = true;
        return;
    }

    // --- DISALLOWED WORDS LIST (US English - Extended Example List) ---
    // !!! WARNING: This is an extensive example list. Real-world profanity filters are complex and require ongoing maintenance.
    // This list should be reviewed, expanded, and culturally adapted. Keep words in lowercase.
    const disallowedWords = [
        // Core Profanities & Sexual Terms
        "fuck", "fucker", "fucking", "fuckin", "motherfucker", "mf", "mofo", "fux", "fuk", "fck", "fckin", "fuxor",
        "shit", "shitty", "shitter", "shat", "sh!t", "bullshit", "bs", "horseshit", "shithead", "shitface", "shithole",
        "ass", "asshole", "asshat", "asswipe", "ass munch", "asslicker", "jackass", "dumbass", "smartass", "kickass", "arse", "arsehole",
        "bitch", "bitchy", "bitching", "son of a bitch", "soab", "b!tch", "biatch",
        "slut", "slutty", "whore", "whoring", "ho", "hoe",
        "cunt", "twat", "pussy", "pussies", "poon", "poontang", "minge", "snatch", "beaver", "clit", "clitoris", "vagina",
        "cock", "cawk", "cocksucker", "suck my cock", "dick", "dickhead", "dickwad", "prick", "penis", "schlong", "dong", "shaft", "knob", "pecker", "weiner", "willy", "boner",
        "balls", "ball sack", "nuts", "nutsack", "bollocks", "testicles", "scrotum",
        "cum", "cumshot", "jizz", "jizzum", "spunk", "sperm", "ejaculate", "semen",
        "anal", "sodomy", "rimjob", "rimming", "blowjob", "bj", "gobble", "handjob", "hj", "felch", "fellatio", "cunnilingus", "dogging",
        "orgy", "gangbang", "threesome", "bukakke",
        "masturbate", "wank", "wanker", "jerk off", "jack off", "fap",
        "tits", "titties", "boobs", "boobies", "jugs", " mammary",
        "porn", "porno", "sex", "xxx", "erotic",

        // Insults & Derogatory Terms (Non-Sexual)
        "bastard", "damn", "goddamn", "godsdamn", "hell", "heck",
        "idiot", "idiotic", "moron", "moronic", "imbecile", "stupid", "dummy", "dunce", "fool", "nincompoop",
        "retard", "retarded", "mongoloid", "spastic", // (Extremely offensive, ableist)
        "loser", "failure", "worthless", "useless", "scum", "scumbag", "dirtbag", "lowlife",
        "ugly", "hideous", "freak", "monster",
        "fat", "fatso", "lardass", "tubby", "obese", // (If used as insult)
        "skinny", "anorexic", "skeleton", // (If used as insult)
        "nerd", "geek", "dork", "dweeb", // (Context dependent, can be insults)
        "coward", "wimp", "pussyfoot", "chicken",
        "liar", "cheat", "fraud", "phony",
        "sucker", "chump", "gullible",
        "weirdo", "creeр", // (using similar unicode char) "creep", "pervert",
        "assclown", "clown", "joker", "buffoon",
        "redneck", "hick", "hillbilly", "trailer trash", // (Socioeconomic slurs)
        "tramp", "bum", "hobo", // (Derogatory for homeless)
        "piss", "pissed", "piss off", "pissant", "pisshead",
        "crap", "crappy", "crapper",
        "bloody", // (Mild, more UK) "bugger", // (Mild, more UK)

        // Discriminatory Slurs (Racial, Ethnic, Religious, Homophobic, Transphobic, etc.)
        // Racial/Ethnic
        "nigger", "nigga", "niglet", "nigguh", "coon", "jigaboo", "darkie", "sambo", "uncle tom",
        "chink", "ching chong", "gook", "slope", "jap", "nip", "oriental", // (for Asians)
        "kike", "yid", "heeb", "shylock", // (for Jews)
        "spic", "beaner", "wetback", "greaser", // (for Hispanics/Latinos)
        "wop", "dago", "guido", // (for Italians)
        "paki", // (for Pakistanis/South Asians, very offensive in UK)
        "raghead", "towelhead", "sand nigger", "camel jockey", // (for Arabs/Middle Easterners)
        "injun", "redskin", "squaw", // (for Native Americans)
        "honky", "cracker", "whitey", "white trash", "ofay", "peckerwood", // (for White people, context often matters)
        "abbo", "abo", // (for Australian Aboriginals)
        // Homophobic/Transphobic
        "fag", "faggot", "faggy", "dyke", "lesbo", "lezzie", "homo", "queer", // ("queer" reclaimed by some, but can be slur)
        "tranny", "shemale", "he-she", "ladyboy", // (Extremely offensive for transgender people)
        "bender", "poof", "pansy", "fruitcake",
        // Religious
        "infidel", "heathen", "christkiller", "islamophobe", "anti-semite",
        // Other groups
        "feminazi", // (Derogatory for feminists)
        "cuck", "cuckold", // (Often used in specific online subcultures)

        // Violence, Threats & Hate Speech
        "kill", "murder", "slaughter", "assassinate", "lynch", "massacre", "exterminate", "butcher",
        "rape", "molest", "abuse", "violate", "defile", "sexual assault", "child molester", "pedophile", "pedo", "grooming",
        "bomb", "terrorist", "terrorism", "jihad", "nazi", "swastika", "heil hitler", "kkk", "ku klux klan", "final solution", "genocide", "ethnic cleansing",
        "shoot", "stab", "gun down", "torture", "maim", "decapitate",
        "hate crime", "death to", "burn in hell", "go to hell",
        "fight", "beat up", "kick your ass", "stomp",

        // Drugs & Illicit Activities (If context is clearly abusive/spammy, not informational)
        "cocaine", "coke", "crack", "heroin", "smack", "junk", "meth", "crystal meth", "speed",
        "lsd", "acid", "ecstasy", "mdma", "molly", "shrooms", "marijuana", "weed", "pot", "ganja", "dope", "hash",
        "opioid", "fentanyl", "oxycontin",
        "drug dealer", "pusher", "meth lab", "grow op",
        "gamble", "casino", "betting", "poker", // (If spam or illegal context)
        "money laundering", "counterfeit", "fraud", "scam", "phishing",
        "hack", "malware", "virus", "ransomware", "trojan",

        // Spam-like & Phishing Terms (Often seen in malicious messages)
        "viagra", "cialis", "levitra", "pharmacy online", "cheap drugs",
        "lose weight fast", "guaranteed income", "work from home easy money", "get rich quick", "free money",
        "win lottery", "you have won", "claim your prize",
        "free trial", "limited time offer", "click here", "urgent action required", "verify your account", "password reset",
        "bitcoin investment", "crypto doubling", "forex trading signals",
        "adult dating", "meet singles", "hot girls", "live cam", "escorts",
        // URL shorteners often used in spam/phishing (blocking these might be too aggressive)
        // "bit.ly", "tinyurl", "goo.gl", "adf.ly", "shorte.st",
        // Gibberish or overly promotional phrases (hard to list exhaustively)
        "asdfghjkl", "qwertyuiop", "zzzzzz", "xxxxxx", "buy now cheap",

        // Leetspeak examples (can be expanded)
        "f|_|ck", "sh!t", "4ss", "b!tch", "c0ck", "d!ck", "p0rn", "s3x", "n1gger", "f@g",
        "|<ill", "murd3r", "r@pe",
        // Combinations
        "ass fuck", "shit fuck", "mother fucking", "fucking bitch", "stupid fuck", "dumb fuck", "fuck face", "fuck wad", "fuck tard",
        "eat shit", "piece of shit", "holy shit", "what the fuck", "wtf", "stfu"
    ];


    // --- Validation Functions ---
    const validators = {
        required: (value) => value.trim() !== '',
        email: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()),
        checked: (element) => element.checked,
        tel: (value) => /^\+?[0-9\s\-()]{7,20}$/.test(value.trim()),
        noDisallowedWords: (value) => {
            if (!value) return true;
            const lowerCaseValue = value.toLowerCase();
            // Basic normalization for English (mostly removes special chars, less emphasis on accents)
            const normalizedValue = lowerCaseValue
                .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove diacritics
                .replace(/[^a-z0-9\s\-_']/g, ''); // Keep alphanumeric, space, hyphen, underscore, apostrophe

            const wordsInValue = normalizedValue.split(/[\s\-_']+/).filter(word => word.length > 0);

            return !disallowedWords.some(disallowedWord => {
                // The `disallowedWords` list is already lowercase.
                // Normalization might be needed if the list itself contained complex characters or accents.
                const normalizedDisallowedWord = disallowedWord.toLowerCase()
                    .normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // Normalize for comparison
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
                    const consonants = word.match(/[bcdfghjklmnpqrstvwxyzBCDFGHJKLMNPQRSTVWXYZ]{5,}/g);
                    if (consonants) continue;
                    validWordCount++;
                }
            }
            return validWordCount >= minCount;
        }
    };

    // Standard error messages (US English)
    const errorMessages = {
        required: "This field is required.",
        email: "Please provide a valid email address.",
        checked: "You must accept this condition.",
        tel: "Invalid phone number format.",
        disallowedWords: "Your message contains inappropriate terms. Please revise it.",
        minValidWords: "Your message seems too short or lacks enough intelligible words. Please provide more details."
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
        charCounterDisplay.textContent = `Characters remaining: ${remaining}`;
        if (remaining < 0) charCounterDisplay.classList.add("error");
        else charCounterDisplay.classList.remove("error");
    };

    const handleSubjectChange = () => {
        if(!subjectSelect || !phoneField || !otherSubjectGroup || !otherSubjectDetailsInput) return;
        const selectedSubject = subjectSelect.value;

        phoneField.removeAttribute('required');
        if(phoneRequiredIndicator) phoneRequiredIndicator.style.display = 'none';
        if (phoneOptionalText) phoneOptionalText.textContent = "(Recommended for faster follow-up)";
        setFieldError(phoneField, null);

        otherSubjectGroup.style.display = 'none';
        otherSubjectDetailsInput.removeAttribute('required');
        setFieldError(otherSubjectDetailsInput, null);

        // IMPORTANT: These 'value' strings must match the <option value="..."> in your English contact.html
        if (selectedSubject === "Request for a callback") {
            phoneField.setAttribute('required', 'true');
            if(phoneRequiredIndicator) phoneRequiredIndicator.style.display = 'inline';
            if (phoneOptionalText) phoneOptionalText.textContent = "(Required for a callback)";
        } else if (selectedSubject === "Other subject") {
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
        if (submitButton.disabled && buttonText.textContent.includes("Please wait")) {
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
        buttonText.classList.add("hide");

        try {
            const rawFormData = new FormData(form);
            const formData = Object.fromEntries(rawFormData.entries());
            if(consentCheckbox) formData.consent = consentCheckbox.checked ? 'accepted' : 'declined';
            if(termsConsentCheckbox) formData.terms_consent = termsConsentCheckbox.checked ? 'accepted' : 'declined';

            if (subjectSelect.value !== "Other subject" || (otherSubjectDetailsInput && !otherSubjectDetailsInput.value.trim())) {
                delete formData.other_subject_details;
            }

            const response = await fetch(form.action, {
                method: "POST",
                headers: { "Content-Type": "application/json", "Accept": "application/json" },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                formMessage.textContent = "Your request has been sent successfully. We will get back to you shortly. ✅";
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
                let errorText = `An error occurred (${response.status}). Please try again later.`;
                try { const errorData = await response.json(); errorText = `Error: ${errorData.message || response.statusText}`; }
                catch (jsonError) { try { const plainTextError = await response.text(); if (plainTextError) errorText = `Error: ${plainTextError}`; } catch (textError) {} }
                formMessage.textContent = errorText + " ❌";
                formMessage.className = "form-message error show";
            }
        } catch (error) {
            console.error("Network or JS error during submission:", error);
            formMessage.textContent = "Could not connect to the server. Please check your internet connection and try again. 🌐";
            formMessage.className = "form-message error show";
        } finally {
            loader.classList.remove("show");
            buttonText.classList.remove("hide"); 

            if (formMessage.classList.contains('success')) {
                buttonText.textContent = "Thank you! Please wait 2 min...";
                setTimeout(() => {
                    if (submitButton.disabled && formMessage.classList.contains('success') && buttonText.textContent.includes("Please wait")) {
                        submitButton.disabled = false;
                        buttonText.textContent = "Send my request"; // Your default English button text
                    }
                }, 120000);
            } else {
                submitButton.disabled = false;
                buttonText.textContent = "Send my request"; // Your default English button text
            }
        }
    });
});