/**
 * StaticRouteMap
 * Displays a completed activity route with high-resolution polyline,
 * distance markers, pace heatmap, and route statistics
 * 
 * Performance optimized: lazy-loads map after navigation transition completes
 */

import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator, InteractionManager } from 'react-native';
import MapView, { Polyline, Marker, PROVIDER_GOOGLE, MapType as RNMapType } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../common/Text';
import { RoutePoint, UnitSystem } from '../../types';
import { Colors, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { formatDistance } from '../../utils/formatting';
import { calculateDistance } from '../../utils/calculations';
import { useSettings } from '../../context';

interface StaticRouteMapProps {
  route: RoutePoint[];
  units?: UnitSystem;
  showDistanceMarkers?: boolean;
  showPaceHeatmap?: boolean;
  averagePace?: number;
}

const StaticRouteMapComponent: React.FC<StaticRouteMapProps> = ({
  route,
  units = 'metric',
  showDistanceMarkers = true,
  showPaceHeatmap = false,
  averagePace = 0,
}) => {
  const { settings } = useSettings();
  const mapRef = React.useRef<MapView>(null);
  const [mapReady, setMapReady] = useState(false);
  const [shouldRenderMap, setShouldRenderMap] = useState(false);

  // Defer map rendering until after navigation animation completes
  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      setShouldRenderMap(true);
    });
    return () => task.cancel();
  }, []);

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

  // Memoize map region calculation
  const mapRegion = useMemo(() => {
    if (route.length === 0) {
      return {
        latitude: 0,
        longitude: 0,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
    }

    let minLat = route[0].latitude;
    let maxLat = route[0].latitude;
    let minLng = route[0].longitude;
    let maxLng = route[0].longitude;

    for (let i = 1; i < route.length; i++) {
      const lat = route[i].latitude;
      const lng = route[i].longitude;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
    }

    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLng + maxLng) / 2;
    const latDelta = (maxLat - minLat) * 1.1;
    const lngDelta = (maxLng - minLng) * 1.1;

    return {
      latitude: centerLat,
      longitude: centerLng,
      latitudeDelta: Math.max(latDelta, 0.005),
      longitudeDelta: Math.max(lngDelta, 0.005),
    };
  }, [route]);

  // Memoize distance markers
  const distanceMarkers = useMemo(() => {
    if (!showDistanceMarkers || route.length < 2) return [];

    const markers: Array<{ position: RoutePoint; distance: number }> = [];
    const markerInterval = units === 'metric' ? 1000 : 1609.34;
    let accumulatedDistance = 0;
    let nextMarkerDistance = markerInterval;

    for (let i = 1; i < route.length; i++) {
      const segmentDistance = calculateDistance(
        route[i - 1].latitude,
        route[i - 1].longitude,
        route[i].latitude,
        route[i].longitude
      );

      accumulatedDistance += segmentDistance;

      if (accumulatedDistance >= nextMarkerDistance) {
        markers.push({
          position: route[i],
          distance: nextMarkerDistance,
        });
        nextMarkerDistance += markerInterval;
      }
    }

    return markers;
  }, [route, showDistanceMarkers, units]);

  // Memoize direction markers
  const directionMarkers = useMemo(() => {
    if (route.length < 2) return [];

    const markers: Array<{ position: RoutePoint; rotation: number }> = [];
    const arrowSpacing = 300; // Place an arrow every 300 meters
    let accumulatedDistance = 0;

    for (let i = 1; i < route.length; i++) {
      const pt1 = route[i - 1];
      const pt2 = route[i];
      const segmentDistance = calculateDistance(
        pt1.latitude,
        pt1.longitude,
        pt2.latitude,
        pt2.longitude
      );

      accumulatedDistance += segmentDistance;

      if (accumulatedDistance >= arrowSpacing) {
        // Calculate bearing
        const toRad = Math.PI / 180;
        const toDeg = 180 / Math.PI;

        const lat1 = pt1.latitude * toRad;
        const lat2 = pt2.latitude * toRad;
        const dLng = (pt2.longitude - pt1.longitude) * toRad;

        const y = Math.sin(dLng) * Math.cos(lat2);
        const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
        const brng = Math.atan2(y, x);
        const bearing = (brng * toDeg + 360) % 360;

        markers.push({
          position: pt2,
          rotation: bearing,
        });

        accumulatedDistance = 0;
      }
    }

    return markers;
  }, [route]);

  // Memoize polyline segments — batch consecutive same-color segments
  // to minimize the number of Polyline components on the map
  const polylineSegments = useMemo(() => {
    if (!showPaceHeatmap || route.length < 2 || !averagePace) {
      return [{
        coordinates: route.map(p => ({ latitude: p.latitude, longitude: p.longitude })),
        color: Colors.primary,
      }];
    }

    // First, determine the color for each segment
    const segmentColors: string[] = [];
    for (let i = 1; i < route.length; i++) {
      const point1 = route[i - 1];
      const point2 = route[i];

      const distance = calculateDistance(
        point1.latitude,
        point1.longitude,
        point2.latitude,
        point2.longitude
      );

      const timeDiff = (point2.timestamp - point1.timestamp) / 1000;
      const segmentPace = distance > 0 ? (timeDiff / distance) * 1000 : averagePace;

      if (segmentPace < averagePace * 0.9) {
        segmentColors.push(Colors.success);
      } else if (segmentPace > averagePace * 1.1) {
        segmentColors.push(Colors.warning);
      } else {
        segmentColors.push(Colors.primary);
      }
    }

    // Then, batch consecutive segments with the same color into single polylines
    const batched: Array<{ coordinates: any[]; color: string }> = [];
    let currentColor = segmentColors[0];
    let currentCoords = [
      { latitude: route[0].latitude, longitude: route[0].longitude },
      { latitude: route[1].latitude, longitude: route[1].longitude },
    ];

    for (let i = 1; i < segmentColors.length; i++) {
      if (segmentColors[i] === currentColor) {
        // Same color — extend the current polyline
        currentCoords.push({ latitude: route[i + 1].latitude, longitude: route[i + 1].longitude });
      } else {
        // Color changed — push current batch and start new one
        batched.push({ coordinates: currentCoords, color: currentColor });
        currentColor = segmentColors[i];
        // Start new batch from the last point of the previous batch (for continuity)
        currentCoords = [
          { latitude: route[i].latitude, longitude: route[i].longitude },
          { latitude: route[i + 1].latitude, longitude: route[i + 1].longitude },
        ];
      }
    }
    // Push the last batch
    batched.push({ coordinates: currentCoords, color: currentColor });

    return batched;
  }, [route, showPaceHeatmap, averagePace]);

  const fitToRoute = () => {
    if (mapRef.current && route.length > 0) {
      const coordinates = route.map(p => ({
        latitude: p.latitude,
        longitude: p.longitude,
      }));
      
      mapRef.current.fitToCoordinates(coordinates, {
        edgePadding: { top: 30, right: 30, bottom: 30, left: 30 },
        animated: true,
      });
    }
  };

  // Show a placeholder while map is loading
  if (!shouldRenderMap) {
    return (
      <View style={styles.container}>
        <View style={styles.mapPlaceholder}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text variant="small" color={Colors.textSecondary} style={{ marginTop: Spacing.sm }}>
            Loading map...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {!mapReady && (
        <View style={styles.mapLoadingOverlay}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      )}
      <MapView
        key={`static-map-${settings.mapType}`}
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={mapRegion}
        mapType={getMapType()}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={true}
        showsTraffic={false}
        showsBuildings={false}
        showsIndoors={false}
        toolbarEnabled={false}
        rotateEnabled={true}
        scrollEnabled={true}
        zoomEnabled={true}
        pitchEnabled={true}
        loadingEnabled={true}
        loadingIndicatorColor={Colors.primary}
        loadingBackgroundColor="#F5F5F5"
        onMapReady={() => setMapReady(true)}
        liteMode={false}
      >
        {/* Route polyline(s) */}
        {polylineSegments.map((segment, index) => (
          <Polyline
            key={`segment-${index}`}
            coordinates={segment.coordinates}
            strokeColor={segment.color}
            strokeWidth={5}
            lineCap="round"
            lineJoin="round"
          />
        ))}

        {/* Start marker */}
        {route.length > 0 && (
          <Marker
            coordinate={{
              latitude: route[0].latitude,
              longitude: route[0].longitude,
            }}
            anchor={{ x: 0.5, y: 0.5 }}
            tracksViewChanges={false}
          >
            <View style={styles.startMarker}>
              <Ionicons name="flag" size={16} color="#fff" />
            </View>
          </Marker>
        )}

        {/* End marker */}
        {route.length > 1 && (
          <Marker
            coordinate={{
              latitude: route[route.length - 1].latitude,
              longitude: route[route.length - 1].longitude,
            }}
            anchor={{ x: 0.5, y: 0.5 }}
            tracksViewChanges={false}
          >
            <View style={styles.endMarker}>
              <Ionicons name="checkmark" size={16} color="#fff" />
            </View>
          </Marker>
        )}

        {/* Distance markers */}
        {distanceMarkers.map((marker, index) => (
          <Marker
            key={`distance-${index}`}
            coordinate={{
              latitude: marker.position.latitude,
              longitude: marker.position.longitude,
            }}
            anchor={{ x: 0.5, y: 0.5 }}
            tracksViewChanges={false}
          >
            <View style={styles.distanceMarker}>
              <Text variant="extraSmall" weight="semiBold" color={Colors.surface}>
                {formatDistance(marker.distance, units, 0)}
              </Text>
            </View>
          </Marker>
        ))}

        {/* Direction markers */}
        {directionMarkers.map((marker, index) => (
          <Marker
            key={`dir-${index}`}
            coordinate={{
              latitude: marker.position.latitude,
              longitude: marker.position.longitude,
            }}
            anchor={{ x: 0.5, y: 0.5 }}
            tracksViewChanges={false}
            flat={true}
          >
            <View style={[styles.directionMarker, { transform: [{ rotate: `${marker.rotation}deg` }] }]}>
              <Ionicons name="chevron-up" size={14} color="#FFFFFF" style={{ marginTop: -1 }} />
            </View>
          </Marker>
        ))}
      </MapView>

      {/* Map controls */}
      {mapReady && (
        <View style={styles.controls}>
          <TouchableOpacity style={styles.controlButton} onPress={fitToRoute}>
            <Ionicons name="expand" size={20} color={Colors.primary} />
          </TouchableOpacity>
        </View>
      )}

      {/* Pace heatmap legend */}
      {showPaceHeatmap && mapReady && (
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: Colors.success }]} />
            <Text variant="extraSmall" color={Colors.textSecondary}>Fast</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: Colors.primary }]} />
            <Text variant="extraSmall" color={Colors.textSecondary}>Average</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: Colors.warning }]} />
            <Text variant="extraSmall" color={Colors.textSecondary}>Slow</Text>
          </View>
        </View>
      )}
    </View>
  );
};

export const StaticRouteMap = React.memo(StaticRouteMapComponent);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: BorderRadius.large,
    overflow: 'hidden',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  mapPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.large,
  },
  mapLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
    borderRadius: BorderRadius.large,
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
    ...Shadows.medium,
  },
  endMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    ...Shadows.medium,
  },
  distanceMarker: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.small,
    borderWidth: 2,
    borderColor: '#fff',
    ...Shadows.small,
  },
  directionMarker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#fff',
    ...Shadows.small,
  },
  controls: {
    position: 'absolute',
    top: Spacing.lg,
    right: Spacing.lg,
    gap: Spacing.sm,
  },
  controlButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.medium,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.medium,
  },
  legend: {
    position: 'absolute',
    bottom: Spacing.lg,
    left: Spacing.lg,
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.medium,
    gap: Spacing.md,
    ...Shadows.small,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
});
