# Formulaire de contact — fonction Cloudflare

Remplace Formspree : reçoit les envois du formulaire de contact (5 langues) et du test d'éligibilité,
vérifie l'anti-robot Turnstile côté serveur et envoie le message à **info@ezra-project.fr**. Gratuit
(offre gratuite de Cloudflare : envois vers une adresse vérifiée du compte, sans quota), rien n'est stocké.

Sécurité :
- l'envoi est verrouillé dans `wrangler.jsonc` : un seul destinataire (info@ezra-project.fr) et un seul expéditeur
  (formulaire@a2deepsec.com) — même détournée, la fonction ne peut écrire qu'à nous ;
- requêtes acceptées uniquement depuis ezra-maroc.com (en-tête Origin) ;
- jeton Turnstile vérifié auprès de Cloudflare (et obtenu sur ezra-maroc.com), champ piège `_gotcha` ;
- champs validés et bornés (taille, e-mail, consentement), aucune injection possible dans les en-têtes.

## Pré-analyse des demandes venant du test d'éligibilité

Le test joint ses réponses brutes (champ caché `_elig`). La fonction en tire une **note sur 100 et un niveau**
(A ≥ 75 solide, B ≥ 55 bon potentiel, C ≥ 35 à creuser, D faible, X sans ascendant marocain) : la note ouvre
l'objet de l'e-mail (`[A · 82/100] Test d'éligibilité – ...`) et un bloc « Pré-analyse » (points forts, points de
vigilance, premières actions, contexte) s'affiche en tête. Rien de tout cela n'est montré au visiteur, et la grille
n'est pas dans le code public du site : elle est dans `src/preanalyse.js` (tables de points en haut du fichier),
à ajuster puis redéployer (`npm run deploy`).

## Mise en place (une seule fois)

1. Cloudflare → Compute → Email Service → Email Routing → Onboard Domain : **a2deepsec.com** (domaine du compte sans
   messagerie), puis Activate. Ne PAS le faire sur ezra-maroc.com : l'activation y remplacerait les MX de l'ancienne
   messagerie (action@ezra-maroc.com). Garder a2deepsec.com renouvelé (expire le 2027-07-03), sinon les envois
   échouent (le site bascule alors sur Formspree).
2. Email Routing → **Adresses de destination** : ajouter `info@ezra-project.fr` et cliquer le lien de confirmation reçu.
3. Turnstile → ajouter un widget : domaines `ezra-maroc.com` et `www.ezra-maroc.com`, mode « Géré ».
4. Dans ce dossier : `npm install`, `npx wrangler login`, `npx wrangler secret put TURNSTILE_SECRET`
   (clé secrète du widget), puis `npm run deploy` (donne l'adresse `https://ezra-contact.<compte>.workers.dev`).
5. Dans `src/config/contact.ts` : renseigner cette adresse et la clé de site Turnstile, publier le site.

Retour à Formspree à tout moment : vider ces deux valeurs. Tant que la fonction est branchée, Formspree reste
en secours si elle est injoignable ou en erreur serveur.

## Essais locaux (rien n'est envoyé : wrangler écrit les e-mails dans `.wrangler/tmp/email/`)

```
copy .dev.vars.example .dev.vars
npm run dev
node test/worker.test.mjs
```
