/**
 * Settings Context
 * Provides global access to user settings across the app
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserSettings, UnitSystem, MapType, Theme } from '../types';
import StorageService from '../services/storage/StorageService';
import AudioAnnouncementService from '../services/audio';
import HapticFeedbackService from '../services/haptic';

interface SettingsContextType {
  settings: UserSettings;
  loading: boolean;
  updateSettings: (newSettings: Partial<UserSettings>) => Promise<void>;
  toggleAudioAnnouncements: (enabled: boolean) => Promise<void>;
  setAnnouncementInterval: (interval: number) => Promise<void>;
  setUnits: (units: UnitSystem) => Promise<void>;
  setMapType: (mapType: MapType) => Promise<void>;
  setTheme: (theme: Theme) => Promise<void>;
  toggleAutoPause: (enabled: boolean) => Promise<void>;
  toggleHapticFeedback: (enabled: boolean) => void;
  isHapticEnabled: boolean;
}

const defaultSettings: UserSettings = {
  units: 'metric',
  audioAnnouncements: true,
  announcementInterval: 1000,
  autoPause: false,
  autoPauseSensitivity: 'medium',
  mapType: 'standard',
  theme: 'light',
  hapticFeedback: true,
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [isHapticEnabled, setIsHapticEnabled] = useState(true);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const savedSettings = await StorageService.getSettings();
      if (savedSettings) {
        setSettings(savedSettings);
        
        // Apply settings to services
        AudioAnnouncementService.updateSettings({
          enabled: savedSettings.audioAnnouncements,
          interval: savedSettings.announcementInterval,
          units: savedSettings.units,
        });
        
        // Apply haptic feedback setting
        const hapticEnabled = savedSettings.hapticFeedback ?? true;
        HapticFeedbackService.initialize(hapticEnabled);
        setIsHapticEnabled(hapticEnabled);
      } else {
        // Initialize with defaults
        HapticFeedbackService.initialize(true);
        setIsHapticEnabled(true);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (newSettings: Partial<UserSettings>) => {
    try {
      const updatedSettings = { ...settings, ...newSettings };
      await StorageService.saveSettings(updatedSettings);
      setSettings(updatedSettings);
      
      // Apply settings to services
      AudioAnnouncementService.updateSettings({
        enabled: updatedSettings.audioAnnouncements,
        interval: updatedSettings.announcementInterval,
        units: updatedSettings.units,
      });
      
      await HapticFeedbackService.success();
    } catch (error) {
      console.error('Error updating settings:', error);
      await HapticFeedbackService.error();
      throw error;
    }
  };

  const toggleAudioAnnouncements = async (enabled: boolean) => {
    await updateSettings({ audioAnnouncements: enabled });
    
    if (enabled) {
      AudioAnnouncementService.enable();
    } else {
      AudioAnnouncementService.disable();
    }
  };

  const setAnnouncementInterval = async (interval: number) => {
    await HapticFeedbackService.selection();
    await updateSettings({ announcementInterval: interval });
    AudioAnnouncementService.setInterval(interval);
  };

  const setUnits = async (units: UnitSystem) => {
    await HapticFeedbackService.selection();
    await updateSettings({ units });
    AudioAnnouncementService.setUnits(units);
  };

  const setMapType = async (mapType: MapType) => {
    await HapticFeedbackService.selection();
    await updateSettings({ mapType });
  };

  const setTheme = async (theme: Theme) => {
    await HapticFeedbackService.selection();
    await updateSettings({ theme });
  };

  const toggleAutoPause = async (enabled: boolean) => {
    await HapticFeedbackService.selection();
    await updateSettings({ autoPause: enabled });
  };

  const toggleHapticFeedback = async (enabled: boolean) => {
    try {
      // Update settings in storage
      await updateSettings({ hapticFeedback: enabled });
      
      // Update service
      if (enabled) {
        HapticFeedbackService.enable();
        await HapticFeedbackService.success();
      } else {
        HapticFeedbackService.disable();
      }
      
      setIsHapticEnabled(enabled);
    } catch (error) {
      console.error('Error toggling haptic feedback:', error);
    }
  };

  return (
    <SettingsContext.Provider
      value={{
        settings,
        loading,
        updateSettings,
        toggleAudioAnnouncements,
        setAnnouncementInterval,
        setUnits,
        setMapType,
        setTheme,
        toggleAutoPause,
        toggleHapticFeedback,
        isHapticEnabled,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = (): SettingsContextType => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
