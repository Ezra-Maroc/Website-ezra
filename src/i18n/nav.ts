import type { Lang } from './locales';
import { legalPages, getLegalUrl } from './legal';

export interface NavItem {
  key: string;
  label: string;
  slug: string;
  /** Shown as a highlighted button at the end of the menu (eligibility test) */
  cta?: boolean;
}

export const nav: Record<Lang, NavItem[]> = {
  fr: [
    { key: 'home', label: 'Accueil', slug: 'index.html' },
    { key: 'advantages', label: 'Avantages', slug: 'avantages.html' },
    { key: 'services', label: 'Services', slug: 'services.html' },
    { key: 'process', label: 'Processus', slug: 'processus.html' },
    { key: 'contact', label: 'Contact', slug: 'contact.html' },
    { key: 'testimonials', label: 'Avis', slug: 'temoignages.html' },
    { key: 'about', label: 'À propos', slug: 'a-propos.html' },
    { key: 'faq', label: 'FAQ', slug: 'faq.html' },
    { key: 'quiz', label: 'Quiz', slug: 'quiz.html' },
    { key: 'eligibility', label: "Test d'éligibilité", slug: 'test-eligibilite.html', cta: true },
  ],
  en: [
    { key: 'home', label: 'Home', slug: 'index.html' },
    { key: 'advantages', label: 'Advantages', slug: 'advantages.html' },
    { key: 'services', label: 'Services', slug: 'services.html' },
    { key: 'process', label: 'Process', slug: 'process.html' },
    { key: 'contact', label: 'Contact', slug: 'contact.html' },
    { key: 'testimonials', label: 'Testimonials', slug: 'testimonials.html' },
    { key: 'about', label: 'About', slug: 'about.html' },
    { key: 'faq', label: 'FAQ', slug: 'faq.html' },
    { key: 'quiz', label: 'Quiz', slug: 'quiz.html' },
    { key: 'eligibility', label: 'Eligibility test', slug: 'eligibility-test.html', cta: true },
  ],
  es: [
    { key: 'home', label: 'Inicio', slug: 'inicio.html' },
    { key: 'advantages', label: 'Ventajas', slug: 'ventajas.html' },
    { key: 'services', label: 'Servicios', slug: 'servicios.html' },
    { key: 'process', label: 'Proceso', slug: 'proceso.html' },
    { key: 'contact', label: 'Contacto', slug: 'contacto.html' },
    { key: 'testimonials', label: 'Opiniones', slug: 'testimonios.html' },
    { key: 'about', label: 'Nosotros', slug: 'sobre-nosotros.html' },
    { key: 'faq', label: 'FAQ', slug: 'faq.html' },
    { key: 'quiz', label: 'Quiz', slug: 'quiz.html' },
    { key: 'eligibility', label: '¿Soy elegible?', slug: 'test-elegibilidad.html', cta: true },
  ],
  he: [
    { key: 'home', label: 'דף הבית', slug: 'index.html' },
    { key: 'advantages', label: 'יתרונות', slug: 'advantages.html' },
    { key: 'services', label: 'שירותים', slug: 'services.html' },
    { key: 'process', label: 'תהליך', slug: 'process.html' },
    { key: 'contact', label: 'צור קשר', slug: 'contact.html' },
    { key: 'testimonials', label: 'המלצות', slug: 'testimonials.html' },
    { key: 'about', label: 'אודות', slug: 'about.html' },
    { key: 'faq', label: 'שאלות נפוצות', slug: 'faq.html' },
    { key: 'quiz', label: 'חידון', slug: 'quiz.html' },
    { key: 'eligibility', label: 'בדיקת זכאות', slug: 'eligibility-test.html', cta: true },
  ],
  ar: [
    { key: 'home', label: 'الرئيسية', slug: 'index.html' },
    { key: 'advantages', label: 'المزايا', slug: 'advantages.html' },
    { key: 'services', label: 'الخدمات', slug: 'services.html' },
    { key: 'process', label: 'المسار', slug: 'process.html' },
    { key: 'contact', label: 'اتصل بنا', slug: 'contact.html' },
    { key: 'testimonials', label: 'شهادات', slug: 'testimonials.html' },
    { key: 'about', label: 'شكون حنا', slug: 'about.html' },
    { key: 'faq', label: 'أسئلة شائعة', slug: 'faq.html' },
    { key: 'quiz', label: 'اختبار', slug: 'quiz.html' },
    { key: 'eligibility', label: 'اختبار الأهلية', slug: 'eligibility-test.html', cta: true },
  ],
};

// Pages hors menus (atteintes seulement par un lien direct), avec une adresse par langue : le
// selecteur de langue reste sur la meme page. Exclues du plan du site (astro.config.mjs, PRIVATE_PATHS).
export const hiddenPages: Record<string, Record<Lang, string>> = {
  // Espace client : questionnaire approfondi des prospects invites (adresse e-mail + mot de passe propose par
  // EZRA). Atteint par le bouton « Espace client » de l'en-tete et du pied de page, pas par le menu.
  // Memes adresses dans le logiciel EZRA (intake_service.PAGE_PATHS).
  intake: { fr: 'espace-client.html', en: 'client-area.html', es: 'area-cliente.html', he: 'client-area.html', ar: 'client-area.html' },
};

// Get the URL for a page in a specific language
export function getPageUrl(pageKey: string, lang: Lang): string {
  // Check if this is a legal page first
  const legalKey = legalKeyMap[pageKey];
  if (legalKey) {
    return getLegalUrl(legalKey, lang);
  }

  const hidden = hiddenPages[pageKey];
  if (hidden) {
    const folder = lang === 'ar' ? 'ara' : lang;
    return (lang === 'fr' ? '/' : `/${folder}/`) + hidden[lang];
  }

  const items = nav[lang];
  const item = items.find(i => i.key === pageKey);
  if (!item) return '#';

  const dirPrefix = lang === 'ar' ? 'ara' : lang;

  // Home pages: FR → /, others → /en/ (Astro build.format: 'preserve' → en/index.html,
  // the same URLs as the former static site)
  if (item.slug === 'index.html') {
    return lang === 'fr' ? '/' : `/${dirPrefix}/`;
  }

  const prefix = lang === 'fr' ? '/' : `/${dirPrefix}/`;
  return prefix + item.slug;
}

// Map currentPage keys to legal.ts keys for legal pages
const legalKeyMap: Record<string, keyof typeof legalPages['fr']> = {
  'privacy': 'privacy',
  'legal-notice': 'legal',
  'terms': 'terms',
  'cookies': 'cookies',
};

// Build hreflang map for a given page key
export function getHreflangMap(pageKey: string): Record<string, string> {
  const map: Record<string, string> = {};

  // Check if this is a legal page
  const legalKey = legalKeyMap[pageKey];

  for (const lang of ['fr', 'en', 'es', 'he', 'ar'] as Lang[]) {
    let url: string;
    if (legalKey) {
      url = getLegalUrl(legalKey, lang);
    } else {
      url = getPageUrl(pageKey, lang);
    }
    const hreflangCode = lang; // fr, en, es, he, ar
    map[hreflangCode] = `https://ezra-maroc.com${url}`;
  }
  map['x-default'] = map['fr'];
  return map;
}
