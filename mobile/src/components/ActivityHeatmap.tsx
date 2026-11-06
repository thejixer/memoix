import { ComponentRef, useMemo, useRef } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { localDateKey } from '../domain';
import { useTheme } from '../theme';
import { AppText } from './ui';

export default function ActivityHeatmap({
  counts,
  year,
}: {
  counts: Record<string, number>;
  year: number;
}) {
  const { theme } = useTheme();
  const chartRef = useRef<ComponentRef<typeof ScrollView> | null>(null);
  const { weeks } = useMemo(() => {
    const start = new Date(year, 0, 1, 12);
    const end = new Date(year, 11, 31, 12);
    const gridStart = new Date(year, 0, 1 - start.getDay(), 12);
    const rangeDays =
      (Date.UTC(end.getFullYear(), end.getMonth(), end.getDate()) -
        Date.UTC(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate())) /
      86_400_000 + 1;
    const gridDays = Math.ceil(rangeDays / 7) * 7;
    const result: (Date | null)[][] = [];
    for (let offset = 0; offset < gridDays; offset += 7) {
      const week: (Date | null)[] = [];
      for (let day = 0; day < 7; day += 1) {
        const dayOffset = offset + day;
        const date = new Date(gridStart);
        date.setDate(gridStart.getDate() + dayOffset);
        week.push(date.getFullYear() === year ? date : null);
      }
      result.push(week);
    }
    return { weeks: result };
  }, [year]);

  const max = Math.max(1, ...Object.values(counts));
  const monthLabels = weeks.map((week, index) => {
    const date = week.find((day): day is Date => day !== null);
    if (!date) return '';
    const month = date.getMonth();
    const previousMonth = index > 0
      ? weeks[index - 1].find((day): day is Date => day !== null)?.getMonth() ?? -1
      : -1;
    return month === previousMonth ? '' : date.toLocaleString('default', { month: 'short' });
  });
  const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  return (
    <View style={styles.wrapper}>
      <View style={styles.labels}>
        {dayLabels.map((day, index) => (
          <AppText key={`${day}-${index}`} muted style={styles.dayLabel}>{day}</AppText>
        ))}
      </View>
      <ScrollView
        ref={chartRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chart}
        onContentSizeChange={() => chartRef.current?.scrollToEnd({ animated: false })}
      >
        <View style={{ width: weeks.length * 7 }}>
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
                  const count = counts[key] ?? 0;
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
      </ScrollView>
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
