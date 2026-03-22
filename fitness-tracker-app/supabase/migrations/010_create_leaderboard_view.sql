-- Create leaderboard view for efficient competition queries
-- This view calculates leaderboard rankings based on competition type

CREATE OR REPLACE VIEW competition_leaderboard AS
SELECT
  p.competition_id,
  p.user_id,
  u.display_name,
  u.photo_url,
  c.challenge_type,
  CASE
    WHEN c.challenge_type = 'MOST_DISTANCE' THEN
      COALESCE(SUM(a.distance), 0)
    WHEN c.challenge_type = 'MOST_ACTIVITIES' THEN
      COUNT(a.id)::numeric
    WHEN c.challenge_type = 'LONGEST_ACTIVITY' THEN
      COALESCE(MAX(a.distance), 0)
    WHEN c.challenge_type = 'FASTEST_PACE' THEN
      COALESCE(MIN(a.pace), 999999)
    ELSE 0
  END AS value,
  RANK() OVER (
    PARTITION BY p.competition_id
    ORDER BY
      CASE
        WHEN c.challenge_type = 'MOST_DISTANCE' THEN COALESCE(SUM(a.distance), 0)
        WHEN c.challenge_type = 'MOST_ACTIVITIES' THEN COUNT(a.id)::numeric
        WHEN c.challenge_type = 'LONGEST_ACTIVITY' THEN COALESCE(MAX(a.distance), 0)
        WHEN c.challenge_type = 'FASTEST_PACE' THEN -COALESCE(MIN(a.pace), 999999)
        ELSE 0
      END DESC
  ) AS rank
FROM participants p
JOIN competitions c ON c.id = p.competition_id
JOIN users u ON u.id = p.user_id
LEFT JOIN activities a ON a.user_id = p.user_id
  AND a.start_time >= c.start_date
  AND a.start_time < c.end_date
  AND a.is_private = false
WHERE p.status = 'joined'
GROUP BY p.competition_id, p.user_id, u.display_name, u.photo_url, c.challenge_type;

-- Grant access to authenticated users
GRANT SELECT ON competition_leaderboard TO authenticated;

-- Create function to get leaderboard for a competition
CREATE OR REPLACE FUNCTION get_competition_leaderboard(competition_uuid UUID)
RETURNS TABLE (
  user_id UUID,
  display_name TEXT,
  photo_url TEXT,
  value NUMERIC,
  rank BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cl.user_id,
    cl.display_name,
    cl.photo_url,
    cl.value,
    cl.rank
  FROM competition_leaderboard cl
  WHERE cl.competition_id = competition_uuid
  ORDER BY cl.rank ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_competition_leaderboard(UUID) TO authenticated;
