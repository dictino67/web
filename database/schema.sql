CREATE TABLE IF NOT EXISTS produits (
    id BIGSERIAL PRIMARY KEY,
    nom_produit VARCHAR(160) NOT NULL CHECK (char_length(trim(nom_produit)) > 0),
    description TEXT NOT NULL CHECK (char_length(trim(description)) > 0),
    quantite_stock INTEGER NOT NULL CHECK (quantite_stock >= 0),
    lieu VARCHAR(160) NOT NULL CHECK (char_length(trim(lieu)) > 0),
    image_oid OID NOT NULL,
    image_mime VARCHAR(80) NOT NULL,
    image_nom VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS produits_created_at_idx ON produits (created_at DESC, id DESC);

CREATE TABLE IF NOT EXISTS factures (
    id BIGSERIAL PRIMARY KEY,
    date_chargement TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    nom_societe VARCHAR(160) NOT NULL CHECK (char_length(trim(nom_societe)) > 0),
    description TEXT NOT NULL CHECK (char_length(trim(description)) > 0),
    fichier_oid OID NOT NULL,
    fichier_mime VARCHAR(80) NOT NULL CHECK (fichier_mime IN ('image/jpeg', 'application/pdf')),
    fichier_nom VARCHAR(255) NOT NULL,
    nom_fichier_image VARCHAR(255) NOT NULL DEFAULT '',
    n8n_traite BOOLEAN NOT NULL DEFAULT FALSE
);

ALTER TABLE factures ADD COLUMN IF NOT EXISTS nom_fichier_image VARCHAR(255) NOT NULL DEFAULT '';
ALTER TABLE factures ADD COLUMN IF NOT EXISTS n8n_traite BOOLEAN NOT NULL DEFAULT FALSE;
UPDATE factures SET nom_fichier_image = fichier_nom WHERE nom_fichier_image = '';

CREATE INDEX IF NOT EXISTS factures_date_chargement_idx ON factures (date_chargement DESC, id DESC);
CREATE INDEX IF NOT EXISTS factures_nom_fichier_image_idx ON factures (nom_fichier_image);

CREATE TABLE IF NOT EXISTS detailfacture (
    id BIGSERIAL PRIMARY KEY,
    nom_fichier VARCHAR(255) NOT NULL,
    description TEXT NOT NULL CHECK (char_length(trim(description)) > 0),
    quantite NUMERIC(12, 3) NOT NULL CHECK (quantite >= 0),
    montant NUMERIC(14, 2) NOT NULL CHECK (montant >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS detailfacture_nom_fichier_idx ON detailfacture (nom_fichier);
SELECT setval(pg_get_serial_sequence('detailfacture', 'id'), COALESCE((SELECT MAX(id) FROM detailfacture), 1), TRUE);

CREATE TABLE IF NOT EXISTS utilisateurs (
    id BIGSERIAL PRIMARY KEY,
    nom_utilisateur VARCHAR(80) UNIQUE NOT NULL,
    mot_de_passe_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
