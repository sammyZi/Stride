import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Supabase configuration for the mobile app
 */
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase configuration. Please check your environment variables.');
}

/**
 * Custom storage adapter for Supabase using AsyncStorage
 * This ensures authentication tokens are properly persisted
 */
const supabaseStorage = {
  getItem: async (key: string) => {
    try {
      return await AsyncStorage.getItem(key);
    } catch (error) {
      console.error('Error getting item from storage:', error);
      return null;
    }
  },
  setItem: async (key: string, value: string) => {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      console.error('Error setting item in storage:', error);
    }
  },
  removeItem: async (key: string) => {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('Error removing item from storage:', error);
    }
  },
};

/**
 * Supabase client instance with proper authentication configuration
 * 
 * Key features:
 * - Automatic token refresh when tokens expire
 * - Session persistence using AsyncStorage
 * - User context automatically added to all requests via JWT
 * - RLS policies enforced at database level using auth.uid()
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: supabaseStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    // Token will be automatically included in all requests
    // RLS policies use auth.uid() to access the user context
  },
  global: {
    headers: {
      'X-Client-Info': 'fitness-tracker-mobile',
    },
  },
});

export default supabase;
