const pool = require('../db/pool');
const { computeCompatibility, suggestRoute } = require('./ai');

// Récupère le profil complet (avec garage) d'un utilisateur
async function getFullProfile(userId) {
  const { rows } = await pool.query(
    `SELECT p.first_name, p.age, p.city, p.bio, p.riding_style, p.level, p.looking_for,
      COALESCE(json_agg(json_build_object('brand', m.brand, 'model', m.model, 'year', m.year))
        FILTER (WHERE m.id IS NOT NULL), '[]') AS motorcycles
     FROM profiles p
     LEFT JOIN motorcycles m ON m.user_id = p.user_id AND m.deleted_at IS NULL
     WHERE p.user_id = $1 AND p.deleted_at IS NULL
     GROUP BY p.id`,
    [userId]
  );
  return rows[0] || null;
}

// Enrichit un match avec le score IA + l'itinéraire suggéré.
// Lancé en arrière-plan à la création du match — ne bloque pas la réponse HTTP.
async function enrichMatch(matchId, userAId, userBId) {
  try {
    const [profileA, profileB] = await Promise.all([
      getFullProfile(userAId),
      getFullProfile(userBId),
    ]);
    if (!profileA || !profileB) return;

    const [compat, route] = await Promise.all([
      computeCompatibility(profileA, profileB),
      suggestRoute({
        cityA: profileA.city,
        cityB: profileB.city,
        styleA: profileA.riding_style,
        styleB: profileB.riding_style,
        levelA: profileA.level,
        levelB: profileB.level,
      }),
    ]);

    await pool.query(
      `UPDATE matches SET compatibility_score = $1, compatibility_summary = $2, suggested_route = $3
       WHERE id = $4`,
      [compat.score, compat.summary, JSON.stringify({ ...route, common_points: compat.common_points }), matchId]
    );
  } catch (err) {
    console.error(`Match enrichment failed for ${matchId}:`, err.message);
  }
}

module.exports = { enrichMatch };
