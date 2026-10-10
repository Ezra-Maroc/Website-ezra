import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';
import sitemap from '@astrojs/sitemap';

const SITE = 'https://ezra-maroc.com';

// Page groups: each maps a page key to its URL path per language (without .html)
const pageGroups = {
  home:         { fr: '',                            en: '/en',                es: '/es/inicio',           he: '/he',                ar: '/ara' },
  advantages:   { fr: '/avantages',                  en: '/en/advantages',     es: '/es/ventajas',         he: '/he/advantages',     ar: '/ara/advantages' },
  services:     { fr: '/services',                   en: '/en/services',       es: '/es/servicios',        he: '/he/services',       ar: '/ara/services' },
  process:      { fr: '/processus',                  en: '/en/process',        es: '/es/proceso',          he: '/he/process',        ar: '/ara/process' },
  testimonials: { fr: '/temoignages',                en: '/en/testimonials',   es: '/es/testimonios',      he: '/he/testimonials',   ar: '/ara/testimonials' },
  about:        { fr: '/a-propos',                   en: '/en/about',          es: '/es/sobre-nosotros',   he: '/he/about',          ar: '/ara/about' },
  contact:      { fr: '/contact',                    en: '/en/contact',        es: '/es/contacto',         he: '/he/contact',        ar: '/ara/contact' },
  faq:          { fr: '/faq',                        en: '/en/faq',            es: '/es/faq',              he: '/he/faq',            ar: '/ara/faq' },
  quiz:         { fr: '/quiz',                       en: '/en/quiz',           es: '/es/quiz',             he: '/he/quiz',           ar: '/ara/quiz' },
  privacy:      { fr: '/politique-confidentialite',   en: '/en/privacy-policy', es: '/es/politica-privacidad', he: '/he/privacy-policy', ar: '/ara/politique-confidentialite' },
  legal:        { fr: '/mentions-legales',            en: '/en/legal-notice',   es: '/es/aviso-legal',      he: '/he/legal-notice',   ar: '/ara/mentions-legales' },
  terms:        { fr: '/conditions-utilisation',      en: '/en/terms-of-service', es: '/es/condiciones-uso', he: '/he/terms-of-service', ar: '/ara/conditions-utilisation' },
  cookies:      { fr: '/politique-cookies',           en: '/en/cookie-policy',  es: '/es/politica-cookies', he: '/he/cookie-policy',  ar: '/ara/politique-cookies' },
};

// Build reverse map: URL path → page key
const urlToPageKey = {};
for (const [key, langs] of Object.entries(pageGroups)) {
  for (const path of Object.values(langs)) {
    urlToPageKey[path] = key;
  }
}

export default defineConfig({
  site: SITE,
  output: 'static',
  trailingSlash: 'never',
  build: {
    format: 'file'
  },
  i18n: {
    defaultLocale: 'fr',
    locales: ['fr', 'en', 'es', 'he', { path: 'ara', codes: ['ar'] }],
    routing: {
      prefixDefaultLocale: false
    }
  },
  integrations: [
    preact(),
    sitemap({
      filter: (page) => !page.includes('404'),
      serialize(item) {
        // Extract path from full URL
        const path = item.url.replace(SITE, '').replace(/\/$/, '');
        const pageKey = urlToPageKey[path];
        if (pageKey) {
          const group = pageGroups[pageKey];
          item.links = Object.entries(group).map(([lang, langPath]) => ({
            lang,
            url: `${SITE}${langPath}`
          }));
          // Add x-default pointing to FR version
          item.links.push({ lang: 'x-default', url: `${SITE}${group.fr}` });
        }
        return item;
      }
    })
  ]
});
