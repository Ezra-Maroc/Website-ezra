-- Espace client : connexion par adresse e-mail + mot de passe.
-- L'adresse n'est jamais stockee : seulement son empreinte HMAC (cle derivee de la cle maitresse),
-- enregistree par le logiciel EZRA a la creation de l'invitation (/intake/admin/register).
ALTER TABLE invites ADD COLUMN email_hash TEXT;
CREATE INDEX IF NOT EXISTS idx_invites_email ON invites (email_hash);
