import React, { useMemo, useState } from 'react';
import { View, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { Card } from '../common/Card';
import { Text } from '../common/Text';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';
import { Activity, UnitSystem } from '../../types';
import { formatDistanceValue } from '../../utils/formatting';

interface ProgressChartCardProps {
  activities: Activity[];
  units: UnitSystem;
}

type ChartType = 'distance' | 'duration' | 'pace';

const screenWidth = Dimensions.get('window').width;
const cardPadding = Spacing.lg * 2;

export const ProgressChartCard: React.FC<ProgressChartCardProps> = ({ activities, units }) => {
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

    return {
      labels,
      datasets: [
        {
          data: dataSets,
          color: (opacity = 1) => `rgba(67, 97, 238, ${opacity})`,
          strokeWidth: 3,
        }
      ],
      suffix
    };
  }, [activities, chartType, units]);

  const chartConfig = {
    backgroundGradientFrom: Colors.surface,
    backgroundGradientTo: Colors.surface,
    color: (opacity = 1) => `rgba(67, 97, 238, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(136, 136, 136, ${opacity})`,
    strokeWidth: 3,
    barPercentage: 0.5,
    useShadowColorFromDataset: false,
    propsForDots: {
      r: "4",
      strokeWidth: "2",
      stroke: Colors.primary
    },
    decimalPlaces: chartType === 'duration' ? 0 : 1,
  };

  return (
    <Card variant="outlined" style={styles.card}>
      <View style={styles.header}>
        <Text variant="mediumLarge" weight="semiBold" color={Colors.textPrimary}>
          Activity Progress
        </Text>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity 
          style={[styles.tab, chartType === 'distance' && styles.activeTab]}
          onPress={() => setChartType('distance')}
        >
          <Text variant="small" weight={chartType === 'distance' ? 'semiBold' : 'regular'} color={chartType === 'distance' ? Colors.surface : Colors.textSecondary}>Distance</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, chartType === 'duration' && styles.activeTab]}
          onPress={() => setChartType('duration')}
        >
           <Text variant="small" weight={chartType === 'duration' ? 'semiBold' : 'regular'} color={chartType === 'duration' ? Colors.surface : Colors.textSecondary}>Time</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, chartType === 'pace' && styles.activeTab]}
          onPress={() => setChartType('pace')}
        >
           <Text variant="small" weight={chartType === 'pace' ? 'semiBold' : 'regular'} color={chartType === 'pace' ? Colors.surface : Colors.textSecondary}>Pace</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.chartWrapper}>
        <LineChart
          data={chartData}
          width={screenWidth - cardPadding - Spacing.md * 2}
          height={220}
          chartConfig={chartConfig}
          bezier
          style={styles.chart}
          yAxisSuffix={chartData.suffix}
        />
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
    padding: Spacing.md,
  },
  header: {
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.xs,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: Colors.background,
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
  activeTab: {
    backgroundColor: Colors.primary,
  },
  chartWrapper: {
    alignItems: 'center',
    marginLeft: -Spacing.md, // offset internal chartkit padding 
  },
  chart: {
    borderRadius: BorderRadius.medium,
  }
});
