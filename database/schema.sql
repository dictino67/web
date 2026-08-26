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
