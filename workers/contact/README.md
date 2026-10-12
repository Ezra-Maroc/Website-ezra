# Formulaire de contact — fonction Cloudflare

Remplace Formspree : reçoit les envois du formulaire de contact (5 langues) et du test d'éligibilité,
vérifie l'anti-robot Turnstile côté serveur et envoie le message à **info@ezra-project.fr**. Gratuit
(offre gratuite de Cloudflare : envois vers une adresse vérifiée du compte, sans quota), rien n'est stocké.

Sécurité :
- l'envoi est verrouillé dans `wrangler.jsonc` : un seul destinataire (info@ezra-project.fr) et un seul expéditeur
  (formulaire@form.ezra-maroc.com) — même détournée, la fonction ne peut écrire qu'à nous ;
- requêtes acceptées uniquement depuis ezra-maroc.com (en-tête Origin) ;
- jeton Turnstile vérifié auprès de Cloudflare (et obtenu sur ezra-maroc.com), champ piège `_gotcha` ;
- champs validés et bornés (taille, e-mail, consentement), aucune injection possible dans les en-têtes.

## Mise en place (une seule fois)

1. Cloudflare → Email Routing de **ezra-maroc.com** → Paramètres → **Sous-domaines** : ajouter `form.ezra-maroc.com`.
   Ne pas activer Email Routing sur le domaine principal : ses MX (messagerie actuelle) doivent rester tels quels.
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
