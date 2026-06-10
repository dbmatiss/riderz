const express = require('express');
const pool = require('../db/pool');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/matches — liste de mes matchs
router.get('/', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT m.id, m.compatibility_score, m.compatibility_summary, m.suggested_route, m.created_at,
        CASE WHEN m.user_a_id = $1 THEN m.user_b_id ELSE m.user_a_id END AS other_user_id,
        p.first_name, p.age, p.city, p.riding_style, p.level
       FROM matches m
       JOIN profiles p ON p.user_id = (CASE WHEN m.user_a_id = $1 THEN m.user_b_id ELSE m.user_a_id END)
       WHERE (m.user_a_id = $1 OR m.user_b_id = $1) AND m.deleted_at IS NULL AND p.deleted_at IS NULL
       ORDER BY m.created_at DESC`,
      [req.userId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
