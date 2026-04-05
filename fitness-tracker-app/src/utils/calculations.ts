/**
 * Calculation Utilities
 * 
 * Core calculation functions for fitness tracking:
 * - Distance calculations using Haversine formula
 * - Pace calculations (min/km and min/mile)
 * - Calorie estimation
 * - Unit conversions (metric/imperial)
 */

import { ActivityType, RoutePoint, Location } from '@/types';

/**
 * Calculate distance between two coordinates using Haversine formula
 * 
 * @param lat1 - Latitude of first point in degrees
 * @param lon1 - Longitude of first point in degrees
 * @param lat2 - Latitude of second point in degrees
 * @param lon2 - Longitude of second point in degrees
 * @returns Distance in meters
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180; // Convert to radians
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

/**
 * Calculate total distance from a route of points
 * 
 * @param route - Array of route points
 * @returns Total distance in meters
 */
export function calculateRouteDistance(route: RoutePoint[] | Location[]): number {
  if (route.length < 2) {
    return 0;
  }

  let totalDistance = 0;

  for (let i = 1; i < route.length; i++) {
    const prev = route[i - 1];
    const curr = route[i];
    
    totalDistance += calculateDistance(
      prev.latitude,
      prev.longitude,
      curr.latitude,
      curr.longitude
    );
  }

  return totalDistance;
}

/**
 * Calculate pace in seconds per kilometer
 * Returns 0 for invalid or extreme values
 * 
 * @param distance - Distance in meters
 * @param duration - Duration in seconds
 * @returns Pace in seconds per kilometer (0 if distance is 0 or pace is unrealistic)
 */
export function calculatePace(distance: number, duration: number): number {
  if (distance <= 0 || duration <= 0) {
    return 0;
  }

  const distanceInKm = distance / 1000;
  const pace = duration / distanceInKm; // seconds per km

  // Filter out unrealistic pace values
  // Fastest human pace: ~1:30/km (90 sec/km) — elite sprinters in short bursts
  // Slowest reasonable pace: ~60:00/km (3600 sec/km) — very slow walk
  if (pace < 90 || pace > 3600 || !isFinite(pace)) {
    return 0;
  }

  return pace;
}

/**
 * Calculate pace in seconds per mile
 * Returns 0 for invalid or extreme values
 * 
 * @param distance - Distance in meters
 * @param duration - Duration in seconds
 * @returns Pace in seconds per mile (0 if distance is 0 or pace is unrealistic)
 */
export function calculatePacePerMile(distance: number, duration: number): number {
  if (distance <= 0 || duration <= 0) {
    return 0;
  }

  const distanceInMiles = metersToMiles(distance);
  const pace = duration / distanceInMiles; // seconds per mile

  // Filter out unrealistic pace values
  // Fastest human pace: ~2:25/mi (145 sec/mi) — elite sprinters
  // Slowest reasonable pace: ~96:00/mi (5800 sec/mi) — very slow walk
  if (pace < 145 || pace > 5800 || !isFinite(pace)) {
    return 0;
  }

  return pace;
}

/**
 * Calculate speed in km/h
 * 
 * @param distance - Distance in meters
 * @param duration - Duration in seconds
 * @returns Speed in km/h
 */
export function calculateSpeed(distance: number, duration: number): number {
  if (duration === 0) {
    return 0;
  }

  const distanceInKm = distance / 1000;
  const durationInHours = duration / 3600;
  return distanceInKm / durationInHours;
}

/**
 * Calculate estimated calories burned
 * 
 * Uses pace-based MET calculation for more accurate results
 * 
 * Formula: Calories = MET × weight(kg) × duration(hours)
 * 
 * @param distance - Distance in meters
 * @param duration - Duration in seconds
 * @param weight - User weight in kg
 * @param activityType - Type of activity (not used, kept for compatibility)
 * @returns Estimated calories burned
 */
export function calculateCalories(
  distance: number,
  duration: number,
  weight: number,
  activityType: ActivityType
): number {
  // Use pace-based calculation for better accuracy
  return calculateCaloriesWithPace(distance, duration, weight, activityType);
}

/**
 * Calculate estimated calories with pace adjustment
 * More accurate calculation that considers pace/intensity
 * 
 * @param distance - Distance in meters
 * @param duration - Duration in seconds
 * @param weight - User weight in kg
 * @param activityType - Type of activity (not used, kept for compatibility)
 * @returns Estimated calories burned
 */
export function calculateCaloriesWithPace(
  distance: number,
  duration: number,
  weight: number,
  activityType: ActivityType
): number {
  if (duration === 0 || weight === 0 || distance === 0) {
    return 0;
  }

  const speed = calculateSpeed(distance, duration); // km/h

  let met: number;

  // Automatically determine activity intensity based on speed
  if (speed < 3.2) {
    met = 2.5; // Slow walking
  } else if (speed < 4.8) {
    met = 3.5; // Moderate walking
  } else if (speed < 6.4) {
    met = 5.0; // Brisk walking
  } else if (speed < 8) {
    met = 7.0; // Very brisk walking / light jogging
  } else if (speed < 10) {
    met = 9.8; // Running (moderate)
  } else if (speed < 12) {
    met = 11.5; // Running (fast)
  } else {
    met = 13.5; // Running (very fast)
  }

  const durationInHours = duration / 3600;
  const calories = met * weight * durationInHours;

  return Math.round(calories);
}

// ============================================================================
// Unit Conversion Functions
// ============================================================================

/**
 * Convert meters to kilometers
 */
export function metersToKilometers(meters: number): number {
  return meters / 1000;
}

/**
 * Convert meters to miles
 */
export function metersToMiles(meters: number): number {
  return meters / 1609.34;
}

/**
 * Convert kilometers to meters
 */
export function kilometersToMeters(km: number): number {
  return km * 1000;
}

/**
 * Convert miles to meters
 */
export function milesToMeters(miles: number): number {
  return miles * 1609.34;
}

/**
 * Convert kilometers to miles
 */
export function kilometersToMiles(km: number): number {
  return km * 0.621371;
}

/**
 * Convert miles to kilometers
 */
export function milesToKilometers(miles: number): number {
  return miles * 1.60934;
}

/**
 * Convert kilograms to pounds
 */
export function kilogramsToPounds(kg: number): number {
  return kg * 2.20462;
}

/**
 * Convert pounds to kilograms
 */
export function poundsToKilograms(lbs: number): number {
  return lbs / 2.20462;
}

/**
 * Convert centimeters to feet and inches
 */
export function centimetersToFeetInches(cm: number): { feet: number; inches: number } {
  const totalInches = cm / 2.54;
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches % 12);
  return { feet, inches };
}

/**
 * Convert feet and inches to centimeters
 */
export function feetInchesToCentimeters(feet: number, inches: number): number {
  const totalInches = feet * 12 + inches;
  return totalInches * 2.54;
}

/**
 * Convert meters per second to kilometers per hour
 */
export function metersPerSecondToKmPerHour(mps: number): number {
  return mps * 3.6;
}

/**
 * Convert meters per second to miles per hour
 */
export function metersPerSecondToMilesPerHour(mps: number): number {
  return mps * 2.23694;
}
