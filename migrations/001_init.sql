-- Enable PostGIS for geo queries
CREATE EXTENSION IF NOT EXISTS postgis;

-- Users (auth only)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  is_verified BOOLEAN DEFAULT FALSE,
  refresh_token TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Profiles
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  age INT NOT NULL,
  city TEXT NOT NULL,
  city_point GEOGRAPHY(Point, 4326),
  bio TEXT CHECK (char_length(bio) <= 280),
  riding_style TEXT CHECK (riding_style IN ('balade', 'sportif', 'voyage', 'tout-terrain', 'custom')),
  level TEXT CHECK (level IN ('debutant', 'intermediaire', 'experimente')),
  looking_for TEXT CHECK (looking_for IN ('serieux', 'rencontres', 'verrai_bien')),
  is_active BOOLEAN DEFAULT FALSE,
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Photos
CREATE TABLE IF NOT EXISTS photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  is_with_bike BOOLEAN DEFAULT FALSE,
  "order" INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Motorcycles (garage)
CREATE TABLE IF NOT EXISTS motorcycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  year INT,
  photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);
