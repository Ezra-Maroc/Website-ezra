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

// Language home pages are served as directories (/en/ → en/index.html)
const LANG_ROOTS = new Set(['/en', '/he', '/ara']);

// Public URL of a page-group path, same rules as getPageUrl() in src/i18n/nav.ts:
// '' → /, language roots → /en/, any other page → /page.html
function toPublicUrl(path) {
  if (path === '') return `${SITE}/`;
  if (LANG_ROOTS.has(path)) return `${SITE}${path}/`;
  return `${SITE}${path}.html`;
}

// Sitemap URL → page-group path (no extension, no trailing slash)
function toPagePath(url) {
  return url.replace(SITE, '').replace(/\.html$/, '').replace(/\/index$/, '').replace(/\/$/, '');
}

export default defineConfig({
  site: SITE,
  output: 'static',
  // 'preserve' keeps the former static site's URLs: about.astro → about.html,
  // en/index.astro → en/index.html
  trailingSlash: 'ignore',
  build: {
    format: 'preserve'
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
        // Same URLs as the pages' canonical and hreflang tags
        const path = toPagePath(item.url);
        item.url = toPublicUrl(path);
        const pageKey = urlToPageKey[path];
        if (pageKey) {
          const group = pageGroups[pageKey];
          item.links = Object.entries(group).map(([lang, langPath]) => ({
            lang,
            url: toPublicUrl(langPath)
          }));
          // Add x-default pointing to FR version
          item.links.push({ lang: 'x-default', url: toPublicUrl(group.fr) });
        }
        return item;
      }
    })
  ]
});
