import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';

/**
 * User profile data structure
 */
export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  photoUrl?: string;
  age?: number;
  weight: number;
  weightUnit: 'kg' | 'lbs';
  height?: number;
  heightUnit?: 'cm' | 'ft';
  gender?: 'male' | 'female' | 'other';
  showAge: boolean;
  showWeight: boolean;
  showHeight: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Profile update data (partial update)
 */
export interface ProfileUpdateData {
  displayName?: string;
  age?: number;
  weight?: number;
  weightUnit?: 'kg' | 'lbs';
  height?: number;
  heightUnit?: 'cm' | 'ft';
  gender?: 'male' | 'female' | 'other';
  showAge?: boolean;
  showWeight?: boolean;
  showHeight?: boolean;
}

/**
 * Profile creation data (for onboarding)
 */
export interface ProfileCreateData {
  id: string;
  email: string;
  displayName: string;
  age: number;
  weight: number;
  weightUnit: 'kg' | 'lbs';
  height?: number;
  heightUnit?: 'cm' | 'ft';
  gender?: 'male' | 'female' | 'other';
  photoUrl?: string;
}

/**
 * ProfileService handles all user profile operations using local storage
 * 
 * Features:
 * - Get user profile
 * - Update user profile
 * - Manage profile photos locally
 * - Manage privacy settings
 */
class ProfileService {
  private readonly PROFILE_KEY = '@fitness_tracker:user_profile';
  private readonly PHOTO_DIR = `${FileSystem.documentDirectory}profile_photos/`;

  /**
   * Get the current user's profile
   * 
   * @returns User profile or null if not found
   */
  async getProfile(): Promise<UserProfile | null> {
    try {
      const profileJson = await AsyncStorage.getItem(this.PROFILE_KEY);
      if (!profileJson) {
        return null;
      }
      return JSON.parse(profileJson);
    } catch (error) {
      console.error('Error getting profile:', error);
      throw new Error('Failed to get user profile');
    }
  }

  /**
   * Create a new user profile (used during onboarding)
   * 
   * @param profileData Profile creation data
   * @returns Created user profile
   */
  async createProfile(profileData: ProfileCreateData): Promise<UserProfile> {
    try {
      const profile: UserProfile = {
        ...profileData,
        showAge: true,
        showWeight: true,
        showHeight: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await AsyncStorage.setItem(this.PROFILE_KEY, JSON.stringify(profile));
      return profile;
    } catch (error) {
      console.error('Error creating profile:', error);
      throw new Error('Failed to create user profile');
    }
  }

  /**
   * Update the current user's profile
   * 
   * @param updates Partial profile data to update
   * @returns Updated user profile
   */
  async updateProfile(updates: ProfileUpdateData): Promise<UserProfile> {
    try {
      const currentProfile = await this.getProfile();
      
      if (!currentProfile) {
        throw new Error('No profile found');
      }

      const updatedProfile: UserProfile = {
        ...currentProfile,
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      await AsyncStorage.setItem(this.PROFILE_KEY, JSON.stringify(updatedProfile));
      return updatedProfile;
    } catch (error) {
      console.error('Error updating profile:', error);
      throw new Error('Failed to update user profile');
    }
  }

  /**
   * Upload a profile photo locally
   * 
   * @param localUri Local file URI of the photo
   * @returns Local path of the saved photo
   */
  async uploadProfilePhoto(localUri: string): Promise<string> {
    try {
      // Ensure photo directory exists
      const dirInfo = await FileSystem.getInfoAsync(this.PHOTO_DIR);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(this.PHOTO_DIR, { intermediates: true });
      }

      // Get file extension
      const fileExt = localUri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `profile.${fileExt}`;
      const newPath = `${this.PHOTO_DIR}${fileName}`;

      // Copy file to app directory
      await FileSystem.copyAsync({
        from: localUri,
        to: newPath,
      });

      // Update profile with new photo path
      const currentProfile = await this.getProfile();
      if (currentProfile) {
        await this.updateProfile({ photoUrl: newPath } as ProfileUpdateData);
      }

      return newPath;
    } catch (error) {
      console.error('Error uploading profile photo:', error);
      throw new Error('Failed to upload profile photo');
    }
  }

  /**
   * Delete the current user's profile photo
   */
  async deleteProfilePhoto(): Promise<void> {
    try {
      const profile = await this.getProfile();
      if (!profile?.photoUrl) {
        return;
      }

      // Delete file if it exists
      const fileInfo = await FileSystem.getInfoAsync(profile.photoUrl);
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(profile.photoUrl);
      }

      // Update profile to remove photo URL
      await this.updateProfile({ photoUrl: undefined } as ProfileUpdateData);
    } catch (error) {
      console.error('Error deleting profile photo:', error);
      throw new Error('Failed to delete profile photo');
    }
  }

  /**
   * Update privacy settings
   * 
   * @param settings Privacy settings to update
   * @returns Updated user profile
   */
  async updatePrivacySettings(settings: {
    showAge?: boolean;
    showWeight?: boolean;
    showHeight?: boolean;
  }): Promise<UserProfile> {
    return this.updateProfile(settings);
  }
}

const profileService = new ProfileService();
export default profileService;
