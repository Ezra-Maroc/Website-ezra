// Locale configuration for each language
export type Lang = 'fr' | 'en' | 'es' | 'he' | 'ar';

export interface LocaleConfig {
  dir: 'ltr' | 'rtl';
  ogLocale: string;
  htmlLang: string;
  pathPrefix: string;       // URL path prefix
  bodyClass?: string;       // Additional body class
}

export const locales: Record<Lang, LocaleConfig> = {
  fr: {
    dir: 'ltr',
    ogLocale: 'fr_FR',
    htmlLang: 'fr',
    pathPrefix: '',
  },
  en: {
    dir: 'ltr',
    ogLocale: 'en_US',
    htmlLang: 'en',
    pathPrefix: '/en',
  },
  es: {
    dir: 'ltr',
    ogLocale: 'es_ES',
    htmlLang: 'es',
    pathPrefix: '/es',
  },
  he: {
    dir: 'rtl',
    ogLocale: 'he_IL',
    htmlLang: 'he',
    pathPrefix: '/he',
  },
  ar: {
    dir: 'rtl',
    ogLocale: 'ar_MA',
    htmlLang: 'ar',
    pathPrefix: '/ara',
    bodyClass: 'rtl',
  },
};

export const LANGS: Lang[] = ['fr', 'en', 'es', 'he', 'ar'];

export function isRTL(lang: Lang): boolean {
  return locales[lang].dir === 'rtl';
}

export function getPathPrefix(lang: Lang): string {
  return locales[lang].pathPrefix;
}
