const express = require('express');
const rateLimit = require('express-rate-limit');
const pool = require('../db/pool');
const { requireAuth } = require('../middleware/auth');
const { enrichMatch } = require('../services/matchEnrichment');

const router = express.Router();

// 100 likes/jour en version gratuite
const likeLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: 100,
  keyGenerator: (req) => req.userId,
  message: { error: 'Limite quotidienne de likes atteinte (100/jour)' },
});

// POST /api/likes — { liked_id, is_super }
router.post('/', requireAuth, likeLimiter, async (req, res) => {
  const { liked_id, is_super } = req.body;
  if (!liked_id) return res.status(400).json({ error: 'liked_id requis' });
  if (liked_id === req.userId) return res.status(400).json({ error: 'Impossible de se liker soi-même' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      `INSERT INTO likes (liker_id, liked_id, is_super) VALUES ($1, $2, $3)
       ON CONFLICT (liker_id, liked_id) DO UPDATE SET is_super = $3`,
      [req.userId, liked_id, !!is_super]
    );

    // Vérifier si l'autre personne nous a déjà liké → match
    const reciprocal = await client.query(
      'SELECT id FROM likes WHERE liker_id = $1 AND liked_id = $2',
      [liked_id, req.userId]
    );

    let match = null;
    if (reciprocal.rows.length) {
      const userA = req.userId < liked_id ? req.userId : liked_id;
      const userB = req.userId < liked_id ? liked_id : req.userId;

      const { rows } = await client.query(
        `INSERT INTO matches (user_a_id, user_b_id) VALUES ($1, $2)
         ON CONFLICT (user_a_id, user_b_id) DO NOTHING
         RETURNING *`,
        [userA, userB]
      );
      match = rows[0] || null;
    }

    await client.query('COMMIT');

    // Score IA + itinéraire générés en arrière-plan, sans bloquer la réponse
    if (match) enrichMatch(match.id, match.user_a_id, match.user_b_id);

    res.status(201).json({ ok: true, match });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  } finally {
    client.release();
  }
});

// POST /api/likes/pass — { passed_id }
router.post('/pass', requireAuth, async (req, res) => {
  const { passed_id } = req.body;
  if (!passed_id) return res.status(400).json({ error: 'passed_id requis' });

  try {
    await pool.query(
      `INSERT INTO passes (passer_id, passed_id) VALUES ($1, $2)
       ON CONFLICT (passer_id, passed_id) DO NOTHING`,
      [req.userId, passed_id]
    );
    res.status(201).json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/likes/received — qui m'a liké (feature payante post-MVP, ouverte au MVP)
router.get('/received', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT l.liker_id, l.is_super, l.created_at, p.first_name, p.age, p.city
       FROM likes l
       JOIN profiles p ON p.user_id = l.liker_id AND p.deleted_at IS NULL
       WHERE l.liked_id = $1
       AND NOT EXISTS (SELECT 1 FROM likes l2 WHERE l2.liker_id = $1 AND l2.liked_id = l.liker_id)
       ORDER BY l.created_at DESC`,
      [req.userId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
