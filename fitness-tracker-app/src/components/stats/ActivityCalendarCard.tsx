import React, { useMemo } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { ContributionGraph } from 'react-native-chart-kit';
import { Card } from '../common/Card';
import { Text } from '../common/Text';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';
import { Activity } from '../../types';

interface ActivityCalendarCardProps {
  activities: Activity[];
}

const screenWidth = Dimensions.get('window').width;
const cardPadding = Spacing.lg * 2; // padding left + right from safe area/card

export const ActivityCalendarCard: React.FC<ActivityCalendarCardProps> = ({ activities }) => {
  // Process activities into the format react-native-chart-kit expects:
  // [{ date: "YYYY-MM-DD", count: <number> }]
  const heatmapData = useMemo(() => {
    const counts: Record<string, number> = {};

    activities.forEach(activity => {
      const date = new Date(activity.startTime);
      // Format as YYYY-MM-DD
      const dateStr = date.toISOString().split('T')[0];
      counts[dateStr] = (counts[dateStr] || 0) + 1;
    });

    return Object.keys(counts).map(dateStr => ({
      date: dateStr,
      count: counts[dateStr],
    }));
  }, [activities]);

  const chartConfig = {
    backgroundGradientFrom: Colors.surface,
    backgroundGradientTo: Colors.surface,
    color: (opacity = 1) => `rgba(67, 97, 238, ${opacity})`, // Using Colors.primary roughly
    labelColor: (opacity = 1) => `rgba(160, 160, 160, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.5,
  };

  const endDate = new Date();
  
  if (activities.length === 0) {
    return null;
  }

  return (
    <Card variant="outlined" style={styles.card}>
      <View style={styles.header}>
        <Text variant="mediumLarge" weight="semiBold" color={Colors.textPrimary}>
          Activity Calendar
        </Text>
        <Text variant="small" color={Colors.textSecondary}>
          {heatmapData.length} active days
        </Text>
      </View>

      <View style={styles.chartContainer}>
        <ContributionGraph
          values={heatmapData}
          endDate={endDate}
          numDays={90}
          width={screenWidth - cardPadding - Spacing.md * 2}
          height={200}
          chartConfig={chartConfig}
          tooltipDataAttrs={(value) => ({ rx: '2', ry: '2' })}
          squareSize={20}
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
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.xs,
  },
  chartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -Spacing.lg, // slightly offset due to chart padding bug in library
  },
});
