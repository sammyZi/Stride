import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { AuthProvider, useAuth } from '../AuthContext';
import authService from '../../services/auth/AuthService';

// Mock the auth service
jest.mock('../../services/auth/AuthService', () => ({
  __esModule: true,
  default: {
    getCurrentUser: jest.fn(),
    onAuthStateChanged: jest.fn(),
    signInWithGoogle: jest.fn(),
    signOut: jest.fn(),
    refreshToken: jest.fn(),
  },
}));

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should provide initial auth state', async () => {
    const mockUser = {
      id: '123',
      email: 'test@example.com',
      displayName: 'Test User',
    };

    (authService.getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
    (authService.onAuthStateChanged as jest.Mock).mockImplementation((callback) => {
      callback(mockUser);
      return jest.fn();
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.user).toEqual(mockUser);
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('should handle sign in with Google', async () => {
    const mockUser = {
      id: '123',
      email: 'test@example.com',
      displayName: 'Test User',
    };

    const mockAuthResult = {
      user: mockUser,
      token: 'mock-token',
      isNewUser: false,
    };

    (authService.getCurrentUser as jest.Mock).mockResolvedValue(null);
    (authService.onAuthStateChanged as jest.Mock).mockImplementation(() => jest.fn());
    (authService.signInWithGoogle as jest.Mock).mockResolvedValue(mockAuthResult);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    let authResult;
    await act(async () => {
      authResult = await result.current.signInWithGoogle('mock-id-token');
    });

    expect(authResult).toEqual(mockAuthResult);
    expect(authService.signInWithGoogle).toHaveBeenCalledWith('mock-id-token');
  });

  it('should handle sign out', async () => {
    const mockUser = {
      id: '123',
      email: 'test@example.com',
      displayName: 'Test User',
    };

    (authService.getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
    (authService.onAuthStateChanged as jest.Mock).mockImplementation((callback) => {
      callback(mockUser);
      return jest.fn();
    });
    (authService.signOut as jest.Mock).mockResolvedValue(undefined);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isAuthenticated).toBe(true);

    await act(async () => {
      await result.current.signOut();
    });

    expect(authService.signOut).toHaveBeenCalled();
  });

  it('should throw error when useAuth is used outside AuthProvider', () => {
    // Suppress console.error for this test
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    expect(() => {
      renderHook(() => useAuth());
    }).toThrow('useAuth must be used within an AuthProvider');

    consoleSpy.mockRestore();
  });
});
