// Espace client : questionnaire approfondi des prospects (pages /espace-client.html et equivalents, hors menus).
// Serveur : routes /intake/* de la fonction Cloudflare "ezra-formulaire" (workers/contact/src/intake/).
// En local : PUBLIC_INTAKE_ENDPOINT=http://127.0.0.1:8787 et PUBLIC_TURNSTILE_SITEKEY=1x00000000000000000000AA
import { TURNSTILE_SITEKEY } from './contact';

export const INTAKE_ENDPOINT: string = import.meta.env.PUBLIC_INTAKE_ENDPOINT ?? 'https://ezra-formulaire.albertassayag.workers.dev';
export const INTAKE_SITEKEY: string = TURNSTILE_SITEKEY;
// Script anti-robot en rendu explicite : le widget est cree par public/js/intake-form.js sur l'ecran d'acces
export const TURNSTILE_EXPLICIT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
