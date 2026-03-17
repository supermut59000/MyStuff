-- ============================================================
-- Encoding
-- ============================================================
SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;
SET character_set_connection = utf8mb4;

-- ============================================================
-- Tables
-- ============================================================

CREATE TABLE IF NOT EXISTS categories (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    name          VARCHAR(100) NOT NULL UNIQUE,
    icon          VARCHAR(10)  NOT NULL DEFAULT '📦',
    description   TEXT,
    custom_fields JSON         NOT NULL DEFAULT '[]',
    has_quantity  BOOLEAN      NOT NULL DEFAULT FALSE,
    poster_layout BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at    DATETIME     DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME     DEFAULT CURRENT_TIMESTAMP
                               ON UPDATE CURRENT_TIMESTAMP
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS items (
    id                INT AUTO_INCREMENT PRIMARY KEY,
    category_id       INT            NOT NULL,
    name              VARCHAR(255)   NOT NULL,
    description       TEXT,
    `condition`       ENUM('mint','good','fair','poor') DEFAULT 'good',
    is_owned          BOOLEAN        DEFAULT TRUE,
    quantity          INT            NOT NULL DEFAULT 1,
    item_value        DECIMAL(10,2),
    custom_data       JSON           NOT NULL DEFAULT '{}',
    reading_status    ENUM('completed','reading','owned_unread','plan_to_read') DEFAULT NULL,
    wear_status       ENUM('active','stored','to_sell','to_donate') DEFAULT NULL,
    deployment_status ENUM('in_use_pc','in_use_server','in_use_other','storage','to_sell','broken') DEFAULT NULL,
    image_path        VARCHAR(500)   DEFAULT NULL,
    lent_to           VARCHAR(200)   DEFAULT NULL,
    lent_at           DATE           DEFAULT NULL,
    read_up_to        INT            DEFAULT NULL,
    deleted_at        DATETIME       DEFAULT NULL,
    created_at        DATETIME       DEFAULT CURRENT_TIMESTAMP,
    updated_at        DATETIME       DEFAULT CURRENT_TIMESTAMP
                                     ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE INDEX        idx_items_category_id ON items(category_id);
CREATE INDEX        idx_items_is_owned    ON items(is_owned);
CREATE INDEX        idx_items_condition   ON items(`condition`);
CREATE INDEX        idx_items_name        ON items(name);
CREATE INDEX        idx_items_deleted_at  ON items(deleted_at);
CREATE FULLTEXT INDEX idx_items_name_ft   ON items(name);

-- ============================================================
-- Preset Categories
-- ============================================================

INSERT INTO categories (name, icon, description, has_quantity, poster_layout, custom_fields) VALUES
(
  'Manga', '📚', 'Mangas et manhwas', FALSE, TRUE,
  '[
    {"key":"serie",   "label":"Série",   "type":"text",   "required":true,  "options":null},
    {"key":"tome",    "label":"Tome",    "type":"number", "required":true,  "options":null},
    {"key":"auteur",  "label":"Auteur",  "type":"text",   "required":false, "options":null},
    {"key":"editeur", "label":"Éditeur", "type":"text",   "required":false, "options":null}
  ]'
),
(
  'Pop Funko', '🎭', 'Figurines Pop Funko', FALSE, TRUE,
  '[
    {"key":"serie",     "label":"Série",     "type":"text",    "required":true,  "options":null},
    {"key":"numero",    "label":"Numéro",    "type":"number",  "required":false, "options":null},
    {"key":"exclusive", "label":"Exclusive", "type":"boolean", "required":false, "options":null},
    {"key":"boite",     "label":"Boîte",     "type":"select",  "required":false, "options":["oui","non","abîmée"]}
  ]'
),
(
  'Vêtements', '👕', 'Vêtements et accessoires', TRUE, FALSE,
  '[
    {"key":"marque",  "label":"Marque",  "type":"text",   "required":false, "options":null},
    {"key":"taille",  "label":"Taille",  "type":"select", "required":false, "options":["XS","S","M","L","XL","XXL","3XL"]},
    {"key":"couleur", "label":"Couleur", "type":"text",   "required":false, "options":null},
    {"key":"matiere", "label":"Matière", "type":"text",   "required":false, "options":null}
  ]'
),
(
  'Tech', '💻', 'Appareils et accessoires tech', FALSE, FALSE,
  '[
    {"key":"marque",       "label":"Marque",          "type":"text", "required":false, "options":null},
    {"key":"modele",       "label":"Modèle",          "type":"text", "required":false, "options":null},
    {"key":"numero_serie", "label":"Numéro de série", "type":"text", "required":false, "options":null},
    {"key":"garantie_fin", "label":"Fin de garantie", "type":"date", "required":false, "options":null}
  ]'
),
(
  'Jeux Vidéo', '🎮', 'Jeux vidéo toutes plateformes', FALSE, TRUE,
  '[
    {"key":"plateforme", "label":"Plateforme", "type":"select", "required":true,  "options":["PS5","PS4","Switch","PC","Xbox","Other"]},
    {"key":"editeur",    "label":"Éditeur",    "type":"text",   "required":false, "options":null},
    {"key":"genre",      "label":"Genre",      "type":"text",   "required":false, "options":null}
  ]'
),
(
  'Livres', '📖', 'Romans, BD et essais', FALSE, FALSE,
  '[
    {"key":"auteur",  "label":"Auteur",  "type":"text", "required":false, "options":null},
    {"key":"editeur", "label":"Éditeur", "type":"text", "required":false, "options":null},
    {"key":"isbn",    "label":"ISBN",    "type":"text", "required":false, "options":null},
    {"key":"genre",   "label":"Genre",   "type":"text", "required":false, "options":null}
  ]'
);
