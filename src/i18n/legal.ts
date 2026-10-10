import type { Lang } from './locales';

// Legal page filename mapping per language
// The keys match the page "key", values are the slug filenames
export const legalPages: Record<Lang, {
  privacy: string;
  legal: string;
  terms: string;
  cookies: string;
}> = {
  fr: {
    privacy: 'politique-confidentialite.html',
    legal: 'mentions-legales.html',
    terms: 'conditions-utilisation.html',
    cookies: 'politique-cookies.html',
  },
  en: {
    privacy: 'privacy-policy.html',
    legal: 'legal-notice.html',
    terms: 'terms-of-service.html',
    cookies: 'cookie-policy.html',
  },
  es: {
    privacy: 'politica-privacidad.html',
    legal: 'aviso-legal.html',
    terms: 'condiciones-uso.html',
    cookies: 'politica-cookies.html',
  },
  he: {
    privacy: 'privacy-policy.html',
    legal: 'legal-notice.html',
    terms: 'terms-of-service.html',
    cookies: 'cookie-policy.html',
  },
  ar: {
    // ARA uses French filenames
    privacy: 'politique-confidentialite.html',
    legal: 'mentions-legales.html',
    terms: 'conditions-utilisation.html',
    cookies: 'politique-cookies.html',
  },
};

// Get the full URL path for a legal page
export function getLegalUrl(pageType: keyof typeof legalPages['fr'], lang: Lang): string {
  const prefix = lang === 'fr' ? '/' : `/${lang === 'ar' ? 'ara' : lang}/`;
  return prefix + legalPages[lang][pageType];
}

// Get the privacy policy URL for tarteaucitron data-privacy-url
export function getPrivacyUrl(lang: Lang): string {
  return getLegalUrl('privacy', lang);
}
