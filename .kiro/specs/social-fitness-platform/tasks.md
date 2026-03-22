# Implementation Plan: Social Fitness Platform

## Overview

This implementation plan transforms the existing fitness tracker app into a social fitness platform with cloud storage, authentication, and competitive features. The implementation is divided into phases to enable incremental development and testing.

## Tasks

- [x] 1. Set up Supabase project and database infrastructure
  - Create Supabase project in Supabase dashboard
  - Enable Google OAuth provider in Supabase Auth
  - Create PostgreSQL database tables (users, activities, friends, etc.)
  - Set up Row Level Security policies
  - Configure environment variables for Supabase
  - _Requirements: 2.1, 2.2, 2.3, 2.8_

- [-] 2. Implement Supabase authentication system
  - [x] 2.1 Configure Row Level Security policies for authentication
    - Implement RLS policies for user data access
    - Add user context to authenticated requests
    - Handle token expiration and invalid tokens
    - _Requirements: 2.4, 2.6, 11.1_

  - [ ] 2.2 Configure Google OAuth in Supabase
    - Enable Google provider in Supabase Auth settings
    - Configure OAuth redirect URL
    - _Requirements: 1.3, 13.1_

- [x] 3. Implement user profile management in Supabase
  - [x] 3.1 Create user profile tables and RLS policies
    - Define users table schema with profile and privacy fields
    - Set up RLS policies for user data access
    - Create indexes for performance
    - _Requirements: 4.7, 5.4_

  - [x] 3.2 Implement user profile operations via Supabase client
    - Use Supabase client for profile CRUD operations
    - Implement profile photo upload to Supabase Storage
    - Handle privacy settings
    - _Requirements: 13.2, 13.3_

- [ ] 4. Implement activity cloud storage in Supabase
  - [ ] 4.1 Create activities table and RLS policies
    - Define activities table schema with GPS route data
    - Set up RLS policies for activity access
    - Create indexes for user_id and created_at
    - _Requirements: 3.5_

  - [ ] 4.2 Implement activity operations via Supabase client
    - Use Supabase client for activity CRUD operations
    - Handle GPS route data storage (JSONB)
    - Implement activity privacy controls
    - _Requirements: 13.4, 13.5, 13.6_

- [ ] 5. Checkpoint - Backend migrated to Supabase
  - Backend folder removed, using Supabase directly from mobile app

- [ ] 6. Implement mobile app authentication with Supabase
  - [ ] 6.1 Install and configure Supabase SDK and Google Sign-In
    - Add @supabase/supabase-js package
    - Configure Google OAuth in app
    - Set up Supabase configuration
    - _Requirements: 1.1, 1.2_

  - [ ] 6.2 Create AuthService for mobile app with Supabase
    - Implement signInWithGoogle using Supabase Auth
    - Implement signOut method
    - Implement token storage with AsyncStorage
    - Implement automatic token refresh via Supabase
    - _Requirements: 1.2, 1.4, 1.6, 1.7_

  - [ ] 6.3 Create sign-in screen UI
    - Design sign-in screen with Google button
    - Implement OAuth flow with Supabase
    - Handle authentication success/failure
    - _Requirements: 1.1, 1.2, 1.5_

- [ ] 7. Implement user onboarding flow
  - [ ] 7.1 Create onboarding screen UI
    - Design form for name, age, weight, height
    - Implement unit selection (kg/lbs, cm/ft)
    - Add optional profile photo upload
    - _Requirements: 4.1, 4.2, 4.3_

  - [ ] 7.2 Implement onboarding validation logic
    - Validate age range (13-120)
    - Validate weight ranges by unit
    - Validate height ranges by unit
    - Prevent form submission with invalid data
    - _Requirements: 4.4, 4.5, 4.6_

  - [ ] 7.3 Integrate onboarding with navigation
    - Show onboarding for new users only
    - Navigate to main app after completion
    - _Requirements: 4.8, 4.9_

- [ ] 8. Implement Supabase client and sync manager
  - [ ] 8.1 Create SupabaseService wrapper
    - Implement database query methods
    - Add authentication token to all requests
    - Handle network errors and retries
    - _Requirements: 2.4_

  - [ ] 8.2 Create SyncManager and SyncQueue
    - Implement queue for offline operations
    - Implement automatic sync on connectivity restore
    - Implement sync status tracking
    - _Requirements: 3.6, 12.1, 12.2_

- [ ] 9. Implement activity cloud sync in mobile app with Supabase
  - [ ] 9.1 Update ActivityService to use Supabase
    - Modify createActivity to insert into Supabase
    - Modify getActivities to query from Supabase
    - Add offline queueing for activities
    - _Requirements: 3.1, 3.2, 3.6_

  - [ ] 9.2 Create data migration tool
    - Detect existing local activities on first sign-in
    - Display migration prompt and progress UI
    - Upload all local activities in batches to Supabase
    - Validate all activities uploaded successfully
    - _Requirements: 3.3, 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7_

- [ ] 10. Checkpoint - Ensure authentication and sync work

- [ ] 11. Implement friends system in Supabase
  - [ ] 11.1 Create friends table and RLS policies
    - Define friends table schema
    - Set up RLS policies for friend relationships
    - Create indexes for lookups
    - _Requirements: 6.3, 6.5_

  - [ ] 11.2 Implement friend operations via Supabase client
    - Use Supabase client for friend CRUD operations
    - Handle friend request status updates
    - Implement bidirectional friend relationships
    - _Requirements: 13.7, 13.8, 13.9, 13.10_

- [ ] 12. Implement user search in Supabase
  - [ ] 12.1 Implement search via Supabase queries
    - Use Supabase full-text search or ILIKE queries
    - Search by display name and email
    - Exclude current user and existing friends
    - Limit results to 20 users
    - _Requirements: 15.2, 15.3, 15.4, 15.5_

- [ ] 13. Implement friends system in mobile app
  - [ ] 13.1 Create FriendsService
    - Implement searchUsers method
    - Implement sendFriendRequest method
    - Implement acceptFriendRequest method
    - Implement declineFriendRequest method
    - Implement getFriends method
    - Implement removeFriend method
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.9_

  - [ ] 13.2 Create friends UI screens
    - Create search screen with text input
    - Create friends list screen
    - Create friend requests screen
    - Create friend profile screen
    - _Requirements: 6.1, 6.7, 6.8_

- [ ] 14. Implement activity feed backend
  - [ ] 14.1 Create feed queries via Supabase
    - Query activities from friends with pagination
    - Include user info and reaction counts
    - Support filtering by activity type
    - _Requirements: 13.11, 7.1, 7.3_

  - [ ] 14.2 Create reactions table and operations
    - Define reactions table schema
    - Implement reaction CRUD via Supabase client
    - Handle reaction uniqueness per user/activity
    - _Requirements: 13.12, 7.4, 7.5_

- [ ] 15. Implement activity feed in mobile app
  - [ ] 15.1 Create FeedService
    - Implement getFeed method
    - Implement refreshFeed method
    - Implement filterByType method
    - _Requirements: 7.1, 7.7_

  - [ ] 15.2 Create ReactionService
    - Implement addReaction method
    - Implement removeReaction method
    - Implement getReactions method
    - _Requirements: 7.4, 7.5_

  - [ ] 15.3 Create activity feed UI
    - Design feed item component with activity details
    - Add reaction buttons and counts
    - Implement pull-to-refresh
    - Add activity type filter
    - _Requirements: 7.1, 7.3, 7.4, 7.6, 7.7_

- [ ] 16. Checkpoint - Ensure social features work

- [ ] 17. Implement competitions backend
  - [ ] 17.1 Create competition tables and RLS policies
    - Define competitions and participants tables
    - Set up RLS policies for competition access
    - Create indexes for performance
    - _Requirements: 8.1, 8.2_

  - [ ] 17.2 Implement competition operations via Supabase
    - Use Supabase client for competition CRUD
    - Handle participant management
    - Implement leaderboard queries
    - _Requirements: 13.13, 13.14, 13.15, 13.16_

  - [ ] 17.3 Implement leaderboard calculation logic
    - Calculate rankings based on challenge type
    - Update leaderboard when activities are added
    - Determine winner when competition ends
    - _Requirements: 8.7, 8.8, 9.1_

- [ ] 18. Implement competitions in mobile app
  - [ ] 18.1 Create CompetitionService
    - Implement createCompetition method
    - Implement getCompetitions method
    - Implement joinCompetition method
    - Implement declineCompetition method
    - Implement getCompetitionDetails method
    - _Requirements: 8.1, 8.4, 8.5, 8.9_

  - [ ] 18.2 Create LeaderboardService
    - Implement getLeaderboard method
    - Implement real-time leaderboard updates
    - _Requirements: 9.1, 9.3_

  - [ ] 18.3 Create competition UI screens
    - Create competition creation screen
    - Create competitions list screen
    - Create competition detail screen with leaderboard
    - Create competition summary screen
    - _Requirements: 8.1, 8.9, 9.1, 9.3, 9.4, 9.6, 16.6_

- [ ] 19. Implement push notifications
  - [ ] 19.1 Set up Firebase Cloud Messaging
    - Configure FCM in Firebase project
    - Add FCM SDK to mobile app
    - Implement device token registration
    - _Requirements: 10.1_

  - [ ] 19.2 Create NotificationService in backend
    - Implement sendNotification method
    - Create notification templates for each type
    - Implement notification preference checking
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.7_

  - [ ] 19.3 Integrate notifications with events
    - Send notification on friend request
    - Send notification on friend acceptance
    - Send notification on activity reaction
    - Send notification on competition invite
    - Send notification on competition end
    - Send notification on rank change
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.7_

  - [ ] 19.4 Write property test for notification preference respect
    - **Property 17: Notification Preference Respect**
    - **Validates: Requirements 10.2, 10.6**

  - [ ] 19.5 Create notification preferences UI
    - Add settings screen for notification preferences
    - Allow toggling each notification type
    - _Requirements: 10.6_

- [ ] 20. Implement scheduled tasks with Supabase Edge Functions
  - [ ] 20.1 Create Edge Function for competition reminders
    - Schedule function using pg_cron or external scheduler
    - Check for competitions ending in 24 hours
    - Send reminder notifications
    - _Requirements: 16.2_

  - [ ] 20.2 Create Edge Function for competition completion
    - Schedule function using pg_cron or external scheduler
    - Check for competitions that have ended
    - Calculate final standings and winner
    - Send completion notifications
    - _Requirements: 8.8, 16.4, 16.5_

- [ ] 21. Implement account deletion in Supabase
  - [ ] 21.1 Implement account deletion via Supabase
    - Use Supabase client to delete user data
    - Delete user profile from users table
    - Delete all user activities (CASCADE)
    - Remove user from all friendships (CASCADE)
    - Remove user from all competitions (CASCADE)
    - Delete all user reactions (CASCADE)
    - Delete all user notifications (CASCADE)
    - Delete auth user via Supabase Auth API
    - _Requirements: 11.7_

  - [ ] 21.2 Add account deletion UI
    - Add delete account button in settings
    - Show confirmation dialog
    - Handle deletion success/failure
    - _Requirements: 11.7_

- [ ] 22. Verify Row Level Security policies
  - [ ] 22.1 Review and test RLS policies
    - Users can only read/write their own profile
    - Users can read friends' profiles (respecting privacy)
    - Users can only write their own activities
    - Users can read friends' non-private activities
    - Implement policies for friends, reactions, competitions
    - _Requirements: 11.2, 11.4, 11.5_

- [ ] 23. Final integration and testing
  - [ ] 23.1 Perform end-to-end testing
    - Test complete sign-up to first activity flow
    - Test friend addition and activity feed flow
    - Test competition creation and completion flow
    - Test offline/online sync flow
    - _Requirements: All_

  - [ ] 23.2 Performance testing and optimization
    - Test database query performance
    - Optimize queries with proper indexes
    - Implement caching where needed
    - Test mobile app performance
    - _Requirements: All_

  - [ ] 23.3 Security audit
    - Review authentication implementation
    - Review RLS policies
    - Test for common vulnerabilities
    - _Requirements: 11.1, 11.2, 11.5, 11.6_

- [ ] 24. Deployment and launch
  - [ ] 24.1 Configure production Supabase project
    - Set up production Supabase project
    - Configure production database and RLS policies
    - Set up production environment variables
    - Configure monitoring and logging
    - _Requirements: All_

  - [ ] 24.2 Build and deploy mobile app
    - Build production iOS and Android apps
    - Submit to App Store and Google Play
    - Set up crash reporting
    - Configure analytics
    - _Requirements: All_

  - [ ] 24.3 User migration and communication
    - Communicate changes to existing users
    - Provide migration guide
    - Monitor migration success rate
    - Gather user feedback
    - _Requirements: 3.3, 14.1_

## Notes

- All tasks are required for comprehensive implementation
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- The implementation follows a phased approach: Supabase Setup → Auth → Sync → Social → Competitions
- Backend folder has been removed - using Supabase directly from mobile app
- All test tasks have been removed per user request
