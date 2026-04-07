# Stride - Walk & Run GPS Tracker

A React Native mobile application built with Expo for tracking walking and running activities with comprehensive metrics, route mapping, and analytics.

## Features

- 🏃 Real-time activity tracking (walking/running)
- 📍 High-accuracy GPS route mapping
- 📊 Comprehensive statistics and analytics
- 🎯 Goal setting and achievement tracking
- 📱 Background tracking with notifications
- 🔐 Google OAuth authentication
- ☁️ Cloud storage with Firebase
- 👥 Social features (coming soon)
- 💾 Offline support with automatic sync
- 📤 Data export for backups
- 📈 Personal records and progress tracking

## Tech Stack

- **Framework**: React Native with Expo
- **Language**: TypeScript
- **Authentication**: Google OAuth with Firebase
- **Backend**: Node.js + Express + Firebase
- **Database**: Cloud Firestore
- **Local Storage**: AsyncStorage
- **Maps**: React Native Maps
- **Navigation**: React Navigation
- **State Management**: React Context API
- **Fonts**: Poppins (Google Fonts)

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Expo CLI
- iOS Simulator (Mac) or Android Emulator

## Installation

1. Clone the repository

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   - Copy `.env.example` to `.env`
   - Add your Google OAuth Client ID
   - Add your Google Maps API key
   - Configure backend API URL

4. Start the backend server (see `../backend/README.md`):
   ```bash
   cd ../backend
   npm start
   ```

5. Start the mobile app:
   ```bash
   npm start
   ```

## Quick Start

For quick authentication testing, see:
- 📖 **[QUICK_START.md](./QUICK_START.md)** - Get started in 3 steps
- 📚 **[AUTHENTICATION_GUIDE.md](./AUTHENTICATION_GUIDE.md)** - Detailed auth flow
- ✅ **[TEST_AUTH.md](./TEST_AUTH.md)** - Testing checklist

## Project Structure

```
fitness-tracker-app/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── common/          # Generic components
│   │   ├── activity/        # Activity-specific components
│   │   ├── map/             # Map components
│   │   └── charts/          # Chart components
│   ├── screens/             # Screen components
│   │   ├── auth/            # Authentication screens
│   │   ├── activity/        # Activity tracking screens
│   │   ├── history/         # Activity history screens
│   │   ├── stats/           # Statistics screens
│   │   ├── profile/         # Profile screens
│   │   └── settings/        # Settings screens
│   ├── navigation/          # Navigation configuration
│   ├── services/            # Business logic services
│   │   ├── location/        # Location tracking
│   │   ├── activity/        # Activity management
│   │   └── storage/         # Local storage (AsyncStorage)
│   ├── hooks/               # Custom React hooks
│   ├── context/             # React Context providers
│   ├── utils/               # Utility functions
│   ├── constants/           # App constants and theme
│   ├── types/               # TypeScript definitions
│   └── config/              # Configuration files
├── assets/                  # Images, fonts, icons
└── app.json                 # Expo configuration
```

## Available Scripts

- `npm start` - Start the Expo development server
- `npm run android` - Run on Android emulator/device
- `npm run ios` - Run on iOS simulator/device (Mac only)
- `npm run web` - Run in web browser

## Configuration

### Environment Variables

Create a `.env` file with:
```
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your-client-id
EXPO_PUBLIC_API_URL=http://localhost:3000/api
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your-maps-key
```

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create or select your project
3. Enable Google+ API
4. Create OAuth 2.0 credentials (Web application)
5. Add authorized redirect URIs (see AUTHENTICATION_GUIDE.md)
6. Copy the Client ID to your `.env` file

### Google Maps Setup

1. Get a Google Maps API key from [Google Cloud Console](https://console.cloud.google.com/)
2. Enable Maps SDK for Android and iOS
3. Add the API key to `.env`

## Permissions

The app requires the following permissions:

### iOS
- Location (When In Use and Always)
- Motion & Fitness

### Android
- Fine Location
- Coarse Location
- Background Location
- Activity Recognition
- Foreground Service

## Design Guidelines

The app follows a modern, clean design with:
- **Primary Font**: Poppins
- **Primary Color**: #6C63FF (Vibrant Purple)
- **Spacing System**: 4px base unit
- **Border Radius**: 12-20px for cards and buttons

See the design document for complete guidelines.

## License

MIT

## Contributing

Contributions are welcome! Please read the contributing guidelines before submitting PRs.
