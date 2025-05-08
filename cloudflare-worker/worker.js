// Contenu pour cloudflare-worker/worker.js

export default {
  async fetch(request, env, ctx) {
    // 1. Autoriser CORS (Important pour que ton JS frontend puisse appeler le worker)
    // Adapte 'Access-Control-Allow-Origin' si tu connais l'URL exacte de ton site
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*', // Permet à n'importe quel domaine d'appeler (pour test, à restreindre idéalement)
      // Si ton site est sur 'https://www.ezra-maroc.com', utilise :
      // 'Access-Control-Allow-Origin': 'https://www.ezra-maroc.com',
      'Access-Control-Allow-Methods': 'POST, OPTIONS', // Méthodes autorisées
      'Access-Control-Allow-Headers': 'Content-Type', // En-têtes autorisés dans la requête
    };

    // Répondre immédiatement aux requêtes OPTIONS (pré-vérification CORS du navigateur)
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // 2. Accepter uniquement les requêtes POST
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ success: false, message: 'Méthode non autorisée' }), {
        status: 405, // Method Not Allowed
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    try {
      // 3. Récupérer les données JSON envoyées par le formulaire
      const formData = await request.json();

      // 4. Validation Côté Serveur (Basique - Renforcer si besoin)
      if (!formData.name || !formData.email || !formData.subject || !formData.message || formData.consent !== 'accepted' || formData.terms_consent !== 'accepted') {
         // Log détaillé pour le débogage serveur uniquement
         console.warn('Validation côté serveur échouée. Données reçues:', JSON.stringify(formData, null, 2));
         return new Response(JSON.stringify({ success: false, message: 'Données manquantes ou invalides. Veuillez vérifier tous les champs obligatoires.' }), {
          status: 400, // Bad Request
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
       // Optionnel : Valider le format de l'email ici aussi
       const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
       if (!emailRegex.test(formData.email)) {
           console.warn('Validation email serveur échouée:', formData.email);
            return new Response(JSON.stringify({ success: false, message: 'Format d\'email invalide.' }), {
               status: 400,
               headers: { ...corsHeaders, 'Content-Type': 'application/json' },
           });
       }


      // 5. Récupérer les variables d'environnement/secrets
      const SENDGRID_KEY = env.SENDGRID_API_KEY;
      const TO_EMAIL = env.TO_EMAIL;
      const FROM_EMAIL = env.FROM_EMAIL;

      // Vérification critique que les variables sont définies
      if (!SENDGRID_KEY || !TO_EMAIL || !FROM_EMAIL) {
          console.error("Erreur critique: Une ou plusieurs variables d'environnement (SENDGRID_API_KEY, TO_EMAIL, FROM_EMAIL) ne sont pas définies dans les paramètres du Worker.");
           return new Response(JSON.stringify({ success: false, message: 'Erreur de configuration serveur critique.' }), {
              status: 500, // Erreur serveur interne
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
           });
      }

      // 6. Construire l'objet email pour l'API SendGrid v3
      const emailData = {
        personalizations: [{
          to: [{ email: TO_EMAIL }], // Utilise la variable d'env
        }],
        from: { email: FROM_EMAIL, name: "Ezra Maroc Formulaire" }, // Utilise la variable d'env
        reply_to: { email: formData.email, name: formData.name }, // Pour pouvoir répondre au client
        subject: `Nouveau contact Ezra Maroc: ${formData.subject}`,
        content: [{
          type: 'text/plain',
          value: `
            Vous avez reçu un nouveau message via le formulaire de contact Ezra Maroc :

            Nom : ${formData.name}
            Email : ${formData.email}
            Téléphone : ${formData.phone || 'Non fourni'}
            Sujet : ${formData.subject}

            Message :
            --------------------------------------------------
            ${formData.message}
            --------------------------------------------------

            Consentement Politique de Conf. : ${formData.consent}
            Consentement CGU : ${formData.terms_consent}
          `,
        }],
      };

      // 7. Envoyer l'email via l'API SendGrid
      const sendgridResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SENDGRID_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailData),
      });

      // 8. Vérifier la réponse de SendGrid
      if (sendgridResponse.status >= 200 && sendgridResponse.status < 300) {
        console.log(`Email pour ${formData.email} envoyé via SendGrid. Statut: ${sendgridResponse.status}`);
        return new Response(JSON.stringify({ success: true, message: 'Message envoyé avec succès.' }), {
          status: 200, // OK
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, // Renvoie JSON avec CORS
        });
      } else {
        const errorBody = await sendgridResponse.text();
        console.error(`Erreur SendGrid (${sendgridResponse.status}) pour ${formData.email}: ${errorBody}`);
         // Message d'erreur générique pour l'utilisateur
         let userErrorMessage = `Erreur lors de l'envoi de l'email (${sendgridResponse.status}). Veuillez réessayer.`;
         // Si le corps contient des infos utiles et non sensibles, on pourrait les ajouter au log, mais pas forcément à l'utilisateur.
         return new Response(JSON.stringify({ success: false, message: userErrorMessage }), {
          status: sendgridResponse.status, // Renvoie le statut d'erreur
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, // Renvoie JSON avec CORS
        });
      }

    } catch (error) {
      // 9. Gérer les erreurs JS ou réseau inattendues
      console.error('Erreur inattendue dans le Worker fetch:', error);
      return new Response(JSON.stringify({ success: false, message: 'Erreur interne du serveur inattendue.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, // Renvoie JSON avec CORS
      });
    }
  },
};