-- Questionnaire approfondi : etat des invitations et copies chiffrees en attente du logiciel EZRA.
-- Aucune donnee personnelle en clair : invites = identifiants et compteurs ; submissions = chiffre RSA/AES.

CREATE TABLE IF NOT EXISTS invites (
  id           TEXT PRIMARY KEY,                    -- identifiant aleatoire du lien (22 car. base64url)
  status       TEXT NOT NULL DEFAULT 'open'
               CHECK (status IN ('open', 'locked', 'submitted', 'revoked')),
  attempts     INTEGER NOT NULL DEFAULT 0,          -- codes faux consecutifs (blocage a 5)
  exp          INTEGER NOT NULL,                    -- expiration du lien (secondes unix)
  lang         TEXT,
  created_at   TEXT NOT NULL,                       -- premiere ouverture vue par le serveur
  opened_at    TEXT,                                -- premier code correct
  submitted_at TEXT,
  updated_at   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS submissions (
  id           TEXT PRIMARY KEY,                    -- = invites.id : une seule soumission par lien
  created_at   TEXT NOT NULL,
  lang         TEXT,
  alg          TEXT NOT NULL,                       -- 'RSA-OAEP-256+A256GCM'
  ek           TEXT NOT NULL,                       -- cle AES chiffree par la cle publique du logiciel
  iv           TEXT NOT NULL,
  ct           TEXT NOT NULL,                       -- reponses chiffrees (AES-256-GCM)
  email_status TEXT NOT NULL DEFAULT 'pending'      -- pending | sent | failed
);

CREATE INDEX IF NOT EXISTS idx_submissions_created ON submissions (created_at);
CREATE INDEX IF NOT EXISTS idx_invites_exp ON invites (exp);
