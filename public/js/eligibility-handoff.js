/* Formulaire de contact ouvert depuis le test d'eligibilite (ancre #test=..., jamais transmise au serveur) :
   - affiche les resultats du test dans un encadre au-dessus du champ message ;
   - les joint a l'envoi dans des champs caches (resume + objet de l'e-mail Formspree "_subject") ;
   - laisse le champ message libre et facultatif pour le message personnel du visiteur ;
   - preselectionne l'objet "evaluation de mon eligibilite".
   Le contenu de l'ancre est traite comme du texte (jamais comme du HTML) et tronque. */
(function () {
  'use strict';

  function clip(s, n) { return String(s === null || s === undefined ? '' : s).slice(0, n); }

  function run() {
    var m = /^#test=(.+)$/.exec(window.location.hash || '');
    if (!m) return;
    var p;
    try { p = JSON.parse(decodeURIComponent(m[1])); } catch (e) { return; }
    if (!p || p.v !== 1 || !Array.isArray(p.l)) return;

    var form = document.getElementById('contact-form');
    var msg = document.getElementById('message');
    var msgGroup = msg && msg.closest('.form-group');
    if (!form || !msg || !msgGroup || form.querySelector('.elig-handoff')) return;

    var ui = p.ui || {};
    var resultLabel = clip(p.rl || 'Résultat', 40);
    var result = clip(p.r, 120);
    var lines = p.l.slice(0, 12).map(function (x) {
      return [clip(x && x[0], 120), clip(x && x[1], 300)];
    });

    // Encadre visible
    var box = document.createElement('div');
    box.className = 'form-group full-width elig-handoff';
    var title = document.createElement('p');
    title.className = 'elig-handoff-title';
    title.textContent = clip(ui.title, 200);
    var res = document.createElement('p');
    res.className = 'elig-handoff-result';
    var strong = document.createElement('strong');
    strong.textContent = resultLabel + ' : ' + result;
    res.appendChild(strong);
    var dl = document.createElement('dl');
    lines.forEach(function (x) {
      var dt = document.createElement('dt');
      dt.textContent = x[0];
      var dd = document.createElement('dd');
      dd.textContent = x[1];
      dl.appendChild(dt);
      dl.appendChild(dd);
    });
    var note = document.createElement('p');
    note.className = 'elig-handoff-note';
    note.textContent = clip(ui.note, 300);
    box.appendChild(title);
    box.appendChild(res);
    box.appendChild(dl);
    box.appendChild(note);
    msgGroup.parentNode.insertBefore(box, msgGroup);

    // Champs caches envoyes avec le formulaire (le script du formulaire envoie tous les champs)
    function hidden(name, value) {
      var i = document.createElement('input');
      i.type = 'hidden';
      i.name = name;
      i.value = value;
      form.appendChild(i);
    }
    // Resume joint a l'e-mail : version francaise si le test a ete fait dans une autre langue
    var fr = p.f && Array.isArray(p.f.l) ? p.f : null;
    var mailHead = fr ? clip(fr.rl || 'Résultat', 40) + ' : ' + clip(fr.r, 120) : resultLabel + ' : ' + result;
    var mailLines = fr ? fr.l.slice(0, 12).map(function (x) { return [clip(x && x[0], 120), clip(x && x[1], 300)]; }) : lines;
    var summary = [mailHead].concat(mailLines.map(function (x) { return x[0] + ' : ' + x[1]; }));
    hidden(clip(ui.fieldName || 'Résultats du test', 80), summary.join('\n'));
    if (p.s) hidden('_subject', clip(p.s, 200));

    // Message personnel : libre et facultatif
    msg.removeAttribute('required');
    msg.setAttribute('aria-required', 'false');
    var label = form.querySelector('label[for="message"]');
    if (label && ui.messageLabel) label.textContent = clip(ui.messageLabel, 120);
    if (ui.messagePlaceholder) msg.placeholder = clip(ui.messagePlaceholder, 300);

    // Objet de la demande
    var sel = document.getElementById('subject');
    if (sel && ui.subjectValue) {
      var opt = Array.prototype.filter.call(sel.options, function (o) { return o.value === ui.subjectValue; })[0];
      if (opt) {
        sel.value = opt.value;
        sel.dispatchEvent(new Event('change', { bubbles: true }));
      }
      // Formspree prend le champ "subject" comme objet de l'e-mail avant "_subject" : on le renomme pour que
      // l'objet affiche le resultat du test (le choix reste envoye, sous le nom "objet_demande")
      if (p.s) sel.name = 'objet_demande';
    }

    var style = document.createElement('style');
    style.textContent =
      '.elig-handoff{background:#f8f9fa;border:1px solid #e5e7eb;border-inline-start:4px solid var(--primary-600,#c5281c);' +
      'border-radius:8px;padding:16px 20px;margin-bottom:20px}' +
      '.elig-handoff-title{font-weight:600;margin:0 0 6px;color:#333}' +
      '.elig-handoff-result{margin:0 0 10px;color:#333}' +
      '.elig-handoff dl{display:grid;grid-template-columns:minmax(0,40%) 1fr;gap:4px 12px;margin:0 0 10px;font-size:.92rem}' +
      '.elig-handoff dt{color:#555}.elig-handoff dd{margin:0;color:#222}' +
      '.elig-handoff-note{font-size:.85rem;color:#555;margin:0}' +
      '@media (max-width:600px){.elig-handoff dl{grid-template-columns:1fr}.elig-handoff dd{margin-bottom:6px}}';
    document.head.appendChild(style);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
})();
