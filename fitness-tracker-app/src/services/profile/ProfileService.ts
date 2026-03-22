import { supabase } from '../../config/supabase';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';

/**
 * User profile data structure matching the database schema
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
 * ProfileService handles all user profile operations via Supabase
 * 
 * Features:
 * - Get user profile (Requirement 13.2)
 * - Update user profile (Requirement 13.3)
 * - Upload profile photos to Supabase Storage
 * - Manage privacy settings (showAge, showWeight, showHeight)
 */
class ProfileService {
  private readonly STORAGE_BUCKET = 'profile-photos';

  /**
   * Get the current user's profile
   * Implements: GET /api/user/profile (Requirement 13.2)
   * 
   * @returns User profile or null if not found
   * @throws Error if database query fails
   */
  async getProfile(): Promise<UserProfile | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('No authenticated user');
      }

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned - profile doesn't exist yet
          return null;
        }
        throw error;
      }

      return this.mapDatabaseToProfile(data);
    } catch (error) {
      console.error('Error getting profile:', error);
      throw new Error('Failed to get user profile');
    }
  }

  /**
   * Create a new user profile (used during onboarding)
   * Implements: POST /api/user/profile
   * 
   * @param profileData Profile creation data
   * @returns Created user profile
   * @throws Error if profile creation fails
   */
  async createProfile(profileData: ProfileCreateData): Promise<UserProfile> {
    try {
      const { data, error } = await supabase
        .from('users')
        .insert({
          id: profileData.id,
          email: profileData.email,
          display_name: profileData.displayName,
          photo_url: profileData.photoUrl,
          age: profileData.age,
          weight: profileData.weight,
          weight_unit: profileData.weightUnit,
          height: profileData.height,
          height_unit: profileData.heightUnit,
          gender: profileData.gender,
          show_age: true,
          show_weight: true,
          show_height: true,
        })
        .select()
        .single();

      if (error) throw error;

      return this.mapDatabaseToProfile(data);
    } catch (error) {
      console.error('Error creating profile:', error);
      throw new Error('Failed to create user profile');
    }
  }

  /**
   * Update the current user's profile
   * Implements: PUT /api/user/profile (Requirement 13.3)
   * 
   * @param updates Partial profile data to update
   * @returns Updated user profile
   * @throws Error if update fails
   */
  async updateProfile(updates: ProfileUpdateData): Promise<UserProfile> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('No authenticated user');
      }

      // Map camelCase to snake_case for database
      const dbUpdates: any = {};
      if (updates.displayName !== undefined) dbUpdates.display_name = updates.displayName;
      if (updates.age !== undefined) dbUpdates.age = updates.age;
      if (updates.weight !== undefined) dbUpdates.weight = updates.weight;
      if (updates.weightUnit !== undefined) dbUpdates.weight_unit = updates.weightUnit;
      if (updates.height !== undefined) dbUpdates.height = updates.height;
      if (updates.heightUnit !== undefined) dbUpdates.height_unit = updates.heightUnit;
      if (updates.gender !== undefined) dbUpdates.gender = updates.gender;
      if (updates.showAge !== undefined) dbUpdates.show_age = updates.showAge;
      if (updates.showWeight !== undefined) dbUpdates.show_weight = updates.showWeight;
      if (updates.showHeight !== undefined) dbUpdates.show_height = updates.showHeight;

      const { data, error } = await supabase
        .from('users')
        .update(dbUpdates)
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;

      return this.mapDatabaseToProfile(data);
    } catch (error) {
      console.error('Error updating profile:', error);
      throw new Error('Failed to update user profile');
    }
  }

  /**
   * Upload a profile photo to Supabase Storage
   * 
   * @param localUri Local file URI of the photo
   * @returns Public URL of the uploaded photo
   * @throws Error if upload fails
   */
  async uploadProfilePhoto(localUri: string): Promise<string> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('No authenticated user');
      }

      // Read the file as base64
      const base64 = await FileSystem.readAsStringAsync(localUri, {
        encoding: 'base64',
      });

      // Get file extension
      const fileExt = localUri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${user.id}/profile.${fileExt}`;

      // Convert base64 to ArrayBuffer
      const arrayBuffer = decode(base64);

      // Upload to Supabase Storage
      const { error } = await supabase.storage
        .from(this.STORAGE_BUCKET)
        .upload(fileName, arrayBuffer, {
          contentType: `image/${fileExt}`,
          upsert: true, // Replace existing file
        });

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(this.STORAGE_BUCKET)
        .getPublicUrl(fileName);

      // Update profile with new photo URL
      await this.updateProfile({ displayName: undefined }); // Trigger update to set photo_url
      await supabase
        .from('users')
        .update({ photo_url: publicUrl })
        .eq('id', user.id);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading profile photo:', error);
      throw new Error('Failed to upload profile photo');
    }
  }

  /**
   * Delete the current user's profile photo
   * 
   * @throws Error if deletion fails
   */
  async deleteProfilePhoto(): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('No authenticated user');
      }

      // Get current profile to find photo URL
      const profile = await this.getProfile();
      if (!profile?.photoUrl) {
        return; // No photo to delete
      }

      // Extract file path from URL
      const urlParts = profile.photoUrl.split('/');
      const fileName = `${user.id}/${urlParts[urlParts.length - 1]}`;

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from(this.STORAGE_BUCKET)
        .remove([fileName]);

      if (storageError) {
        console.error('Error deleting from storage:', storageError);
      }

      // Update profile to remove photo URL
      await supabase
        .from('users')
        .update({ photo_url: null })
        .eq('id', user.id);
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

  /**
   * Map database row to UserProfile interface
   * Converts snake_case to camelCase
   */
  private mapDatabaseToProfile(data: any): UserProfile {
    return {
      id: data.id,
      email: data.email,
      displayName: data.display_name,
      photoUrl: data.photo_url,
      age: data.age,
      weight: data.weight,
      weightUnit: data.weight_unit,
      height: data.height,
      heightUnit: data.height_unit,
      gender: data.gender,
      showAge: data.show_age,
      showWeight: data.show_weight,
      showHeight: data.show_height,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }
}

const profileService = new ProfileService();
export default profileService;
