require('dotenv').config();

const fs = require('node:fs');
const http = require('node:http');
const https = require('node:https');
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
const isProduction = process.env.NODE_ENV === 'production';
const hasTls = Boolean(process.env.SSL_KEY_PATH && process.env.SSL_CERT_PATH);
const pageSize = 10;
const maxFileSize = 5 * 1024 * 1024;
const invoiceTypes = new Set(['image/jpeg', 'application/pdf']);
const imageTypes = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);

if (isProduction && !hasTls) throw new Error('SSL_KEY_PATH et SSL_CERT_PATH sont obligatoires en production.');
if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) throw new Error('SESSION_SECRET doit contenir au moins 32 caractères.');
if (!process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD_HASH?.startsWith('$2')) throw new Error('ADMIN_USERNAME et ADMIN_PASSWORD_HASH sont obligatoires.');

const pool = new Pool({ host: process.env.PGHOST, port: process.env.PGPORT, database: process.env.PGDATABASE, user: process.env.PGUSER, password: process.env.PGPASSWORD, ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: process.env.PGSSL_REJECT_UNAUTHORIZED !== 'false' } : undefined });
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: maxFileSize, files: 1 } });

app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '100kb' }));
app.use(session({ store: new PgSession({ pool, tableName: 'user_sessions', createTableIfMissing: true }), secret: process.env.SESSION_SECRET, resave: false, saveUninitialized: false, cookie: { httpOnly: true, secure: hasTls, sameSite: 'strict', maxAge: 8 * 60 * 60 * 1000 } }));

const errorResponse = (res, status, message) => res.status(status).json({ error: message });
const requireAuth = (req, res, next) => req.session.user ? next() : errorResponse(res, 401, 'Authentification requise.');
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
  try { await client.query('BEGIN'); oid = await writeLargeObject(client, req.file.buffer); const result = await client.query(`INSERT INTO factures (nom_societe, description, fichier_oid, fichier_mime, fichier_nom) VALUES ($1, $2, $3, $4, $5) RETURNING id, date_chargement`, [company, description, oid, req.file.mimetype, path.basename(req.file.originalname)]); await client.query('COMMIT'); return res.status(201).json({ message: 'Facture enregistrée avec succès.', invoice: result.rows[0] }); }
  catch (error) { await client.query('ROLLBACK').catch(() => {}); if (oid) await pool.query('SELECT lo_unlink($1)', [oid]).catch(() => {}); console.error(error); return errorResponse(res, 500, 'Impossible d’enregistrer la facture.'); } finally { client.release(); }
});
app.get('/api/invoices', requireAuth, async (req, res) => {
  const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1); const offset = (page - 1) * pageSize;
  try { const [invoices, count] = await Promise.all([pool.query('SELECT id, date_chargement, nom_societe, description, fichier_mime, fichier_nom FROM factures ORDER BY date_chargement DESC, id DESC LIMIT $1 OFFSET $2', [pageSize, offset]), pool.query('SELECT COUNT(*)::int AS total FROM factures')]); const total = count.rows[0].total; return res.json({ invoices: invoices.rows, total, page, limit: pageSize, hasNext: offset + invoices.rows.length < total }); } catch (error) { console.error(error); return errorResponse(res, 500, 'Impossible de charger les factures.'); }
});
app.get('/api/invoices/:id/file', requireAuth, async (req, res) => {
  try { const result = await pool.query('SELECT fichier_oid, fichier_mime, fichier_nom FROM factures WHERE id = $1', [req.params.id]); if (!result.rowCount) return errorResponse(res, 404, 'Facture introuvable.'); const file = await pool.query('SELECT lo_get($1) AS data', [result.rows[0].fichier_oid]); res.set({ 'Content-Type': result.rows[0].fichier_mime, 'X-Content-Type-Options': 'nosniff', 'Content-Disposition': `inline; filename="${path.basename(result.rows[0].fichier_nom).replace(/["\r\n]/g, '')}"` }); return res.send(file.rows[0].data); } catch (error) { console.error(error); return errorResponse(res, 500, 'Impossible de charger le fichier.'); }
});

app.use((req, res, next) => ['/', '/index.html', '/list.html'].includes(req.path) && !req.session.user ? res.redirect('/login.html') : next());
app.use(express.static(__dirname, { dotfiles: 'deny', index: false }));
app.use((error, req, res, next) => error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE' ? errorResponse(res, 400, 'Le fichier ne doit pas dépasser 5 Mo.') : errorResponse(res, 400, 'Requête invalide.'));

ensureAdmin().then(() => {
  const options = hasTls ? { key: fs.readFileSync(process.env.SSL_KEY_PATH), cert: fs.readFileSync(process.env.SSL_CERT_PATH) } : undefined;
  const server = hasTls ? https.createServer(options, app) : http.createServer(app);
  server.listen(port, () => console.log(`Serveur démarré sur ${hasTls ? 'https' : 'http'}://localhost:${port}`));
}).catch((error) => { console.error('Initialisation impossible:', error); process.exit(1); });
