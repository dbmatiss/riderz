require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');
const garageRoutes = require('./routes/garage');
const feedRoutes = require('./routes/feed');
const likesRoutes = require('./routes/likes');
const matchesRoutes = require('./routes/matches');
const messagesRoutes = require('./routes/messages');
const safetyRoutes = require('./routes/safety');
const { setupChat } = require('./services/chat');

const app = express();

app.use(cors());
app.use(express.json());

// Rate limiting global
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 200 }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/garage', garageRoutes);
app.use('/api/feed', feedRoutes);
app.use('/api/likes', likesRoutes);
app.use('/api/matches', matchesRoutes);
app.use('/api/matches', messagesRoutes);
app.use('/api/safety', safetyRoutes);

app.get('/health', (_, res) => res.json({ status: 'ok' }));

const server = http.createServer(app);
setupChat(server);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Riderz API running on port ${PORT} (HTTP + WebSocket)`));
