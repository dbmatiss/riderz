const express = require('express');
const pool = require('../db/pool');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/feed — profils à swiper
// Query params optionnels: max_distance_km, min_age, max_age, riding_style
router.get('/', requireAuth, async (req, res) => {
  const { max_distance_km, min_age, max_age, riding_style, limit } = req.query;

  try {
    const me = await pool.query(
      'SELECT city_point FROM profiles WHERE user_id = $1 AND deleted_at IS NULL',
      [req.userId]
    );
    if (!me.rows.length) return res.status(404).json({ error: 'Profil non trouvé' });

    const myPoint = me.rows[0].city_point;
    const conditions = [
      'p.user_id != $1',
      'p.deleted_at IS NULL',
      'p.is_active = TRUE',
      // Pas de profils sans moto vérifiée
      'EXISTS (SELECT 1 FROM motorcycles m WHERE m.user_id = p.user_id AND m.deleted_at IS NULL)',
      'u.is_verified = TRUE',
      // Exclure déjà likés / passés
      'NOT EXISTS (SELECT 1 FROM likes l WHERE l.liker_id = $1 AND l.liked_id = p.user_id)',
      'NOT EXISTS (SELECT 1 FROM passes ps WHERE ps.passer_id = $1 AND ps.passed_id = p.user_id)',
    ];
    const params = [req.userId];
    let i = 2;

    if (min_age) { conditions.push(`p.age >= $${i++}`); params.push(min_age); }
    if (max_age) { conditions.push(`p.age <= $${i++}`); params.push(max_age); }
    if (riding_style) { conditions.push(`p.riding_style = $${i++}`); params.push(riding_style); }
    if (max_distance_km && myPoint) {
      conditions.push(`ST_DWithin(p.city_point, $${i++}, $${i++} * 1000)`);
      params.push(myPoint, max_distance_km);
    }

    const lim = Math.min(parseInt(limit) || 20, 50);
    params.push(lim);

    const { rows } = await pool.query(
      `SELECT p.user_id, p.first_name, p.age, p.city, p.bio, p.riding_style, p.level, p.looking_for,
        COALESCE(json_agg(DISTINCT m) FILTER (WHERE m.id IS NOT NULL), '[]') AS motorcycles,
        COALESCE(json_agg(DISTINCT ph) FILTER (WHERE ph.id IS NOT NULL), '[]') AS photos
       FROM profiles p
       JOIN users u ON u.id = p.user_id
       LEFT JOIN motorcycles m ON m.user_id = p.user_id AND m.deleted_at IS NULL
       LEFT JOIN photos ph ON ph.user_id = p.user_id AND ph.deleted_at IS NULL
       WHERE ${conditions.join(' AND ')}
       GROUP BY p.id
       ORDER BY p.last_active_at DESC
       LIMIT $${i}`,
      params
    );

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
