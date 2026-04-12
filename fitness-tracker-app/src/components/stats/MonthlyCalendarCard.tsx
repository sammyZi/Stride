import React, { useState, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Card } from '../common/Card';
import { Text } from '../common/Text';
import { ActivityCard } from '../activity/ActivityCard';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';
import { Activity, UnitSystem } from '../../types';

interface MonthlyCalendarCardProps {
  activities: Activity[];
  units: UnitSystem;
}

const DAYS_OF_WEEK = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export const MonthlyCalendarCard: React.FC<MonthlyCalendarCardProps> = ({ activities, units }) => {
  const navigation = useNavigation<any>();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(new Date().toDateString());

  // Group activities by date string
  const activitiesByDate = useMemo(() => {
    const map = new Map<string, Activity[]>();
    activities.forEach(activity => {
      const d = new Date(activity.startTime).toDateString();
      if (!map.has(d)) {
        map.set(d, []);
      }
      map.get(d)!.push(activity);
    });
    return map;
  }, [activities]);

  // Generate calendar grid for current month
  const calendarGrid = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const grids: any[] = [];
    let currentWeek: any[] = Array(7).fill(null);
    let dayCount = 1;
    let dayCursor = firstDay.getDay();

    while (dayCount <= lastDay.getDate()) {
      const dateObj = new Date(year, month, dayCount);
      const ds = dateObj.toDateString();
      
      currentWeek[dayCursor] = {
        date: dateObj,
        dayNum: dayCount,
        dateStr: ds,
        hasActivity: activitiesByDate.has(ds),
        isToday: ds === new Date().toDateString()
      };

      dayCursor++;
      if (dayCursor > 6) {
        grids.push(currentWeek);
        currentWeek = Array(7).fill(null);
        dayCursor = 0;
      }
      dayCount++;
    }

    if (currentWeek.some(d => d !== null)) {
      grids.push(currentWeek);
    }

    return grids;
  }, [currentDate, activitiesByDate]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const selectedDayActivities = selectedDate ? activitiesByDate.get(selectedDate) || [] : [];
  
  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <View style={styles.container}>
      <Card variant="outlined" style={styles.card}>
        {/* Header: Month Navigation */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handlePrevMonth} style={styles.navButton}>
            <Text variant="small" weight="semiBold" color={Colors.primary}>&lt; Prev</Text>
          </TouchableOpacity>
          <Text variant="mediumLarge" weight="bold" color={Colors.textPrimary}>
            {monthName}
          </Text>
          <TouchableOpacity onPress={handleNextMonth} style={styles.navButton}>
            <Text variant="small" weight="semiBold" color={Colors.primary}>Next &gt;</Text>
          </TouchableOpacity>
        </View>

        {/* Days Header */}
        <View style={styles.daysHeaderRow}>
          {DAYS_OF_WEEK.map((day, i) => (
             <Text key={`day_${i}`} variant="small" weight="semiBold" color={Colors.textSecondary} style={styles.dayCol}>
               {day}
             </Text>
          ))}
        </View>

        {/* Calendar Grid */}
        <View style={styles.gridContainer}>
          {calendarGrid.map((week, wIndex) => (
            <View key={`week_${wIndex}`} style={styles.weekRow}>
              {week.map((day: any, dIndex: number) => {
                if (!day) return <View key={`empty_${wIndex}_${dIndex}`} style={styles.dayCell} />;
                
                const isSelected = selectedDate === day.dateStr;
                const isTodaySelected = day.isToday && isSelected;
                const isTodayNotSelected = day.isToday && !isSelected;

                // Determine text color explicitly
                let textColor = Colors.textPrimary;
                if (isSelected) {
                  textColor = '#fff';
                } else if (day.isToday) {
                  textColor = Colors.primary;
                }

                return (
                  <TouchableOpacity
                    key={`day_${day.dateStr}_${isSelected ? 's' : 'u'}`}
                    style={styles.dayCell}
                    onPress={() => setSelectedDate(day.dateStr)}
                  >
                    <View style={[
                      styles.dateCircle,
                      isSelected && styles.dateCircleSelected,
                      isTodayNotSelected && styles.dateCircleToday
                    ]}>
                      <Text 
                        variant="medium" 
                        weight={isSelected || day.isToday ? 'bold' : 'regular'}
                        color={textColor}
                      >
                        {day.dayNum}
                      </Text>
                    </View>
                    
                    {/* Activity Indicator like Google Fit - filled ring */}
                    <View style={styles.indicatorContainer}>
                      {day.hasActivity && (
                        <View style={[
                          styles.activityDot,
                          isSelected && styles.activityDotSelected
                        ]} />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>
      </Card>

      {/* Activities List for Selected Day */}
      {selectedDate && (
        <View style={styles.activitiesList}>
          <Text variant="medium" weight="semiBold" style={styles.selectedDateTitle}>
            {new Date(selectedDate).toLocaleDateString('default', { weekday: 'long', month: 'long', day: 'numeric'})}
          </Text>
          
          {selectedDayActivities.length === 0 ? (
            <Text variant="small" color={Colors.textSecondary} style={styles.noActivity}>
              No activities on this day.
            </Text>
          ) : (
            selectedDayActivities.map((activity, index) => (
              <View key={`act_${activity.id}_${index}`} style={styles.activityCardWrapper}>
                <ActivityCard 
                  activity={activity} 
                  units={units} 
                  onPress={() => navigation.navigate('ActivityDetail', { activityId: activity.id })}
                />
              </View>
            ))
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.xl,
  },
  card: {
    marginHorizontal: Spacing.lg,
    padding: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.xs,
  },
  navButton: {
    padding: Spacing.xs,
  },
  daysHeaderRow: {
    flexDirection: 'row',
    marginBottom: Spacing.sm,
  },
  dayCol: {
    flex: 1,
    textAlign: 'center',
  },
  gridContainer: {
    gap: Spacing.sm,
  },
  weekRow: {
    flexDirection: 'row',
  },
  dayCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    height: 48,
  },
  dateCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    overflow: 'hidden',
  },
  dateCircleSelected: {
    backgroundColor: Colors.primary,
  },
  dateCircleToday: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.primary,
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
    backgroundColor: Colors.success,
    overflow: 'hidden',
  },
  activityDotSelected: { // make it pop even if selected Date is white
    backgroundColor: Colors.success,
  },
  activitiesList: {
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
  },
  selectedDateTitle: {
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
    marginLeft: Spacing.xs, // alignment
  },
  noActivity: {
    marginLeft: Spacing.xs,
    fontStyle: 'italic',
  },
  activityCardWrapper: {
    marginBottom: Spacing.md, // Spacing between activities when multiple stacked
  }
});
