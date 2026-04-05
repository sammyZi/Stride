/**
 * SharingService - Handle activity sharing and export functionality
 * Provides methods for sharing activities, exporting data in various formats
 */

import { Share, Platform } from 'react-native';
import { Paths, File } from 'expo-file-system';
import { shareAsync, isAvailableAsync } from 'expo-sharing';
import { Activity, UnitSystem } from '../../types';
import {
  formatDistance,
  formatDuration,
  formatPace,
  formatDate,
} from '../../utils/formatting';
import StorageService from '../storage/StorageService';

class SharingService {
  /**
   * Share activity as text message
   */
  async shareActivityText(activity: Activity, units: UnitSystem): Promise<void> {
    try {
      const message = this.generateActivityText(activity, units);

      await Share.share({
        message,
        title: `${activity.type.charAt(0).toUpperCase() + activity.type.slice(1)} Activity`,
      });
    } catch (error) {
      console.error('Error sharing activity text:', error);
      throw new Error('Failed to share activity');
    }
  }

  /**
   * Generate shareable text for an activity
   */
  private generateActivityText(activity: Activity, units: UnitSystem): string {
    const activityType = 'Activity';
    const emoji = '🏃';

    return `${emoji} ${activityType}\n\n` +
      `📏 Distance: ${formatDistance(activity.distance, units)}\n` +
      `⏱️ Duration: ${formatDuration(activity.duration)}\n` +
      `⚡ Pace: ${formatPace(activity.averagePace, units)}\n` +
      `👟 Steps: ${activity.steps.toLocaleString()}\n` +
      `🔥 Calories: ${Math.round(activity.calories)}\n` +
      `📅 Date: ${formatDate(activity.startTime, 'long')}\n\n` +
      `Tracked with Stride 💪`;
  }

  /**
   * Export activity as GPX file
   */
  async exportActivityGPX(activity: Activity): Promise<void> {
    try {
      const gpxContent = this.generateGPX(activity);
      const fileName = `activity_${activity.id}_${Date.now()}.gpx`;
      const file = new File(Paths.cache, fileName);

      await file.write(gpxContent);

      const isAvailable = await isAvailableAsync();
      if (isAvailable) {
        await shareAsync(file.uri, {
          mimeType: 'application/gpx+xml',
          dialogTitle: 'Export Activity GPX',
          UTI: 'public.xml',
        });
      } else {
        console.log('GPX file saved to:', file.uri);
      }
    } catch (error) {
      console.error('Error exporting GPX:', error);
      throw new Error('Failed to export GPX file');
    }
  }

  /**
   * Generate GPX XML content from activity
   */
  private generateGPX(activity: Activity): string {
    const activityType = 'activity';
    const startDate = new Date(activity.startTime).toISOString();
    
    let trackPoints = '';
    activity.route.forEach((point) => {
      const timestamp = new Date(point.timestamp).toISOString();
      const elevation = point.altitude !== undefined ? `    <ele>${point.altitude.toFixed(2)}</ele>\n` : '';
      
      trackPoints += `  <trkpt lat="${point.latitude}" lon="${point.longitude}">\n`;
      trackPoints += elevation;
      trackPoints += `    <time>${timestamp}</time>\n`;
      trackPoints += `  </trkpt>\n`;
    });

    return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Stride App"
  xmlns="http://www.topografix.com/GPX/1/1"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">
  <metadata>
    <name>${activityType} - ${startDate}</name>
    <time>${startDate}</time>
  </metadata>
  <trk>
    <name>${activityType}</name>
    <type>${activityType}</type>
    <trkseg>
${trackPoints}    </trkseg>
  </trk>
</gpx>`;
  }

  /**
   * Export activity as JSON file
   */
  async exportActivityJSON(activity: Activity): Promise<void> {
    try {
      const jsonContent = JSON.stringify(activity, null, 2);
      const fileName = `activity_${activity.id}_${Date.now()}.json`;
      const file = new File(Paths.cache, fileName);

      await file.write(jsonContent);

      const isAvailable = await isAvailableAsync();
      if (isAvailable) {
        await shareAsync(file.uri, {
          mimeType: 'application/json',
          dialogTitle: 'Export Activity Data',
        });
      } else {
        console.log('JSON file saved to:', file.uri);
      }
    } catch (error) {
      console.error('Error exporting JSON:', error);
      throw new Error('Failed to export JSON file');
    }
  }

  /**
   * Export all activities as backup JSON
   */
  async exportAllActivitiesBackup(): Promise<void> {
    try {
      const exportData = await StorageService.exportData();
      const fileName = `fitness_tracker_backup_${Date.now()}.json`;
      const file = new File(Paths.cache, fileName);

      await file.write(exportData);

      const isAvailable = await isAvailableAsync();
      if (isAvailable) {
        await shareAsync(file.uri, {
          mimeType: 'application/json',
          dialogTitle: 'Export Backup',
        });
      } else {
        console.log('Backup saved to:', file.uri);
      }
    } catch (error) {
      console.error('Error exporting backup:', error);
      throw new Error('Failed to export backup');
    }
  }

  /**
   * Import backup from JSON file
   */
  async importBackup(fileUri: string): Promise<void> {
    try {
      const file = new File(fileUri);
      const jsonContent = await file.text();

      await StorageService.importData(jsonContent);
      console.log('Backup imported successfully');
    } catch (error) {
      console.error('Error importing backup:', error);
      throw new Error('Failed to import backup');
    }
  }

  /**
   * Generate shareable activity summary card data
   * Returns data that can be used to render a shareable image
   */
  generateActivitySummaryCard(activity: Activity, units: UnitSystem) {
    return {
      type: activity.type,
      date: formatDate(activity.startTime, 'long'),
      metrics: {
        distance: formatDistance(activity.distance, units),
        duration: formatDuration(activity.duration),
        pace: formatPace(activity.averagePace, units),
        steps: activity.steps.toLocaleString(),
        calories: Math.round(activity.calories).toString(),
      },
      route: activity.route,
    };
  }

  /**
   * Share activity as image
   * Captures the activity summary and shares it as an image
   */
  async shareActivityImage(imageUri: string): Promise<void> {
    try {
      const isAvailable = await isAvailableAsync();
      if (isAvailable) {
        await shareAsync(imageUri, {
          mimeType: 'image/png',
          dialogTitle: 'Share Activity',
        });
      } else {
        // Fallback to native share
        await Share.share({
          url: imageUri,
          title: 'Activity Summary',
        });
      }
    } catch (error) {
      console.error('Error sharing activity image:', error);
      throw new Error('Failed to share activity image');
    }
  }
}

// Export singleton instance
export default new SharingService();
