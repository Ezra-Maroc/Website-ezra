/**
 * Cloudflare Worker pour gérer les soumissions du formulaire de contact Ezra Maroc
 *
 * Fonctionnalités :
 * - Répond aux requêtes OPTIONS (pré-vérification CORS)
 * - Accepte uniquement les requêtes POST
 * - Valide les données reçues (champs obligatoires, format email)
 * - Récupère la clé API SendGrid, l'email destinataire et expéditeur depuis les variables/secrets Cloudflare
 * - Construit et envoie un email via l'API SendGrid v3
 * - Inclut un en-tête Reply-To pour répondre facilement au client
 * - Renvoie des réponses JSON standardisées au script frontend (contact-form.js) avec les en-têtes CORS appropriés.
 */

export default {
  async fetch(request, env, ctx) {

    // ==================================
    // Configuration CORS
    // ==================================
    // Remplacez par l'URL exacte de votre site pour plus de sécurité en production
    // Ex: 'https://www.ezra-maroc.com'
    const allowedOrigin = env.ALLOWED_ORIGIN || '*'; // Lit depuis les variables ou utilise '*' par défaut

    const corsHeaders = {
      'Access-Control-Allow-Origin': allowedOrigin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS', // Uniquement POST et OPTIONS nécessaires
      'Access-Control-Allow-Headers': 'Content-Type', // Seul 'Content-Type' est envoyé par notre JS
    };

    // ==================================
    // Gestion de la requête OPTIONS (Pré-vérification CORS)
    // ==================================
    if (request.method === 'OPTIONS') {
      // La pré-vérification CORS est gérée en renvoyant simplement les en-têtes d'autorisation
      return new Response(null, { headers: corsHeaders });
    }

    // ==================================
    // Vérification Méthode POST
    // ==================================
    if (request.method !== 'POST') {
      // Méthode non autorisée, renvoie 405 avec les en-têtes CORS
      return new Response(JSON.stringify({ success: false, message: 'Méthode non autorisée. Seules les requêtes POST sont acceptées.' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ==================================
    // Traitement de la requête POST
    // ==================================
    try {
      // --- 1. Récupération et Parsing des données ---
      let formData;
      try {
        formData = await request.json(); // Attend que les données JSON soient lues
      } catch (e) {
        // Si le JSON est mal formé
        console.error('Erreur de parsing JSON:', e);
        return new Response(JSON.stringify({ success: false, message: 'Requête invalide (JSON mal formé).' }), {
          status: 400, // Bad Request
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // --- 2. Validation Côté Serveur ---
      const requiredFields = ['name', 'email', 'subject', 'message', 'consent', 'terms_consent'];
      const missingFields = requiredFields.filter(field => !formData[field]); // Vérifie la présence

      if (missingFields.length > 0) {
        console.warn('Validation serveur échouée - Champs manquants:', missingFields.join(', '));
        return new Response(JSON.stringify({ success: false, message: `Données manquantes. Champs requis : ${missingFields.join(', ')}` }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Vérification spécifique des valeurs de consentement
      if (formData.consent !== 'accepted' || formData.terms_consent !== 'accepted') {
         console.warn('Validation serveur échouée - Consentements non acceptés');
         return new Response(JSON.stringify({ success: false, message: 'Les consentements nécessaires n\'ont pas été acceptés.' }), {
           status: 400,
           headers: { ...corsHeaders, 'Content-Type': 'application/json' },
         });
       }

      // Validation du format Email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
          console.warn('Validation email serveur échouée:', formData.email);
          return new Response(JSON.stringify({ success: false, message: 'Format d\'email invalide fourni.' }), {
             status: 400,
             headers: { ...corsHeaders, 'Content-Type': 'application/json' },
         });
      }

      // --- 3. Récupération des Variables/Secrets Cloudflare ---
      // Ces variables DOIVENT être définies dans les Settings > Variables de votre Worker
      // SENDGRID_API_KEY doit être défini comme un SECRET (Encrypt coché)
      const SENDGRID_KEY = env.SENDGRID_API_KEY;
      const TO_EMAIL = env.TO_EMAIL;           // Ex: info@ezra-project.fr
      const FROM_EMAIL = env.FROM_EMAIL;         // Ex: contact-form@votre-domaine-verifie.com (DOIT être vérifié sur SendGrid)

      // Vérification critique de l'existence des variables
      if (!SENDGRID_KEY || !TO_EMAIL || !FROM_EMAIL) {
          const missingVars = [
              !SENDGRID_KEY && "SENDGRID_API_KEY (Secret)",
              !TO_EMAIL && "TO_EMAIL",
              !FROM_EMAIL && "FROM_EMAIL"
          ].filter(Boolean).join(', ');
          console.error(`Erreur critique: Variables d'environnement manquantes : ${missingVars}. Vérifiez la configuration du Worker.`);
          // Ne pas renvoyer de détails techniques à l'utilisateur
           return new Response(JSON.stringify({ success: false, message: 'Erreur de configuration interne du serveur. Veuillez contacter l\'administrateur.' }), {
              status: 500, // Erreur serveur
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
           });
      }

      // --- 4. Construction de l'objet email SendGrid ---
      const emailData = {
        personalizations: [{
          to: [{ email: TO_EMAIL }],
          // Optionnel: BCC vers une autre adresse si besoin
          // bcc: [{ email: 'archive@votredomaine.com' }]
        }],
        from: {
             email: FROM_EMAIL,
             name: "Formulaire Ezra Maroc" // Nom de l'expéditeur tel qu'il apparaît
        },
        reply_to: {
             email: formData.email, // Email de l'utilisateur qui a rempli
             name: formData.name      // Nom de l'utilisateur qui a rempli
        },
        subject: `Nouveau contact Ezra Maroc : ${formData.subject}`, // Sujet clair
        content: [{
          type: 'text/plain', // Contenu en texte brut pour compatibilité maximale
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
          `,
        }],
      };

      // --- 5. Appel à l'API SendGrid ---
      console.log(`Tentative d'envoi d'email à ${TO_EMAIL} de la part de ${formData.email}`);
      const sendgridResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          // Utilise le Secret récupéré depuis l'environnement
          'Authorization': `Bearer ${SENDGRID_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailData), // Convertit l'objet en JSON
      });

      // --- 6. Traitement de la réponse SendGrid ---
      if (sendgridResponse.ok) { // ok est true pour les statuts 200-299
        // SendGrid renvoie souvent 202 Accepted, ce qui est OK.
        console.log(`Email pour ${formData.email} envoyé avec succès via SendGrid. Statut: ${sendgridResponse.status}`);
        return new Response(JSON.stringify({ success: true, message: 'Votre message a été envoyé avec succès.' }), {
          status: 200, // Ou 202 si on veut être précis, mais 200 est ok pour le frontend
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } else {
        // Erreur côté SendGrid
        const errorBody = await sendgridResponse.text(); // Récupère le corps de l'erreur pour les logs
        console.error(`Erreur SendGrid (${sendgridResponse.status}) lors de l'envoi pour ${formData.email}: ${errorBody}`);
        // Ne pas renvoyer les détails de l'erreur SendGrid à l'utilisateur
         return new Response(JSON.stringify({ success: false, message: `Une erreur est survenue lors de l'envoi de l'email (Code: SG-${sendgridResponse.status}). Veuillez réessayer ou contacter le support.` }), {
          status: 502, // Bad Gateway - indique un problème avec le service externe (SendGrid)
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

    } catch (error) {
      // --- 7. Gestion des erreurs inattendues (JS, réseau, etc.) ---
      console.error('Erreur inattendue dans le Worker fetch handler:', error);
      // Message d'erreur générique pour l'utilisateur
      return new Response(JSON.stringify({ success: false, message: 'Une erreur interne inattendue est survenue sur le serveur.' }), {
        status: 500, // Internal Server Error
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  },
};