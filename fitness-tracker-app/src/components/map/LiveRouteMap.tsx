import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MapView, { Polyline, Marker, PROVIDER_GOOGLE, MapType as RNMapType } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { Location } from '../../types';
import { Colors } from '../../constants/theme';
import { useSettings } from '../../context';
import locationService from '../../services/location';

interface LiveRouteMapProps {
  currentLocation: Location | null;
  routePoints: Location[];
  isTracking: boolean;
}

export const LiveRouteMap: React.FC<LiveRouteMapProps> = ({
  currentLocation,
  routePoints,
  isTracking,
}) => {
  const { settings } = useSettings();
  const mapRef = React.useRef<MapView>(null);
  const [hasInitialized, setHasInitialized] = React.useState(false);

  // Convert our MapType to React Native Maps MapType
  const getMapType = (): RNMapType => {
    switch (settings.mapType) {
      case 'satellite':
        return 'satellite';
      case 'hybrid':
        return 'hybrid';
      case 'standard':
      default:
        return 'standard';
    }
  };

  // Log when map type changes
  React.useEffect(() => {
    console.log('Map type changed to:', settings.mapType);
  }, [settings.mapType]);

  // Center on first location
  React.useEffect(() => {
    if (currentLocation && mapRef.current && !hasInitialized) {
      console.log('Centering map on:', currentLocation.latitude, currentLocation.longitude);
      mapRef.current.animateToRegion({
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 500);
      setHasInitialized(true);
    }
  }, [currentLocation, hasInitialized]);

  // Auto-follow when tracking (but allow manual pan)
  const [autoFollow, setAutoFollow] = React.useState(true);
  
  React.useEffect(() => {
    if (currentLocation && mapRef.current && isTracking && hasInitialized && autoFollow) {
      mapRef.current.animateToRegion({
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 1000);
    }
  }, [currentLocation, isTracking, hasInitialized, autoFollow]);

  const coordinates = routePoints.map(point => ({
    latitude: point.latitude,
    longitude: point.longitude,
  }));

  const centerOnLocation = async () => {
    setAutoFollow(true); // Re-enable auto-follow

    if (currentLocation && mapRef.current) {
      console.log('Center button pressed, moving to:', currentLocation.latitude, currentLocation.longitude);
      mapRef.current.animateToRegion({
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      }, 500);
    } else {
      // currentLocation is stale/null — force-fetch a fresh GPS fix
      console.log('currentLocation is null, fetching fresh location...');
      try {
        const freshLocation = await locationService.refreshCurrentLocation();
        if (freshLocation && mapRef.current) {
          console.log('Fresh location obtained:', freshLocation.latitude, freshLocation.longitude);
          mapRef.current.animateToRegion({
            latitude: freshLocation.latitude,
            longitude: freshLocation.longitude,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
          }, 500);
        } else {
          console.log('Could not obtain fresh location');
        }
      } catch (error) {
        console.error('Error fetching fresh location:', error);
      }
    }
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        mapType={getMapType()}
        style={styles.map}
        initialRegion={{
          latitude: currentLocation?.latitude || 18.4681966,
          longitude: currentLocation?.longitude || 73.8272872,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
        showsUserLocation={true}
        showsMyLocationButton={false}
        showsCompass={false}
        showsTraffic={false}
        showsBuildings={true}
        showsIndoors={true}
        toolbarEnabled={false}
        rotateEnabled={false}
        scrollEnabled={true}
        zoomEnabled={true}
        zoomControlEnabled={false}
        zoomTapEnabled={true}
        minZoomLevel={10}
        maxZoomLevel={20}
        loadingEnabled={false}
        moveOnMarkerPress={false}
        onPanDrag={() => setAutoFollow(false)} // Disable auto-follow when user pans
      >
        {/* Route polyline */}
        {coordinates.length > 1 && (
          <Polyline
            coordinates={coordinates}
            strokeColor={Colors.primary}
            strokeWidth={5}
            lineCap="round"
            lineJoin="round"
          />
        )}

        {/* Start marker */}
        {routePoints.length > 0 && (
          <Marker
            coordinate={{
              latitude: routePoints[0].latitude,
              longitude: routePoints[0].longitude,
            }}
          >
            <View style={styles.startMarker}>
              <Ionicons name="flag" size={16} color="#fff" />
            </View>
          </Marker>
        )}
      </MapView>

      {/* Location Button */}
      <TouchableOpacity 
        style={styles.locationButton} 
        onPress={centerOnLocation}
        activeOpacity={0.8}
      >
        <Ionicons name="locate" size={22} color={Colors.primary} />
      </TouchableOpacity>

      {/* GPS Info */}
      {currentLocation && (
        <View style={styles.gpsInfo}>
          <Text style={styles.gpsText}>
            {currentLocation.accuracy?.toFixed(0)}m • {routePoints.length} pts
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  locationButton: {
    position: 'absolute',
    bottom: 240,
    right: 16,
    backgroundColor: '#fff',
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  gpsInfo: {
    position: 'absolute',
    bottom: 294,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  gpsText: {
    color: '#fff',
    fontSize: 11,
    fontFamily: 'Poppins_500Medium',
  },
  startMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
});
