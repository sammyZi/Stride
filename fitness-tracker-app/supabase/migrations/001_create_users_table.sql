-- Create users table
-- This table stores user profiles and settings
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  photo_url TEXT,
  age INTEGER CHECK (age >= 13 AND age <= 120),
  weight NUMERIC(5, 2) NOT NULL,
  weight_unit TEXT NOT NULL CHECK (weight_unit IN ('kg', 'lbs')),
  height NUMERIC(5, 2),
  height_unit TEXT CHECK (height_unit IN ('cm', 'ft')),
  gender TEXT CHECK (gender IN ('male', 'female', 'other')),
  show_age BOOLEAN DEFAULT true,
  show_weight BOOLEAN DEFAULT true,
  show_height BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on email for search
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Create index on display_name for search
CREATE INDEX IF NOT EXISTS idx_users_display_name ON users(display_name);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON users
  FOR SELECT
  USING (auth.uid() = id);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON users
  FOR UPDATE
  USING (auth.uid() = id);

-- Policy: Users can insert their own profile (during onboarding)
CREATE POLICY "Users can insert own profile"
  ON users
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Note: Policy for reading friends' profiles will be added after friends table is created (see migration 003)

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
