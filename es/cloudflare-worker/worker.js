export default {
    async fetch(request, env, ctx) {
      if (request.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405 });
      }
  
      try {
        const data = await request.json();
  
        const email = {
          personalizations: [{
            to: [{ email: env.TO_EMAIL }],
            subject: data.subject || "Nouveau message depuis le formulaire Ezra Maroc"
          }],
          from: { email: env.FROM_EMAIL, name: "Ezra Maroc" },
          content: [{
            type: "text/plain",
            value: `
  Nom : ${data.name}
  Email : ${data.email}
  Téléphone : ${data.phone || "Non renseigné"}
  Message :
  ${data.message}
            `
          }]
        };
  
        const sendgridRes = await fetch("https://api.sendgrid.com/v3/mail/send", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${env.SENDGRID_API_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(email)
        });
  
        if (!sendgridRes.ok) {
          const errorText = await sendgridRes.text();
          return new Response(`Erreur d'envoi : ${errorText}`, { status: 500 });
        }
  
        return new Response("Email envoyé avec succès ✅", {
          status: 200,
          headers: { "Content-Type": "text/plain" }
        });
  
      } catch (err) {
        return new Response("Erreur interne : " + err.message, { status: 500 });
      }
    }
  };
  