-- Create reactions table
-- This table stores user reactions to activities
CREATE TABLE IF NOT EXISTS reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('thumbs_up', 'fire', 'muscle')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_user_activity_reaction UNIQUE (activity_id, user_id)
);

-- Create index on activity_id for reaction count queries
CREATE INDEX IF NOT EXISTS idx_reactions_activity ON reactions(activity_id);

-- Create index on user_id for user reaction queries
CREATE INDEX IF NOT EXISTS idx_reactions_user ON reactions(user_id);

-- Create composite index for efficient reaction queries
CREATE INDEX IF NOT EXISTS idx_reactions_activity_user ON reactions(activity_id, user_id);

-- Enable Row Level Security
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read reactions on their own activities
CREATE POLICY "Users can read reactions on own activities"
  ON reactions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM activities
      WHERE activities.id = reactions.activity_id
      AND activities.user_id = auth.uid()
    )
  );

-- Policy: Users can update their own reactions
CREATE POLICY "Users can update own reactions"
  ON reactions
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Users can delete their own reactions
CREATE POLICY "Users can delete own reactions"
  ON reactions
  FOR DELETE
  USING (auth.uid() = user_id);

-- Note: Policies for reading/creating reactions on friends' activities will be added after friends table is created (see migration 003)
