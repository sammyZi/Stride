import { Activity, RoutePoint } from '../../types';
import supabaseService, { DatabaseResult } from '../database/SupabaseService';

/**
 * Database activity record matching the Supabase schema
 */
interface DatabaseActivity {
  id: string;
  user_id: string;
  type: 'walking' | 'running';
  start_time: string;
  end_time: string;
  duration: number;
  distance: number;
  pace: number;
  calories: number;
  route: {
    coordinates: Array<{
      lat: number;
      lng: number;
      timestamp: number;
      accuracy?: number;
      altitude?: number;
    }>;
  };
  is_private: boolean;
  created_at: string;
}

/**
 * Options for creating a new activity
 */
export interface CreateActivityOptions {
  type: 'walking' | 'running';
  startTime: number;
  endTime: number;
  duration: number;
  distance: number;
  pace: number;
  calories: number;
  route: RoutePoint[];
  isPrivate?: boolean;
}

/**
 * Options for querying activities
 */
export interface ActivityQueryOptions {
  limit?: number;
  offset?: number;
  type?: 'walking' | 'running';
  startDate?: Date;
  endDate?: Date;
}

/**
 * SupabaseActivityService handles all activity CRUD operations via Supabase
 * 
 * Features:
 * - Create new activities with GPS route data
 * - Retrieve user's activity history with filtering
 * - Retrieve specific activities by ID
 * - Handle GPS route data as JSONB
 * - Support activity privacy controls
 * 
 * Requirements: 13.4, 13.5, 13.6
 */
class SupabaseActivityService {
  /**
   * Create a new activity in Supabase
   * 
   * @param options Activity data to create
   * @returns The created activity or error
   * 
   * Requirement 13.4: POST /api/activities for creating new activities
   */
  async createActivity(
    options: CreateActivityOptions
  ): Promise<DatabaseResult<Activity>> {
    try {
      // Convert local Activity format to database format
      const dbActivity: Omit<DatabaseActivity, 'id' | 'user_id' | 'created_at'> = {
        type: options.type,
        start_time: new Date(options.startTime).toISOString(),
        end_time: new Date(options.endTime).toISOString(),
        duration: options.duration,
        distance: options.distance,
        pace: options.pace,
        calories: options.calories,
        route: {
          coordinates: options.route.map((point) => ({
            lat: point.latitude,
            lng: point.longitude,
            timestamp: point.timestamp,
            accuracy: point.accuracy,
            altitude: point.altitude,
          })),
        },
        is_private: options.isPrivate ?? false,
      };

      // Insert into Supabase (user_id is automatically set via RLS)
      const result = await supabaseService.executeQuery<DatabaseActivity>(
        async () => {
          const { data, error } = await supabaseService
            .getClient()
            .from('activities')
            .insert(dbActivity)
            .select()
            .single();

          return { data, error };
        }
      );

      if (result.error || !result.data) {
        return { data: null, error: result.error };
      }

      // Convert database format back to local Activity format
      const activity = this.convertToActivity(result.data);
      return { data: activity, error: null };
    } catch (error) {
      console.error('Error creating activity:', error);
      return {
        data: null,
        error: new Error(
          error instanceof Error ? error.message : 'Failed to create activity'
        ),
      };
    }
  }

  /**
   * Retrieve user's activity history from Supabase
   * 
   * @param options Query options for filtering and pagination
   * @returns Array of activities or error
   * 
   * Requirement 13.5: GET /api/activities for retrieving user's activity history
   */
  async getActivities(
    options: ActivityQueryOptions = {}
  ): Promise<DatabaseResult<Activity[]>> {
    try {
      const result = await supabaseService.executeQuery<DatabaseActivity[]>(
        async () => {
          let query = supabaseService
            .getClient()
            .from('activities')
            .select('*')
            .order('created_at', { ascending: false });

          // Apply filters
          if (options.type) {
            query = query.eq('type', options.type);
          }

          if (options.startDate) {
            query = query.gte('start_time', options.startDate.toISOString());
          }

          if (options.endDate) {
            query = query.lte('end_time', options.endDate.toISOString());
          }

          // Apply pagination
          if (options.limit) {
            query = query.limit(options.limit);
          }

          if (options.offset) {
            query = query.range(
              options.offset,
              options.offset + (options.limit || 50) - 1
            );
          }

          const { data, error } = await query;
          return { data, error };
        }
      );

      if (result.error || !result.data) {
        return { data: null, error: result.error };
      }

      // Convert all activities to local format
      const activities = result.data.map((dbActivity) =>
        this.convertToActivity(dbActivity)
      );

      return { data: activities, error: null };
    } catch (error) {
      console.error('Error fetching activities:', error);
      return {
        data: null,
        error: new Error(
          error instanceof Error ? error.message : 'Failed to fetch activities'
        ),
      };
    }
  }

  /**
   * Retrieve a specific activity by ID from Supabase
   * 
   * @param activityId The ID of the activity to retrieve
   * @returns The activity or error
   * 
   * Requirement 13.6: GET /api/activities/:id for retrieving a specific activity
   */
  async getActivityById(activityId: string): Promise<DatabaseResult<Activity>> {
    try {
      const result = await supabaseService.executeQuery<DatabaseActivity>(
        async () => {
          const { data, error } = await supabaseService
            .getClient()
            .from('activities')
            .select('*')
            .eq('id', activityId)
            .single();

          return { data, error };
        }
      );

      if (result.error || !result.data) {
        return { data: null, error: result.error };
      }

      const activity = this.convertToActivity(result.data);
      return { data: activity, error: null };
    } catch (error) {
      console.error('Error fetching activity:', error);
      return {
        data: null,
        error: new Error(
          error instanceof Error ? error.message : 'Failed to fetch activity'
        ),
      };
    }
  }

  /**
   * Update an existing activity's privacy setting
   * 
   * @param activityId The ID of the activity to update
   * @param isPrivate Whether the activity should be private
   * @returns The updated activity or error
   */
  async updateActivityPrivacy(
    activityId: string,
    isPrivate: boolean
  ): Promise<DatabaseResult<Activity>> {
    try {
      const result = await supabaseService.executeQuery<DatabaseActivity>(
        async () => {
          const { data, error } = await supabaseService
            .getClient()
            .from('activities')
            .update({ is_private: isPrivate })
            .eq('id', activityId)
            .select()
            .single();

          return { data, error };
        }
      );

      if (result.error || !result.data) {
        return { data: null, error: result.error };
      }

      const activity = this.convertToActivity(result.data);
      return { data: activity, error: null };
    } catch (error) {
      console.error('Error updating activity privacy:', error);
      return {
        data: null,
        error: new Error(
          error instanceof Error
            ? error.message
            : 'Failed to update activity privacy'
        ),
      };
    }
  }

  /**
   * Delete an activity from Supabase
   * 
   * @param activityId The ID of the activity to delete
   * @returns Success status or error
   */
  async deleteActivity(activityId: string): Promise<DatabaseResult<boolean>> {
    try {
      const result = await supabaseService.executeQuery<null>(async () => {
        const { error } = await supabaseService
          .getClient()
          .from('activities')
          .delete()
          .eq('id', activityId);

        return { data: null, error };
      });

      if (result.error) {
        return { data: null, error: result.error };
      }

      return { data: true, error: null };
    } catch (error) {
      console.error('Error deleting activity:', error);
      return {
        data: null,
        error: new Error(
          error instanceof Error ? error.message : 'Failed to delete activity'
        ),
      };
    }
  }

  /**
   * Convert database activity format to local Activity type
   * 
   * @param dbActivity Database activity record
   * @returns Local Activity object
   */
  private convertToActivity(dbActivity: DatabaseActivity): Activity {
    return {
      id: dbActivity.id,
      type: dbActivity.type,
      startTime: new Date(dbActivity.start_time).getTime(),
      endTime: new Date(dbActivity.end_time).getTime(),
      duration: dbActivity.duration,
      distance: dbActivity.distance,
      steps: 0, // Steps not stored in database yet
      route: dbActivity.route.coordinates.map((coord) => ({
        latitude: coord.lat,
        longitude: coord.lng,
        timestamp: coord.timestamp,
        accuracy: coord.accuracy || 0,
        altitude: coord.altitude,
      })),
      averagePace: dbActivity.pace,
      maxPace: dbActivity.pace, // Max pace not stored separately yet
      calories: dbActivity.calories,
      elevationGain: undefined, // Elevation gain not calculated yet
      status: 'completed',
      createdAt: new Date(dbActivity.created_at).getTime(),
    };
  }
}

const supabaseActivityService = new SupabaseActivityService();
export default supabaseActivityService;
