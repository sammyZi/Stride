-- Create friends table
-- This table stores friend relationships and requests
CREATE TABLE IF NOT EXISTS friends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user2_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted')),
  requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  CONSTRAINT different_users CHECK (user1_id != user2_id),
  CONSTRAINT unique_friendship UNIQUE (user1_id, user2_id)
);

-- Create index on user1_id for friend lookups
CREATE INDEX IF NOT EXISTS idx_friends_user1 ON friends(user1_id);

-- Create index on user2_id for friend lookups
CREATE INDEX IF NOT EXISTS idx_friends_user2 ON friends(user2_id);

-- Create index on status for pending request queries
CREATE INDEX IF NOT EXISTS idx_friends_status ON friends(status);

-- Create composite index for efficient friend queries
CREATE INDEX IF NOT EXISTS idx_friends_user1_user2_status ON friends(user1_id, user2_id, status);

-- Enable Row Level Security
ALTER TABLE friends ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own friend relationships
CREATE POLICY "Users can read own friendships"
  ON friends
  FOR SELECT
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Policy: Users can create friend requests
CREATE POLICY "Users can create friend requests"
  ON friends
  FOR INSERT
  WITH CHECK (
    auth.uid() = requester_id
    AND (auth.uid() = user1_id OR auth.uid() = user2_id)
    AND status = 'pending'
  );

-- Policy: Users can update friend requests they received
CREATE POLICY "Users can update received friend requests"
  ON friends
  FOR UPDATE
  USING (
    (auth.uid() = user1_id OR auth.uid() = user2_id)
    AND auth.uid() != requester_id
  );

-- Policy: Users can delete their own friendships
CREATE POLICY "Users can delete own friendships"
  ON friends
  FOR DELETE
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Function to set accepted_at timestamp when status changes to accepted
CREATE OR REPLACE FUNCTION set_accepted_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    NEW.accepted_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically set accepted_at
CREATE TRIGGER update_friends_accepted_at
  BEFORE UPDATE ON friends
  FOR EACH ROW
  EXECUTE FUNCTION set_accepted_at();
