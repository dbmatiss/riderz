const express = require('express');
const pool = require('../db/pool');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/matches/:matchId/messages — historique du chat (paginé)
router.get('/:matchId/messages', requireAuth, async (req, res) => {
  const { before, limit } = req.query;

  try {
    const inMatch = await pool.query(
      'SELECT 1 FROM matches WHERE id = $1 AND (user_a_id = $2 OR user_b_id = $2) AND deleted_at IS NULL',
      [req.params.matchId, req.userId]
    );
    if (!inMatch.rows.length) return res.status(403).json({ error: 'Accès refusé' });

    const params = [req.params.matchId];
    let where = 'match_id = $1 AND deleted_at IS NULL';
    if (before) {
      params.push(before);
      where += ` AND created_at < $${params.length}`;
    }
    params.push(Math.min(parseInt(limit) || 50, 100));

    const { rows } = await pool.query(
      `SELECT * FROM messages WHERE ${where} ORDER BY created_at DESC LIMIT $${params.length}`,
      params
    );
    res.json(rows.reverse());
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
