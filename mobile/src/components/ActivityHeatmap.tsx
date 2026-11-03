import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { localDateKey, Memory } from '../domain';
import { theme } from '../theme';
import { AppText } from './ui';

export default function ActivityHeatmap({
  memories,
  start,
  end,
}: {
  memories: Memory[];
  start: Date;
  end: Date;
}) {
  const { weeks, counts } = useMemo(() => {
    const rangeDays =
      (Date.UTC(end.getFullYear(), end.getMonth(), end.getDate()) -
        Date.UTC(start.getFullYear(), start.getMonth(), start.getDate())) /
        86_400_000 +
      1;
    const result: (Date | null)[][] = [];
    for (let offset = 0; offset < rangeDays; offset += 7) {
      const week: (Date | null)[] = [];
      for (let day = 0; day < 7; day += 1) {
        const dayOffset = offset + day;
        if (dayOffset >= rangeDays) {
          week.push(null);
          continue;
        }
        const date = new Date(start);
        date.setDate(start.getDate() + dayOffset);
        week.push(date);
      }
      result.push(week);
    }
    const values = new Map<string, number>();
    const firstDayKey = localDateKey(start);
    const lastDayKey = localDateKey(end);
    for (const memory of memories) {
      const key = localDateKey(memory.occurredAt);
      if (key < firstDayKey || key > lastDayKey) continue;
      values.set(key, (values.get(key) ?? 0) + 1);
    }
    return { weeks: result, counts: values };
  }, [end, memories, start]);

  const max = Math.max(1, ...counts.values());
  const monthLabels = weeks.map((week, index) => {
    const date = week.find((day): day is Date => day !== null);
    if (!date) return '';
    const month = date.getMonth();
    const previousDate = index > 0
      ? weeks[index - 1].find((day): day is Date => day !== null)
      : undefined;
    const previousMonth = previousDate?.getMonth() ?? -1;
    return month === previousMonth
      ? ''
      : date.toLocaleString('default', { month: 'short' });
  });
  const firstDay = start.getDay();
  const dayLabels = Array.from({ length: 7 }, (_, index) =>
    new Date(2024, 0, 7 + ((firstDay + index) % 7)).toLocaleString('default', {
      weekday: 'narrow',
    }),
  );

  return (
    <View style={styles.wrapper}>
      <View style={styles.labels}>
        {dayLabels.map((day, index) => (
          <AppText key={`${day}-${index}`} muted style={styles.dayLabel}>{day}</AppText>
        ))}
      </View>
      <View style={styles.chart}>
        <View style={[styles.months, { width: weeks.length * 7 }]}>
          {monthLabels.map((month, index) =>
            month ? (
              <AppText
                key={`month-${index}`}
                muted
                numberOfLines={1}
                style={[styles.monthLabel, { left: index * 7 }]}
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
                if (!date) return <View key={dayIndex} style={styles.emptyCell} />;
                const key = localDateKey(date);
                const count = counts.get(key) ?? 0;
                const opacity = count === 0 ? 0.16 : 0.35 + (count / max) * 0.65;
                return (
                  <View
                    key={dayIndex}
                    accessibilityLabel={`${key}: ${count} memories`}
                    style={[styles.cell, { opacity, backgroundColor: theme.green }]}
                  />
                );
              })}
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flexDirection: 'row', gap: 5 },
  chart: { flex: 1 },
  labels: { justifyContent: 'space-between', paddingVertical: 1 },
  dayLabel: { height: 7, fontSize: 7, lineHeight: 7 },
  weeks: { flexDirection: 'row', gap: 1 },
  months: { position: 'relative', height: 12, marginBottom: 3 },
  monthLabel: { position: 'absolute', width: 25, fontSize: 7, lineHeight: 10 },
  week: { gap: 1 },
  cell: { width: 6, height: 6, borderRadius: 2 },
  emptyCell: { width: 6, height: 6 },
});
