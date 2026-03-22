import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../config/supabase';

/**
 * Storage keys for authentication data
 */
const STORAGE_KEYS = {
  AUTH_TOKEN: '@fitness_tracker:auth_token',
  USER_DATA: '@fitness_tracker:user_data',
  REFRESH_TOKEN: '@fitness_tracker:refresh_token',
};

/**
 * User data structure
 */
export interface User {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  isNewUser?: boolean;
}

/**
 * Authentication result
 */
export interface AuthResult {
  user: User;
  token: string;
  isNewUser: boolean;
}

/**
 * AuthService handles all authentication operations using Supabase
 */
class AuthService {
  private authStateListeners: Set<(user: User | null) => void> = new Set();
  private currentUser: User | null = null;

  constructor() {
    this.loadStoredUser();
    this.setupAuthListener();
  }

  /**
   * Setup Supabase auth state listener
   */
  private setupAuthListener(): void {
    supabase.auth.onAuthStateChange(async (_event: string, session: any) => {
      if (session?.user) {
        const user = await this.mapSupabaseUser(session.user);
        this.currentUser = user;
        await this.storeAuthData(user, session.access_token);
        this.notifyAuthStateChange(user);
      } else {
        this.currentUser = null;
        await this.clearAuthData();
        this.notifyAuthStateChange(null);
      }
    });
  }

  /**
   * Map Supabase user to app User format
   */
  private async mapSupabaseUser(supabaseUser: any): Promise<User> {
    return {
      id: supabaseUser.id,
      email: supabaseUser.email || '',
      displayName: supabaseUser.user_metadata?.full_name || supabaseUser.email?.split('@')[0] || 'User',
      photoURL: supabaseUser.user_metadata?.avatar_url,
    };
  }

  /**
   * Load stored user data on initialization
   */
  private async loadStoredUser(): Promise<void> {
    try {
      const storedUser = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
      if (storedUser) {
        this.currentUser = JSON.parse(storedUser);
      }
    } catch (error) {
      console.error('Error loading stored user:', error);
    }
  }

  /**
   * Sign in with Google OAuth using Supabase
   * @param idToken Google ID token
   */
  async signInWithGoogle(idToken: string): Promise<AuthResult> {
    try {
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: idToken,
      });

      if (error) throw error;
      if (!data.user || !data.session) throw new Error('No user data returned');

      const user = await this.mapSupabaseUser(data.user);
      const isNewUser = data.user.created_at === data.user.last_sign_in_at;

      await this.storeAuthData(user, data.session.access_token);
      this.currentUser = { ...user, isNewUser };
      this.notifyAuthStateChange(this.currentUser);

      return {
        user: this.currentUser,
        token: data.session.access_token,
        isNewUser,
      };
    } catch (error) {
      console.error('Google sign-in error:', error);
      throw new Error('Failed to sign in with Google');
    }
  }

  /**
   * Sign in with Google OAuth - handled by SignInScreen
   * This method is called after successful Google authentication
   * @param user User data
   * @param token Access token
   */
  async setAuthenticatedUser(user: User, token: string): Promise<void> {
    try {
      await this.storeAuthData(user, token);
      this.currentUser = user;
      this.notifyAuthStateChange(user);
    } catch (error) {
      console.error('Error setting authenticated user:', error);
      throw new Error('Failed to store authentication data');
    }
  }

  /**
   * Sign out the current user
   */
  async signOut(): Promise<void> {
    try {
      await supabase.auth.signOut();
      await this.clearAuthData();
      this.currentUser = null;
      this.notifyAuthStateChange(null);
    } catch (error) {
      console.error('Sign-out error:', error);
      throw new Error('Failed to sign out');
    }
  }

  /**
   * Get the current authenticated user
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      if (this.currentUser) {
        return this.currentUser;
      }

      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        this.currentUser = await this.mapSupabaseUser(user);
        return this.currentUser;
      }

      const storedUser = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
      if (storedUser) {
        this.currentUser = JSON.parse(storedUser);
        return this.currentUser;
      }

      return null;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  /**
   * Refresh the authentication token
   */
  async refreshToken(): Promise<string> {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) throw error;
      if (!data.session) throw new Error('No session returned');

      await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, data.session.access_token);
      return data.session.access_token;
    } catch (error) {
      console.error('Token refresh error:', error);
      throw new Error('Failed to refresh token');
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  /**
   * Get the current authentication token
   */
  async getToken(): Promise<string | null> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      return session?.access_token || null;
    } catch (error) {
      console.error('Error getting token:', error);
      return null;
    }
  }

  /**
   * Listen to authentication state changes
   */
  onAuthStateChanged(callback: (user: User | null) => void): () => void {
    this.authStateListeners.add(callback);
    callback(this.currentUser);

    return () => {
      this.authStateListeners.delete(callback);
    };
  }

  /**
   * Notify all listeners of auth state change
   */
  private notifyAuthStateChange(user: User | null): void {
    this.authStateListeners.forEach(listener => {
      try {
        listener(user);
      } catch (error) {
        console.error('Error in auth state listener:', error);
      }
    });
  }

  /**
   * Store authentication data in AsyncStorage
   */
  private async storeAuthData(user: User, token: string): Promise<void> {
    try {
      await AsyncStorage.multiSet([
        [STORAGE_KEYS.USER_DATA, JSON.stringify(user)],
        [STORAGE_KEYS.AUTH_TOKEN, token],
      ]);
    } catch (error) {
      console.error('Error storing auth data:', error);
      throw new Error('Failed to store authentication data');
    }
  }

  /**
   * Clear all authentication data from AsyncStorage
   */
  private async clearAuthData(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.USER_DATA,
        STORAGE_KEYS.AUTH_TOKEN,
        STORAGE_KEYS.REFRESH_TOKEN,
      ]);
    } catch (error) {
      console.error('Error clearing auth data:', error);
    }
  }
}

const authService = new AuthService();
export default authService;
