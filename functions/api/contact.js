// Cloudflare Pages Function — POST /api/contact
// Handles contact form submissions with Turnstile verification, D1 storage, and Resend email

const ALLOWED_ORIGINS = [
  'https://ezra-maroc.com',
  'https://www.ezra-maroc.com',
];

// CORS headers helper
function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

function jsonResponse(data, status, origin) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(origin),
    },
  });
}

// --- Validation helpers ---

function sanitizeString(input, maxLength = 1000) {
  if (typeof input !== 'string') return '';
  return input
    .replace(/<[^>]*>/g, '')       // strip HTML tags
    .replace(/[<>"]/g, '')         // remove angle brackets and quotes
    .trim()
    .substring(0, maxLength);
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length < 255;
}

function isValidPhone(phone) {
  if (!phone) return true; // phone is optional by default
  return /^\+?[0-9\s\-()]{7,20}$/.test(phone.trim());
}

const DISALLOWED_WORDS = [
  "merde","connard","connasse","putain","enculé","enculer","nique","niquer",
  "salope","batard","bâtard","fdp","fils de pute","va te faire","ta gueule",
  "ferme ta gueule","pute","bordel","con","cul","bite","couille","chier",
  "foutre","branleur","branleuse","abruti","débile","crétin","mongol",
  "attardé","nazi","pédé","tapette","gouine","bougnoule","négro","nègre",
  "youpin","bamboula","je vais te tuer","va crever","crève","je te hais",
  "suce","sucer"
];

function containsDisallowedWords(text) {
  if (!text) return false;
  const normalized = text.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s\-_']/g, '');
  const words = normalized.split(/[\s\-_']+/).filter(w => w.length > 0);
  return DISALLOWED_WORDS.some(disallowed => {
    const normalizedDisallowed = disallowed.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return words.includes(normalizedDisallowed);
  });
}

function hasMinValidWords(text, minCount = 15, minWordLength = 2) {
  if (!text) return false;
  const words = text.match(/(\b\p{L}+(['-]\p{L}+)*\b)/gu) || [];
  let validCount = 0;
  for (const word of words) {
    if (word.length >= minWordLength) {
      if (/^(\p{L})\1{3,}$/u.test(word)) continue;
      if (/[bcdfghjklmnpqrstvwxz]{5,}/i.test(word)) continue;
      validCount++;
    }
  }
  return validCount >= minCount;
}

// --- Rate limiting (in-memory per isolate, best-effort) ---
const rateLimitMap = new Map();
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

function isRateLimited(ip) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now - entry.start > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(ip, { start: now, count: 1 });
    return false;
  }
  entry.count++;
  if (entry.count > RATE_LIMIT_MAX) return true;
  return false;
}

// --- Turnstile verification ---

async function verifyTurnstile(token, secret) {
  if (!token || !secret) return false;
  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret, response: token }),
  });
  const data = await response.json();
  return data.success === true;
}

// --- Resend email ---

async function sendEmail(apiKey, toEmail, formData, ip) {
  const { name, email, phone, subject, other_subject_details, message, lang } = formData;

  const subjectLine = `[Ezra Maroc] Nouveau message de ${name} — ${subject}`;

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #c5281c; border-bottom: 2px solid #c5281c; padding-bottom: 10px;">
        Nouveau message — Formulaire de contact
      </h2>
      <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
        <tr style="background: #f8f8f8;">
          <td style="padding: 10px; font-weight: bold; width: 35%; border: 1px solid #ddd;">Nom</td>
          <td style="padding: 10px; border: 1px solid #ddd;">${escapeHtml(name)}</td>
        </tr>
        <tr>
          <td style="padding: 10px; font-weight: bold; border: 1px solid #ddd;">Email</td>
          <td style="padding: 10px; border: 1px solid #ddd;"><a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></td>
        </tr>
        <tr style="background: #f8f8f8;">
          <td style="padding: 10px; font-weight: bold; border: 1px solid #ddd;">Téléphone</td>
          <td style="padding: 10px; border: 1px solid #ddd;">${phone ? escapeHtml(phone) : '—'}</td>
        </tr>
        <tr>
          <td style="padding: 10px; font-weight: bold; border: 1px solid #ddd;">Sujet</td>
          <td style="padding: 10px; border: 1px solid #ddd;">${escapeHtml(subject)}${other_subject_details ? ' — ' + escapeHtml(other_subject_details) : ''}</td>
        </tr>
        <tr style="background: #f8f8f8;">
          <td style="padding: 10px; font-weight: bold; border: 1px solid #ddd;">Message</td>
          <td style="padding: 10px; border: 1px solid #ddd; white-space: pre-wrap;">${escapeHtml(message)}</td>
        </tr>
        <tr>
          <td style="padding: 10px; font-weight: bold; border: 1px solid #ddd;">Langue</td>
          <td style="padding: 10px; border: 1px solid #ddd;">${escapeHtml(lang || 'fr')}</td>
        </tr>
        <tr style="background: #f8f8f8;">
          <td style="padding: 10px; font-weight: bold; border: 1px solid #ddd;">IP</td>
          <td style="padding: 10px; border: 1px solid #ddd;">${escapeHtml(ip || 'unknown')}</td>
        </tr>
        <tr>
          <td style="padding: 10px; font-weight: bold; border: 1px solid #ddd;">Date</td>
          <td style="padding: 10px; border: 1px solid #ddd;">${new Date().toISOString()}</td>
        </tr>
      </table>
      <p style="margin-top: 20px; color: #666; font-size: 12px;">
        Cet email a été envoyé automatiquement depuis le formulaire de contact ezra-maroc.com
      </p>
    </div>
  `;

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Ezra Maroc <noreply@ezra-maroc.com>',
      to: toEmail,
      reply_to: email,
      subject: subjectLine,
      html: htmlBody,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(`Resend error: ${error.message || response.statusText}`);
  }

  return await response.json();
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

// --- Store in D1 ---

async function storeSubmission(db, formData, ip, turnstileVerified) {
  const { name, email, phone, subject, other_subject_details, message, consent, terms_consent, lang } = formData;

  await db.prepare(
    `INSERT INTO submissions (name, email, phone, subject, other_subject_details, message, consent, terms_consent, lang, ip_address, turnstile_verified, created_at, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), 'new')`
  ).bind(
    name,
    email,
    phone || null,
    subject,
    other_subject_details || null,
    message,
    consent || 'accepted',
    terms_consent || 'accepted',
    lang || 'fr',
    ip || null,
    turnstileVerified ? 1 : 0
  ).run();
}

// --- Main handlers ---

// OPTIONS handler for CORS preflight
export async function onRequestOptions(context) {
  const origin = context.request.headers.get('Origin') || '';
  return new Response(null, {
    status: 204,
    headers: corsHeaders(origin),
  });
}

// POST handler
export async function onRequestPost(context) {
  const { request, env } = context;
  const origin = request.headers.get('Origin') || '';

  // 1. CORS check
  if (!ALLOWED_ORIGINS.includes(origin)) {
    return jsonResponse({ error: 'Origin not allowed' }, 403, origin);
  }

  // 2. Rate limiting
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  if (isRateLimited(ip)) {
    return jsonResponse({ error: 'Too many requests. Please try again later.' }, 429, origin);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400, origin);
  }

  // 3. Turnstile verification
  const turnstileToken = body['cf-turnstile-response'];
  const turnstileSecret = env.TURNSTILE_SECRET;
  let turnstileVerified = false;

  if (turnstileSecret) {
    turnstileVerified = await verifyTurnstile(turnstileToken, turnstileSecret);
    if (!turnstileVerified) {
      return jsonResponse({ error: 'Anti-spam verification failed. Please try again.' }, 400, origin);
    }
  }

  // 4. Sanitize & validate inputs
  const formData = {
    name: sanitizeString(body.name, 200),
    email: sanitizeString(body.email, 254),
    phone: sanitizeString(body.phone || '', 30),
    subject: sanitizeString(body.subject, 300),
    other_subject_details: sanitizeString(body.other_subject_details || '', 300),
    message: sanitizeString(body.message, 1000),
    consent: body.consent || '',
    terms_consent: body.terms_consent || '',
    lang: sanitizeString(body.lang || 'fr', 5),
  };

  // Required fields
  if (!formData.name || !formData.email || !formData.subject || !formData.message) {
    return jsonResponse({ error: 'Missing required fields.' }, 400, origin);
  }

  // Email format
  if (!isValidEmail(formData.email)) {
    return jsonResponse({ error: 'Invalid email address.' }, 400, origin);
  }

  // Phone format (if provided)
  if (formData.phone && !isValidPhone(formData.phone)) {
    return jsonResponse({ error: 'Invalid phone number format.' }, 400, origin);
  }

  // Disallowed words (check name, message, other_subject_details)
  if (containsDisallowedWords(formData.name) ||
      containsDisallowedWords(formData.message) ||
      containsDisallowedWords(formData.other_subject_details)) {
    return jsonResponse({ error: 'Message contains inappropriate content.' }, 400, origin);
  }

  // Minimum valid words in message
  if (!hasMinValidWords(formData.message, 15, 2)) {
    return jsonResponse({ error: 'Message too short or lacks intelligible content.' }, 400, origin);
  }

  // 5. Store in D1 (if bound)
  if (env.DB) {
    try {
      await storeSubmission(env.DB, formData, ip, turnstileVerified);
    } catch (dbError) {
      // Log but don't fail — email is more important
      console.error('D1 storage error:', dbError.message);
    }
  }

  // 6. Send email via Resend
  const contactEmail = env.CONTACT_EMAIL || 'info@ezra-project.fr';
  const resendKey = env.RESEND_API_KEY;

  if (!resendKey) {
    return jsonResponse({ error: 'Email service not configured.' }, 500, origin);
  }

  try {
    await sendEmail(resendKey, contactEmail, formData, ip);
  } catch (emailError) {
    console.error('Resend error:', emailError.message);
    return jsonResponse({ error: 'Failed to send email. Please try again later.' }, 500, origin);
  }

  // 7. Success
  return jsonResponse({ success: true }, 200, origin);
}
