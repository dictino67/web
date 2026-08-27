require('dotenv').config();

const http = require('node:http');
const path = require('node:path');
const bcrypt = require('bcryptjs');
const express = require('express');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const PgSession = require('connect-pg-simple')(session);
const multer = require('multer');
const helmet = require('helmet');
const { Pool } = require('pg');

const app = express();
const port = Number(process.env.PORT || 3000);
const pageSize = 10;
const maxFileSize = 5 * 1024 * 1024;
const invoiceTypes = new Set(['image/jpeg', 'application/pdf']);
const imageTypes = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);

if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) throw new Error('SESSION_SECRET doit contenir au moins 32 caractères.');
if (!process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD_HASH?.startsWith('$2')) throw new Error('ADMIN_USERNAME et ADMIN_PASSWORD_HASH sont obligatoires.');
if (!process.env.N8N_API_KEY || process.env.N8N_API_KEY.length < 32) throw new Error('N8N_API_KEY doit contenir au moins 32 caractères.');

const pool = new Pool({ host: process.env.PGHOST, port: process.env.PGPORT, database: process.env.PGDATABASE, user: process.env.PGUSER, password: process.env.PGPASSWORD, ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: process.env.PGSSL_REJECT_UNAUTHORIZED !== 'false' } : undefined });
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: maxFileSize, files: 1 } });

app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '100kb' }));
app.use(session({ store: new PgSession({ pool, tableName: 'user_sessions', createTableIfMissing: true }), secret: process.env.SESSION_SECRET, resave: false, saveUninitialized: false, cookie: { httpOnly: true, secure: false, sameSite: 'strict', maxAge: 8 * 60 * 60 * 1000 } }));

const errorResponse = (res, status, message) => res.status(status).json({ error: message });
const requireAuth = (req, res, next) => req.session.user ? next() : errorResponse(res, 401, 'Authentification requise.');
const requireN8nApiKey = (req, res, next) => req.get('X-N8N-API-KEY') === process.env.N8N_API_KEY ? next() : errorResponse(res, 401, 'Clé API n8n invalide.');
const isSignatureValid = (buffer, mime) => {
  if (mime === 'image/jpeg') return buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]));
  if (mime === 'image/png') return buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (mime === 'image/gif') return ['GIF87a', 'GIF89a'].includes(buffer.subarray(0, 6).toString('ascii'));
  if (mime === 'image/webp') return buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP';
  return mime === 'application/pdf' && buffer.subarray(0, 5).toString('ascii') === '%PDF-';
};
async function writeLargeObject(client, buffer) {
  const oid = (await client.query('SELECT lo_create(0) AS oid')).rows[0].oid;
  const fd = (await client.query('SELECT lo_open($1, 131072) AS fd', [oid])).rows[0].fd;
  try { for (let offset = 0; offset < buffer.length; offset += 8192) await client.query('SELECT lowrite($1, $2)', [fd, buffer.subarray(offset, offset + 8192)]); } finally { await client.query('SELECT lo_close($1)', [fd]); }
  return oid;
}
async function ensureAdmin() {
  await pool.query(`INSERT INTO utilisateurs (nom_utilisateur, mot_de_passe_hash) VALUES ($1, $2) ON CONFLICT (nom_utilisateur) DO UPDATE SET mot_de_passe_hash = EXCLUDED.mot_de_passe_hash`, [process.env.ADMIN_USERNAME, process.env.ADMIN_PASSWORD_HASH]);
}

app.post('/api/auth/login', rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false }), async (req, res) => {
  const username = String(req.body.username || '').trim();
  const password = String(req.body.password || '');
  try {
    const result = await pool.query('SELECT id, nom_utilisateur, mot_de_passe_hash FROM utilisateurs WHERE nom_utilisateur = $1', [username]);
    if (!result.rowCount || !(await bcrypt.compare(password, result.rows[0].mot_de_passe_hash))) return errorResponse(res, 401, 'Identifiant ou mot de passe incorrect.');
    req.session.regenerate((error) => { if (error) return errorResponse(res, 500, 'Impossible de créer la session.'); req.session.user = { id: result.rows[0].id, username: result.rows[0].nom_utilisateur }; return res.json({ authenticated: true }); });
  } catch (error) { console.error(error); return errorResponse(res, 500, 'Impossible de se connecter.'); }
});
app.get('/api/auth/me', (req, res) => req.session.user ? res.json({ user: req.session.user }) : errorResponse(res, 401, 'Authentification requise.'));
app.post('/api/auth/logout', requireAuth, (req, res) => req.session.destroy(() => res.clearCookie('connect.sid').json({ authenticated: false })));

app.post('/api/invoices', requireAuth, upload.single('document'), async (req, res) => {
  const company = String(req.body.nom_societe || '').trim();
  const description = String(req.body.description || '').trim();
  if (!company || !description) return errorResponse(res, 400, 'Veuillez renseigner la société et la description.');
  if (!req.file || !invoiceTypes.has(req.file.mimetype) || !isSignatureValid(req.file.buffer, req.file.mimetype)) return errorResponse(res, 400, 'Un fichier JPEG ou PDF valide est obligatoire.');
  const client = await pool.connect(); let oid;
  try { await client.query('BEGIN'); oid = await writeLargeObject(client, req.file.buffer); const fileName = path.basename(req.file.originalname); const result = await client.query(`INSERT INTO factures (nom_societe, description, fichier_oid, fichier_mime, fichier_nom, nom_fichier_image) VALUES ($1, $2, $3, $4, $5, $5) RETURNING id, date_chargement`, [company, description, oid, req.file.mimetype, fileName]); await client.query('COMMIT'); return res.status(201).json({ message: 'Facture enregistrée avec succès.', invoice: result.rows[0] }); }
  catch (error) { await client.query('ROLLBACK').catch(() => {}); if (oid) await pool.query('SELECT lo_unlink($1)', [oid]).catch(() => {}); console.error(error); return errorResponse(res, 500, 'Impossible d’enregistrer la facture.'); } finally { client.release(); }
});
app.get('/api/invoices', requireAuth, async (req, res) => {
  const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1); const offset = (page - 1) * pageSize;
  try { const [invoices, count] = await Promise.all([pool.query('SELECT id, date_chargement, nom_societe, description, fichier_mime, fichier_nom FROM factures ORDER BY date_chargement DESC, id DESC LIMIT $1 OFFSET $2', [pageSize, offset]), pool.query('SELECT COUNT(*)::int AS total FROM factures')]); const total = count.rows[0].total; return res.json({ invoices: invoices.rows, total, page, limit: pageSize, hasNext: offset + invoices.rows.length < total }); } catch (error) { console.error(error); return errorResponse(res, 500, 'Impossible de charger les factures.'); }
});
app.get('/api/invoices/:id/file', requireAuth, async (req, res) => {
  try { const result = await pool.query('SELECT fichier_oid, fichier_mime, fichier_nom FROM factures WHERE id = $1', [req.params.id]); if (!result.rowCount) return errorResponse(res, 404, 'Facture introuvable.'); const file = await pool.query('SELECT lo_get($1) AS data', [result.rows[0].fichier_oid]); res.set({ 'Content-Type': result.rows[0].fichier_mime, 'X-Content-Type-Options': 'nosniff', 'Content-Disposition': `inline; filename="${path.basename(result.rows[0].fichier_nom).replace(/["\r\n]/g, '')}"` }); return res.send(file.rows[0].data); } catch (error) { console.error(error); return errorResponse(res, 500, 'Impossible de charger le fichier.'); }
});

app.get('/api/n8n/invoices/:id/file', requireN8nApiKey, async (req, res) => {
  try {
    const result = await pool.query('SELECT fichier_oid, fichier_mime, fichier_nom FROM factures WHERE id = $1', [req.params.id]);
    if (!result.rowCount) return errorResponse(res, 404, 'Facture introuvable.');
    const file = await pool.query('SELECT lo_get($1) AS data', [result.rows[0].fichier_oid]);
    res.set({ 'Content-Type': result.rows[0].fichier_mime, 'X-Content-Type-Options': 'nosniff', 'Content-Disposition': `attachment; filename="${path.basename(result.rows[0].fichier_nom).replace(/["\r\n]/g, '')}"` });
    return res.send(file.rows[0].data);
  } catch (error) { console.error(error); return errorResponse(res, 500, 'Impossible de charger le fichier pour n8n.'); }
});

app.get('/api/invoices/:id', requireAuth, async (req, res) => {
  try {
    const invoice = await pool.query('SELECT id, date_chargement, nom_societe, description, fichier_mime, fichier_nom, nom_fichier_image, n8n_traite FROM factures WHERE id = $1', [req.params.id]);
    if (!invoice.rowCount) return errorResponse(res, 404, 'Facture introuvable.');
    const details = await pool.query('SELECT id, nom_fichier, description, quantite, montant FROM detailfacture WHERE nom_fichier = $1 ORDER BY id', [invoice.rows[0].nom_fichier_image]);
    return res.json({ invoice: invoice.rows[0], details: details.rows });
  } catch (error) { console.error(error); return errorResponse(res, 500, 'Impossible de charger le détail de la facture.'); }
});

app.put('/api/invoices/:id', requireAuth, upload.single('document'), async (req, res) => {
  const company = String(req.body.nom_societe || '').trim();
  const description = String(req.body.description || '').trim();
  if (!company || !description) return errorResponse(res, 400, 'La société et la description sont obligatoires.');
  if (req.file && (!invoiceTypes.has(req.file.mimetype) || !isSignatureValid(req.file.buffer, req.file.mimetype))) return errorResponse(res, 400, 'Le fichier doit être un JPEG ou un PDF valide.');
  const client = await pool.connect(); let newOid;
  try {
    await client.query('BEGIN');
    const current = await client.query('SELECT fichier_oid FROM factures WHERE id = $1 FOR UPDATE', [req.params.id]);
    if (!current.rowCount) { await client.query('ROLLBACK'); return errorResponse(res, 404, 'Facture introuvable.'); }
    if (req.file) newOid = await writeLargeObject(client, req.file.buffer);
    const fileName = req.file ? path.basename(req.file.originalname) : null;
    const result = await client.query(`UPDATE factures SET nom_societe = $1, description = $2, fichier_oid = COALESCE($3, fichier_oid), fichier_mime = COALESCE($4, fichier_mime), fichier_nom = COALESCE($5, fichier_nom), nom_fichier_image = COALESCE($5, nom_fichier_image), n8n_traite = CASE WHEN $3 IS NULL THEN n8n_traite ELSE FALSE END WHERE id = $6 RETURNING id, date_chargement, nom_societe, description, fichier_mime, fichier_nom, nom_fichier_image, n8n_traite`, [company, description, newOid || null, req.file?.mimetype || null, fileName, req.params.id]);
    await client.query('COMMIT');
    if (newOid) await pool.query('SELECT lo_unlink($1)', [current.rows[0].fichier_oid]).catch(() => {});
    return res.json({ message: 'Facture modifiée avec succès.', invoice: result.rows[0] });
  } catch (error) { await client.query('ROLLBACK').catch(() => {}); if (newOid) await pool.query('SELECT lo_unlink($1)', [newOid]).catch(() => {}); console.error(error); return errorResponse(res, 500, 'Impossible de modifier la facture.'); }
  finally { client.release(); }
});

app.use((req, res, next) => ['/', '/index.html', '/list.html', '/detail.html'].includes(req.path) && !req.session.user ? res.redirect('/login.html') : next());
app.use(express.static(__dirname, { dotfiles: 'deny', index: false }));
app.use((error, req, res, next) => error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE' ? errorResponse(res, 400, 'Le fichier ne doit pas dépasser 5 Mo.') : errorResponse(res, 400, 'Requête invalide.'));

ensureAdmin().then(() => {
  const server = http.createServer(app);
  server.listen(port, () => console.log(`Serveur démarré sur http://localhost:${port}`));
}).catch((error) => { console.error('Initialisation impossible:', error); process.exit(1); });
