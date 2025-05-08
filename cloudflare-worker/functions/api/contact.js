// Contenu CORRIGÉ pour : functions/api/contact.js

/**
 * Cloudflare Pages Function pour gérer les soumissions du formulaire de contact Ezra Maroc
 * Ce fichier remplace le worker autonome précédent.
 * Il est appelé automatiquement pour les requêtes sur /api/contact
 */

// La fonction principale qui gère les requêtes POST sur /api/contact
export async function onRequestPost(context) {
    // context contient { request, env, params, next, data }
    // On extrait request (la requête entrante) et env (les variables d'environnement/secrets)
    const { request, env } = context;
  
    // --- Configuration CORS ---
    // Lit la variable d'environnement ALLOWED_ORIGIN définie dans les paramètres Pages.
    // Si elle n'est pas définie, '*' est utilisé (moins sécurisé, ok pour test).
    // METTEZ 'https://ezra-maroc.com' dans les variables Cloudflare Pages !
    const allowedOrigin = env.ALLOWED_ORIGIN || '*';
    const corsHeaders = {
      'Access-Control-Allow-Origin': allowedOrigin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };
  
    try {
      // --- 1. Parsing des données JSON du formulaire ---
      let formData;
      try {
        formData = await request.json();
      } catch (e) {
        console.error('Erreur de parsing JSON dans Pages Function:', e);
        return new Response(JSON.stringify({ success: false, message: 'Requête invalide (corps non JSON ou mal formé).' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
  
      // --- 2. Validation Côté Serveur (Essentielle) ---
      const requiredFields = ['name', 'email', 'subject', 'message', 'consent', 'terms_consent'];
      const missingFields = requiredFields.filter(field => !formData[field]);
  
      if (missingFields.length > 0) {
        console.warn('Pages Function: Validation échouée - Champs manquants:', missingFields.join(', '));
        return new Response(JSON.stringify({ success: false, message: `Données manquantes. Champs requis: ${missingFields.join(', ')}` }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (formData.consent !== 'accepted' || formData.terms_consent !== 'accepted') {
        console.warn('Pages Function: Validation échouée - Consentements requis non acceptés.');
        return new Response(JSON.stringify({ success: false, message: 'Les consentements nécessaires doivent être acceptés.' }), {
           status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
         console.warn('Pages Function: Validation email échouée:', formData.email);
         return new Response(JSON.stringify({ success: false, message: 'Format d\'email invalide.' }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
       }
  
      // --- 3. Récupération des Variables/Secrets Cloudflare (configurées pour le PROJET PAGES) ---
      const SENDGRID_KEY = env.SENDGRID_API_KEY; // Doit être un SECRET dans Pages Settings
      const TO_EMAIL = env.TO_EMAIL;           // Variable d'environnement Plaintext
      const FROM_EMAIL = env.FROM_EMAIL;         // Variable d'environnement Plaintext (et vérifiée chez SendGrid!)
  
      if (!SENDGRID_KEY || !TO_EMAIL || !FROM_EMAIL) {
        // Identification des variables manquantes pour le log
        const missingVars = [
            !SENDGRID_KEY && "SENDGRID_API_KEY (Secret)",
            !TO_EMAIL && "TO_EMAIL",
            !FROM_EMAIL && "FROM_EMAIL"
        ].filter(Boolean).join(', '); // Filtre les valeurs false/null/undefined et joint les noms
        console.error(`Erreur critique (Pages Function): Variables d'environnement manquantes : ${missingVars}. Vérifiez la configuration du projet Pages.`);
        return new Response(JSON.stringify({ success: false, message: 'Erreur de configuration interne du serveur critique (PF).' }), {
           status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
  
      // --- 4. Construction de l'email SendGrid ---
      const emailData = {
        personalizations: [{ to: [{ email: TO_EMAIL }] }],
        from: { email: FROM_EMAIL, name: "Formulaire Ezra Maroc (Site)" },
        reply_to: { email: formData.email, name: formData.name },
        subject: `Nouveau contact Ezra Maroc : ${formData.subject}`,
        content: [{
          type: 'text/plain',
          // === DEBUT CORRECTION ===
          // Le template literal doit contenir le corps complet de l'email et se terminer par `
          value: `
  Vous avez reçu une nouvelle soumission depuis le formulaire de contact Ezra Maroc :
  
  ----------------------------------------
  Informations du Contact :
  ----------------------------------------
  Nom : ${formData.name || 'Non fourni'}
  Email : ${formData.email || 'Non fourni'}
  Téléphone : ${formData.phone || 'Non fourni'}
  
  ----------------------------------------
  Détails de la Demande :
  ----------------------------------------
  Sujet : ${formData.subject || 'Non fourni'}
  Message :
  ${formData.message || 'Aucun message fourni'}
  
  ----------------------------------------
  Consentements :
  ----------------------------------------
  Politique de Confidentialité : ${formData.consent === 'accepted' ? 'Accepté' : 'Non Accepté'}
  Conditions Générales d'Utilisation : ${formData.terms_consent === 'accepted' ? 'Accepté' : 'Non Accepté'}
  
  ----------------------------------------
  Heure de Soumission (UTC) : ${new Date().toISOString()}
  ` // <--- ACCENT GRAVE FERMANT AJOUTÉ ICI
          // === FIN CORRECTION ===
        }],
      };
  
      // --- 5. Appel à l'API SendGrid ---
      console.log(`PAGES FUNCTION: Envoi email vers ${TO_EMAIL} depuis ${formData.email}`);
      const sendgridResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${SENDGRID_KEY}`, 'Content-Type': 'application/json', },
        body: JSON.stringify(emailData),
      });
  
      // --- 6. Traitement Réponse SendGrid ---
      if (sendgridResponse.ok) {
        console.log(`PAGES FUNCTION: Email pour ${formData.email} envoyé. Statut: ${sendgridResponse.status}`);
        return new Response(JSON.stringify({ success: true, message: 'Votre message a été envoyé avec succès.' }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } else {
        const errorBody = await sendgridResponse.text();
        console.error(`PAGES FUNCTION: Erreur SendGrid (${sendgridResponse.status}) pour ${formData.email}: ${errorBody}`);
         return new Response(JSON.stringify({ success: false, message: `Erreur lors de l'envoi de l'email (Code: PFSG-${sendgridResponse.status}).` }), {
          status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
  
    } catch (error) {
      // --- 7. Gestion Erreurs Inattendues ---
      console.error('Erreur inattendue dans Pages Function onRequestPost:', error);
      return new Response(JSON.stringify({ success: false, message: 'Une erreur interne du serveur (PF).' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }
  
  // Optionnel: Gérer les requêtes OPTIONS explicitement si nécessaire
  export async function onRequestOptions(context) {
     const allowedOrigin = context.env.ALLOWED_ORIGIN || '*';
     const corsHeaders = {
       'Access-Control-Allow-Origin': allowedOrigin,
       'Access-Control-Allow-Methods': 'POST, OPTIONS',
       'Access-Control-Allow-Headers': 'Content-Type',
       // Optionnel: Ajouter 'Access-Control-Max-Age' pour mettre en cache la pré-vérification
       // 'Access-Control-Max-Age': '86400', // 24 heures
     };
     return new Response(null, { headers: corsHeaders });
  }
  
  // Optionnel: Gérer GET pour donner une réponse claire si qqn essaie d'accéder directement
  export async function onRequestGet(context) {
    const allowedOrigin = context.env.ALLOWED_ORIGIN || '*';
    const corsHeaders = {
      'Access-Control-Allow-Origin': allowedOrigin,
      'Content-Type': 'application/json'
     };
     return new Response(JSON.stringify({ success: false, message: 'Méthode GET non supportée. Utilisez POST pour envoyer le formulaire.' }), {
         status: 405, headers: corsHeaders
     });
  }
  
  // Si tu n'as besoin que de POST et OPTIONS, tu peux supprimer onRequestGet.
  // La présence de onRequestOptions est une bonne pratique.