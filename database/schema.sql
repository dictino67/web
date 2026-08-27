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
    fichier_nom VARCHAR(255) NOT NULL
);

CREATE INDEX IF NOT EXISTS factures_date_chargement_idx ON factures (date_chargement DESC, id DESC);

CREATE TABLE IF NOT EXISTS utilisateurs (
    id BIGSERIAL PRIMARY KEY,
    nom_utilisateur VARCHAR(80) UNIQUE NOT NULL,
    mot_de_passe_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
