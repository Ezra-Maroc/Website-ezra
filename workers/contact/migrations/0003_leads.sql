-- Demandes du formulaire de contact et du test d'eligibilite : copie CHIFFREE pour le logiciel EZRA (cle publique
-- INTAKE_PUBLIC_KEY, illisible sans la cle privee du PC), en plus de l'e-mail. Effacee des que le logiciel l'a
-- recuperee (/intake/admin/leads/ack), au plus tard apres 60 jours (cron). Rien n'y est lisible en clair.
CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  kind TEXT NOT NULL,
  alg TEXT NOT NULL,
  ek TEXT NOT NULL,
  iv TEXT NOT NULL,
  ct TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_leads_created ON leads (created_at);
