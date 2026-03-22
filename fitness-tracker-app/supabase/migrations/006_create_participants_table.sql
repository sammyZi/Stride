-- Create participants table
-- This table stores competition participants and their status
CREATE TABLE IF NOT EXISTS participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('invited', 'joined', 'declined')),
  joined_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_competition_participant UNIQUE (competition_id, user_id)
);

-- Create index on competition_id for participant queries
CREATE INDEX IF NOT EXISTS idx_participants_competition ON participants(competition_id);

-- Create index on user_id for user's competitions
CREATE INDEX IF NOT EXISTS idx_participants_user ON participants(user_id);

-- Create index on status for invitation queries
CREATE INDEX IF NOT EXISTS idx_participants_status ON participants(status);

-- Create composite index for efficient participant queries
CREATE INDEX IF NOT EXISTS idx_participants_competition_status ON participants(competition_id, status);

-- Enable Row Level Security
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read participants of competitions they're in
CREATE POLICY "Users can read participants of own competitions"
  ON participants
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM competitions
      WHERE competitions.id = participants.competition_id
      AND (
        competitions.creator_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM participants p2
          WHERE p2.competition_id = competitions.id
          AND p2.user_id = auth.uid()
        )
      )
    )
  );

-- Policy: Competition creators can insert participants
CREATE POLICY "Creators can insert participants"
  ON participants
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM competitions
      WHERE competitions.id = participants.competition_id
      AND competitions.creator_id = auth.uid()
    )
  );

-- Policy: Invited users can update their own participation status
CREATE POLICY "Users can update own participation"
  ON participants
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Competition creators can delete participants
CREATE POLICY "Creators can delete participants"
  ON participants
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM competitions
      WHERE competitions.id = participants.competition_id
      AND competitions.creator_id = auth.uid()
    )
  );

-- Function to set joined_at timestamp when status changes to joined
CREATE OR REPLACE FUNCTION set_joined_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'joined' AND (OLD.status IS NULL OR OLD.status != 'joined') THEN
    NEW.joined_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically set joined_at
CREATE TRIGGER update_participants_joined_at
  BEFORE INSERT OR UPDATE ON participants
  FOR EACH ROW
  EXECUTE FUNCTION set_joined_at();
