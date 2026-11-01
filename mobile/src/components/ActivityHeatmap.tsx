import { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Memory } from '../domain';
import { theme } from '../theme';
import { AppText } from './ui';

function dayKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function ActivityHeatmap({ memories }: { memories: Memory[] }) {
  const { weeks, counts } = useMemo(() => {
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - 363);
    start.setDate(start.getDate() - start.getDay());
    const result: Date[][] = [];
    const cursor = new Date(start);
    while (cursor <= now) {
      const week: Date[] = [];
      for (let day = 0; day < 7; day += 1) {
        week.push(new Date(cursor));
        cursor.setDate(cursor.getDate() + 1);
      }
      result.push(week);
    }
    const values = new Map<string, number>();
    for (const memory of memories) {
      const key = dayKey(new Date(memory.occurredAt));
      values.set(key, (values.get(key) ?? 0) + 1);
    }
    return { weeks: result, counts: values };
  }, [memories]);

  const max = Math.max(1, ...counts.values());
  const monthLabels = weeks.map((week, index) => {
    const month = week[0].getMonth();
    const previousMonth = index > 0 ? weeks[index - 1][0].getMonth() : -1;
    return month === previousMonth
      ? ''
      : week[0].toLocaleString('default', { month: 'short' });
  });
  return (
    <View style={styles.wrapper}>
      <View style={styles.labels}>
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
          <AppText key={`${day}-${index}`} muted style={styles.dayLabel}>{day}</AppText>
        ))}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroll}>
        <View>
          <View style={[styles.months, { width: weeks.length * 9 }]}>
            {monthLabels.map((month, index) =>
              month ? (
                <AppText
                  key={`month-${index}`}
                  muted
                  numberOfLines={1}
                  style={[styles.monthLabel, { left: index * 9 }]}
                >
                  {month}
                </AppText>
              ) : null,
            )}
          </View>
          <View style={styles.weeks}>
            {weeks.map((week, index) => (
              <View key={index} style={styles.week}>
                {week.map((date, dayIndex) => {
                  const count = counts.get(dayKey(date)) ?? 0;
                  const opacity = count === 0 ? 0.16 : 0.35 + (count / max) * 0.65;
                  return (
                    <View
                      key={dayIndex}
                      accessibilityLabel={`${dayKey(date)}: ${count} memories`}
                      style={[styles.cell, { opacity, backgroundColor: theme.green }]}
                    />
                  );
                })}
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flexDirection: 'row', gap: 5 },
  scroll: { flex: 1 },
  labels: { justifyContent: 'space-between', paddingVertical: 1 },
  dayLabel: { height: 11, fontSize: 8, lineHeight: 11 },
  weeks: { flexDirection: 'row', gap: 2 },
  months: { position: 'relative', height: 12, marginBottom: 3 },
  monthLabel: { position: 'absolute', width: 28, fontSize: 7, lineHeight: 10 },
  week: { gap: 2 },
  cell: { width: 7, height: 7, borderRadius: 2 },
});
