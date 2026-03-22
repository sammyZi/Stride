# Design Document: Social Fitness Platform

## Overview

This design document outlines the technical architecture for transforming the fitness tracker app into a social fitness platform. The system will consist of three main components:

1. **React Native Mobile App** - The existing fitness tracker enhanced with authentication, social features, and cloud sync
2. **Supabase Backend** - PostgreSQL database with Row Level Security, authentication, and real-time subscriptions

The design prioritizes:
- Seamless migration from local-only to cloud-based storage
- Real-time social interactions and competition updates
- Offline-first architecture with automatic sync
- Secure authentication and data privacy
- Scalable backend architecture

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    React Native App                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Auth Module  │  │ Social Module│  │ Activity     │      │
│  │              │  │              │  │ Tracking     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Local Storage (AsyncStorage + Cache)         │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ Supabase Client SDK
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      Supabase Backend                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Supabase     │  │ PostgreSQL   │  │ Realtime     │      │
│  │ Auth         │  │ Database     │  │ Subscriptions│      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Row Level    │  │ Edge         │  │ Storage      │      │
│  │ Security     │  │ Functions    │  │              │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### Component Interaction Flow

**Authentication Flow:**
```
User → Google OAuth → Supabase Auth → JWT Token → App
```

**Activity Upload Flow:**
```
Activity Tracking → Local Save → Sync Queue → Supabase Client → PostgreSQL → Friends' Feeds
```

**Competition Update Flow:**
```
Activity Complete → Supabase Client → PostgreSQL Update → Edge Function → Push Notifications → Leaderboard Refresh
```

## Components and Interfaces

### 1. Mobile App Components

#### 1.1 Authentication Module

**Purpose:** Handle Google OAuth sign-in and token management with Supabase

**Key Classes:**
- `AuthService`: Manages authentication state and token storage using Supabase Auth
- `GoogleAuthProvider`: Integrates with Google OAuth
- `TokenManager`: Securely stores and refreshes auth tokens

**Interfaces:**
```typescript
interface AuthService {
  signInWithGoogle(): Promise<AuthResult>;
  signOut(): Promise<void>;
  getCurrentUser(): Promise<User | null>;
  refreshToken(): Promise<string>;
  isAuthenticated(): boolean;
}

interface AuthResult {
  user: User;
  token: string;
  isNewUser: boolean;
}

interface User {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  profile?: UserProfile;
}
```

#### 1.2 Supabase Client Module

**Purpose:** Handle all database operations with Supabase

**Key Classes:**
- `SupabaseClient`: Supabase client instance with authentication
- `ActivityService`: Activity database operations
- `SocialService`: Friends and feed database operations
- `CompetitionService`: Competition database operations

**Interfaces:**
```typescript
interface SupabaseService {
  from<T>(table: string): SupabaseQueryBuilder<T>;
  auth: SupabaseAuthClient;
  storage: SupabaseStorageClient;
  realtime: SupabaseRealtimeClient;
}

interface DatabaseResponse<T> {
  data: T | null;
  error: PostgrestError | null;
}
```

#### 1.3 Sync Manager Module

**Purpose:** Handle offline queue and cloud synchronization

**Key Classes:**
- `SyncManager`: Orchestrates sync operations
- `SyncQueue`: Manages pending operations
- `ConflictResolver`: Handles data conflicts

**Interfaces:**
```typescript
interface SyncManager {
  queueActivity(activity: Activity): Promise<void>;
  syncPending(): Promise<SyncResult>;
  getSyncStatus(): SyncStatus;
  onSyncComplete(callback: (result: SyncResult) => void): void;
}

interface SyncQueue {
  add(operation: SyncOperation): Promise<void>;
  getAll(): Promise<SyncOperation[]>;
  remove(id: string): Promise<void>;
  clear(): Promise<void>;
}

interface SyncOperation {
  id: string;
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  resource: 'activity' | 'profile' | 'reaction';
  data: any;
  timestamp: number;
  retryCount: number;
}

interface SyncStatus {
  isPending: boolean;
  pendingCount: number;
  lastSyncTime: number;
  isSyncing: boolean;
}
```

#### 1.4 Social Module

**Purpose:** Manage friends, feed, and social interactions

**Key Classes:**
- `FriendsService`: Friend management
- `FeedService`: Activity feed
- `ReactionService`: Activity reactions

**Interfaces:**
```typescript
interface FriendsService {
  searchUsers(query: string): Promise<User[]>;
  sendFriendRequest(userId: string): Promise<void>;
  acceptFriendRequest(requestId: string): Promise<void>;
  declineFriendRequest(requestId: string): Promise<void>;
  getFriends(): Promise<Friend[]>;
  removeFriend(userId: string): Promise<void>;
  getPendingRequests(): Promise<FriendRequest[]>;
}

interface FeedService {
  getFeed(limit?: number, offset?: number): Promise<FeedItem[]>;
  refreshFeed(): Promise<FeedItem[]>;
  filterByType(type: ActivityType): Promise<FeedItem[]>;
}

interface ReactionService {
  addReaction(activityId: string, reaction: ReactionType): Promise<void>;
  removeReaction(activityId: string): Promise<void>;
  getReactions(activityId: string): Promise<Reaction[]>;
}
```

#### 1.5 Competition Module

**Purpose:** Manage competitions and leaderboards

**Key Classes:**
- `CompetitionService`: Competition CRUD operations
- `LeaderboardService`: Real-time leaderboard updates

**Interfaces:**
```typescript
interface CompetitionService {
  createCompetition(competition: CreateCompetitionDto): Promise<Competition>;
  getCompetitions(): Promise<Competition[]>;
  joinCompetition(competitionId: string): Promise<void>;
  declineCompetition(competitionId: string): Promise<void>;
  getCompetitionDetails(competitionId: string): Promise<Competition>;
}

interface LeaderboardService {
  getLeaderboard(competitionId: string): Promise<LeaderboardEntry[]>;
  subscribeToUpdates(competitionId: string, callback: (entries: LeaderboardEntry[]) => void): void;
  unsubscribe(competitionId: string): void;
}

interface CreateCompetitionDto {
  name: string;
  challengeType: ChallengeType;
  startDate: Date;
  endDate: Date;
  participantIds: string[];
}

type ChallengeType = 'MOST_DISTANCE' | 'MOST_ACTIVITIES' | 'LONGEST_ACTIVITY' | 'FASTEST_PACE';
```

### 2. Supabase Backend Components

#### 2.1 PostgreSQL Database Schema

**Purpose:** Store all application data with Row Level Security

**Tables:**
- `users`: User profiles and settings
- `activities`: GPS-tracked activities
- `friends`: Friend relationships
- `reactions`: Activity reactions
- `competitions`: Competition data
- `participants`: Competition participants
- `notifications`: User notifications

#### 2.2 Row Level Security Policies

**Purpose:** Enforce data access rules at the database level

**Key Policies:**
- Users can only read/write their own profile
- Users can read friends' profiles (respecting privacy)
- Users can only write their own activities
- Users can read friends' non-private activities
- Competition participants can read competition data

#### 2.3 Edge Functions

**Purpose:** Server-side logic for complex operations

**Key Functions:**
- `competition-reminder`: Send reminders for ending competitions
- `competition-complete`: Calculate winners and send notifications
- `leaderboard-update`: Update competition leaderboards
- `notification-dispatch`: Send push notifications

## Data Models

### PostgreSQL Database Schema

```
users/
  {userId}/
    - email: string
    - displayName: string
    - photoURL: string
    - profile: {
        age: number
        weight: number
        weightUnit: 'kg' | 'lbs'
        height?: number
        heightUnit?: 'cm' | 'ft'
        gender?: 'male' | 'female' | 'other'
      }
    - privacySettings: {
        showAge: boolean
        showWeight: boolean
        showHeight: boolean
      }
    - createdAt: timestamp
    - updatedAt: timestamp

activities/
  {activityId}/
    - userId: string
    - type: 'walking' | 'running'
    - startTime: timestamp
    - endTime: timestamp
    - duration: number (seconds)
    - distance: number (meters)
    - pace: number (min/km)
    - calories: number
    - route: {
        coordinates: Array<{lat: number, lng: number, timestamp: number}>
      }
    - isPrivate: boolean
    - createdAt: timestamp

friends/
  {friendshipId}/
    - user1Id: string
    - user2Id: string
    - status: 'pending' | 'accepted'
    - requesterId: string
    - createdAt: timestamp
    - acceptedAt?: timestamp

reactions/
  {reactionId}/
    - activityId: string
    - userId: string
    - type: 'thumbs_up' | 'fire' | 'muscle'
    - createdAt: timestamp

competitions/
  {competitionId}/
    - name: string
    - creatorId: string
    - challengeType: 'MOST_DISTANCE' | 'MOST_ACTIVITIES' | 'LONGEST_ACTIVITY' | 'FASTEST_PACE'
    - startDate: timestamp
    - endDate: timestamp
    - status: 'pending' | 'active' | 'completed'
    - participants: Array<{
        userId: string
        status: 'invited' | 'joined' | 'declined'
        joinedAt?: timestamp
      }>
    - leaderboard: Array<{
        userId: string
        value: number
        rank: number
      }>
    - winnerId?: string
    - createdAt: timestamp
    - completedAt?: timestamp

notifications/
  {notificationId}/
    - userId: string
    - type: 'friend_request' | 'friend_accepted' | 'activity_reaction' | 'competition_invite' | 'competition_ended' | 'rank_change'
    - title: string
    - body: string
    - data: object
    - read: boolean
    - createdAt: timestamp
```

### TypeScript Data Models

```typescript
interface UserProfile {
  age: number;
  weight: number;
  weightUnit: 'kg' | 'lbs';
  height?: number;
  heightUnit?: 'cm' | 'ft';
  gender?: 'male' | 'female' | 'other';
}

interface PrivacySettings {
  showAge: boolean;
  showWeight: boolean;
  showHeight: boolean;
}

interface User {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  profile?: UserProfile;
  privacySettings: PrivacySettings;
  createdAt: Date;
  updatedAt: Date;
}

interface Activity {
  id: string;
  userId: string;
  type: 'walking' | 'running';
  startTime: Date;
  endTime: Date;
  duration: number;
  distance: number;
  pace: number;
  calories: number;
  route: RouteData;
  isPrivate: boolean;
  createdAt: Date;
}

interface RouteData {
  coordinates: RoutePoint[];
}

interface RoutePoint {
  lat: number;
  lng: number;
  timestamp: number;
}

interface Friend {
  id: string;
  user1Id: string;
  user2Id: string;
  status: 'pending' | 'accepted';
  requesterId: string;
  createdAt: Date;
  acceptedAt?: Date;
}

interface FriendRequest {
  id: string;
  fromUser: User;
  toUserId: string;
  createdAt: Date;
}

interface Reaction {
  id: string;
  activityId: string;
  userId: string;
  type: 'thumbs_up' | 'fire' | 'muscle';
  createdAt: Date;
}

interface Competition {
  id: string;
  name: string;
  creatorId: string;
  challengeType: ChallengeType;
  startDate: Date;
  endDate: Date;
  status: 'pending' | 'active' | 'completed';
  participants: Participant[];
  leaderboard: LeaderboardEntry[];
  winnerId?: string;
  createdAt: Date;
  completedAt?: Date;
}

interface Participant {
  userId: string;
  status: 'invited' | 'joined' | 'declined';
  joinedAt?: Date;
}

interface LeaderboardEntry {
  userId: string;
  displayName: string;
  photoURL?: string;
  value: number;
  rank: number;
}

interface FeedItem {
  id: string;
  activity: Activity;
  user: User;
  reactions: Reaction[];
  userReaction?: Reaction;
  createdAt: Date;
}

interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data: object;
  read: boolean;
  createdAt: Date;
}

type NotificationType = 
  | 'friend_request' 
  | 'friend_accepted' 
  | 'activity_reaction' 
  | 'competition_invite' 
  | 'competition_ended' 
  | 'rank_change';
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property 1: Authentication Token Verification
*For any* API request to a protected endpoint, the backend should verify the authentication token and reject requests with invalid or missing tokens with a 401 status code.
**Validates: Requirements 2.4, 2.6, 11.1**

### Property 2: User Data Isolation
*For any* data access request, users should only be able to access their own data or data explicitly shared by their friends, ensuring proper authorization boundaries.
**Validates: Requirements 11.2**

### Property 3: Activity Cloud Sync
*For any* completed activity, the app should upload it to Firestore (immediately if online, or queue it for later sync if offline), ensuring no activities are lost.
**Validates: Requirements 3.1, 3.6**

### Property 4: Offline Queue Sync
*For any* queued activity when network connectivity is restored, the app should automatically sync all pending activities to Firestore in the order they were created.
**Validates: Requirements 3.6, 12.2**

### Property 5: Data Migration Completeness
*For any* migration operation, all local activities should be successfully uploaded to Firestore before marking the migration as complete, ensuring data integrity.
**Validates: Requirements 3.4, 14.3, 14.7**

### Property 6: Conflict Resolution by Timestamp
*For any* data conflict during sync (same activity modified locally and remotely), the version with the most recent timestamp should be used as the source of truth.
**Validates: Requirements 3.7**

### Property 7: Profile Field Validation
*For any* user profile input, age should be validated to be between 13 and 120, weight should be within reasonable ranges for the selected unit, and height should be within reasonable ranges for the selected unit.
**Validates: Requirements 4.4, 4.5, 4.6**

### Property 8: Onboarding Completion Required
*For any* new user, the app should not allow navigation to the main interface until required profile fields (display name, age, weight) are provided.
**Validates: Requirements 4.9**

### Property 9: Profile Privacy Controls
*For any* profile view request, only fields marked as visible in privacy settings should be shown to friends, and private fields should be hidden.
**Validates: Requirements 5.6, 5.7**

### Property 10: Friend Request Bidirectionality
*For any* accepted friend request, a mutual bidirectional friendship should be created, allowing both users to see each other's activities and profiles.
**Validates: Requirements 6.5**

### Property 11: Private Activity Exclusion
*For any* activity marked as private, it should not appear in the social feed or be visible to any friends, regardless of their relationship status.
**Validates: Requirements 11.4**

### Property 12: Feed Activity Filtering
*For any* feed filter selection (walking, running, all), only activities matching the selected type should be displayed in the feed.
**Validates: Requirements 7.7**

### Property 13: Reaction Uniqueness
*For any* user and activity combination, only one reaction should be allowed per user (adding a new reaction should replace any existing reaction from that user).
**Validates: Requirements 7.4, 7.5**

### Property 14: Competition Invitation Completeness
*For any* created competition, invitations should be sent to all selected participants, ensuring no participant is missed.
**Validates: Requirements 8.3**

### Property 15: Leaderboard Ranking Accuracy
*For any* active competition, the leaderboard should rank participants correctly based on the challenge type metric (distance, activity count, longest activity, or fastest pace).
**Validates: Requirements 9.1**

### Property 16: Competition Winner Determination
*For any* completed competition, the participant with the highest metric value for the challenge type should be declared the winner.
**Validates: Requirements 8.8, 16.4**

### Property 17: Notification Preference Respect
*For any* notification trigger, the notification should only be sent if the user has enabled that notification type in their preferences.
**Validates: Requirements 10.2, 10.6**

### Property 18: User Search Exclusion
*For any* user search query, the results should exclude the current user and users who are already friends.
**Validates: Requirements 15.3**

### Property 19: Search Query Minimum Length
*For any* search query with fewer than 3 characters, the app should not perform a search and should display a message indicating the minimum length requirement.
**Validates: Requirements 15.6**

### Property 20: Account Deletion Completeness
*For any* account deletion request, all user data including profile, activities, friendships, reactions, and competition participations should be removed from Firestore.
**Validates: Requirements 11.7**

## Error Handling

### Authentication Errors

**Token Expiration:**
- Detect expired tokens before API calls
- Automatically attempt token refresh
- If refresh fails, redirect to sign-in screen
- Preserve user's current state for restoration after re-authentication

**OAuth Failures:**
- Display user-friendly error messages for common OAuth errors
- Provide retry mechanism
- Log detailed errors for debugging
- Handle network timeouts gracefully

### Network Errors

**Connection Loss:**
- Detect network connectivity changes
- Queue operations for later sync
- Display offline indicator in UI
- Prevent user actions that require network when offline

**API Request Failures:**
- Implement exponential backoff for retries
- Maximum 3 retry attempts for failed requests
- Display error messages for permanent failures
- Allow manual retry for critical operations

**Sync Conflicts:**
- Use timestamp-based conflict resolution
- Log conflicts for monitoring
- Notify user if manual intervention needed
- Preserve both versions in case of critical conflicts

### Data Validation Errors

**Profile Input:**
- Validate all inputs client-side before submission
- Display field-specific error messages
- Prevent form submission with invalid data
- Highlight invalid fields in red

**Activity Data:**
- Validate GPS coordinates are within valid ranges
- Ensure timestamps are sequential
- Verify distance calculations are reasonable
- Reject activities with impossible metrics (e.g., 1000 km/h pace)

### Competition Errors

**Invalid Participants:**
- Validate all participant IDs exist before creating competition
- Handle cases where participants have deleted accounts
- Notify creator if invitations fail to send

**Leaderboard Calculation:**
- Handle edge cases (no activities, tied scores)
- Validate activity timestamps are within competition period
- Recalculate if data inconsistencies detected

### Firebase Errors

**Firestore Errors:**
- Handle permission denied errors
- Retry on temporary failures
- Log quota exceeded errors
- Implement circuit breaker for repeated failures

**Cloud Messaging Errors:**
- Handle invalid device tokens
- Retry failed notification sends
- Log notification delivery failures
- Update device token if expired

## Testing Strategy

### Unit Testing

The testing strategy employs both unit tests and property-based tests to ensure comprehensive coverage:

**Unit Tests** focus on:
- Specific examples of authentication flows (successful login, failed login)
- API endpoint existence and basic responses
- UI component rendering with specific props
- Error handling for known edge cases
- Integration between services

**Property-Based Tests** focus on:
- Universal properties that hold for all inputs
- Data validation across random inputs
- Authorization rules across all user combinations
- Sync behavior across various network conditions
- Competition calculations across random participant data

### Property-Based Testing

We will use **fast-check** (for TypeScript/JavaScript) as the property-based testing library for both frontend and backend code.

**Configuration:**
- Minimum 100 iterations per property test
- Each test tagged with: `Feature: social-fitness-platform, Property {number}: {property_text}`
- Tests should generate realistic random data (valid user IDs, reasonable activity metrics, etc.)

**Example Property Test Structure:**
```typescript
// Feature: social-fitness-platform, Property 3: Activity Cloud Sync
it('should upload any completed activity to Firestore', async () => {
  await fc.assert(
    fc.asyncProperty(
      activityArbitrary(), // Generator for random activities
      async (activity) => {
        const result = await activityService.createActivity(activity);
        const stored = await firestoreService.getActivity(result.id);
        expect(stored).toEqual(activity);
      }
    ),
    { numRuns: 100 }
  );
});
```

### Integration Testing

**API Integration Tests:**
- Test complete request/response cycles
- Verify authentication middleware integration
- Test database operations end-to-end
- Validate error responses

**Mobile App Integration Tests:**
- Test navigation flows
- Verify data persistence
- Test offline/online transitions
- Validate push notification handling

### End-to-End Testing

**Critical User Flows:**
1. Sign up → Onboarding → First activity → View in history
2. Add friend → View friend's activity → React to activity
3. Create competition → Friend joins → Complete activities → View leaderboard → Competition ends
4. Complete activity offline → Go online → Verify sync

### Performance Testing

**Backend Performance:**
- API response times < 200ms for 95th percentile
- Support 1000 concurrent users
- Database query optimization
- Caching strategy for frequently accessed data

**Mobile App Performance:**
- App launch time < 2 seconds
- Smooth 60 FPS animations
- Efficient memory usage
- Battery optimization for background tracking

### Security Testing

**Authentication:**
- Test token expiration handling
- Verify token refresh mechanism
- Test unauthorized access attempts
- Validate OAuth flow security

**Authorization:**
- Test data access boundaries
- Verify privacy settings enforcement
- Test friend-only data access
- Validate competition participant restrictions

**Data Protection:**
- Verify HTTPS enforcement
- Test input sanitization
- Validate Firebase Security Rules
- Test account deletion completeness

## Implementation Notes

### Technology Stack

**Mobile App:**
- React Native with Expo
- TypeScript
- React Navigation
- AsyncStorage for local caching
- Expo Google Sign-In
- Supabase Client SDK (@supabase/supabase-js)

**Backend:**
- Supabase (PostgreSQL database)
- Supabase Auth (Google OAuth)
- Supabase Realtime (real-time subscriptions)
- Supabase Edge Functions (Deno runtime)
- Supabase Storage (file storage)

**Testing:**
- Jest (unit tests)
- fast-check (property-based tests)
- React Native Testing Library (component tests)

### Deployment Architecture

**Backend Deployment:**
- Supabase Cloud (managed PostgreSQL + Auth + Storage + Edge Functions)
- Environment-based configuration (dev, staging, production)
- Built-in logging and monitoring
- Health check endpoints via Edge Functions

**Mobile App Deployment:**
- Expo EAS Build for iOS and Android
- Over-the-air updates for non-native changes
- Staged rollout for major updates
- Crash reporting and analytics

### Database Schema Optimization

**Indexes:**
- `activities`: user_id, created_at (for user activity history)
- `friends`: user1_id, user2_id, status (for friend lookups)
- `competitions`: status, end_date (for active competitions)
- `notifications`: user_id, read, created_at (for notification queries)

**Materialized Views:**
- User activity counts and statistics
- Competition leaderboards (refreshed on activity insert)
- Friend counts per user

### Scalability Considerations

**Caching Strategy:**
- Cache user profiles for 5 minutes
- Cache friend lists for 1 minute
- Cache leaderboards for 30 seconds during active competitions
- Invalidate cache on data updates

**Pagination:**
- Activity feed: 20 items per page
- Activity history: 50 items per page
- Search results: 20 items per page
- Use cursor-based pagination with PostgreSQL LIMIT/OFFSET

**Rate Limiting:**
- Search: 10 requests per minute per user
- Friend requests: 20 per day per user
- Competition creation: 5 per day per user
- API requests: 100 per minute per user

### Migration Strategy

**Phase 1: Supabase Setup**
1. Create Supabase project
2. Set up database schema and RLS policies
3. Configure Google OAuth provider
4. Test authentication flow

**Phase 2: Mobile App Authentication**
1. Install Supabase client SDK
2. Implement Google OAuth sign-in
3. Implement onboarding flow
4. Test authentication flow

**Phase 3: Cloud Sync**
1. Implement activity upload to Supabase
2. Implement sync queue
3. Implement data migration tool
4. Test offline/online transitions

**Phase 4: Social Features**
1. Implement friend system
2. Implement activity feed
3. Implement reactions
4. Test social interactions

**Phase 5: Competitions**
1. Implement competition creation
2. Implement leaderboard
3. Implement notifications via Edge Functions
4. Test competition flows

**Phase 6: Production Launch**
1. Migrate existing users
2. Monitor performance
3. Gather user feedback
4. Iterate on features
