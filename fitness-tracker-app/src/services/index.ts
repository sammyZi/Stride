/**
 * Service exports
 * Export all services from this file
 */

export { default as StorageService } from './storage/StorageService';
export { default as locationService } from './location';
export type { LocationUpdateCallback } from './location';
export { default as ActivityService } from './activity';
export { default as StepCounterService } from './stepCounter';
export type { StepUpdateCallback } from './stepCounter';
export { default as NotificationService } from './notification';
export { default as AudioAnnouncementService } from './audio';
export { default as HapticFeedbackService } from './haptic';
export { default as PersonalRecordsService } from './personalRecords';
export { default as SharingService } from './sharing/SharingService';
export { default as BatteryOptimizationService } from './battery/BatteryOptimizationService';
export { profileService } from './profile';
export type { UserProfile, ProfileUpdateData, ProfileCreateData } from './profile';

// Services will be exported here as they are created
// export { FirebaseService } from './firebase/FirebaseService';
// etc.
