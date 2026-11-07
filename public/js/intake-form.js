/* Espace client : questionnaire d'eligibilite approfondi (prospects invites) — moteur commun aux 5 langues.
   Acces, au choix :
     - identifiants : adresse e-mail + mot de passe de 8 caracteres propose par EZRA (page ouverte depuis le
       bouton « Espace client » du site ou l'adresse recue par e-mail) ;
     - lien direct signe (jeton apres le #, jamais envoye a un serveur web) + le meme mot de passe.
   Toujours avec l'anti-robot Cloudflare Turnstile. La fonction Cloudflare verifie tout et renvoie une
   session (4 h) gardee en memoire seulement : rien n'est ecrit dans le navigateur (ni cookie, ni stockage).
   Ecrans : connexion (formulaire + panneau d'accueil), etapes (barre d'etapes, champs groupes, champs
   conditionnels en ligne via showIf, validation), verification (cartes modifiables), confirmation.
   Le serveur revalide tout et compose lui-meme le recapitulatif. 0 dependance.
   Modele : <script type="application/json" id="intake-data"> (src/data/intake/<langue>.json).
   Styles : public/styles/intake.css. Icones Font Awesome : relancer scripts/subset-fontawesome.py si on en ajoute. */
(function () {
  'use strict';
  var dataEl = document.getElementById('intake-data');
  var app = document.getElementById('intake-app');
  if (!dataEl || !app) return;
  // Jamais dans le cadre d'un autre site (detournement de clics) : la page refuse de s'afficher
  if (window.top !== window.self) { app.textContent = ''; return; }
  var D = JSON.parse(dataEl.textContent);
  var U = D.ui;
  var lang = (document.documentElement.lang || 'fr').split('-')[0];
  var rtl = document.documentElement.dir === 'rtl';
  var BACK_ICON = rtl ? 'fa-solid fa-arrow-right' : 'fa-solid fa-arrow-left';
  var NEXT_ICON = rtl ? 'fa-solid fa-arrow-left' : 'fa-solid fa-arrow-right';
  var ENDPOINT = (app.getAttribute('data-endpoint') || '').replace(/\/+$/, '');
  var SITEKEY = app.getAttribute('data-sitekey') || '';
  var CONTACT_URL = app.getAttribute('data-contact') || '';
  var HOME_URL = app.getAttribute('data-home') || '/';
  var SECTIONS = D.sections;
  var REVIEW = SECTIONS.length; // position de l'etape « Verification » dans la barre d'etapes
  var OTHER = '__other__';

  var answers = {};       // { idQuestion: valeur | {sel:[], other:''} }
  var sectionIdx = 0;
  var furthest = 0;       // etape la plus avancee deja atteinte (barre d'etapes cliquable jusque-la)
  var errors = {};
  var session = null;     // jeton de session (memoire seulement)
  var submitted = false;
  var afterAccess = null; // ecran a rouvrir apres une nouvelle connexion (session expiree)
  var lastEmail = '';     // identifiant deja saisi (reconnexion apres session expiree)
  var shown = null;       // questions affichees au rendu precedent de la section (apparition des nouvelles)

  // ---------- jeton du lien : lu apres le #, puis efface de la barre d'adresse et de l'historique ----------
  var TOKEN = null;
  var tokenInfo = null;
  (function readToken() {
    var m = /(?:^#|&)t=([A-Za-z0-9._-]{20,400})/.exec(location.hash || '');
    if (m) TOKEN = m[1];
    if (location.hash) {
      try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* ancien navigateur */ }
    }
    if (!TOKEN) return;
    try { // lecture NON fiable (affichage seulement) : le serveur verifie la signature
      var p = TOKEN.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      while (p.length % 4) p += '=';
      tokenInfo = JSON.parse(atob(p));
    } catch (e) { tokenInfo = null; }
    // Lien abime (copie incomplete...) : connexion classique avec l'adresse e-mail et le mot de passe
    if (!tokenInfo || typeof tokenInfo.e !== 'number') { TOKEN = null; tokenInfo = null; }
  })();

  // Le selecteur de langue garde l'acces (le jeton suit dans l'ancre)
  if (TOKEN) {
    var ls = document.getElementById('lang-select');
    if (ls) Array.prototype.forEach.call(ls.options, function (o) { if (o.value) o.value = o.value.split('#')[0] + '#t=' + TOKEN; });
  }

  // Quitter la page avec des reponses non envoyees : alerte du navigateur
  window.addEventListener('beforeunload', function (e) {
    if (!submitted && Object.keys(answers).length) { e.preventDefault(); e.returnValue = ''; }
  });

  function h(tag, attrs, kids) {
    var e = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      var v = attrs[k];
      if (k === 'class') e.className = v;
      else if (k.indexOf('on') === 0) e.addEventListener(k.slice(2), v);
      else if (v !== null && v !== undefined && v !== false) e.setAttribute(k, v === true ? '' : v);
    });
    (kids || []).forEach(function (c) { if (c) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return e;
  }
  function icon(cls) { return h('i', { class: cls, 'aria-hidden': 'true' }); }

  // Listes deroulantes (pays) triees dans l'ordre alphabetique de la langue, "Autre" en dernier
  var collator = window.Intl && Intl.Collator ? new Intl.Collator(lang) : null;
  function optionsOf(q) {
    var opts = q.optionsRef ? D.optionLists[q.optionsRef] : (q.options || []);
    if (q.type !== 'select' || !collator) return opts;
    return opts.slice().sort(function (a, b) {
      if (a.id === 'autre') return 1;
      if (b.id === 'autre') return -1;
      return collator.compare(a.text, b.text);
    });
  }
  function labelOf(q, id) {
    var o = optionsOf(q).filter(function (x) { return x.id === id; })[0];
    return o ? o.text : id;
  }

  // Dates de la verification en toutes lettres, dans la langue de la page (chiffres latins en arabe)
  var dateFmt = null;
  try {
    dateFmt = new Intl.DateTimeFormat(lang === 'ar' ? 'ar-MA-u-nu-latn' : lang, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  } catch (e) { dateFmt = null; }
  function fmtDate(v) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(v));
    if (!m) return String(v);
    if (dateFmt) { try { return dateFmt.format(new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]))); } catch (e) { /* repli */ } }
    return m[3] + '/' + m[2] + '/' + m[1];
  }

  function showIfPass(q) {
    if (!q.showIf) return true;
    var v = answers[q.showIf.q];
    if (v === undefined || v === null) return false;
    var vals = Array.isArray(v) ? v : (v && v.sel ? v.sel : [v]);
    return q.showIf.in.some(function (x) { return vals.indexOf(x) !== -1; });
  }
  function sectionQuestions(sec) {
    return D.questions.filter(function (q) { return q.section === sec.id && showIfPass(q); });
  }
  function isController(qid) {
    return D.questions.some(function (q) { return q.showIf && q.showIf.q === qid; });
  }
  function isAnswered(q) {
    var v = answers[q.id];
    if (q.type === 'multi') {
      var sel = v && v.sel ? v.sel : [];
      if (!sel.length) return false;
      if (sel.indexOf(OTHER) !== -1) return !!(v.other && v.other.trim());
      return true;
    }
    return v !== undefined && v !== null && String(v).trim() !== '';
  }

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  var TEL_RE = /^[+()\-\s.0-9]{6,40}$/;
  var TODAY = new Date().toISOString().slice(0, 10);

  function validate(q) {
    if (!q.required && !isAnswered(q)) return null;
    if (q.required && !isAnswered(q)) return U.errRequired;
    var v = String(answers[q.id] || '').trim();
    if (q.type === 'email' && !EMAIL_RE.test(v)) return U.errEmail;
    if (q.type === 'tel' && (!TEL_RE.test(v) || (v.match(/\d/g) || []).length < 6)) return U.errTel;
    if (q.type === 'date' && (!/^\d{4}-\d{2}-\d{2}$/.test(v) || v < '1900-01-01' || v > TODAY)) return U.errDate;
    return null;
  }
  function sectionErrors(idx) {
    var errs = {};
    var first = null;
    sectionQuestions(SECTIONS[idx]).forEach(function (q) {
      var e = validate(q);
      if (e) { errs[q.id] = e; if (!first) first = q.id; }
    });
    return { errs: errs, first: first };
  }

  // ---------- champs ----------
  function fieldId(q) { return 'f_' + q.id; }

  function renderField(q) {
    var wrap = h('div', { class: 'intake-field' + (q.width === 'half' ? ' is-half' : ''), 'data-q': q.id });
    var isGroup = q.type === 'single' || q.type === 'multi';
    var labelId = 'l_' + q.id;
    // Obligatoire par defaut (rappel en tete d'etape) : seules les questions facultatives sont signalees
    var opt = q.required ? null : h('span', { class: 'intake-opt' }, [' ' + U.optional]);
    wrap.appendChild(h(isGroup ? 'p' : 'label', isGroup ? { class: 'intake-label', id: labelId } : { class: 'intake-label', 'for': fieldId(q), id: labelId }, [q.text, opt]));
    if (q.help) wrap.appendChild(h('p', { class: 'intake-help', id: 'h_' + q.id }, [q.help]));
    if (q.type === 'multi') wrap.appendChild(h('p', { class: 'intake-hint', id: 'm_' + q.id }, [U.multiHint]));
    var describedBy = [q.help ? 'h_' + q.id : '', q.type === 'multi' ? 'm_' + q.id : '', errors[q.id] ? 'e_' + q.id : '']
      .filter(Boolean).join(' ') || null;
    var common = {
      id: fieldId(q), 'aria-required': q.required ? 'true' : null,
      'aria-invalid': errors[q.id] ? 'true' : null, 'aria-describedby': describedBy
    };

    if (q.type === 'text' || q.type === 'email' || q.type === 'tel' || q.type === 'date') {
      wrap.appendChild(h('input', Object.assign({}, common, {
        class: 'intake-input', type: q.type === 'text' ? 'text' : q.type,
        value: answers[q.id] || '', placeholder: q.placeholder || null,
        autocomplete: q.autocomplete || 'off', maxlength: q.type === 'email' ? '254' : (q.type === 'tel' ? '40' : (q.type === 'date' ? null : '150')),
        min: q.type === 'date' ? '1900-01-01' : null, max: q.type === 'date' ? TODAY : null,
        dir: q.type === 'email' || q.type === 'tel' ? 'ltr' : null,
        oninput: function (e) { answers[q.id] = e.target.value; clearError(q); }
      })));
    } else if (q.type === 'paragraph') {
      wrap.appendChild(h('textarea', Object.assign({}, common, {
        class: 'intake-input intake-textarea', rows: '5', maxlength: '3000', placeholder: q.placeholder || null,
        oninput: function (e) { answers[q.id] = e.target.value; clearError(q); }
      }), [answers[q.id] || '']));
    } else if (q.type === 'select') {
      var sel = h('select', Object.assign({}, common, {
        class: 'intake-input intake-select',
        onchange: function (e) { answers[q.id] = e.target.value; clearError(q); maybeRerender(q); }
      }), [h('option', { value: '' }, [U.choose])]);
      optionsOf(q).forEach(function (o) {
        sel.appendChild(h('option', { value: o.id, selected: answers[q.id] === o.id }, [o.text]));
      });
      wrap.appendChild(sel);
    } else if (isGroup) {
      wrap.appendChild(renderButtonGroup(q, q.type === 'multi', labelId, describedBy));
    }
    if (errors[q.id]) wrap.appendChild(h('p', { class: 'intake-error', id: 'e_' + q.id, role: 'alert' }, [errors[q.id]]));
    return wrap;
  }

  // Disposition des choix selon leurs libelles (calculee dans chaque langue) : peu de choix courts =>
  // pastilles a la taille du texte ; beaucoup de choix tres courts => grille reguliere ; libelles moyens =>
  // deux colonnes ; phrases => liste.
  function optionsLayout(q, multi) {
    var opts = optionsOf(q);
    var count = opts.length + (multi && q.other ? 1 : 0);
    var maxLen = opts.reduce(function (m, o) { return Math.max(m, String(o.text).length); }, 0);
    if (count <= 6 && maxLen <= 30) return 'is-pills';
    if (maxLen <= 18) return 'is-grid';
    if (count >= 5 && maxLen <= 40) return 'is-grid2';
    return 'is-list';
  }

  // Choix unique = groupe radio (un seul arret de tabulation, fleches pour changer) ; choix multiple =
  // boutons a cocher.
  function renderButtonGroup(q, multi, labelId, describedBy) {
    var opts = optionsOf(q);
    var group = h('div', {
      class: 'intake-options ' + optionsLayout(q, multi) + (multi ? ' is-multi' : ''),
      role: multi ? 'group' : 'radiogroup', 'aria-labelledby': labelId, 'aria-describedby': describedBy,
      'aria-required': !multi && q.required ? 'true' : null, 'aria-invalid': !multi && errors[q.id] ? 'true' : null
    });
    var cur = answers[q.id];
    var sel = multi ? (cur && cur.sel ? cur.sel.slice() : []) : cur;
    var otherInput = null;
    var hasPick = !multi && opts.some(function (o) { return o.id === sel; });

    function save() { answers[q.id] = { sel: sel.slice(), other: otherInput ? otherInput.value : '' }; clearError(q); }

    opts.forEach(function (o, k) {
      var on = multi ? sel.indexOf(o.id) !== -1 : sel === o.id;
      group.appendChild(h('button', {
        type: 'button', class: 'intake-option', 'data-opt': o.id, role: multi ? null : 'radio',
        'aria-pressed': multi ? (on ? 'true' : 'false') : null,
        'aria-checked': multi ? null : (on ? 'true' : 'false'),
        tabindex: multi ? null : ((on || (!hasPick && k === 0)) ? '0' : '-1'),
        onclick: function () {
          if (!multi) {
            answers[q.id] = o.id; sel = o.id; clearError(q);
            Array.prototype.forEach.call(group.querySelectorAll('.intake-option'), function (b, i) {
              var me = opts[i] && opts[i].id === o.id;
              b.setAttribute('aria-checked', me ? 'true' : 'false');
              b.setAttribute('tabindex', me ? '0' : '-1');
            });
            maybeRerender(q, o.id);
            return;
          }
          var i = sel.indexOf(o.id);
          if (i !== -1) sel.splice(i, 1); else sel.push(o.id);
          this.setAttribute('aria-pressed', sel.indexOf(o.id) !== -1 ? 'true' : 'false');
          save();
          maybeRerender(q, o.id);
        }
      }, [h('span', { class: 'intake-check', 'aria-hidden': 'true' }), h('span', { class: 'intake-option-text' }, [o.text])]));
    });

    if (!multi) {
      group.addEventListener('keydown', function (e) {
        var step = { ArrowDown: 1, ArrowUp: -1, ArrowRight: rtl ? -1 : 1, ArrowLeft: rtl ? 1 : -1 }[e.key];
        if (!step) return;
        var btns = Array.prototype.slice.call(group.querySelectorAll('.intake-option'));
        var i = btns.indexOf(document.activeElement);
        if (i === -1) return;
        e.preventDefault();
        var nb = btns[(i + step + btns.length) % btns.length];
        nb.click();
        if (nb.isConnected) nb.focus();
      });
    }

    var holder = h('div', {}, [group]);
    if (multi && q.other) {
      var otherOn = sel.indexOf(OTHER) !== -1;
      group.appendChild(h('button', {
        type: 'button', class: 'intake-option', 'data-opt': OTHER, 'aria-pressed': otherOn ? 'true' : 'false',
        onclick: function () {
          var i = sel.indexOf(OTHER);
          if (i !== -1) sel.splice(i, 1); else sel.push(OTHER);
          var nowOn = sel.indexOf(OTHER) !== -1;
          this.setAttribute('aria-pressed', nowOn ? 'true' : 'false');
          otherInput.hidden = !nowOn;
          if (nowOn) otherInput.focus();
          save();
        }
      }, [h('span', { class: 'intake-check', 'aria-hidden': 'true' }), h('span', { class: 'intake-option-text' }, [U.otherLabel])]));
      otherInput = h('input', {
        class: 'intake-input intake-other', type: 'text', maxlength: '120', placeholder: U.otherPlaceholder,
        'aria-label': U.otherLabel, value: (cur && cur.other) || '', hidden: !otherOn,
        oninput: function () { save(); }
      });
      holder.appendChild(otherInput);
    }
    return holder;
  }

  function clearError(q) {
    if (!errors[q.id]) return;
    delete errors[q.id];
    var w = app.querySelector('[data-q="' + q.id + '"]');
    if (!w) return;
    var e = w.querySelector('.intake-error');
    if (e) e.remove();
    Array.prototype.forEach.call(w.querySelectorAll('[aria-invalid]'), function (x) { x.removeAttribute('aria-invalid'); });
    Array.prototype.forEach.call(w.querySelectorAll('[aria-describedby]'), function (x) {
      var ids = x.getAttribute('aria-describedby').split(' ').filter(function (id) { return id !== 'e_' + q.id; });
      if (ids.length) x.setAttribute('aria-describedby', ids.join(' ')); else x.removeAttribute('aria-describedby');
    });
  }

  // Une question qui en conditionne d'autres : on re-affiche l'etape (reponses conservees), sans animation,
  // en rendant le focus au meme choix (clavier / lecteur d'ecran) ; les questions qui apparaissent s'animent
  function maybeRerender(q, optId) {
    if (!isController(q.id)) return;
    renderSection({ focus: false, animate: false });
    var el = app.querySelector(optId ? '[data-q="' + q.id + '"] [data-opt="' + optId + '"]' : '#' + fieldId(q));
    if (el) el.focus({ preventScroll: true });
  }

  // ---------- ecrans ----------
  // Premier ecran : la page reste en haut (banniere visible) ; ensuite, chaque changement d'ecran ramene la
  // carte en vue et donne le focus a son titre (lecteurs d'ecran). opts.top = bloc fixe au-dessus (etapes).
  var firstScreen = true;
  function screen(kind, nodes, opts) {
    opts = opts || {};
    app.className = 'intake-card is-' + kind;
    app.setAttribute('data-screen', kind);
    if (kind !== 'form') app.removeAttribute('data-section');
    app.textContent = '';
    if (opts.top) app.appendChild(opts.top);
    var body = h('div', { class: 'intake-screen' + (opts.animate === false ? '' : ' is-entering') });
    nodes.forEach(function (n) { if (n) body.appendChild(n); });
    app.appendChild(body);
    if (firstScreen) { firstScreen = false; return; }
    if (opts.focus !== false) focusHeading();
  }

  function focusHeading() {
    var el = document.getElementById('intake-h');
    var header = document.querySelector('.site-header');
    var offset = (header ? header.offsetHeight : 70) + 16;
    var top = app.getBoundingClientRect().top;
    if (top < offset || top > window.innerHeight * 0.4) window.scrollTo({ top: window.pageYOffset + top - offset, behavior: 'smooth' });
    if (el) el.focus({ preventScroll: true });
  }

  // Barre d'etapes : 5 etapes + verification. Etapes deja atteintes cliquables (retour sans perte).
  function stepper(current) {
    var items = SECTIONS.map(function (s, i) { return { i: i, label: s.short || s.title }; });
    items.push({ i: REVIEW, label: U.stepReview });
    var ol = h('ol', {});
    items.forEach(function (it) {
      var isCur = it.i === current;
      var done = !isCur && it.i < furthest;
      var reachable = !isCur && it.i <= furthest;
      var dot = h('span', { class: 'intake-step-dot', 'aria-hidden': 'true' },
        [done ? icon('fa-solid fa-check') : (it.i === REVIEW ? icon('fa-solid fa-flag-checkered') : String(it.i + 1))]);
      var kids = [dot, h('span', { class: 'intake-step-label' }, [it.label]), done ? h('span', { class: 'intake-sr' }, [' (' + U.stepDone + ')']) : null];
      var inner = reachable
        ? h('button', { type: 'button', class: 'intake-step', onclick: function () { if (it.i === REVIEW) toReview(); else goSection(it.i); } }, kids)
        : h('span', { class: 'intake-step' }, kids);
      ol.appendChild(h('li', {
        class: 'intake-steps-item' + (done ? ' is-done' : '') + (isCur ? ' is-current' : '') + (reachable && !done ? ' is-reachable' : ''),
        'aria-current': isCur ? 'step' : null
      }, [inner]));
    });
    return h('nav', { class: 'intake-steps', 'aria-label': U.stepsLabel }, [ol]);
  }

  // Ecran final (envoye) ou message (deja envoye, acces expire, bloque)
  function message(kind, title, text, variant) {
    var ok = kind === 'ok';
    var sym = ok ? 'fa-solid fa-check' : (kind === 'lock' ? 'fa-solid fa-lock' : 'fa-solid fa-circle-exclamation');
    var nodes = [
      h('div', { class: 'intake-done-icon ' + (ok ? 'ok' : 'err'), 'aria-hidden': 'true' }, [icon(sym)]),
      h('h2', { tabindex: '-1', id: 'intake-h' }, [title]),
      h('p', { class: 'intake-done-text' }, [text])
    ];
    if (variant === 'sent') {
      nodes.push(h('div', { class: 'intake-next-steps' }, [
        h('h3', {}, [U.nextTitle]),
        h('ol', {}, [['fa-solid fa-magnifying-glass', U.next1], ['fa-solid fa-phone', U.next2], ['fa-solid fa-comments', U.next3]].map(function (s) {
          return h('li', {}, [h('span', { class: 'intake-next-icon', 'aria-hidden': 'true' }, [icon(s[0])]), h('span', {}, [s[1]])]);
        }))
      ]));
    }
    var contact = CONTACT_URL ? h('a', { class: 'intake-btn ' + (ok ? 'intake-btn-ghost' : 'intake-btn-primary'), href: CONTACT_URL },
      [icon('fa-solid fa-envelope'), h('span', {}, [U.noAccessLink])]) : null;
    var home = h('a', { class: 'intake-btn ' + (ok ? 'intake-btn-primary' : 'intake-btn-ghost'), href: HOME_URL },
      [icon('fa-solid fa-house'), h('span', {}, [U.homeLink])]);
    nodes.push(h('div', { class: 'intake-done-actions' }, ok ? [home, variant === 'sent' ? null : contact] : [contact, home]));
    screen('done', [h('div', { class: 'intake-done is-' + (ok ? 'ok' : 'err') }, nodes)]);
  }

  // ---------- ecran d'acces : identifiants (e-mail + mot de passe) ou lien direct + mot de passe ----------
  var tsWidget = null;
  var tsToken = '';

  function whenTurnstile(cb, tries) {
    if (window.turnstile && window.turnstile.render) return cb();
    if ((tries || 0) > 100) return cb(new Error('turnstile'));
    setTimeout(function () { whenTurnstile(cb, (tries || 0) + 1); }, 100);
  }

  // Mot de passe : masque par defaut (bouton afficher / masquer), mis en forme XXXX-XXXX a la saisie
  function passwordField(onEnter, onInput) {
    var input = h('input', {
      id: 'intake-code', class: 'intake-input intake-code', type: 'password', inputmode: 'text',
      autocomplete: TOKEN ? 'one-time-code' : 'current-password', autocapitalize: 'characters', spellcheck: 'false', dir: 'ltr',
      maxlength: '9', placeholder: U.codePlaceholder, 'aria-describedby': 'intake-access-msg', 'aria-required': 'true',
      oninput: function (e) {
        var raw = e.target.value.toUpperCase().replace(/[^0-9A-Z]/g, '').slice(0, 8);
        e.target.value = raw.length > 4 ? raw.slice(0, 4) + '-' + raw.slice(4) : raw;
        onInput();
      },
      onkeydown: function (e) { if (e.key === 'Enter') { e.preventDefault(); onEnter(); } }
    });
    var eye = icon('fa-solid fa-eye');
    var toggle = h('button', {
      type: 'button', class: 'intake-reveal', 'aria-pressed': 'false', 'aria-controls': 'intake-code',
      'aria-label': U.showPassword, title: U.showPassword,
      onclick: function () {
        var show = input.type === 'password';
        input.type = show ? 'text' : 'password';
        toggle.setAttribute('aria-pressed', show ? 'true' : 'false');
        toggle.setAttribute('title', show ? U.hidePassword : U.showPassword);
        eye.className = show ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye';
        input.focus();
      }
    }, [eye]);
    return { input: input, box: h('div', { class: 'intake-ifield intake-password' }, [icon('fa-solid fa-key intake-lead'), input, toggle]) };
  }

  function welcomePanel() {
    var steps = [[U.step1Title, U.step1Text], [U.step2Title, U.step2Text], [U.step3Title, U.step3Text]];
    var trust = [['fa-solid fa-lock', U.trust1], ['fa-solid fa-user-shield', U.trust2], ['fa-solid fa-laptop', U.trust3]];
    return h('aside', { class: 'intake-welcome', 'aria-labelledby': 'intake-welcome-h' }, [
      h('h2', { class: 'intake-welcome-title', id: 'intake-welcome-h' }, [U.welcomeTitle]),
      h('p', { class: 'intake-welcome-text' }, [U.welcomeText]),
      h('ol', { class: 'intake-howto' }, steps.map(function (s, i) {
        return h('li', {}, [
          h('span', { class: 'intake-howto-num', 'aria-hidden': 'true' }, [String(i + 1)]),
          h('span', { class: 'intake-howto-body' }, [h('strong', {}, [s[0]]), h('span', {}, [s[1]])])
        ]);
      })),
      h('ul', { class: 'intake-trust' }, trust.map(function (t) { return h('li', {}, [icon(t[0]), h('span', {}, [t[1]])]); }))
    ]);
  }

  function renderAccess(note) {
    var linkMode = !!TOKEN; // lien direct : l'identifiant est dans le lien, seul le mot de passe est demande
    var btnLabel = linkMode ? U.accessButton : U.loginButton;
    var msg = h('p', { class: 'intake-error intake-alert', id: 'intake-access-msg', role: 'alert', 'aria-live': 'assertive' }, [note || '']);
    if (note) msg.classList.add('intake-note');
    function clearMsg() { msg.textContent = ''; }
    var pwd = passwordField(submitAccess, clearMsg);
    var emailInput = linkMode ? null : h('input', {
      id: 'intake-email', class: 'intake-input', type: 'email', inputmode: 'email', autocomplete: 'username',
      autocapitalize: 'none', spellcheck: 'false', dir: 'ltr', maxlength: '254', value: lastEmail || null,
      placeholder: U.emailPlaceholder, 'aria-describedby': 'intake-access-msg', 'aria-required': 'true',
      oninput: clearMsg,
      onkeydown: function (e) { if (e.key === 'Enter') { e.preventDefault(); pwd.input.focus(); } }
    });
    var btnText = h('span', {}, [btnLabel]);
    var btn = h('button', { type: 'button', class: 'intake-btn intake-btn-primary intake-btn-block intake-access-btn', onclick: submitAccess },
      [icon('fa-solid fa-lock'), btnText]);
    var tsBox = h('div', { id: 'intake-turnstile', class: 'intake-turnstile' });

    var form = h('div', { class: 'intake-access intake-login' }, [
      h('div', { class: 'intake-login-head' }, [
        h('span', { class: 'intake-login-icon', 'aria-hidden': 'true' }, [icon('fa-solid fa-user-lock')]),
        h('h2', { class: 'intake-section-title', tabindex: '-1', id: 'intake-h' }, [linkMode ? U.accessTitle : U.loginTitle]),
        h('p', { class: 'intake-section-intro' }, [linkMode ? U.accessText : U.loginText])
      ]),
      emailInput ? h('div', { class: 'intake-login-field' }, [
        h('label', { class: 'intake-label', 'for': 'intake-email' }, [U.emailLabel]),
        h('div', { class: 'intake-ifield' }, [icon('fa-solid fa-envelope intake-lead'), emailInput])
      ]) : null,
      h('div', { class: 'intake-login-field' }, [h('label', { class: 'intake-label', 'for': 'intake-code' }, [U.codeLabel]), pwd.box]),
      msg, tsBox, btn,
      linkMode ? null : h('p', { class: 'intake-noaccess' }, [U.noAccess + ' ', CONTACT_URL ? h('a', { href: CONTACT_URL }, [U.noAccessLink]) : null])
    ]);
    screen('login', [h('div', { class: 'intake-split' }, [form, welcomePanel()])]);
    // Retour apres session expiree : saisie directe du mot de passe (l'adresse est deja remplie)
    if (note) (emailInput && !lastEmail ? emailInput : pwd.input).focus({ preventScroll: true });

    tsToken = '';
    tsWidget = null;
    whenTurnstile(function (err) {
      if (err || !SITEKEY) return;
      try {
        tsWidget = window.turnstile.render(tsBox, {
          sitekey: SITEKEY, appearance: 'interaction-only', language: lang === 'ar' ? 'ar' : lang,
          callback: function (t) { tsToken = t; },
          'expired-callback': function () { tsToken = ''; },
          'error-callback': function () { tsToken = ''; }
        });
      } catch (e) { /* widget indisponible : le serveur refusera, message affiche */ }
    });

    function waitToken(cb, tries) {
      if (tsToken || (tries || 0) > 80) return cb();
      setTimeout(function () { waitToken(cb, (tries || 0) + 1); }, 100);
    }
    function busy(on) {
      btn.disabled = on;
      btn.classList.toggle('is-busy', on);
      btn.setAttribute('aria-busy', on ? 'true' : 'false');
      btnText.textContent = on ? U.verifying : btnLabel;
    }

    function submitAccess() {
      var code = pwd.input.value.replace(/[^0-9A-Za-z]/g, '');
      var email = emailInput ? emailInput.value.trim() : '';
      msg.classList.remove('intake-note');
      if (emailInput && !EMAIL_RE.test(email)) { msg.textContent = U.errLoginFormat; emailInput.focus(); return; }
      if (code.length !== 8) { msg.textContent = linkMode ? U.errCodeFormat : U.errLoginFormat; pwd.input.focus(); return; }
      if (emailInput) lastEmail = email;
      busy(true);
      waitToken(function () {
        var path = linkMode ? '/intake/verify' : '/intake/login';
        var body = linkMode ? { token: TOKEN, code: code, turnstile: tsToken } : { email: email, code: code, turnstile: tsToken };
        api(path, body, function (status, data) {
          busy(false);
          if (window.turnstile && tsWidget !== null) { try { window.turnstile.reset(tsWidget); } catch (e) { /* */ } }
          tsToken = '';
          var state = data && data.state;
          if (status === 200 && data && data.ok && data.session) {
            session = data.session;
            var back = afterAccess;
            afterAccess = null;
            if (back === 'review') renderReview(); else renderSection();
            return;
          }
          if (state === 'wrong') { msg.textContent = U.errCodeWrong.replace('{n}', data.remaining); pwd.input.select(); return; }
          // Identifiants : meme message que l'adresse soit inconnue ou le mot de passe faux (rien ne fuit)
          if (state === 'login') { msg.textContent = U.errLogin; pwd.input.select(); return; }
          if (state === 'format') { msg.textContent = U.errLoginFormat; return; }
          if (state === 'locked') return message('lock', U.lockedTitle, U.lockedText);
          if (state === 'used') { submitted = true; return message('ok', U.usedTitle, U.usedText, 'used'); }
          if (state === 'expired' || state === 'invalid') return message('err', U.expiredTitle, U.expiredText);
          msg.textContent = (state === 'bot' || state === 'rate') ? U.errBot : U.errNetwork;
        });
      });
    }
  }

  // ---------- etapes ----------
  function renderSection(opts) {
    opts = opts || {};
    var sec = SECTIONS[sectionIdx];
    var qs = sectionQuestions(sec);
    var rerender = opts.animate === false && shown && shown.section === sectionIdx;
    var fields = h('div', { class: 'intake-fields' });
    qs.forEach(function (q) {
      var f = renderField(q);
      if (rerender && shown.ids.indexOf(q.id) === -1) f.classList.add('is-new');
      fields.appendChild(f);
    });
    shown = { section: sectionIdx, ids: qs.map(function (q) { return q.id; }) };
    var last = sectionIdx === SECTIONS.length - 1;
    var nav = h('div', { class: 'intake-nav' }, [
      sectionIdx > 0
        ? h('button', { type: 'button', class: 'intake-btn intake-btn-ghost intake-back', onclick: function () { goSection(sectionIdx - 1); } },
          [icon(BACK_ICON), h('span', {}, [U.back])])
        : null,
      h('div', { class: 'intake-nav-main' }, [
        furthest === REVIEW && !last ? h('button', { type: 'button', class: 'intake-btn intake-btn-link', onclick: toReview }, [U.backToReview]) : null,
        h('button', { type: 'button', class: 'intake-btn intake-btn-primary intake-next', onclick: nextSection },
          [h('span', {}, [last ? U.toReview : U.next]), icon(NEXT_ICON)])
      ])
    ]);
    screen('form', [
      h('header', { class: 'intake-head' }, [
        h('p', { class: 'intake-eyebrow' }, [U.stepOf.replace('{n}', String(sectionIdx + 1)).replace('{total}', String(SECTIONS.length))]),
        h('h2', { class: 'intake-section-title', tabindex: '-1', id: 'intake-h' }, [sec.title]),
        sec.intro ? h('p', { class: 'intake-section-intro' }, [sec.intro]) : null,
        h('p', { class: 'intake-required-note' }, [U.requiredNote])
      ]),
      fields, nav
    ], { top: stepper(sectionIdx), focus: opts.focus, animate: opts.animate });
    app.setAttribute('data-section', sec.id);
  }

  function goSection(i) {
    errors = {};
    sectionIdx = i;
    renderSection();
  }

  function nextSection() {
    var r = sectionErrors(sectionIdx);
    errors = r.errs;
    if (r.first) { renderSection({ focus: false, animate: false }); focusField(r.first); return; }
    if (sectionIdx < SECTIONS.length - 1) {
      sectionIdx++;
      furthest = Math.max(furthest, sectionIdx);
      renderSection();
    } else toReview();
  }

  // Verification : toutes les etapes sont revalidees (une reponse modifiee peut en rendre une autre necessaire)
  function toReview() {
    for (var i = 0; i < SECTIONS.length; i++) {
      var r = sectionErrors(i);
      if (r.first) {
        var same = i === sectionIdx;
        errors = r.errs;
        sectionIdx = i;
        renderSection({ focus: false, animate: !same });
        focusField(r.first);
        return;
      }
    }
    errors = {};
    renderReview();
  }

  function focusField(qid) {
    var el = app.querySelector('[data-q="' + qid + '"]');
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    var inp = el.querySelector('input:not([hidden]),select,textarea,[role="radio"][tabindex="0"],button');
    if (inp) inp.focus({ preventScroll: true });
  }

  // ---------- verification et envoi ----------
  function valueText(q) {
    var v = answers[q.id];
    if (q.type === 'multi') {
      var parts = v.sel.filter(function (x) { return x !== OTHER; }).map(function (id) { return labelOf(q, id); });
      if (v.sel.indexOf(OTHER) !== -1 && v.other) parts.push(U.otherLabel + ' : ' + v.other);
      return parts.join(', ');
    }
    if (q.type === 'single' || q.type === 'select') return labelOf(q, v);
    if (q.type === 'date') return fmtDate(v);
    return String(v);
  }

  function renderReview(banner) {
    sectionIdx = SECTIONS.length - 1;
    furthest = REVIEW;
    var list = h('div', { class: 'intake-review' });
    SECTIONS.forEach(function (sec, i) {
      var qs = sectionQuestions(sec).filter(isAnswered);
      if (!qs.length) return;
      var dl = h('dl', { class: 'intake-review-list' });
      qs.forEach(function (q) { dl.appendChild(h('dt', {}, [q.text])); dl.appendChild(h('dd', { dir: 'auto' }, [valueText(q)])); });
      list.appendChild(h('section', { class: 'intake-review-card', 'aria-labelledby': 'rv_' + sec.id }, [
        h('div', { class: 'intake-review-head' }, [
          h('span', { class: 'intake-review-num', 'aria-hidden': 'true' }, [String(i + 1)]),
          h('h3', { id: 'rv_' + sec.id }, [sec.title]),
          h('button', { type: 'button', class: 'intake-edit', onclick: function () { goSection(i); } },
            [icon('fa-solid fa-pen'), h('span', {}, [U.edit]), h('span', { class: 'intake-sr' }, [' : ' + sec.title])])
        ]),
        dl
      ]));
    });
    var noConsent = answers.consent_contact === 'non';
    var sendText = h('span', {}, [U.submit]);
    var send = h('button', { type: 'button', class: 'intake-btn intake-btn-primary intake-submit', disabled: noConsent, onclick: function () { doSubmit(send, sendText); } },
      [icon('fa-solid fa-paper-plane'), sendText]);
    screen('review', [
      h('header', { class: 'intake-head' }, [
        h('p', { class: 'intake-eyebrow' }, [U.stepReview]),
        h('h2', { class: 'intake-section-title', tabindex: '-1', id: 'intake-h' }, [U.reviewTitle]),
        h('p', { class: 'intake-section-intro' }, [U.reviewIntro])
      ]),
      banner ? h('p', { class: 'intake-error intake-banner', role: 'alert' }, [banner]) : null,
      list,
      noConsent ? h('p', { class: 'intake-error intake-banner', role: 'alert' }, [U.consentBlock]) : null,
      h('div', { class: 'intake-callout' }, [icon('fa-solid fa-circle-info'), h('p', {}, [U.submitNote])]),
      h('div', { class: 'intake-nav' }, [
        h('button', { type: 'button', class: 'intake-btn intake-btn-ghost intake-back', onclick: function () { goSection(SECTIONS.length - 1); } },
          [icon(BACK_ICON), h('span', {}, [U.back])]),
        h('div', { class: 'intake-nav-main' }, [send])
      ])
    ], { top: stepper(REVIEW) });
  }

  // Reponses des questions affichees, en identifiants (memes dans toutes les langues)
  function rawAnswers() {
    var out = {};
    D.questions.forEach(function (q) {
      if (!showIfPass(q) || !isAnswered(q)) return;
      var v = answers[q.id];
      out[q.id] = q.type === 'multi' ? { sel: v.sel.slice(), other: v.sel.indexOf(OTHER) !== -1 ? v.other : '' } : String(v).trim();
    });
    return out;
  }

  function doSubmit(btn, txt) {
    btn.disabled = true;
    btn.classList.add('is-busy');
    btn.setAttribute('aria-busy', 'true');
    txt.textContent = U.sending;
    api('/intake/submit', { v: 1, session: session, lang: lang, answers: rawAnswers() }, function (status, data) {
      var state = data && data.state;
      if (status === 200 && data && data.ok) { submitted = true; return message('ok', U.successTitle, U.successText, 'sent'); }
      if (state === 'session') { afterAccess = 'review'; session = null; return renderAccess(U.sessionExpired); }
      if (state === 'used') { submitted = true; return message('ok', U.usedTitle, U.usedText, 'used'); }
      if (state === 'locked') return message('lock', U.lockedTitle, U.lockedText);
      if (state === 'invalid' && data.fields && data.fields.length) {
        // Le serveur a refuse une reponse : retour a l'etape concernee
        var q = D.questions.filter(function (x) { return x.id === data.fields[0]; })[0];
        if (q) {
          errors = {};
          data.fields.forEach(function (f) { errors[f] = U.errRequired; });
          sectionIdx = Math.max(0, SECTIONS.map(function (s) { return s.id; }).indexOf(q.section));
          renderSection({ focus: false });
          return focusField(q.id);
        }
      }
      renderReview(U.errorText);
    });
  }

  function api(path, body, cb) {
    var ctrl = window.AbortController ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 30000);
    fetch(ENDPOINT + path, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      credentials: 'omit', referrerPolicy: 'no-referrer', signal: ctrl ? ctrl.signal : undefined
    }).then(function (r) {
      return r.json().catch(function () { return null; }).then(function (d) { clearTimeout(timer); cb(r.status, d); });
    }).catch(function () { clearTimeout(timer); cb(0, null); });
  }

  // ---------- demarrage ----------
  // Sans lien direct : ecran de connexion (adresse e-mail + mot de passe). Lien direct expire : message.
  var nowSec = Math.floor(Date.now() / 1000);
  if (TOKEN && tokenInfo.e <= nowSec) message('err', U.expiredTitle, U.expiredText);
  else renderAccess();
})();
