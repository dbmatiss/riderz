require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');
const garageRoutes = require('./routes/garage');
const feedRoutes = require('./routes/feed');
const likesRoutes = require('./routes/likes');
const matchesRoutes = require('./routes/matches');

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

app.get('/health', (_, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Riderz API running on port ${PORT}`));
