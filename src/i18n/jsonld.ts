import type { Lang } from './locales';

// Organization JSON-LD descriptions per language
const orgDescriptions: Record<Lang, string> = {
  fr: "Ezra Maroc offre un accompagnement expert pour l'obtention de la nationalit\u00e9 marocaine, sp\u00e9cialis\u00e9 dans les d\u00e9marches par filiation. Nous guidons nos clients \u00e0 chaque \u00e9tape, de l'\u00e9valuation d'\u00e9ligibilit\u00e9 \u00e0 la constitution du dossier et au suivi administratif.",
  en: 'Expert support for obtaining Moroccan nationality through family ties.',
  es: "Acompa\u00f1amiento experto para obtener la nacionalidad marroqu\u00ed por v\u00ednculos familiares.",
  he: '\u05dc\u05d9\u05d5\u05d5\u05d9 \u05de\u05d5\u05de\u05d7\u05d4 \u05dc\u05d4\u05e9\u05d2\u05ea \u05d4\u05d0\u05d6\u05e8\u05d7\u05d5\u05ea \u05d4\u05de\u05e8\u05d5\u05e7\u05d0\u05d9\u05ea \u05d3\u05e8\u05da \u05d6\u05d9\u05e7\u05d4 \u05de\u05e9\u05e4\u05d7\u05ea\u05d9\u05ea.',
  ar: '\u0645\u0631\u0627\u0641\u0642\u0629 \u0645\u062a\u062e\u0635\u0635\u0629 \u0644\u0644\u062d\u0635\u0648\u0644 \u0639\u0644\u0649 \u0627\u0644\u062c\u0646\u0633\u064a\u0629 \u0627\u0644\u0645\u063a\u0631\u0628\u064a\u0629 \u0639\u0628\u0631 \u0627\u0644\u0631\u0648\u0627\u0628\u0637 \u0627\u0644\u0639\u0627\u0626\u0644\u064a\u0629.',
};

export function getOrganizationJsonLD(lang: Lang) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Ezra Maroc Consulting Services LLC',
    url: 'https://ezra-maroc.com',
    logo: 'https://ezra-maroc.com/img/logo.png',
    description: orgDescriptions[lang],
    contactPoint: {
      '@type': 'ContactPoint',
      email: 'info@ezra-project.fr',
      contactType: 'Customer Service / Inquiry',
      areaServed: ['FR', 'MA', 'US', 'CA', 'IL'],
      availableLanguage: ['French', 'English', 'Spanish', 'Hebrew', 'Arabic'],
    },
    address: {
      '@type': 'PostalAddress',
      streetAddress: '30 N Gould St Ste R',
      addressLocality: 'Sheridan',
      addressRegion: 'WY',
      postalCode: '82801',
      addressCountry: 'US',
    },
    sameAs: ['https://www.instagram.com/ezramaroc/'],
  };
}
