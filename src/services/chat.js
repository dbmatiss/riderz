const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const pool = require('../db/pool');

// Vérifie que l'utilisateur fait partie du match
async function isInMatch(userId, matchId) {
  const { rows } = await pool.query(
    'SELECT 1 FROM matches WHERE id = $1 AND (user_a_id = $2 OR user_b_id = $2) AND deleted_at IS NULL',
    [matchId, userId]
  );
  return rows.length > 0;
}

function setupChat(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: '*' },
  });

  // Auth JWT sur la connexion socket
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Token manquant'));
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = payload.userId;
      next();
    } catch {
      next(new Error('Token invalide'));
    }
  });

  io.on('connection', (socket) => {
    // Rejoindre la room d'un match
    socket.on('join_match', async (matchId) => {
      if (await isInMatch(socket.userId, matchId)) {
        socket.join(`match:${matchId}`);
        socket.emit('joined', { matchId });
      } else {
        socket.emit('error', { message: 'Accès refusé à ce match' });
      }
    });

    // Envoyer un message — persisté en base, puis broadcast
    socket.on('send_message', async ({ matchId, content, mediaUrl }) => {
      if (!await isInMatch(socket.userId, matchId)) {
        return socket.emit('error', { message: 'Accès refusé' });
      }
      if (!content && !mediaUrl) return;

      try {
        const { rows } = await pool.query(
          `INSERT INTO messages (match_id, sender_id, content, media_url)
           VALUES ($1, $2, $3, $4) RETURNING *`,
          [matchId, socket.userId, content || null, mediaUrl || null]
        );
        io.to(`match:${matchId}`).emit('new_message', rows[0]);
      } catch (err) {
        console.error(err);
        socket.emit('error', { message: 'Message non envoyé' });
      }
    });

    // Indicateur de frappe
    socket.on('typing', ({ matchId, isTyping }) => {
      socket.to(`match:${matchId}`).emit('typing', { userId: socket.userId, isTyping });
    });

    // Accusé de lecture
    socket.on('mark_read', async ({ matchId }) => {
      if (!await isInMatch(socket.userId, matchId)) return;
      await pool.query(
        `UPDATE messages SET read_at = NOW()
         WHERE match_id = $1 AND sender_id != $2 AND read_at IS NULL`,
        [matchId, socket.userId]
      );
      socket.to(`match:${matchId}`).emit('messages_read', { by: socket.userId });
    });
  });

  return io;
}

module.exports = { setupChat };
