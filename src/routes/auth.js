const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db/pool');

const router = express.Router();

function signAccess(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '15m' });
}

function signRefresh(userId) {
  return jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, { expiresIn: '30d' });
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email et mot de passe requis' });
  if (password.length < 8) return res.status(400).json({ error: 'Mot de passe trop court (8 caractères min)' });

  try {
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existing.rows.length) return res.status(409).json({ error: 'Email déjà utilisé' });

    const hash = await bcrypt.hash(password, 12);
    const refresh = signRefresh('tmp');

    const { rows } = await pool.query(
      'INSERT INTO users (email, password_hash, refresh_token) VALUES ($1, $2, $3) RETURNING id',
      [email.toLowerCase(), hash, null]
    );

    const userId = rows[0].id;
    const refreshToken = signRefresh(userId);
    await pool.query('UPDATE users SET refresh_token = $1 WHERE id = $2', [refreshToken, userId]);

    res.status(201).json({
      access_token: signAccess(userId),
      refresh_token: refreshToken,
      user_id: userId
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email et mot de passe requis' });

  try {
    const { rows } = await pool.query(
      'SELECT id, password_hash FROM users WHERE email = $1 AND deleted_at IS NULL',
      [email.toLowerCase()]
    );
    if (!rows.length) return res.status(401).json({ error: 'Identifiants incorrects' });

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Identifiants incorrects' });

    const refreshToken = signRefresh(user.id);
    await pool.query('UPDATE users SET refresh_token = $1 WHERE id = $2', [refreshToken, user.id]);

    res.json({
      access_token: signAccess(user.id),
      refresh_token: refreshToken,
      user_id: user.id
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res) => {
  const { refresh_token } = req.body;
  if (!refresh_token) return res.status(400).json({ error: 'refresh_token requis' });

  try {
    const payload = jwt.verify(refresh_token, process.env.JWT_REFRESH_SECRET);
    const { rows } = await pool.query(
      'SELECT id, refresh_token FROM users WHERE id = $1 AND deleted_at IS NULL',
      [payload.userId]
    );
    if (!rows.length || rows[0].refresh_token !== refresh_token) {
      return res.status(401).json({ error: 'Token invalide' });
    }

    const newRefresh = signRefresh(rows[0].id);
    await pool.query('UPDATE users SET refresh_token = $1 WHERE id = $2', [newRefresh, rows[0].id]);

    res.json({
      access_token: signAccess(rows[0].id),
      refresh_token: newRefresh
    });
  } catch {
    res.status(401).json({ error: 'Token invalide ou expiré' });
  }
});

// POST /api/auth/logout
router.post('/logout', async (req, res) => {
  const { refresh_token } = req.body;
  if (refresh_token) {
    try {
      const payload = jwt.verify(refresh_token, process.env.JWT_REFRESH_SECRET);
      await pool.query('UPDATE users SET refresh_token = NULL WHERE id = $1', [payload.userId]);
    } catch {}
  }
  res.json({ ok: true });
});

module.exports = router;
