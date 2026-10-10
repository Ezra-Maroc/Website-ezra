// Locale configuration for each language
export type Lang = 'fr' | 'en' | 'es' | 'he' | 'ar';

export interface LocaleConfig {
  dir: 'ltr' | 'rtl';
  ogLocale: string;
  htmlLang: string;
  pathPrefix: string;       // URL path prefix
  fontsUrl: string;         // Google Fonts <link> URL
  bodyClass?: string;       // Additional body class
}

export const locales: Record<Lang, LocaleConfig> = {
  fr: {
    dir: 'ltr',
    ogLocale: 'fr_FR',
    htmlLang: 'fr',
    pathPrefix: '',
    fontsUrl: 'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&family=Poppins:wght@300;400;500;600&display=swap',
  },
  en: {
    dir: 'ltr',
    ogLocale: 'en_US',
    htmlLang: 'en',
    pathPrefix: '/en',
    fontsUrl: 'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&family=Poppins:wght@300;400;500;600&display=swap',
  },
  es: {
    dir: 'ltr',
    ogLocale: 'es_ES',
    htmlLang: 'es',
    pathPrefix: '/es',
    fontsUrl: 'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&family=Poppins:wght@300;400;500;600&display=swap',
  },
  he: {
    dir: 'rtl',
    ogLocale: 'he_IL',
    htmlLang: 'he',
    pathPrefix: '/he',
    fontsUrl: 'https://fonts.googleapis.com/css2?family=Heebo:wght@400;500;600;700&family=Assistant:wght@300;400;500;600&display=swap',
  },
  ar: {
    dir: 'rtl',
    ogLocale: 'ar_MA',
    htmlLang: 'ar',
    pathPrefix: '/ara',
    fontsUrl: 'https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700&display=swap',
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
