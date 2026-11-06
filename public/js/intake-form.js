/* Espace client : questionnaire d'eligibilite approfondi (prospects invites) — moteur commun aux 5 langues.
   Acces, au choix :
     - identifiants : adresse e-mail + mot de passe de 8 caracteres propose par EZRA (page ouverte depuis le
       bouton « Espace client » du site ou l'adresse recue par e-mail) ;
     - lien direct signe (jeton apres le #, jamais envoye a un serveur web) + le meme mot de passe.
   Toujours avec l'anti-robot Cloudflare Turnstile. La fonction Cloudflare verifie tout et renvoie une
   session (4 h) gardee en memoire seulement : rien n'est ecrit dans le navigateur (ni cookie, ni stockage).
   Affichage par SECTION (champs groupes), champs conditionnels en ligne (showIf), validation, revision,
   puis envoi. Le serveur revalide tout et compose lui-meme le recapitulatif. 0 dependance.
   Modele : <script type="application/json" id="intake-data"> (src/data/intake/<langue>.json). */
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
  var SECTIONS = D.sections;
  var OTHER = '__other__';

  var answers = {};       // { idQuestion: valeur | {sel:[], other:''} }
  var sectionIdx = 0;
  var errors = {};
  var session = null;     // jeton de session (memoire seulement)
  var submitted = false;
  var afterAccess = null; // ecran a rouvrir apres une nouvelle connexion (session expiree)
  var lastEmail = '';     // identifiant deja saisi (reconnexion apres session expiree)

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

  // ---------- champs ----------
  function fieldId(q) { return 'f_' + q.id; }

  function renderField(q) {
    var wrap = h('div', { class: 'intake-field', 'data-q': q.id });
    var mark = q.required ? h('span', { class: 'intake-req', 'aria-hidden': 'true' }, [' *'])
      : h('span', { class: 'intake-opt' }, [' ' + U.optional]);
    var isGroup = q.type === 'single' || q.type === 'multi';
    var labelId = 'l_' + q.id;
    wrap.appendChild(h(isGroup ? 'p' : 'label', isGroup ? { class: 'intake-label', id: labelId } : { class: 'intake-label', 'for': fieldId(q), id: labelId }, [q.text, mark]));
    if (q.help) wrap.appendChild(h('p', { class: 'intake-help' }, [q.help]));
    var describedBy = errors[q.id] ? 'e_' + q.id : null;

    if (q.type === 'text' || q.type === 'email' || q.type === 'tel' || q.type === 'date') {
      wrap.appendChild(h('input', {
        id: fieldId(q), class: 'intake-input', type: q.type === 'text' ? 'text' : q.type,
        value: answers[q.id] || '', placeholder: q.placeholder || null,
        autocomplete: q.autocomplete || 'off', maxlength: q.type === 'email' ? '254' : (q.type === 'tel' ? '40' : (q.type === 'date' ? null : '150')),
        min: q.type === 'date' ? '1900-01-01' : null, max: q.type === 'date' ? TODAY : null,
        dir: q.type === 'email' || q.type === 'tel' ? 'ltr' : null,
        'aria-invalid': errors[q.id] ? 'true' : null, 'aria-describedby': describedBy,
        oninput: function (e) { answers[q.id] = e.target.value; clearError(q); }
      }));
    } else if (q.type === 'paragraph') {
      wrap.appendChild(h('textarea', {
        id: fieldId(q), class: 'intake-input intake-textarea', rows: '4', maxlength: '3000', placeholder: q.placeholder || null,
        'aria-invalid': errors[q.id] ? 'true' : null, 'aria-describedby': describedBy,
        oninput: function (e) { answers[q.id] = e.target.value; clearError(q); }
      }, [answers[q.id] || '']));
    } else if (q.type === 'select') {
      var sel = h('select', {
        id: fieldId(q), class: 'intake-input intake-select',
        'aria-invalid': errors[q.id] ? 'true' : null, 'aria-describedby': describedBy,
        onchange: function (e) { answers[q.id] = e.target.value; clearError(q); maybeRerender(q); }
      }, [h('option', { value: '' }, [U.choose])]);
      optionsOf(q).forEach(function (o) {
        sel.appendChild(h('option', { value: o.id, selected: answers[q.id] === o.id }, [o.text]));
      });
      wrap.appendChild(sel);
    } else if (isGroup) {
      if (q.type === 'multi') wrap.appendChild(h('p', { class: 'intake-hint' }, [U.multiHint]));
      wrap.appendChild(renderButtonGroup(q, q.type === 'multi', labelId));
    }
    if (errors[q.id]) wrap.appendChild(h('p', { class: 'intake-error', id: 'e_' + q.id, role: 'alert' }, [errors[q.id]]));
    return wrap;
  }

  function renderButtonGroup(q, multi, labelId) {
    var group = h('div', { class: 'intake-options' + (multi ? ' is-multi' : ''), role: multi ? 'group' : 'radiogroup', 'aria-labelledby': labelId });
    var cur = answers[q.id];
    var sel = multi ? (cur && cur.sel ? cur.sel.slice() : []) : cur;
    var otherInput = null;
    var opts = optionsOf(q);

    function save() { answers[q.id] = { sel: sel.slice(), other: otherInput ? otherInput.value : '' }; clearError(q); }

    opts.forEach(function (o) {
      var on = multi ? sel.indexOf(o.id) !== -1 : sel === o.id;
      group.appendChild(h('button', {
        type: 'button', class: 'intake-option', role: multi ? null : 'radio',
        'aria-pressed': multi ? (on ? 'true' : 'false') : null,
        'aria-checked': multi ? null : (on ? 'true' : 'false'),
        onclick: function () {
          if (!multi) {
            answers[q.id] = o.id; sel = o.id; clearError(q);
            Array.prototype.forEach.call(group.querySelectorAll('.intake-option'), function (b, k) {
              b.setAttribute('aria-checked', opts[k] && opts[k].id === o.id ? 'true' : 'false');
            });
            maybeRerender(q);
            return;
          }
          var i = sel.indexOf(o.id);
          if (i !== -1) sel.splice(i, 1); else sel.push(o.id);
          this.setAttribute('aria-pressed', sel.indexOf(o.id) !== -1 ? 'true' : 'false');
          save();
          maybeRerender(q);
        }
      }, [h('span', { class: 'intake-check', 'aria-hidden': 'true' }), h('span', {}, [o.text])]));
    });

    var holder = h('div', {}, [group]);
    if (multi && q.other) {
      var otherOn = sel.indexOf(OTHER) !== -1;
      group.appendChild(h('button', {
        type: 'button', class: 'intake-option', 'aria-pressed': otherOn ? 'true' : 'false',
        onclick: function () {
          var i = sel.indexOf(OTHER);
          if (i !== -1) sel.splice(i, 1); else sel.push(OTHER);
          var nowOn = sel.indexOf(OTHER) !== -1;
          this.setAttribute('aria-pressed', nowOn ? 'true' : 'false');
          otherInput.hidden = !nowOn;
          if (nowOn) otherInput.focus();
          save();
        }
      }, [h('span', { class: 'intake-check', 'aria-hidden': 'true' }), h('span', {}, [U.otherLabel])]));
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
    var inp = w.querySelector('[aria-invalid]');
    if (inp) inp.removeAttribute('aria-invalid');
  }

  // Une question qui en conditionne d'autres : on re-affiche la section (les reponses sont conservees)
  function maybeRerender(q) { if (isController(q.id)) renderSection(false); }

  // ---------- structure des ecrans ----------
  function progress(current, total) {
    return [
      h('p', { class: 'intake-progress-text', 'aria-live': 'polite' }, [U.section.replace('{n}', Math.min(current + 1, total)).replace('{total}', total)]),
      h('div', { class: 'intake-progress', 'aria-hidden': 'true' }, [h('span', { style: 'width:' + Math.round((100 * current) / total) + '%' })])
    ];
  }

  // Premier ecran : la page reste en haut (banniere visible) ; ensuite, chaque changement d'ecran
  // ramene la carte en vue et donne le focus a son titre (lecteurs d'ecran)
  var firstScreen = true;
  function screen(nodes, focusIt) {
    app.textContent = '';
    nodes.forEach(function (n) { if (n) app.appendChild(n); });
    if (firstScreen) { firstScreen = false; return; }
    if (focusIt !== false) focusHeading();
  }

  function focusHeading() {
    var el = document.getElementById('intake-h');
    var header = document.querySelector('.site-header');
    var offset = (header ? header.offsetHeight : 70) + 16;
    var top = app.getBoundingClientRect().top;
    if (top < offset || top > window.innerHeight * 0.4) window.scrollTo({ top: window.pageYOffset + top - offset, behavior: 'smooth' });
    if (el) el.focus({ preventScroll: true });
  }

  function message(kind, title, text) {
    var icon = kind === 'ok' ? 'fa-solid fa-circle-check' : (kind === 'lock' ? 'fa-solid fa-lock' : 'fa-solid fa-circle-exclamation');
    screen([h('div', { class: 'intake-done' }, [
      h('div', { class: 'intake-done-icon ' + (kind === 'ok' ? 'ok' : 'err'), 'aria-hidden': 'true' }, [h('i', { class: icon })]),
      h('h2', { tabindex: '-1', id: 'intake-h' }, [title]),
      h('p', {}, [text])
    ])]);
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
      maxlength: '9', placeholder: U.codePlaceholder, 'aria-describedby': 'intake-access-msg',
      oninput: function (e) {
        var raw = e.target.value.toUpperCase().replace(/[^0-9A-Z]/g, '').slice(0, 8);
        e.target.value = raw.length > 4 ? raw.slice(0, 4) + '-' + raw.slice(4) : raw;
        onInput();
      },
      onkeydown: function (e) { if (e.key === 'Enter') { e.preventDefault(); onEnter(); } }
    });
    var icon = h('i', { class: 'fa-solid fa-eye', 'aria-hidden': 'true' });
    var toggle = h('button', {
      type: 'button', class: 'intake-reveal', 'aria-pressed': 'false', 'aria-controls': 'intake-code',
      'aria-label': U.showPassword, title: U.showPassword,
      onclick: function () {
        var show = input.type === 'password';
        input.type = show ? 'text' : 'password';
        toggle.setAttribute('aria-pressed', show ? 'true' : 'false');
        toggle.setAttribute('title', show ? U.hidePassword : U.showPassword);
        icon.className = show ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye';
        input.focus();
      }
    }, [icon]);
    return { input: input, box: h('div', { class: 'intake-password' }, [input, toggle]) };
  }

  function renderAccess(note) {
    var linkMode = !!TOKEN; // lien direct : l'identifiant est dans le lien, seul le mot de passe est demande
    var btnLabel = linkMode ? U.accessButton : U.loginButton;
    var msg = h('p', { class: 'intake-error', id: 'intake-access-msg', role: 'alert', 'aria-live': 'assertive' }, [note || '']);
    if (note) msg.classList.add('intake-note');
    function clearMsg() { msg.textContent = ''; }
    var pwd = passwordField(submitAccess, clearMsg);
    var emailInput = linkMode ? null : h('input', {
      id: 'intake-email', class: 'intake-input', type: 'email', inputmode: 'email', autocomplete: 'username',
      autocapitalize: 'none', spellcheck: 'false', dir: 'ltr', maxlength: '254', value: lastEmail || null,
      'aria-describedby': 'intake-access-msg',
      oninput: clearMsg,
      onkeydown: function (e) { if (e.key === 'Enter') { e.preventDefault(); pwd.input.focus(); } }
    });
    var btn = h('button', { type: 'button', class: 'btn btn-primary intake-next intake-access-btn', onclick: submitAccess },
      [h('i', { class: 'fa-solid fa-lock', 'aria-hidden': 'true' }), ' ' + btnLabel]);
    var tsBox = h('div', { id: 'intake-turnstile', class: 'intake-turnstile' });

    var kids = [
      h('div', { class: 'intake-access-icon', 'aria-hidden': 'true' }, [h('i', { class: 'fa-solid fa-lock' })]),
      h('h2', { class: 'intake-section-title', tabindex: '-1', id: 'intake-h' }, [linkMode ? U.accessTitle : U.loginTitle]),
      h('p', { class: 'intake-section-intro' }, [linkMode ? U.accessText : U.loginText])
    ];
    if (emailInput) kids.push(h('label', { class: 'intake-label', 'for': 'intake-email' }, [U.emailLabel]), emailInput);
    kids.push(h('label', { class: 'intake-label', 'for': 'intake-code' }, [U.codeLabel]), pwd.box, msg, tsBox, btn);
    if (!linkMode) {
      kids.push(h('p', { class: 'intake-noaccess' }, [U.noAccess + ' ', CONTACT_URL ? h('a', { href: CONTACT_URL }, [U.noAccessLink]) : null]));
    }
    kids.push(h('p', { class: 'intake-secure' }, [h('i', { class: 'fa-solid fa-lock', 'aria-hidden': 'true' }), ' ' + U.secureNote]));
    screen([h('div', { class: 'intake-access' }, kids)]);
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

    function submitAccess() {
      var code = pwd.input.value.replace(/[^0-9A-Za-z]/g, '');
      var email = emailInput ? emailInput.value.trim() : '';
      msg.classList.remove('intake-note');
      if (emailInput && !EMAIL_RE.test(email)) { msg.textContent = U.errLoginFormat; emailInput.focus(); return; }
      if (code.length !== 8) { msg.textContent = linkMode ? U.errCodeFormat : U.errLoginFormat; pwd.input.focus(); return; }
      if (emailInput) lastEmail = email;
      btn.disabled = true;
      btn.lastChild.textContent = ' ' + U.verifying;
      waitToken(function () {
        var path = linkMode ? '/intake/verify' : '/intake/login';
        var body = linkMode ? { token: TOKEN, code: code, turnstile: tsToken } : { email: email, code: code, turnstile: tsToken };
        api(path, body, function (status, data) {
          btn.disabled = false;
          btn.lastChild.textContent = ' ' + btnLabel;
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
          if (state === 'used') { submitted = true; return message('ok', U.usedTitle, U.usedText); }
          if (state === 'expired' || state === 'invalid') return message('err', U.expiredTitle, U.expiredText);
          msg.textContent = (state === 'bot' || state === 'rate') ? U.errBot : U.errNetwork;
        });
      });
    }
  }

  // ---------- sections ----------
  function renderSection(focusIt) {
    var sec = SECTIONS[sectionIdx];
    var fields = h('div', { class: 'intake-fields' });
    sectionQuestions(sec).forEach(function (q) { fields.appendChild(renderField(q)); });
    var nav = h('div', { class: 'intake-nav' }, [
      sectionIdx > 0
        ? h('button', { type: 'button', class: 'intake-back', onclick: function () { errors = {}; sectionIdx--; renderSection(); } },
          [h('i', { class: BACK_ICON, 'aria-hidden': 'true' }), ' ' + U.back])
        : h('span'),
      h('button', { type: 'button', class: 'btn btn-primary intake-next', onclick: nextSection },
        [U.next + ' ', h('i', { class: NEXT_ICON, 'aria-hidden': 'true' })])
    ]);
    screen(progress(sectionIdx, SECTIONS.length).concat([
      h('h2', { class: 'intake-section-title', tabindex: '-1', id: 'intake-h' }, [sec.num + '. ' + sec.title]),
      sec.intro ? h('p', { class: 'intake-section-intro' }, [sec.intro]) : null,
      fields, nav
    ]), focusIt);
  }

  function nextSection() {
    errors = {};
    var first = null;
    sectionQuestions(SECTIONS[sectionIdx]).forEach(function (q) {
      var e = validate(q);
      if (e) { errors[q.id] = e; if (!first) first = q.id; }
    });
    if (first) { renderSection(false); focusField(first); return; }
    if (sectionIdx < SECTIONS.length - 1) { sectionIdx++; renderSection(); } else renderReview();
  }

  function focusField(qid) {
    var el = app.querySelector('[data-q="' + qid + '"]');
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    var inp = el.querySelector('input:not([hidden]),select,textarea,button');
    if (inp) inp.focus({ preventScroll: true });
  }

  // ---------- revision et envoi ----------
  function valueText(q) {
    var v = answers[q.id];
    if (q.type === 'multi') {
      var parts = v.sel.filter(function (x) { return x !== OTHER; }).map(function (id) { return labelOf(q, id); });
      if (v.sel.indexOf(OTHER) !== -1 && v.other) parts.push(U.otherLabel + ' : ' + v.other);
      return parts.join(', ');
    }
    if (q.type === 'single' || q.type === 'select') return labelOf(q, v);
    if (q.type === 'date') { var d = String(v).split('-'); return d[2] + '/' + d[1] + '/' + d[0]; }
    return String(v);
  }

  function renderReview(banner) {
    sectionIdx = SECTIONS.length - 1;
    var nodes = progress(SECTIONS.length, SECTIONS.length);
    nodes.push(h('h2', { class: 'intake-section-title', tabindex: '-1', id: 'intake-h' }, [U.reviewTitle]));
    if (banner) nodes.push(h('p', { class: 'intake-error intake-banner', role: 'alert' }, [banner]));
    SECTIONS.forEach(function (sec, i) {
      var qs = sectionQuestions(sec).filter(isAnswered);
      if (!qs.length) return;
      var dl = h('dl');
      qs.forEach(function (q) { dl.appendChild(h('dt', {}, [q.text])); dl.appendChild(h('dd', { dir: 'auto' }, [valueText(q)])); });
      nodes.push(h('div', { class: 'intake-review-block' }, [
        h('h3', {}, [sec.num + '. ' + sec.title + ' ',
          h('button', { type: 'button', class: 'intake-edit', onclick: function () { errors = {}; sectionIdx = i; renderSection(); } }, [U.edit])]),
        dl
      ]));
    });
    var noConsent = answers.consent_contact === 'non';
    if (noConsent) nodes.push(h('p', { class: 'intake-error', role: 'alert' }, [U.consentBlock]));
    var send = h('button', { type: 'button', class: 'btn btn-primary intake-submit', disabled: noConsent, onclick: function () { doSubmit(send); } },
      [h('i', { class: 'fa-solid fa-paper-plane', 'aria-hidden': 'true' }), ' ' + U.submit]);
    nodes.push(h('div', { class: 'intake-nav' }, [
      h('button', { type: 'button', class: 'intake-back', onclick: function () { renderSection(); } }, [h('i', { class: BACK_ICON, 'aria-hidden': 'true' }), ' ' + U.back]),
      send
    ]));
    nodes.push(h('p', { class: 'intake-disclaimer' }, [D.meta.privacy]));
    screen(nodes);
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

  function doSubmit(btn) {
    btn.disabled = true;
    btn.lastChild.textContent = ' ' + U.sending;
    api('/intake/submit', { v: 1, session: session, lang: lang, answers: rawAnswers() }, function (status, data) {
      var state = data && data.state;
      if (status === 200 && data && data.ok) { submitted = true; return message('ok', U.successTitle, U.successText); }
      if (state === 'session') { afterAccess = 'review'; session = null; return renderAccess(U.sessionExpired); }
      if (state === 'used') { submitted = true; return message('ok', U.usedTitle, U.usedText); }
      if (state === 'locked') return message('lock', U.lockedTitle, U.lockedText);
      if (state === 'invalid' && data.fields && data.fields.length) {
        // Le serveur a refuse une reponse : retour a la section concernee
        var q = D.questions.filter(function (x) { return x.id === data.fields[0]; })[0];
        if (q) {
          errors = {};
          data.fields.forEach(function (f) { errors[f] = U.errRequired; });
          sectionIdx = Math.max(0, SECTIONS.map(function (s) { return s.id; }).indexOf(q.section));
          renderSection(false);
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
