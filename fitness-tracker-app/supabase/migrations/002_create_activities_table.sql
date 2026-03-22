-- Create activities table
-- This table stores GPS-tracked fitness activities
CREATE TABLE IF NOT EXISTS activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('walking', 'running')),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  duration INTEGER NOT NULL, -- in seconds
  distance NUMERIC(10, 2) NOT NULL, -- in meters
  pace NUMERIC(5, 2) NOT NULL, -- in min/km
  calories INTEGER NOT NULL,
  route JSONB NOT NULL, -- { coordinates: [{lat, lng, timestamp}] }
  is_private BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on user_id and created_at for user activity history queries
CREATE INDEX IF NOT EXISTS idx_activities_user_created ON activities(user_id, created_at DESC);

-- Create index on user_id and is_private for feed queries
CREATE INDEX IF NOT EXISTS idx_activities_user_private ON activities(user_id, is_private);

-- Create index on start_time for competition queries
CREATE INDEX IF NOT EXISTS idx_activities_start_time ON activities(start_time);

-- Enable Row Level Security
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own activities
CREATE POLICY "Users can read own activities"
  ON activities
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own activities
CREATE POLICY "Users can insert own activities"
  ON activities
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own activities
CREATE POLICY "Users can update own activities"
  ON activities
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Users can delete their own activities
CREATE POLICY "Users can delete own activities"
  ON activities
  FOR DELETE
  USING (auth.uid() = user_id);

-- Note: Policy for reading friends' activities will be added after friends table is created (see migration 003)
