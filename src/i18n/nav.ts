import type { Lang } from './locales';
import { legalPages, getLegalUrl } from './legal';

export interface NavItem {
  key: string;
  label: string;
  slug: string;
}

export const nav: Record<Lang, NavItem[]> = {
  fr: [
    { key: 'home', label: 'Accueil', slug: 'index.html' },
    { key: 'advantages', label: 'Avantages', slug: 'avantages.html' },
    { key: 'services', label: 'Services', slug: 'services.html' },
    { key: 'process', label: 'Processus', slug: 'processus.html' },
    { key: 'contact', label: 'Contact', slug: 'contact.html' },
    { key: 'testimonials', label: 'Témoignages', slug: 'temoignages.html' },
    { key: 'about', label: 'À propos', slug: 'a-propos.html' },
    { key: 'faq', label: 'FAQ', slug: 'faq.html' },
    { key: 'quiz', label: 'Quiz', slug: 'quiz.html' },
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
  ],
  es: [
    { key: 'home', label: 'Inicio', slug: 'inicio.html' },
    { key: 'advantages', label: 'Ventajas', slug: 'ventajas.html' },
    { key: 'services', label: 'Servicios', slug: 'servicios.html' },
    { key: 'process', label: 'Proceso', slug: 'proceso.html' },
    { key: 'contact', label: 'Contacto', slug: 'contacto.html' },
    { key: 'testimonials', label: 'Testimonios', slug: 'testimonios.html' },
    { key: 'about', label: 'Sobre nosotros', slug: 'sobre-nosotros.html' },
    { key: 'faq', label: 'FAQ', slug: 'faq.html' },
    { key: 'quiz', label: 'Quiz', slug: 'quiz.html' },
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
  ],
};

// Get the URL for a page in a specific language
export function getPageUrl(pageKey: string, lang: Lang): string {
  // Check if this is a legal page first
  const legalKey = legalKeyMap[pageKey];
  if (legalKey) {
    return getLegalUrl(legalKey, lang);
  }

  const items = nav[lang];
  const item = items.find(i => i.key === pageKey);
  if (!item) return '#';

  const dirPrefix = lang === 'ar' ? 'ara' : lang;

  // Home pages: FR → /index.html, others → /en.html (Astro build.format: 'file')
  if (item.slug === 'index.html') {
    return lang === 'fr' ? '/index.html' : `/${dirPrefix}.html`;
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
