const express = require('express');
const pool = require('../db/pool');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/profile/me
router.get('/me', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT p.*,
        COALESCE(json_agg(m ORDER BY m.created_at) FILTER (WHERE m.id IS NOT NULL), '[]') AS motorcycles,
        COALESCE(json_agg(ph ORDER BY ph."order") FILTER (WHERE ph.id IS NOT NULL), '[]') AS photos
       FROM profiles p
       LEFT JOIN motorcycles m ON m.user_id = p.user_id AND m.deleted_at IS NULL
       LEFT JOIN photos ph ON ph.user_id = p.user_id AND ph.deleted_at IS NULL
       WHERE p.user_id = $1 AND p.deleted_at IS NULL
       GROUP BY p.id`,
      [req.userId]
    );

    if (!rows.length) return res.status(404).json({ error: 'Profil non trouvé' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/profile — créer ou mettre à jour
router.post('/', requireAuth, async (req, res) => {
  const { first_name, age, city, bio, riding_style, level, looking_for } = req.body;

  if (!first_name || !age || !city) {
    return res.status(400).json({ error: 'first_name, age et city sont requis' });
  }

  try {
    const existing = await pool.query(
      'SELECT id FROM profiles WHERE user_id = $1 AND deleted_at IS NULL',
      [req.userId]
    );

    if (existing.rows.length) {
      await pool.query(
        `UPDATE profiles SET first_name=$1, age=$2, city=$3, bio=$4,
         riding_style=$5, level=$6, looking_for=$7
         WHERE user_id=$8 AND deleted_at IS NULL`,
        [first_name, age, city, bio, riding_style, level, looking_for, req.userId]
      );
    } else {
      await pool.query(
        `INSERT INTO profiles (user_id, first_name, age, city, bio, riding_style, level, looking_for)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [req.userId, first_name, age, city, bio, riding_style, level, looking_for]
      );
    }

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
