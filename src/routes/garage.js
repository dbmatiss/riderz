const express = require('express');
const pool = require('../db/pool');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/garage — liste mes motos
router.get('/', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM motorcycles WHERE user_id = $1 AND deleted_at IS NULL ORDER BY created_at',
      [req.userId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/garage — ajouter une moto
router.post('/', requireAuth, async (req, res) => {
  const { brand, model, year, photo_url } = req.body;
  if (!brand || !model) return res.status(400).json({ error: 'brand et model requis' });

  try {
    const { rows } = await pool.query(
      'INSERT INTO motorcycles (user_id, brand, model, year, photo_url) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [req.userId, brand, model, year || null, photo_url || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PATCH /api/garage/:id — modifier une moto
router.patch('/:id', requireAuth, async (req, res) => {
  const { brand, model, year, photo_url } = req.body;

  try {
    const { rows } = await pool.query(
      `UPDATE motorcycles SET
        brand = COALESCE($1, brand),
        model = COALESCE($2, model),
        year = COALESCE($3, year),
        photo_url = COALESCE($4, photo_url)
       WHERE id = $5 AND user_id = $6 AND deleted_at IS NULL
       RETURNING *`,
      [brand, model, year, photo_url, req.params.id, req.userId]
    );

    if (!rows.length) return res.status(404).json({ error: 'Moto non trouvée' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// DELETE /api/garage/:id — soft delete
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { rowCount } = await pool.query(
      'UPDATE motorcycles SET deleted_at = NOW() WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL',
      [req.params.id, req.userId]
    );
    if (!rowCount) return res.status(404).json({ error: 'Moto non trouvée' });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
