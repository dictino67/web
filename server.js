require('dotenv').config();

const path = require('node:path');
const express = require('express');
const multer = require('multer');
const { Pool } = require('pg');

const app = express();
const port = Number(process.env.PORT || 3000);
const pageSize = 10;
const maxImageSize = 5 * 1024 * 1024;
const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);

const pool = new Pool({
  host: process.env.PGHOST,
  port: process.env.PGPORT,
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: maxImageSize, files: 1 }
});

app.use(express.json());
app.use(express.static(__dirname));

function sendError(res, status, message) {
  return res.status(status).json({ error: message });
}

function hasImageSignature(buffer, mimeType) {
  if (mimeType === 'image/jpeg') return buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]));
  if (mimeType === 'image/png') return buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (mimeType === 'image/gif') return buffer.subarray(0, 6).toString('ascii') === 'GIF87a' || buffer.subarray(0, 6).toString('ascii') === 'GIF89a';
  if (mimeType === 'image/webp') return buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP';
  return false;
}

async function writeLargeObject(client, buffer) {
  const result = await client.query('SELECT lo_create(0) AS oid');
  const oid = result.rows[0].oid;
  const descriptor = (await client.query('SELECT lo_open($1, 131072) AS fd', [oid])).rows[0].fd;
  try {
    for (let offset = 0; offset < buffer.length; offset += 8192) {
      await client.query('SELECT lowrite($1, $2)', [descriptor, buffer.subarray(offset, offset + 8192)]);
    }
  } finally {
    await client.query('SELECT lo_close($1)', [descriptor]);
  }
  return oid;
}

app.post('/api/products', upload.single('image'), async (req, res) => {
  const name = String(req.body.nom_produit || '').trim();
  const description = String(req.body.description || '').trim();
  const location = String(req.body.lieu || '').trim();
  const quantity = Number(req.body.quantite_stock);

  if (!name || !description || !location || !Number.isInteger(quantity) || quantity < 0) {
    return sendError(res, 400, 'Veuillez renseigner correctement tous les champs.');
  }
  if (!req.file) return sendError(res, 400, 'Une image est obligatoire.');
  if (!allowedMimeTypes.has(req.file.mimetype) || !hasImageSignature(req.file.buffer, req.file.mimetype)) {
    return sendError(res, 400, 'Le fichier doit être une image JPG, PNG, GIF ou WebP valide.');
  }

  const client = await pool.connect();
  let imageOid;
  try {
    await client.query('BEGIN');
    imageOid = await writeLargeObject(client, req.file.buffer);
    const result = await client.query(
      `INSERT INTO produits (nom_produit, description, quantite_stock, lieu, image_oid, image_mime, image_nom)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [name, description, quantity, location, imageOid, req.file.mimetype, req.file.originalname]
    );
    await client.query('COMMIT');
    return res.status(201).json({ message: 'Produit enregistré avec succès.', id: result.rows[0].id });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    if (imageOid) await pool.query('SELECT lo_unlink($1)', [imageOid]).catch(() => {});
    console.error(error);
    return sendError(res, 500, 'Impossible d’enregistrer le produit.');
  } finally {
    client.release();
  }
});

app.get('/api/products', async (req, res) => {
  const requestedPage = Number.parseInt(req.query.page, 10) || 1;
  const page = Math.max(requestedPage, 1);
  const offset = (page - 1) * pageSize;
  try {
    const [products, count] = await Promise.all([
      pool.query(
        `SELECT id, nom_produit, description, quantite_stock, lieu, image_mime, created_at
         FROM produits ORDER BY created_at DESC, id DESC LIMIT $1 OFFSET $2`,
        [pageSize, offset]
      ),
      pool.query('SELECT COUNT(*)::int AS total FROM produits')
    ]);
    const total = count.rows[0].total;
    return res.json({ products: products.rows, total, page, limit: pageSize, hasNext: offset + products.rows.length < total });
  } catch (error) {
    console.error(error);
    return sendError(res, 500, 'Impossible de charger les produits.');
  }
});

app.get('/api/products/:id/image', async (req, res) => {
  try {
    const result = await pool.query('SELECT image_oid, image_mime FROM produits WHERE id = $1', [req.params.id]);
    if (!result.rowCount) return sendError(res, 404, 'Produit introuvable.');
    const image = await pool.query('SELECT lo_get($1) AS data', [result.rows[0].image_oid]);
    res.type(result.rows[0].image_mime).send(image.rows[0].data);
  } catch (error) {
    console.error(error);
    return sendError(res, 500, 'Impossible de charger l’image.');
  }
});

app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') return sendError(res, 400, 'L’image ne doit pas dépasser 5 Mo.');
  return sendError(res, 400, 'Requête invalide.');
});

app.listen(port, () => console.log(`Serveur démarré sur http://localhost:${port}`));
