import React, { useMemo, useState } from 'react';
import { View, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { Text } from '../common/Text';
import { Spacing, BorderRadius } from '../../constants/theme';
import { useTheme } from '../../hooks';
import { Activity, UnitSystem } from '../../types';
import { formatDistanceValue } from '../../utils/formatting';

interface ProgressChartCardProps {
  activities: Activity[];
  units: UnitSystem;
}

type ChartType = 'distance' | 'duration' | 'pace';

const screenWidth = Dimensions.get('window').width;
// Total horizontal insets: scrollContent padding (16×2) + section padding
const horizontalInsets = Spacing.lg * 2 + Spacing.md;

const ProgressChartCardComponent: React.FC<ProgressChartCardProps> = ({ activities, units }) => {
  const { colors } = useTheme();
  const [chartType, setChartType] = useState<ChartType>('distance');

  const chartData = useMemo(() => {
    // Get the last 10 activities, sorted oldest-to-newest for chart display
    const recent = [...activities]
      .sort((a, b) => a.startTime - b.startTime)
      .slice(-10);

    // If no activities, show empty placeholder
    if (recent.length === 0) {
      return {
        labels: [''],
        datasets: [
          {
            data: [0],
            color: (opacity = 1) => `rgba(67, 97, 238, ${opacity})`,
            strokeWidth: 3,
          }
        ],
        suffix: '',
      };
    }

    // Labels: show activity number
    const labels = recent.map((_, i) => `#${i + 1}`);

    let dataSets: number[] = [];
    let suffix = '';

    if (chartType === 'distance') {
      const isMetric = units === 'metric';
      dataSets = recent.map(a => Number(formatDistanceValue(a.distance, units)));
      suffix = isMetric ? ' km' : ' mi';
    } else if (chartType === 'duration') {
      dataSets = recent.map(a => Math.round(a.duration / 60));
      suffix = ' min';
    } else if (chartType === 'pace') {
      dataSets = recent.map(a => {
        if (a.averagePace <= 0) return 0;
        return Number((a.averagePace / 60).toFixed(1));
      });
      suffix = ' /' + (units === 'metric' ? 'km' : 'mi');
    }

    // Prevent crashing if all data is 0
    const hasData = dataSets.some(val => val > 0);
    if (!hasData) {
      dataSets = recent.map(() => 0);
    }

    // Create a floor ~30% below the minimum so the chart has breathing room
    const minVal = Math.min(...dataSets.filter(v => v > 0));
    const floor = hasData ? Math.max(0, Math.floor(minVal * 0.7)) : 0;

    return {
      labels,
      datasets: [
        {
          data: dataSets,
          color: (opacity = 1) => `rgba(67, 97, 238, ${opacity})`,
          strokeWidth: 3,
        },
        {
          // Invisible baseline to set Y-axis floor
          data: dataSets.map(() => floor),
          color: () => 'transparent',
          strokeWidth: 0,
          withDots: false,
        },
      ],
      suffix
    };
  }, [activities, chartType, units]);

  const chartConfig = {
    backgroundGradientFrom: colors.background,
    backgroundGradientTo: colors.background,
    color: (opacity = 1) => `rgba(108, 99, 255, ${opacity})`,
    labelColor: () => colors.textSecondary,
    strokeWidth: 3,
    barPercentage: 0.5,
    useShadowColorFromDataset: false,
    propsForDots: {
      r: "4",
      strokeWidth: "2",
      stroke: colors.primary
    },
    decimalPlaces: chartType === 'duration' ? 0 : 1,
  };

  return (
    <View style={styles.section}>
      <Text variant="extraSmall" weight="semiBold" color={colors.primary} style={styles.sectionLabel}>
        ACTIVITY PROGRESS
      </Text>

      <View style={[styles.tabs, { backgroundColor: colors.background }]}>
        <TouchableOpacity 
          style={[styles.tab, chartType === 'distance' && [styles.activeTab, { backgroundColor: colors.primary }]]}
          onPress={() => setChartType('distance')}
        >
          <Text variant="small" weight={chartType === 'distance' ? 'semiBold' : 'regular'} color={chartType === 'distance' ? '#fff' : colors.textSecondary}>Distance</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, chartType === 'duration' && [styles.activeTab, { backgroundColor: colors.primary }]]}
          onPress={() => setChartType('duration')}
        >
           <Text variant="small" weight={chartType === 'duration' ? 'semiBold' : 'regular'} color={chartType === 'duration' ? '#fff' : colors.textSecondary}>Time</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, chartType === 'pace' && [styles.activeTab, { backgroundColor: colors.primary }]]}
          onPress={() => setChartType('pace')}
        >
           <Text variant="small" weight={chartType === 'pace' ? 'semiBold' : 'regular'} color={chartType === 'pace' ? '#fff' : colors.textSecondary}>Pace</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.chartWrapper}>
        <LineChart
          data={chartData}
          width={screenWidth - horizontalInsets}
          height={220}
          chartConfig={chartConfig}
          bezier
          style={styles.chart}
          yAxisSuffix={chartData.suffix}
        />
      </View>
    </View>
  );
};

// Memoized so the (expensive) SVG chart only re-renders when its data changes,
// not on unrelated Profile screen state updates.
export const ProgressChartCard = React.memo(ProgressChartCardComponent);

const styles = StyleSheet.create({
  section: {
    marginBottom: Spacing.xl,
  },
  sectionLabel: {
    letterSpacing: 1,
    textTransform: 'uppercase' as const,
    marginBottom: Spacing.md,
    marginLeft: 4,
  },
  tabs: {
    flexDirection: 'row',
    borderRadius: BorderRadius.medium,
    padding: 4,
    marginBottom: Spacing.lg,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    borderRadius: BorderRadius.medium,
  },
  activeTab: {},
  chartWrapper: {
    alignItems: 'center',
    overflow: 'hidden',
  },
  chart: {
    borderRadius: BorderRadius.medium,
    marginLeft: -Spacing.lg, // offset internal chartkit left padding
  }
});
