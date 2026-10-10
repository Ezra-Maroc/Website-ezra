import type { Lang } from './locales';

// All UI translations for shared components
export const ui: Record<Lang, {
  // Header
  logoAlt: string;
  brandName: [string, string]; // [regular, bold] — e.g. ["Ezra", "Maroc"]
  langSelectLabel: string;

  // Footer
  footerTagline: string;
  footerQuickLinks: string;
  footerLegalLinks: string;
  footerKeyServices: string;
  footerContact: string;
  copyright: string;
  disclaimer: string;
  linkedinLabel: string;
  instagramLabel: string;

  // Footer services
  serviceEligibility: string;
  serviceConstitution: string;
  serviceRecherche: string;
  serviceSuivi: string;
  servicePostObtention: string;

  // Legal link labels
  privacyPolicy: string;
  legalNotice: string;
  termsOfService: string;
  cookiePolicy: string;
  cookieSettings: string;

  // Footer France office
  footerFranceOffice: string;
  footerFranceAddress: string;

  // Mobile menu
  menuLabel: string;

  // Mid-page CTA
  ctaTitle: string;
  ctaSubtitle: string;
  ctaButton: string;

  // Skip link
  skipToContent: string;

  // Language names
  langNames: Record<string, string>;
}> = {
  fr: {
    logoAlt: 'Ezra Maroc Project Logo',
    brandName: ['Ezra', 'Maroc'],
    langSelectLabel: 'Sélectionnez la langue',
    footerTagline: 'Votre partenaire de confiance pour l\'obtention de la nationalité marocaine.',
    footerQuickLinks: 'Liens rapides',
    footerLegalLinks: 'Liens légaux',
    footerKeyServices: 'Nos Services Clés',
    footerContact: 'Contact',
    copyright: '© 2024-{year} Ezra Maroc Consulting Services LLC. Tous droits réservés.',
    disclaimer: 'Ce site fournit des informations générales et ne constitue pas un conseil juridique.',
    linkedinLabel: 'LinkedIn Ezra Maroc',
    instagramLabel: 'Instagram Ezra Maroc',
    serviceEligibility: 'Vérification d\'éligibilité',
    serviceConstitution: 'Constitution du dossier',
    serviceRecherche: 'Recherche généalogique',
    serviceSuivi: 'Suivi administratif',
    servicePostObtention: 'Services post-obtention',
    privacyPolicy: 'Politique de confidentialité',
    legalNotice: 'Mentions légales',
    termsOfService: 'Conditions d\'utilisation',
    cookiePolicy: 'Politique cookies',
    cookieSettings: 'Gestion des cookies',
    footerFranceOffice: 'Bureau France',
    footerFranceAddress: '113 Bd du Général Koenig, 92200 Neuilly-sur-Seine, France',
    menuLabel: 'Menu',
    ctaTitle: 'Prêt à démarrer ?',
    ctaSubtitle: 'Demandez votre évaluation gratuite dès maintenant.',
    ctaButton: 'Contactez-nous',
    skipToContent: 'Aller au contenu principal',
    langNames: { fr: 'Français', en: 'English', es: 'Español', he: 'עברית', ar: 'العربية (الدارجة)' },
  },
  en: {
    logoAlt: 'Ezra Maroc Project Logo',
    brandName: ['Ezra', 'Maroc'],
    langSelectLabel: 'Select language',
    footerTagline: 'Your trusted partner for obtaining Moroccan nationality.',
    footerQuickLinks: 'Quick Links',
    footerLegalLinks: 'Legal Links',
    footerKeyServices: 'Our Key Services',
    footerContact: 'Contact',
    copyright: '© 2024-{year} Ezra Maroc Consulting Services LLC. All rights reserved.',
    disclaimer: 'This website provides general information and does not constitute legal advice.',
    linkedinLabel: 'LinkedIn Ezra Maroc',
    instagramLabel: 'Instagram Ezra Maroc',
    serviceEligibility: 'Eligibility Verification',
    serviceConstitution: 'File Preparation',
    serviceRecherche: 'Genealogical Research',
    serviceSuivi: 'Administrative Follow-up',
    servicePostObtention: 'Post-Acquisition Services',
    privacyPolicy: 'Privacy Policy',
    legalNotice: 'Legal Notice',
    termsOfService: 'Terms of Service',
    cookiePolicy: 'Cookie Policy',
    cookieSettings: 'Cookie Settings',
    footerFranceOffice: 'France Office',
    footerFranceAddress: '113 Bd du Général Koenig, 92200 Neuilly-sur-Seine, France',
    menuLabel: 'Menu',
    ctaTitle: 'Ready to get started?',
    ctaSubtitle: 'Request your free assessment now.',
    ctaButton: 'Contact Us',
    skipToContent: 'Skip to main content',
    langNames: { fr: 'Français', en: 'English', es: 'Español', he: 'עברית', ar: 'العربية (الدارجة)' },
  },
  es: {
    logoAlt: 'Ezra Maroc Project Logo',
    brandName: ['Ezra', 'Maroc'],
    langSelectLabel: 'Seleccione el idioma',
    footerTagline: 'Su socio de confianza para obtener la nacionalidad marroquí.',
    footerQuickLinks: 'Enlaces rápidos',
    footerLegalLinks: 'Enlaces legales',
    footerKeyServices: 'Nuestros Servicios Clave',
    footerContact: 'Contacto',
    copyright: '© 2024-{year} Ezra Maroc Consulting Services LLC. Todos los derechos reservados.',
    disclaimer: 'Este sitio proporciona información general y no constituye asesoramiento jurídico.',
    linkedinLabel: 'LinkedIn Ezra Maroc',
    instagramLabel: 'Instagram Ezra Maroc',
    serviceEligibility: 'Verificación de elegibilidad',
    serviceConstitution: 'Constitución del expediente',
    serviceRecherche: 'Investigación genealógica',
    serviceSuivi: 'Seguimiento administrativo',
    servicePostObtention: 'Servicios post-obtención',
    privacyPolicy: 'Política de privacidad',
    legalNotice: 'Aviso legal',
    termsOfService: 'Condiciones de uso',
    cookiePolicy: 'Política de cookies',
    cookieSettings: 'Gestión de cookies',
    footerFranceOffice: 'Oficina Francia',
    footerFranceAddress: '113 Bd du Général Koenig, 92200 Neuilly-sur-Seine, France',
    menuLabel: 'Menú',
    ctaTitle: '¿Listo para empezar?',
    ctaSubtitle: 'Solicite su evaluación gratuita ahora.',
    ctaButton: 'Contáctenos',
    skipToContent: 'Ir al contenido principal',
    langNames: { fr: 'Français', en: 'English', es: 'Español', he: 'עברית', ar: 'العربية (الدارجة)' },
  },
  he: {
    logoAlt: 'לוגו פרויקט עזרא מרוק',
    brandName: ['Ezra', 'Maroc'],
    langSelectLabel: 'בחר שפה',
    footerTagline: 'השותף המהימן שלך לקבלת אזרחות מרוקאית.',
    footerQuickLinks: 'קישורים מהירים',
    footerLegalLinks: 'קישורים משפטיים',
    footerKeyServices: 'השירותים המרכזיים שלנו',
    footerContact: 'צור קשר',
    copyright: '© 2024-{year} Ezra Maroc Consulting Services LLC. כל הזכויות שמורות.',
    disclaimer: 'אתר זה מספק מידע כללי ואינו מהווה ייעוץ משפטי.',
    linkedinLabel: 'LinkedIn עזרא מרוק',
    instagramLabel: 'Instagram עזרא מרוק',
    serviceEligibility: 'בדיקת זכאות',
    serviceConstitution: 'הכנת תיק',
    serviceRecherche: 'מחקר גנאלוגי',
    serviceSuivi: 'מעקב מנהלי',
    servicePostObtention: 'שירותים לאחר קבלה',
    privacyPolicy: 'מדיניות פרטיות',
    legalNotice: 'הודעה משפטית',
    termsOfService: 'תנאי שימוש',
    cookiePolicy: 'מדיניות עוגיות',
    cookieSettings: 'הגדרות עוגיות',
    footerFranceOffice: 'משרד צרפת',
    footerFranceAddress: '113 Bd du Général Koenig, 92200 Neuilly-sur-Seine, France',
    menuLabel: 'תפריט',
    ctaTitle: 'מוכנים להתחיל?',
    ctaSubtitle: 'בקשו את ההערכה החינמית שלכם עכשיו.',
    ctaButton: 'צרו קשר',
    skipToContent: 'דלג לתוכן הראשי',
    langNames: { fr: 'Français', en: 'English', es: 'Español', he: 'עברית', ar: 'العربية (الدارجة)' },
  },
  ar: {
    logoAlt: 'شعار مشروع عزرا المغرب',
    brandName: ['عزرا', 'ماروك'],
    langSelectLabel: 'اختر اللغة',
    footerTagline: 'شريكك الموثوق للحصول على الجنسية المغربية.',
    footerQuickLinks: 'روابط سريعة',
    footerLegalLinks: 'روابط قانونية',
    footerKeyServices: 'خدماتنا الرئيسية',
    footerContact: 'اتصل بنا',
    copyright: '© 2024-{year} عزرا المغرب للاستشارات ذ.م.م. جميع الحقوق محفوظة.',
    disclaimer: 'هذا الموقع يوفر معلومات عامة ولا يشكل استشارة قانونية.',
    linkedinLabel: 'لينكدإن عزرا المغرب',
    instagramLabel: 'إنستغرام عزرا المغرب',
    serviceEligibility: 'التحقق من الأهلية',
    serviceConstitution: 'تكوين الملف',
    serviceRecherche: 'البحث في الأنساب',
    serviceSuivi: 'المتابعة الإدارية',
    servicePostObtention: 'خدمات ما بعد الحصول',
    privacyPolicy: 'سياسة الخصوصية',
    legalNotice: 'الإشعار القانوني',
    termsOfService: 'شروط الاستخدام',
    cookiePolicy: 'سياسة ملفات تعريف الارتباط',
    cookieSettings: 'إدارة ملفات تعريف الارتباط',
    footerFranceOffice: 'مكتب فرنسا',
    footerFranceAddress: '113 Bd du Général Koenig, 92200 Neuilly-sur-Seine, France',
    menuLabel: 'القائمة',
    ctaTitle: 'مستعدين تبدأو؟',
    ctaSubtitle: 'اطلبو تقييمكم المجاني دابا.',
    ctaButton: 'تواصلو معانا',
    skipToContent: 'انتقل إلى المحتوى الرئيسي',
    langNames: { fr: 'Français', en: 'English', es: 'Español', he: 'עברית', ar: 'العربية (الدارجة)' },
  },
};
