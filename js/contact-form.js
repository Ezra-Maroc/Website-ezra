// =======================================================
// ===   JS Formulaire Contact Ezra Maroc                ===
// ===   (Version v4.3 - Filtre mots valides + Liste étendue) ===
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
        console.error("Un ou plusieurs éléments essentiels du formulaire sont manquants. Vérifiez les ID et classes.");
        if (formMessage) {
             formMessage.textContent = "Erreur : Impossible d'initialiser complètement le formulaire.";
             formMessage.className = "form-message error show";
        }
        if (submitButton) submitButton.disabled = true;
        return;
    }

    // --- LISTE DES MOTS INTERDITS (en minuscules) ---
    // !!! ATTENTION : LISTE TRÈS EXTENSIVE. À UTILISER AVEC EXTRÊME PRUDENCE ET APRÈS REVUE APPROFONDIE. !!!
    const disallowedWords = [
        "merde", "merdeux", "merdeuse", "merdes", "emmerder", "emmerdeur", "emmerdeuse", "va te faire emmerder",
        "con", "connard", "connasse", "conne", "cons", "connards", "connasses", "déconne", "déconner", "déconneur", "déconneuse",
        "couille", "couilles", "couillu", "couillue", "couillon", "couillonne", "couillons", "casse-couilles",
        "bite", "bites", "bitte", "bittes", "zob", "zobs", "zboub", "zboubs", "quéquette", "kékette", "pine", "pines", "queue", "queues", "chibre", "chibres", "dard", "gland", "prépuce",
        "chatte", "chattes", "moule", "moules", "concha", "schneck", "schnek", "shnek", "minou", "minous", "foufoune", "foufounes", "touffe", "vulve", "vagin", "clitoris",
        "cul", "culs", "trouduc", "trou du cul", "troudbal", "troudballes", "anus", "anal", "sodomie", "sodomiser", "défoncer le cul", "lécher le cul", "lèche-cul",
        "nique", "niquer", "niqueur", "niqueuse", "nique ta mère", "nique tes morts", "nique sa mère", "nique la police", "va te faire niquer", "forniquer",
        "baise", "baiser", "baiseur", "baiseuse", "baisable", "baisodrome", "va te faire baiser", "s'envoyer en l'air", "tirer un coup", "ken", "quène",
        "branler", "branleur", "branleuse", "branlette", "se branler", "masturber", "masturbation",
        "pute", "putes", "putain", "putains", "putain de", "salope", "salopes", "saloperie", "garce", "garces", "traînée", "trainée", "traînées", "poufiasse", "pouffiasse", "pouffiasses", "grognasse", "grognasses", "catin", "catins", "morue", "morues", "paillasse", "guidoune",
        "proxénète", "mac", "maquereau", "maquerelle", "souteneur",
        "bordel", "bordels", "maison close", "lupanar", "claquedents",
        "gerbe", "gerber", "dégueuler", "dégueulasse", "dégueu", "vomi", "vomir", "régurgiter",
        "pisse", "pisser", "pisseur", "pisseuse", "urine", "uriner", "pipi", "pissat",
        "caca", "caguer", "chiasse", "chier", "fais chier", "va chier", "chiant", "chiante", "chieuse", "chie", "étron", "étrons", "excrément", "merdier", "scatophile", "scato", "coprophile",
        "prout", "prouts", "péter", "peter", "pet", "pets", "flatulence", "vent",
        "sperme", "éjaculer", "éjaculation", "foutre", "semence", "roubignoles", "gonades", "testicules", "coucougnettes", "burnes",
        "règle", "règles", "menstrues", "sang de règles", "lochies", "cataménial",

        "abruti", "abrutie", "abrutis", "crétin des alpes",
        "imbécile", "imbéciles", "débile", "débiles", "crétin", "crétins", "idiot", "idiote", "idiots", "sᏆupidе", // (exemple avec caractère unicode similaire)
        "stupide", "stupides", "andouille", "andouilles", "sot", "sotte", "sots", "niais", "niaise", "benêt", "benet", "niaiseux", "niaiseuse", "jobard",
        "taré", "tarée", "tarés", "timbré", "cinglé", "givré", "barjo", "barjot", "dingue", "zinzin", "folle", "fou", "fous", "dingo", "aliéné", "aliénée", "psychopathe", "déséquilibré", "foldingue",
        "mongol", "mongolien", "mongolienne", "trisomique",
        "gogol", "gogole", "gogols", "demeuré",
        "attardé", "attardée", "handicapé", "infirme", "estropié",
        "nul", "nulle", "nuls", "nullard", "nullarde", "loser", "looser", "raté", "ratée", "minable", "pathétique", "pitoyable", "médiocre", "incapable", "manchot",
        "moche", "moches", "laid", "laide", "laids", "laideron", "laideronne", "thonaire", "thon", "boudin", "cageot", "vilain", "disgracieux", "repoussant",
        "gros", "grosse", "gros porc", "grosse truie", "grosse vache", "gros lard", "gros sac", "obèse", "bouffi", "ventripotent", "gras du bide",
        "maigre", "maigrichon", "maigrichonne", "squelette", "anorexique", "échalas", "asperge", "sac d'os",
        "nain", "naine", "nabot", "nabote", "minus", "lilliputien", "demi-portion", "avorton",
        "clochard", "clocharde", "clodo", "clodos", "mendiant", "mendiante", "pauvre type", "pauvre con", "SDF", "vaurien", "miséreux", "gueux", "tramp",
        "péquenot", "péquenaud", "plouc", "bouseux", "cul-terreux", "paysan", "rustre", "balourd", "pignouf",
        "ignare", "ignorant", "ignorante", "inculte", "illettré", "analphabète",
        "pleurnichard", "pleurnicheur", "pleurnicheuse", "chouineur", "chouineuse",
        "lâche", "couard", "froussard", "trouillard", "gonzesse", "pleutre", "poltron", "dégonflé",
        "parasite", "vermine", "poison", "cancer", "déchet", "sous-merde", "rebut",
        "bouffon", "bouffonne", "clown", "guignol", "marionnette", "pantin", "pitre",
        "crasseux", "crasseuse", "pouilleux", "pouilleuse", "malpropre", "sale", "souillon", "dégoûtant", "infect", "répugnant",
        "puant", "puante", "empeste", "charogne", "crevure", "fétide", "pestilentiel", "malodorant",

        "pédé", "pédale", "pd", "tapette", "tarlouze", "fiotte", "enculeur de mouches", "homosexuel", "gay", "homo", // (si utilisé comme insulte)
        "gouine", "goudou", "camionneuse", "lesbienne", "dyke", "butch", "lesbiche", // (si utilisé comme insulte)
        "trans", "travelo", "tranny", "shemale", "hermaphrodite", "transsexuel", "transgenre", // (extrêmement offensant si utilisé pour insulter)
        "bougnoule", "bougnoul", "bicot", "raton", "tronche de cake", "melon", "arabe", "maghrébin", // (raciste, "arabe"/"maghrébin" si utilisé péjorativement)
        "nègre", "négro", "negro", "négresse", "bamboula", "face de craie", "niakoué", "noir", "noire", "black", "africain", // (raciste, les derniers si utilisés péjorativement)
        "chinetoque", "chintok", "chinetoc", "face de citron", "jaune", "asiat", "asiatique", // (raciste, les derniers si utilisés péjorativement)
        "youtre", "youpin", "youpine", "feuj", "sale juif", "israélite", "circoncis", // (antisémite)
        "gitan", "manouche", "romano", "romanichel", "bohémien", "voleur de poules", "rom", "tsigane", // (anti-tsigane, si utilisé péjorativement)
        "polak", "rital", "espingo", "portos", "boche", "fritz", "rosbif", "yankee", "amerloque", // (insultes nationalistes)
        "sauvage", "barbare", "primitif", "cannibale",
        "makake", "singe", "babouin", // (raciste)
        "wesh", "wesh wesh", "racaille", "caillera", "zoulette", "lascar", "blédard", // (si utilisé de manière stéréotypée et péjorative)
        "fachiste", "facho", "nazi", "nazie", "hitlérien", "collabo", "pétainiste", "rouge-brun", "suprémaciste",
        "islamiste", "djihadiste", "terroriste", "salafiste", // (Sensible, risque de faux positifs)
        "féministe", "féminazie", "miso", "misandre", "misogyne", "machiste", "phallocrate", // (Si utilisé pour insulter)

        "crève", "crever", "que tu crèves", "va crever", "je souhaite ta mort", "crève charogne",
        "va mourir", "meurs", "je vais te tuer", "je vais te buter", "je vais te fumer", "je vais te défoncer", "je vais t'éclater", "je vais te faire la peau", "je vais t'étriper", "je vais te saigner",
        "ferme ta gueule", "ta gueule", "ftg", "boucle-la", "la ferme", "tais-toi", "ferme ton clapet", "ferme ta boîte à camembert",
        "casse-toi", "dégage", "barre-toi", "va-t'en", "fous le camp", "tire-toi", "disparais", "va te faire voir", "va te jeter",
        "fils de pute", "fdp", "fils de chienne", "fils de salope", "enfant de putain", "fils de ta mère la pute",
        "bâtard", "batard", "enfant de salaud", "sans père",
        "ordure", "pourriture", "raclure", "lie de la société", "excrément de la société",
        "fumier", "tas de fumier", "sac à merde", "sac à vin",
        "va te pendre", "suicide-toi", "jette-toi d'un pont", "disparais à jamais",
        "j'emmerde", "je t'emmerde", "qu'il aille se faire foutre", "va te faire foutre", "qu'ils aillent tous se faire foutre", "je m'en carre", "je m'en contrefous",
        "rien à foutre", "rien à branler", "je m'en bats les couilles", "je m'en tape", "osef", "balec",
        "tête de con", "tête de nœud", "tête de bite", "tête de cul", "sale gueule", "gueule de con", "tronche de cake",
        "pauvre merde", "pauvre type", "pauvre merdeux", "pauvre cloche", "pauvre tache",
        "espèce de",
        "va te faire cuire un œuf", "va jouer ailleurs", "va voir là-bas si j'y suis",
        "tu pues", "tu sens mauvais", "tu pues de la gueule", "haleine de chacal",
        "lèche-bottes", "fayot", "soumis", "carpette", "serpillière",
        "hypocrite", "menteur", "menteuse", "traître", "judas", "faux-cul", "double face",
        "profiteur", "parasite social", "escroc", "voleur", "fraudeur",

        "heil hitler", "sieg heil", "croix gammée", "svastika", "88", "1488", // (nazisme et codes néo-nazis)
        "ku klux klan", "kkk",
        "satan", "diable", "démon", "belzébuth", "lucifer", "va au diable", "que le diable t'emporte",
        "hostie", "calice", "tabernacle", "sacrement", "ciboire", "viarge", "simonaque", // (jurons québécois)
        "putain de dieu", "bordel de dieu", "nom de dieu", "sacré dieu", "verdammt", "godverdomme", "scheisse", // (blasphèmes dans d'autres langues parfois utilisés)

        "drogue", "drogues", "came", "dope", "toxico", "junkie", "dealer", "deal", "planque", "four", "gourou",
        "beuh", "shit", "weed", "herbe", "marie-jeanne", "marijuana", "cannabis", "joint", "pétard", "bang", "douille", "chichon", "résine", "ganja", "skunk",
        "coke", "cocaïne", "cc", "blanche", "neige", "rail", "sniffer", "poudre", "freebase",
        "héro", "héroïne", "cheval", "brown sugar", "fix", "seringue", "junk", "horse",
        "LSD", "acide", "trip", "buvard", "ecstasy", "ecsta", "MDMA", "taz", "XTC", "E", "molly",
        "crack", "galette", "caillou", "meth", "crystal meth", "ice", "speed", "amphétamine", "amphèt",
        "tuer", "assassiner", "meurtre", "homicide", "buter", "fumer", "descendre", "liquider", "exécuter", "flinguer", "fragger",
        "égorger", "poignarder", "massacrer", "charcuter", "abattre", "sniper", "estourbir",
        "viol", "violer", "violeur", "violeuse", "agression sexuelle", "attouchement", "pédophile", "pédophilie", "inceste", "abus sexuel", "prédateur sexuel", "tournante",
         "bombe", "attentat", "exploser", "explosion", "terrorisme", "terroriste", "kamikaze", "détonateur", "semtex", "nitroglycérine",
        "arme", "armes", "flingue", "kalashnikov", "AK47", "uzi", "fusil", "carabine", "revolver", "pistolet", "couteau", "poignard", "machette", "grenade", "mitraillette", "bazooka",
        "gang", "mafia", "cartel", "racket", "arnaque", "escroquerie", "vol", "cambriolage", "braquage", "hold-up", "casse",
        "kidnapping", "enlèvement", "otage", "rançon", "séquestration",

        "tg" , "ftg", "ntm", "fdp", "vtf", "dtc" , "btg", "pov con",
        "blc" , "osef", "balec", "mblc", "jmen blc", "raf",
        "kthxbye", "stfu" , "omfg", "wtf", "lol", "mdr", "ptdr", "xptdr", // (si utilisés agressivement)
        "boloss", "bolos", "bolosse", "bouffon", "tocard", "hasbeen",
        "kikoo", "kikoolol", "kévin", "Dylan", "Jean-Eudes",
        "noob", "newbie", "débutant", "bleu", "bizuth",
        "thug", "wesh", "zarma", "chelou", "relou", "chanmé", "vénère",
        "michto", "michtonneuse", "suceuse", "pigeon", "crevard", "rat",
        "c0n", "c*n", "conn@rd", "k0n", "k0nn@rd", "$@l0pe", "s@lope",
        "m3rd3", "m*rde", "merd*", "merd0se",
        "put1", "pxtain", "p*tain", "p#t@1n", "p*t1",
        "s@l0pe", "sal*pe", "sa1ope",
        "f*ck", "phoque", "foutre",
        "sale con", "sale pute", "sale merde", "gros con", "grosse conne", "petit con", "petite conne", "vieux con", "vieille conne",
        "pauvre con", "pauvre merde", "pauvre type", "pauvre tache", "pauvre mec", "pauvre fille",
        "espèce de con", "espèce de salope", "espèce d'abruti", "espèce de crétin", "espèce de naze",
        "va te faire", "allez vous faire",
        "enculeur de poules", "pisseur de copie", "mange-merde"
    ];

    // --- Fonctions de validation ---
    const validators = {
        required: (value) => value.trim() !== '',
        email: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()),
        checked: (element) => element.checked,
        tel: (value) => /^\+?[0-9\s\-()]{7,20}$/.test(value.trim()),
        noDisallowedWords: (value) => {
            if (!value) return true;
            const lowerCaseValue = value.toLowerCase();
            const normalizedValue = lowerCaseValue
                .replace(/[àáâãäå]/g, "a").replace(/[æ]/g, "ae")
                .replace(/[èéêë]/g, "e")
                .replace(/[ìíîï]/g, "i")
                .replace(/[òóôõöø]/g, "o").replace(/[œ]/g, "oe")
                .replace(/[ùúûü]/g, "u")
                .replace(/[ç]/g, "c")
                .replace(/[ñ]/g, "n")
                .replace(/[^a-z0-9\s\-_']/g, ''); // Enlève la plupart des caractères spéciaux non alphanumériques sauf espace, -, _,'

            const wordsInValue = normalizedValue.split(/[\s\-_']+/).filter(word => word.length > 0); // Sépare par espace, -, _, '

            return !disallowedWords.some(disallowedWord => {
                const normalizedDisallowedWord = disallowedWord.toLowerCase() // La liste est déjà en minuscules et normalisée
                    .replace(/[àáâãäå]/g, "a").replace(/[æ]/g, "ae")
                    .replace(/[èéêë]/g, "e")
                    .replace(/[ìíîï]/g, "i")
                    .replace(/[òóôõöø]/g, "o").replace(/[œ]/g, "oe")
                    .replace(/[ùúûü]/g, "u")
                    .replace(/[ç]/g, "c")
                    .replace(/[ñ]/g, "n");
                // Vérification si un mot de la phrase est EXACTEMENT un mot interdit
                // OU si un mot interdit est contenu dans un mot de la phrase (plus agressif, peut donner des faux positifs)
                // Pour l'instant, on garde l'égalité exacte des mots splités.
                return wordsInValue.includes(normalizedDisallowedWord);
            });
        },
        minValidWords: (value, minCount = 15, minWordLength = 2) => { // Ex: 15 mots d'au moins 2 lettres
            if (!value) return false;
            const words = value.match(/(\b\p{L}+(['-]\p{L}+)*\b)/gu) || [];
            let validWordCount = 0;
            for (const word of words) {
                if (word.length >= minWordLength) {
                    if (/^(\p{L})\1{3,}$/u.test(word)) continue; // Ex: aaaa (4 répétitions ou plus)
                    const consonants = word.match(/[bcdfghjklmnpqrstvwxzBCDFGHJKLMNPQRSTVWXZ]{5,}/g);
                    if (consonants) continue;
                    validWordCount++;
                }
            }
            return validWordCount >= minCount;
        }
    };

    // Messages d'erreur standard
    const errorMessages = {
        required: "Ce champ est obligatoire.",
        email: "Veuillez fournir une adresse email valide.",
        checked: "Vous devez accepter cette condition.",
        tel: "Format de téléphone invalide.",
        disallowedWords: "Votre message contient des termes inappropriés. Veuillez le modifier.",
        minValidWords: "Votre message semble trop court ou ne contient pas suffisamment de mots intelligibles. Veuillez détailler davantage."
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
        // Validations spécifiques au champ message
        if (field.id === 'message' && value.trim() !== '') {
            if (isValid && !validators.noDisallowedWords(value)) {
                isValid = false; errorMessage = errorMessages.disallowedWords;
            }
            // Valider minValidWords seulement si pas déjà en erreur pour mots interdits
            if (isValid && !validators.minValidWords(value, 15, 2)) { // Mettez 20 ici si vous voulez 20 mots
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
        charCounterDisplay.textContent = `Caractères restants : ${remaining}`;
        if (remaining < 0) charCounterDisplay.classList.add("error");
        else charCounterDisplay.classList.remove("error");
    };

    const handleSubjectChange = () => {
        if(!subjectSelect || !phoneField || !otherSubjectGroup || !otherSubjectDetailsInput) return;
        const selectedSubject = subjectSelect.value;

        phoneField.removeAttribute('required');
        if(phoneRequiredIndicator) phoneRequiredIndicator.style.display = 'none';
        if (phoneOptionalText) phoneOptionalText.textContent = "(Recommandé pour un suivi rapide)";
        setFieldError(phoneField, null);

        otherSubjectGroup.style.display = 'none';
        otherSubjectDetailsInput.removeAttribute('required');
        setFieldError(otherSubjectDetailsInput, null);

        if (selectedSubject === "Demande de rappel téléphonique") {
            phoneField.setAttribute('required', 'true');
            if(phoneRequiredIndicator) phoneRequiredIndicator.style.display = 'inline';
            if (phoneOptionalText) phoneOptionalText.textContent = "(Obligatoire pour un rappel)";
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
            // Valider seulement les mots interdits à l'input pour la performance
            if (messageTextarea.value.trim() !== '') {
                if (!validators.noDisallowedWords(messageTextarea.value)) {
                    setFieldError(messageTextarea, errorMessages.disallowedWords);
                } else {
                    const currentError = document.getElementById(`${messageTextarea.id}-error`)?.textContent;
                    if (currentError === errorMessages.disallowedWords) { // Effacer si c'était l'erreur des mots interdits
                        setFieldError(messageTextarea, null);
                    }
                }
            } else {
                setFieldError(messageTextarea, null);
            }
        });
        messageTextarea.addEventListener('blur', () => validateField(messageTextarea)); // Valide tout pour le message
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
        if (submitButton.disabled && buttonText.textContent.includes("Patientez")) {
            return; 
        }

        let isFormValid = true;
        formMessage.className = "form-message";
        formMessage.textContent = "";

        form.querySelectorAll("input, select, textarea").forEach(field => {
            if (field.hasAttribute('required') || field.id === 'message') { // Valider le message pour tous ses critères
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

            if (subjectSelect.value !== "Autre sujet" || (otherSubjectDetailsInput && !otherSubjectDetailsInput.value.trim())) {
                delete formData.other_subject_details;
            }

            const response = await fetch(form.action, {
                method: "POST",
                headers: { "Content-Type": "application/json", "Accept": "application/json" },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                formMessage.textContent = "Votre demande a été envoyée avec succès. Nous reviendrons vers vous rapidement. ✅";
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
                let errorText = `Une erreur est survenue (${response.status}). Veuillez réessayer plus tard.`;
                try { const errorData = await response.json(); errorText = `Erreur : ${errorData.message || response.statusText}`; }
                catch (jsonError) { try { const plainTextError = await response.text(); if (plainTextError) errorText = `Erreur : ${plainTextError}`; } catch (textError) {} }
                formMessage.textContent = errorText + " ❌";
                formMessage.className = "form-message error show";
            }
        } catch (error) {
            console.error("Erreur réseau ou JS lors de la soumission:", error);
            formMessage.textContent = "Impossible de contacter le serveur. Veuillez vérifier votre connexion internet et réessayer. 🌐";
            formMessage.className = "form-message error show";
        } finally {
            loader.classList.remove("show");
            buttonText.classList.remove("hide"); 

            if (formMessage.classList.contains('success')) {
                buttonText.textContent = "Merci ! Patientez 2 min...";
                setTimeout(() => {
                    if (submitButton.disabled && formMessage.classList.contains('success') && buttonText.textContent.includes("Patientez")) {
                        submitButton.disabled = false;
                        buttonText.textContent = "Envoyer ma demande";
                    }
                }, 120000); // 2 minutes
            } else {
                submitButton.disabled = false;
                buttonText.textContent = "Envoyer ma demande";
            }
        }
    });
});