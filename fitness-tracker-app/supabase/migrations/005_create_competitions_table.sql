-- Create competitions table
-- This table stores competition data and leaderboards
CREATE TABLE IF NOT EXISTS competitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  challenge_type TEXT NOT NULL CHECK (challenge_type IN ('MOST_DISTANCE', 'MOST_ACTIVITIES', 'LONGEST_ACTIVITY', 'FASTEST_PACE')),
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'active', 'completed')),
  winner_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  CONSTRAINT valid_date_range CHECK (end_date > start_date)
);

-- Create index on creator_id for user's competitions
CREATE INDEX IF NOT EXISTS idx_competitions_creator ON competitions(creator_id);

-- Create index on status for active competition queries
CREATE INDEX IF NOT EXISTS idx_competitions_status ON competitions(status);

-- Create index on end_date for scheduled tasks
CREATE INDEX IF NOT EXISTS idx_competitions_end_date ON competitions(end_date);

-- Create composite index for efficient competition queries
CREATE INDEX IF NOT EXISTS idx_competitions_status_end_date ON competitions(status, end_date);

-- Enable Row Level Security
ALTER TABLE competitions ENABLE ROW LEVEL SECURITY;

-- Policy: Creators can read their own competitions
-- NOTE: The full policy (including participants) is in 009_add_cross_table_policies.sql
--       because it must run after the participants table is created.
CREATE POLICY "Creators can read own competitions"
  ON competitions
  FOR SELECT
  USING (auth.uid() = creator_id);

-- Policy: Users can create competitions
CREATE POLICY "Users can create competitions"
  ON competitions
  FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

-- Policy: Creators can update their competitions
CREATE POLICY "Creators can update own competitions"
  ON competitions
  FOR UPDATE
  USING (auth.uid() = creator_id);

-- Policy: Creators can delete their competitions
CREATE POLICY "Creators can delete own competitions"
  ON competitions
  FOR DELETE
  USING (auth.uid() = creator_id);

-- Function to set completed_at timestamp when status changes to completed
CREATE OR REPLACE FUNCTION set_completed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    NEW.completed_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically set completed_at
CREATE TRIGGER update_competitions_completed_at
  BEFORE UPDATE ON competitions
  FOR EACH ROW
  EXECUTE FUNCTION set_completed_at();

-- Function to update competition status based on dates
CREATE OR REPLACE FUNCTION update_competition_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.start_date <= NOW() AND NEW.end_date > NOW() AND NEW.status = 'pending' THEN
    NEW.status = 'active';
  ELSIF NEW.end_date <= NOW() AND NEW.status != 'completed' THEN
    NEW.status = 'completed';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update competition status
CREATE TRIGGER auto_update_competition_status
  BEFORE INSERT OR UPDATE ON competitions
  FOR EACH ROW
  EXECUTE FUNCTION update_competition_status();
