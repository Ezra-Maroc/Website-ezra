// Formulaire de contact : ou partent les messages (voir workers/contact/README.md).
// Tant que l'adresse de la fonction Cloudflare ET la cle de site Turnstile ne sont pas renseignees, le site reste
// sur Formspree sans widget anti-robot. Une fois les deux renseignees : envoi a la fonction, Formspree en secours
// si elle est injoignable ou en erreur serveur. Les variables PUBLIC_* servent aux essais locaux.
export const FORMSPREE_ENDPOINT = 'https://formspree.io/f/mjkwzpdr';
// Fonction "ezra-formulaire" (workers/contact) et widget Turnstile "Formulaire ezra-maroc.com" du compte Cloudflare
const WORKER_ENDPOINT = import.meta.env.PUBLIC_CONTACT_ENDPOINT ?? 'https://ezra-formulaire.albertassayag.workers.dev';
export const TURNSTILE_SITEKEY = import.meta.env.PUBLIC_TURNSTILE_SITEKEY ?? '0x4AAAAAAFUsnebGbulmSJVH';

const useWorker = Boolean(WORKER_ENDPOINT && TURNSTILE_SITEKEY);
export const FORM_ACTION = useWorker ? WORKER_ENDPOINT : FORMSPREE_ENDPOINT;
export const FORM_FALLBACK = useWorker ? FORMSPREE_ENDPOINT : undefined;
export const SHOW_TURNSTILE = useWorker;
