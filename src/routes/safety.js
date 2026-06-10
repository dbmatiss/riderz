const express = require('express');
const pool = require('../db/pool');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// POST /api/safety/block — { blocked_id }
router.post('/block', requireAuth, async (req, res) => {
  const { blocked_id } = req.body;
  if (!blocked_id) return res.status(400).json({ error: 'blocked_id requis' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      'INSERT INTO blocks (blocker_id, blocked_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [req.userId, blocked_id]
    );
    // Soft delete du match éventuel — coupe aussi le chat
    await client.query(
      `UPDATE matches SET deleted_at = NOW()
       WHERE deleted_at IS NULL
       AND ((user_a_id = $1 AND user_b_id = $2) OR (user_a_id = $2 AND user_b_id = $1))`,
      [req.userId, blocked_id]
    );
    await client.query('COMMIT');
    res.status(201).json({ ok: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  } finally {
    client.release();
  }
});

// POST /api/safety/report — { reported_id, reason }
router.post('/report', requireAuth, async (req, res) => {
  const { reported_id, reason } = req.body;
  if (!reported_id || !reason) return res.status(400).json({ error: 'reported_id et reason requis' });

  try {
    await pool.query(
      'INSERT INTO reports (reporter_id, reported_id, reason) VALUES ($1, $2, $3)',
      [req.userId, reported_id, reason]
    );
    res.status(201).json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
