import React, { useMemo } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Card } from '../common/Card';
import { Text } from '../common/Text';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';
import { Activity } from '../../types';

interface TimelineCalendarCardProps {
  activities: Activity[];
}

export const TimelineCalendarCard: React.FC<TimelineCalendarCardProps> = ({ activities }) => {
  // Generate the last 14 days and check for activities
  const days = useMemo(() => {
    // Determine which dates have activities
    const activityDates = new Set<string>();
    activities.forEach(activity => {
      const d = new Date(activity.startTime);
      activityDates.add(d.toDateString());
    });

    const result = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Go back 14 days
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      
      const isToday = i === 0;
      const hasActivity = activityDates.has(d.toDateString());
      
      result.push({
        date: d,
        dayStr: d.toLocaleDateString('en-US', { weekday: 'short' }),
        dateNum: d.getDate(),
        isToday,
        hasActivity,
      });
    }

    return result;
  }, [activities]);

  return (
    <Card variant="outlined" style={styles.card}>
      <View style={styles.header}>
        <Text variant="mediumLarge" weight="semiBold" color={Colors.textPrimary}>
          Daily Timeline
        </Text>
      </View>

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        // Scroll to the end (today) on load
        onContentSizeChange={(w, h) => {
           // We could use a ref to scrollToEnd, but React Native ScrollView 
           // usually starts at the left. Users can scroll right to today.
           // Setting inverted={false} and scrolling is tricky, so we'll just leave it default.
        }}
      >
        {days.map((day, index) => {
          return (
            <View key={index} style={styles.dayColumn}>
              <Text 
                variant="extraSmall" 
                color={day.isToday ? Colors.primary : Colors.textSecondary}
                weight={day.isToday ? 'bold' : 'regular'}
                style={styles.dayStr}
              >
                {day.dayStr.charAt(0)}
              </Text>
              
              <View style={[
                styles.dateCircle, 
                day.isToday && styles.todayCircle
              ]}>
                <Text 
                  variant="medium" 
                  color={day.isToday ? '#fff' : Colors.textPrimary}
                  weight={day.isToday ? 'bold' : 'medium'}
                >
                  {day.dateNum}
                </Text>
              </View>

              <View style={styles.indicatorContainer}>
                {day.hasActivity && (
                  <View style={styles.activityDot} />
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
    paddingVertical: Spacing.md,
    paddingHorizontal: 0, // Let scrollview span full width of card
  },
  header: {
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xs,
    gap: 4,
  },
  dayColumn: {
    alignItems: 'center',
    width: 44,
  },
  dayStr: {
    marginBottom: 8,
  },
  dateCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  todayCircle: {
    backgroundColor: Colors.primary,
  },
  indicatorContainer: {
    height: 6,
    width: '100%',
    alignItems: 'center',
  },
  activityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.success, // Use success green for completed activity, or primary
  }
});
