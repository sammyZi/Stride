/**
 * Core TypeScript type definitions for the Fitness Tracker App
 */

export type ActivityType = 'activity';
export type ActivityStatus = 'active' | 'paused' | 'completed';
export type SyncStatus = 'synced' | 'pending' | 'failed';
export type UnitSystem = 'metric' | 'imperial';
export type MapType = 'standard' | 'satellite' | 'hybrid';
export type Theme = 'light' | 'dark' | 'auto';
export type AutoPauseSensitivity = 'low' | 'medium' | 'high';
export type GoalType = 'distance' | 'frequency' | 'duration';
export type GoalPeriod = 'weekly' | 'monthly';
export type StatsPeriod = 'week' | 'month' | 'allTime';
export type AccuracyQuality = 'excellent' | 'good' | 'fair' | 'poor';

export interface Location {
  latitude: number;
  longitude: number;
  altitude: number | null;
  accuracy: number;
  timestamp: number;
  speed: number | null;
  heading: number | null;
}

export interface RoutePoint {
  latitude: number;
  longitude: number;
  altitude?: number;
  timestamp: number;
  accuracy: number;
}

export interface Activity {
  id: string;
  type: ActivityType;
  startTime: number;
  endTime: number;
  duration: number;  // in seconds
  distance: number;  // in meters
  steps: number;
  route: RoutePoint[];
  averagePace: number;  // in seconds per km
  maxPace: number;
  calories: number;
  elevationGain?: number;
  status: 'completed';  // Only completed activities are stored
  createdAt: number;
}

export interface ActivityMetrics {
  currentPace: number;
  averagePace: number;
  distance: number;
  duration: number;
  steps: number;
  calories: number;
}

export interface UserProfile {
  id: string;
  name: string;
  profilePictureUri?: string;  // Local file URI for local storage
  weight?: number;  // in kg
  height?: number;  // in cm
  createdAt: number;
  updatedAt: number;
}

export interface UserSettings {
  units: UnitSystem;
  audioAnnouncements: boolean;
  announcementInterval: number;  // in meters
  autoPause: boolean;
  autoPauseSensitivity: AutoPauseSensitivity;
  mapType: MapType;
  theme: Theme;
  hapticFeedback: boolean;
}

export interface Goal {
  id: string;
  type: GoalType;
  target: number;
  period: GoalPeriod;
  startDate: number;
  endDate: number;
  progress: number;
  achieved: boolean;
  createdAt: number;
}

export interface Statistics {
  period: StatsPeriod;
  totalDistance: number;
  totalDuration: number;
  totalActivities: number;
  totalSteps: number;
  totalCalories: number;
  averagePace: number;
  personalRecords: PersonalRecords;
}

export interface PersonalRecords {
  longestDistance: ActivityRecord;
  fastestPace: ActivityRecord;
  longestDuration: ActivityRecord;
  mostSteps: ActivityRecord;
}

export interface ActivityRecord {
  value: number;
  activityId: string;
  date: number;
}

export interface AccuracyStatus {
  current: number;
  quality: AccuracyQuality;
  gpsSignalStrength: number;
}

export interface ActivityFilters {
  startDate?: number;
  endDate?: number;
  type?: ActivityType;
  limit?: number;
}
