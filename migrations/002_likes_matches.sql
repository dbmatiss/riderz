-- Likes (swipe right / super like)
CREATE TABLE IF NOT EXISTS likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  liker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  liked_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_super BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (liker_id, liked_id)
);

CREATE INDEX IF NOT EXISTS idx_likes_liked_id ON likes(liked_id);

-- Passes (swipe left) — pour ne pas re-proposer un profil passé
CREATE TABLE IF NOT EXISTS passes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  passer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  passed_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (passer_id, passed_id)
);

-- Matches
CREATE TABLE IF NOT EXISTS matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_b_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  compatibility_score INT,
  compatibility_summary TEXT,
  suggested_route JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  UNIQUE (user_a_id, user_b_id)
);
