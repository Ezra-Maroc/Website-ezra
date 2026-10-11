/* Test d'eligibilite a la nationalite marocaine : moteur commun a toutes les langues.
   Les questions et les textes viennent du bloc <script type="application/json" id="elig-data"> de la page
   (fichier src/data/eligibility/<langue>.json). Rien n'est stocke ni envoye : les reponses ne quittent le
   navigateur que si le visiteur clique sur "Envoyer mes reponses", qui ouvre le formulaire de contact
   pre-rempli via l'ancre #test=... (une ancre n'est jamais transmise au serveur). */
(function () {
  'use strict';
  var dataEl = document.getElementById('elig-data');
  var app = document.getElementById('elig-app');
  if (!dataEl || !app) return;
  var D = JSON.parse(dataEl.textContent);
  // Resume et objet de l'e-mail envoyes a l'equipe : toujours en francais (textes FR embarques sur les autres langues)
  var frEl = document.getElementById('elig-data-fr');
  var FR = frEl ? JSON.parse(frEl.textContent) : D;
  var lang = (document.documentElement.lang || 'fr').split('-')[0];
  var BACK_ICON = document.documentElement.dir === 'rtl' ? 'fa-solid fa-arrow-right' : 'fa-solid fa-arrow-left';
  var Q = D.questions;
  var answers = {};
  var path = []; // ecrans affiches : index de question, ou 'result'

  function h(tag, attrs, kids) {
    var e = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      var v = attrs[k];
      if (k === 'class') e.className = v;
      else if (k.indexOf('on') === 0) e.addEventListener(k.slice(2), v);
      else if (v !== null && v !== undefined && v !== false) e.setAttribute(k, v === true ? '' : v);
    });
    (kids || []).forEach(function (c) {
      if (c) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return e;
  }

  function isVisible(q) {
    if (!q.showIf) return true;
    return Object.keys(q.showIf).every(function (k) {
      return answers[k] !== undefined && q.showIf[k].indexOf(answers[k]) !== -1;
    });
  }

  function nextIndex(from) {
    for (var i = from + 1; i < Q.length; i++) if (isVisible(Q[i])) return i;
    return -1;
  }

  function totalQuestions() {
    return answers[Q[0].id] === undefined ? Q.length : Q.filter(isVisible).length;
  }

  // Apres une reponse, efface celles des questions qui ne s'appliquent plus
  function pruneAnswers() {
    Q.forEach(function (q) { if (!isVisible(q)) delete answers[q.id]; });
  }

  function focusTitle(el) {
    var header = document.querySelector('.site-header');
    var offset = (header ? header.offsetHeight : 70) + 16;
    var top = app.getBoundingClientRect().top;
    if (top < offset || top > window.innerHeight * 0.5) {
      window.scrollTo({ top: window.pageYOffset + top - offset, behavior: 'smooth' });
    }
    if (el) el.focus({ preventScroll: true });
  }

  function goNext(i) {
    pruneAnswers();
    var nx = nextIndex(i);
    path.push(nx === -1 ? 'result' : nx);
    render();
  }

  function goBack() {
    if (path.length > 1) { path.pop(); render(); }
  }

  function renderQuestion(i) {
    var q = Q[i];
    var n = path.filter(function (p) { return p !== 'result'; }).length;
    var total = totalQuestions();
    var progressText = D.ui.progress.replace('{n}', n).replace('{total}', total);
    var title = h('h2', { class: 'elig-question', tabindex: '-1', id: 'elig-q' }, [q.text]);
    var options = h('div', { class: 'elig-options', role: 'group', 'aria-labelledby': 'elig-q' });
    var selected = q.multiple ? (answers[q.id] || []).slice() : null;
    var nextBtn = null;

    q.options.forEach(function (o) {
      var pressed = q.multiple ? selected.indexOf(o.id) !== -1 : answers[q.id] === o.id;
      var btn = h('button', {
        type: 'button',
        class: 'elig-option' + (q.multiple ? ' is-multi' : ''),
        'aria-pressed': pressed ? 'true' : 'false',
        onclick: function () {
          if (!q.multiple) { answers[q.id] = o.id; goNext(i); return; }
          var pos = selected.indexOf(o.id);
          if (pos !== -1) selected.splice(pos, 1);
          else if (o.id === q.exclusive) selected = [o.id];
          else {
            selected = selected.filter(function (s) { return s !== q.exclusive; });
            selected.push(o.id);
          }
          Array.prototype.forEach.call(options.children, function (b, k) {
            b.setAttribute('aria-pressed', selected.indexOf(q.options[k].id) !== -1 ? 'true' : 'false');
          });
          nextBtn.disabled = selected.length === 0;
        }
      }, [h('span', { class: 'elig-check', 'aria-hidden': 'true' }), h('span', {}, [o.text])]);
      options.appendChild(btn);
    });

    var nav = h('div', { class: 'elig-nav' });
    if (path.length > 1) {
      nav.appendChild(h('button', { type: 'button', class: 'elig-back', onclick: goBack },
        [h('i', { class: BACK_ICON, 'aria-hidden': 'true' }), ' ' + D.ui.back]));
    } else {
      nav.appendChild(h('span'));
    }
    if (q.multiple) {
      nextBtn = h('button', {
        type: 'button', class: 'btn btn-primary elig-next', disabled: selected.length === 0,
        onclick: function () { answers[q.id] = selected.slice(); goNext(i); }
      }, [D.ui.next]);
      nav.appendChild(nextBtn);
    }

    app.textContent = '';
    app.appendChild(h('p', { class: 'elig-progress-text', 'aria-live': 'polite' }, [progressText]));
    app.appendChild(h('div', { class: 'elig-progress', 'aria-hidden': 'true' },
      [h('span', { style: 'width:' + Math.round((100 * n) / total) + '%' })]));
    app.appendChild(title);
    if (q.multiple) app.appendChild(h('p', { class: 'elig-hint' }, [D.ui.multiHint]));
    app.appendChild(options);
    app.appendChild(nav);
    return title;
  }

  function computeResult() {
    var a = answers;
    if (a.ascendant === 'aucun') return 'hors';
    if (a.ascendant === 'nsp') return 'recherche';
    var docs = a.documents || [];
    if (docs.length === 0 || docs.indexOf('aucun') !== -1) return 'recherche';
    if ((a.ascendant === 'pere' || a.ascendant === 'mere') && a.liens === 'tous') return 'favorable';
    return 'etudier';
  }

  function answerText(q) {
    var v = answers[q.id];
    return (Array.isArray(v) ? v : [v]).map(function (id) {
      var o = q.options.filter(function (x) { return x.id === id; })[0];
      return o ? o.text : id;
    }).join(', ');
  }

  // Questions et options ont les memes identifiants dans toutes les langues
  function summaryLines(data) {
    return data.questions.filter(function (q) { return answers[q.id] !== undefined && isVisible(q); })
      .map(function (q) { return [q.label, answerText(q)]; });
  }

  function emailSubject(data, key) {
    var a = answers;
    var detail = data.subjectDetail[a.ascendant] || '';
    var side = (a.ascendant === 'grandparent' || a.ascendant === 'arriere') ? data.sideDetail[a.cote] : '';
    return data.ui.subjectPrefix + ' – ' + data.results[key].label +
      (detail ? ' (' + detail + (side ? ', ' + side : '') + ')' : '') +
      (lang === 'fr' ? '' : ' [' + lang.toUpperCase() + ']');
  }

  function handoffUrl(key) {
    var payload = {
      v: 1, s: emailSubject(FR, key), r: D.results[key].label, rl: D.ui.resultLine,
      l: summaryLines(D), ui: D.ui.handoff
    };
    // Version francaise du resume pour l'e-mail de l'equipe (inutile sur la page francaise)
    if (FR !== D) payload.f = { r: FR.results[key].label, rl: FR.ui.resultLine, l: summaryLines(FR) };
    return D.ui.contactUrl + '#test=' + encodeURIComponent(JSON.stringify(payload));
  }

  function renderResult() {
    var key = computeResult();
    var R = D.results[key];
    var title = h('h2', { class: 'elig-badge elig-badge--' + key, tabindex: '-1' }, [R.label]);
    var dl = h('dl');
    summaryLines(D).forEach(function (l) { dl.appendChild(h('dt', {}, [l[0]])); dl.appendChild(h('dd', {}, [l[1]])); });
    var tip = key === 'hors' ? null : (D.tips[answers.pays] || D.tips['default']);

    app.textContent = '';
    app.appendChild(h('div', { class: 'elig-result' }, [
      h('p', { class: 'elig-kicker' }, [D.ui.resultKicker]),
      title,
      h('p', {}, [R.text]),
      h('div', { class: 'elig-block' }, [h('h3', {}, [D.ui.nextStepTitle]), h('p', {}, [R.next])]),
      tip ? h('div', { class: 'elig-block elig-block--tip' }, [h('h3', {}, [D.ui.tipTitle]), h('p', {}, [tip])]) : null,
      h('div', { class: 'elig-summary' }, [h('h3', {}, [D.ui.summaryTitle]), dl]),
      h('div', { class: 'elig-actions' }, [
        h('a', { class: 'btn btn-primary elig-send', href: handoffUrl(key) },
          [h('i', { class: 'fa-solid fa-paper-plane', 'aria-hidden': 'true' }), ' ' + D.ui.send]),
        h('p', { class: 'elig-send-note' }, [D.ui.sendNote]),
        h('div', { class: 'elig-result-nav' }, [
          h('button', { type: 'button', class: 'elig-back', onclick: goBack },
            [h('i', { class: BACK_ICON, 'aria-hidden': 'true' }), ' ' + D.ui.back]),
          h('button', {
            type: 'button', class: 'elig-restart',
            onclick: function () { answers = {}; path = [0]; render(); }
          }, [h('i', { class: 'fas fa-redo', 'aria-hidden': 'true' }), ' ' + D.ui.restart])
        ])
      ]),
      h('p', { class: 'elig-disclaimer' }, [D.ui.disclaimer])
    ]));
    return title;
  }

  function render() {
    var current = path[path.length - 1];
    var title = current === 'result' ? renderResult() : renderQuestion(current);
    if (path.length > 1) focusTitle(title);
  }

  path = [0];
  render();
})();
