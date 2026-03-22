-- Add cross-table RLS policies
-- This migration adds policies that reference multiple tables
-- Must run after all base tables are created

-- ============================================================================
-- Users Table - Add policy for reading friends' profiles
-- ============================================================================

CREATE POLICY "Users can read friends profiles"
  ON users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM friends
      WHERE (friends.user1_id = auth.uid() AND friends.user2_id = users.id AND friends.status = 'accepted')
         OR (friends.user2_id = auth.uid() AND friends.user1_id = users.id AND friends.status = 'accepted')
    )
  );

-- ============================================================================
-- Activities Table - Add policy for reading friends' non-private activities
-- ============================================================================

CREATE POLICY "Users can read friends non-private activities"
  ON activities
  FOR SELECT
  USING (
    is_private = false
    AND EXISTS (
      SELECT 1 FROM friends
      WHERE (friends.user1_id = auth.uid() AND friends.user2_id = activities.user_id AND friends.status = 'accepted')
         OR (friends.user2_id = auth.uid() AND friends.user1_id = activities.user_id AND friends.status = 'accepted')
    )
  );

-- ============================================================================
-- Reactions Table - Add policies for friends' activities
-- ============================================================================

-- Policy: Users can read reactions on friends' activities
CREATE POLICY "Users can read reactions on friends activities"
  ON reactions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM activities
      WHERE activities.id = reactions.activity_id
      AND activities.is_private = false
      AND EXISTS (
        SELECT 1 FROM friends
        WHERE (friends.user1_id = auth.uid() AND friends.user2_id = activities.user_id AND friends.status = 'accepted')
           OR (friends.user2_id = auth.uid() AND friends.user1_id = activities.user_id AND friends.status = 'accepted')
      )
    )
  );

-- Policy: Users can create reactions on friends' activities
CREATE POLICY "Users can create reactions on friends activities"
  ON reactions
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM activities
      WHERE activities.id = reactions.activity_id
      AND activities.is_private = false
      AND EXISTS (
        SELECT 1 FROM friends
        WHERE (friends.user1_id = auth.uid() AND friends.user2_id = activities.user_id AND friends.status = 'accepted')
           OR (friends.user2_id = auth.uid() AND friends.user1_id = activities.user_id AND friends.status = 'accepted')
      )
    )
  );

-- ============================================================================
-- Competitions Table - Full SELECT policy (requires participants table)
-- ============================================================================

-- Drop the creator-only placeholder policy added in 005 and replace with
-- the full policy that also covers participants.
DROP POLICY IF EXISTS "Creators can read own competitions" ON competitions;

CREATE POLICY "Users can read own competitions"
  ON competitions
  FOR SELECT
  USING (
    auth.uid() = creator_id
    OR EXISTS (
      SELECT 1 FROM participants
      WHERE participants.competition_id = competitions.id
      AND participants.user_id = auth.uid()
    )
  );
