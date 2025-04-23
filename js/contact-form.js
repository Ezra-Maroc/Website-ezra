// js/contact-form.js

// Loader + message handling for Ezra Maroc contact form

document.addEventListener("DOMContentLoaded", () => {
    const form   = document.getElementById("contact-form");
    const btn    = form.querySelector("button");
    const loader = btn.querySelector(".btn-loader");
    const text   = btn.querySelector(".btn-text");
    const flash  = document.getElementById("form-message");
  
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
  
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }
  
      loader.style.display = "inline-block";
      text.style.display   = "none";
      flash.style.display  = "none";
  
      try {
        const formData = Object.fromEntries(new FormData(form).entries());
  
        const res = await fetch(form.action, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData)
        });
  
        if (res.ok) {
          flash.textContent = "Votre message a bien été envoyé. ✅";
          flash.className   = "form-message success";
          form.reset();
        } else {
          const errText = await res.text();
          flash.textContent = "Erreur : " + errText;
          flash.className   = "form-message error";
        }
      } catch (err) {
        flash.textContent = "Erreur réseau : " + err.message;
        flash.className   = "form-message error";
      } finally {
        loader.style.display = "none";
        text.style.display   = "inline-block";
        flash.style.display  = "block";
      }
    });
  });
  