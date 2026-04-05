/**
 * Formatting Utilities
 * 
 * Functions for formatting values for display:
 * - Distance formatting (metric/imperial)
 * - Pace formatting (min/km or min/mile)
 * - Duration formatting (HH:MM:SS)
 * - Time formatting
 */

import { UnitSystem } from '@/types';
import { metersToKilometers, metersToMiles } from './calculations';

/**
 * Format distance for display
 * 
 * @param meters - Distance in meters
 * @param units - Unit system (metric or imperial)
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted distance string with unit
 */
export function formatDistance(
  meters: number,
  units: UnitSystem = 'metric',
  decimals: number = 2
): string {
  if (units === 'metric') {
    const km = metersToKilometers(meters);
    
    // Show meters for distances less than 1km
    if (km < 1) {
      return `${Math.round(meters)} m`;
    }
    
    return `${km.toFixed(decimals)} km`;
  } else {
    const miles = metersToMiles(meters);
    
    // Show feet for distances less than 0.1 miles
    if (miles < 0.1) {
      const feet = meters * 3.28084;
      return `${Math.round(feet)} ft`;
    }
    
    return `${miles.toFixed(decimals)} mi`;
  }
}

/**
 * Format distance value only (without unit)
 * 
 * @param meters - Distance in meters
 * @param units - Unit system (metric or imperial)
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted distance value
 */
export function formatDistanceValue(
  meters: number,
  units: UnitSystem = 'metric',
  decimals: number = 2
): string {
  if (units === 'metric') {
    const km = metersToKilometers(meters);
    return km.toFixed(decimals);
  } else {
    const miles = metersToMiles(meters);
    return miles.toFixed(decimals);
  }
}

/**
 * Get distance unit label
 * 
 * @param units - Unit system (metric or imperial)
 * @returns Unit label (km or mi)
 */
export function getDistanceUnit(units: UnitSystem = 'metric'): string {
  return units === 'metric' ? 'km' : 'mi';
}

/**
 * Format pace for display (min/km or min/mile)
 * 
 * @param secondsPerKm - Pace in seconds per kilometer
 * @param units - Unit system (metric or imperial)
 * @returns Formatted pace string (e.g., "5:30 /km" or "8:52 /mi")
 */
export function formatPace(
  secondsPerKm: number,
  units: UnitSystem = 'metric'
): string {
  if (secondsPerKm <= 0 || !isFinite(secondsPerKm) || secondsPerKm > 3600) {
    return units === 'metric' ? '--:-- /km' : '--:-- /mi';
  }

  // Convert to seconds per mile if imperial
  let secondsPerUnit = secondsPerKm;
  if (units === 'imperial') {
    secondsPerUnit = secondsPerKm * 1.60934; // Convert km pace to mile pace
  }

  const minutes = Math.floor(secondsPerUnit / 60);
  const seconds = Math.floor(secondsPerUnit % 60);

  const unit = units === 'metric' ? '/km' : '/mi';
  return `${minutes}:${seconds.toString().padStart(2, '0')} ${unit}`;
}

/**
 * Format pace value only (without unit)
 * 
 * @param secondsPerKm - Pace in seconds per kilometer
 * @param units - Unit system (metric or imperial)
 * @returns Formatted pace value (e.g., "5:30")
 */
export function formatPaceValue(
  secondsPerKm: number,
  units: UnitSystem = 'metric'
): string {
  if (secondsPerKm <= 0 || !isFinite(secondsPerKm) || secondsPerKm > 3600) {
    return '--:--';
  }

  // Convert to seconds per mile if imperial
  let secondsPerUnit = secondsPerKm;
  if (units === 'imperial') {
    secondsPerUnit = secondsPerKm * 1.60934;
  }

  const minutes = Math.floor(secondsPerUnit / 60);
  const seconds = Math.floor(secondsPerUnit % 60);

  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Get pace unit label
 * 
 * @param units - Unit system (metric or imperial)
 * @returns Pace unit label (/km or /mi)
 */
export function getPaceUnit(units: UnitSystem = 'metric'): string {
  return units === 'metric' ? '/km' : '/mi';
}

/**
 * Format duration in seconds to HH:MM:SS or MM:SS
 * 
 * @param seconds - Duration in seconds
 * @param alwaysShowHours - Always show hours even if 0 (default: false)
 * @returns Formatted duration string
 */
export function formatDuration(seconds: number, alwaysShowHours: boolean = false): string {
  if (seconds < 0 || !isFinite(seconds)) {
    return '00:00';
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0 || alwaysShowHours) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format duration in seconds to a human-readable string
 * 
 * @param seconds - Duration in seconds
 * @returns Human-readable duration (e.g., "1h 23m", "45m 30s", "30s")
 */
export function formatDurationHuman(seconds: number): string {
  if (seconds < 0 || !isFinite(seconds)) {
    return '0s';
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts: string[] = [];

  if (hours > 0) {
    parts.push(`${hours}h`);
  }
  if (minutes > 0) {
    parts.push(`${minutes}m`);
  }
  if (secs > 0 || parts.length === 0) {
    parts.push(`${secs}s`);
  }

  return parts.join(' ');
}

/**
 * Format duration components
 * 
 * @param seconds - Duration in seconds
 * @returns Object with hours, minutes, and seconds
 */
export function getDurationComponents(seconds: number): {
  hours: number;
  minutes: number;
  seconds: number;
} {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  return { hours, minutes, seconds: secs };
}

/**
 * Format speed for display
 * 
 * @param metersPerSecond - Speed in meters per second
 * @param units - Unit system (metric or imperial)
 * @returns Formatted speed string (e.g., "10.5 km/h" or "6.5 mph")
 */
export function formatSpeed(
  metersPerSecond: number,
  units: UnitSystem = 'metric'
): string {
  if (metersPerSecond === 0 || !isFinite(metersPerSecond)) {
    return units === 'metric' ? '0.0 km/h' : '0.0 mph';
  }

  if (units === 'metric') {
    const kmh = metersPerSecond * 3.6;
    return `${kmh.toFixed(1)} km/h`;
  } else {
    const mph = metersPerSecond * 2.23694;
    return `${mph.toFixed(1)} mph`;
  }
}

/**
 * Format calories for display
 * 
 * @param calories - Calories burned
 * @returns Formatted calories string
 */
export function formatCalories(calories: number): string {
  if (calories < 0 || !isFinite(calories)) {
    return '0 cal';
  }

  return `${Math.round(calories)} cal`;
}

/**
 * Format steps for display
 * 
 * @param steps - Number of steps
 * @returns Formatted steps string
 */
export function formatSteps(steps: number): string {
  if (steps < 0 || !isFinite(steps)) {
    return '0 steps';
  }

  return `${Math.round(steps).toLocaleString()} steps`;
}

/**
 * Format date for display
 * 
 * @param timestamp - Unix timestamp in milliseconds
 * @param format - Format type ('short', 'long', 'time')
 * @returns Formatted date string
 */
export function formatDate(
  timestamp: number,
  format: 'short' | 'long' | 'time' = 'short'
): string {
  const date = new Date(timestamp);

  switch (format) {
    case 'short':
      // e.g., "Jan 15, 2024"
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    
    case 'long':
      // e.g., "Monday, January 15, 2024"
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    
    case 'time':
      // e.g., "2:30 PM"
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    
    default:
      return date.toLocaleDateString();
  }
}

/**
 * Format date and time for display
 * 
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Formatted date and time string (e.g., "Jan 15, 2024 at 2:30 PM")
 */
export function formatDateTime(timestamp: number): string {
  const date = formatDate(timestamp, 'short');
  const time = formatDate(timestamp, 'time');
  return `${date} at ${time}`;
}

/**
 * Format relative time (e.g., "2 hours ago", "yesterday")
 * 
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Relative time string
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) {
    return 'just now';
  } else if (minutes < 60) {
    return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
  } else if (hours < 24) {
    return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  } else if (days === 1) {
    return 'yesterday';
  } else if (days < 7) {
    return `${days} days ago`;
  } else {
    return formatDate(timestamp, 'short');
  }
}

/**
 * Format weight for display
 * 
 * @param kg - Weight in kilograms
 * @param units - Unit system (metric or imperial)
 * @returns Formatted weight string
 */
export function formatWeight(kg: number, units: UnitSystem = 'metric'): string {
  if (units === 'metric') {
    return `${kg.toFixed(1)} kg`;
  } else {
    const lbs = kg * 2.20462;
    return `${lbs.toFixed(1)} lbs`;
  }
}

/**
 * Format height for display
 * 
 * @param cm - Height in centimeters
 * @param units - Unit system (metric or imperial)
 * @returns Formatted height string
 */
export function formatHeight(cm: number, units: UnitSystem = 'metric'): string {
  if (units === 'metric') {
    return `${cm} cm`;
  } else {
    const totalInches = cm / 2.54;
    const feet = Math.floor(totalInches / 12);
    const inches = Math.round(totalInches % 12);
    return `${feet}'${inches}"`;
  }
}
