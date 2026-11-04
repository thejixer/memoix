import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import {
  filterMemories,
  getDailyExpenseTotals,
  getTopComposites,
  localDateKey,
  Memory,
} from '../domain';
import { AppText, Card, DateFilterField, Page } from '../components/ui';
import { CompositeBarChart, DailyLineChart } from '../components/ExpenseCharts';

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function getDefaultDateRange(now = new Date()) {
  const since = new Date(now);
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - ((since.getDay() + 1) % 7));
  const until = new Date(since);
  until.setDate(until.getDate() + 6);
  return { since: dateKey(since), until: dateKey(until) };
}

export default function ExpenseAnalyticsScreen({ memories }: { memories: Memory[] }) {
  const [since, setSince] = useState(() => getDefaultDateRange().since);
  const [until, setUntil] = useState(() => getDefaultDateRange().until);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  useFocusEffect(
    useCallback(
      () => () => {
        const range = getDefaultDateRange();
        setSince(range.since);
        setUntil(range.until);
        setSelectedDate(null);
      },
      [],
    ),
  );
  const expenses = useMemo(
    () => filterMemories(memories, '', since, until).filter(item => item.type === 'expense'),
    [memories, since, until],
  );
  const allExpenseDates = memories
    .filter(memory => memory.type === 'expense')
    .map(memory => localDateKey(memory.occurredAt))
    .sort();
  const defaultRange = getDefaultDateRange();
  const chartSince = since || allExpenseDates[0] || defaultRange.since;
  const chartUntil = until || allExpenseDates[allExpenseDates.length - 1] || defaultRange.until;
  const days = useMemo(
    () => getDailyExpenseTotals(expenses, chartSince, chartUntil),
    [expenses, chartSince, chartUntil],
  );
  const topTags = useMemo(() => getTopComposites(expenses, 'tags'), [expenses]);
  const topPeople = useMemo(() => getTopComposites(expenses, 'people'), [expenses]);
  const focusDate = selectedDate ?? days[days.length - 1]?.date ?? null;
  const selectedDay = focusDate
    ? expenses.filter(memory => localDateKey(memory.occurredAt) === focusDate)
    : [];
  const dailyAmounts = days.map(day => day.total);
  const sortedDailyAmounts = [...dailyAmounts].sort((a, b) => a - b);
  const dailyMean = dailyAmounts.length
    ? dailyAmounts.reduce((sum, amount) => sum + amount, 0) / dailyAmounts.length
    : 0;
  const middle = Math.floor(sortedDailyAmounts.length / 2);
  const dailyMedian = !sortedDailyAmounts.length
    ? 0
    : sortedDailyAmounts.length % 2
      ? sortedDailyAmounts[middle]
      : (sortedDailyAmounts[middle - 1] + sortedDailyAmounts[middle]) / 2;
  const dailyStdDev = dailyAmounts.length
    ? Math.sqrt(
        dailyAmounts.reduce((sum, amount) => sum + (amount - dailyMean) ** 2, 0) /
          dailyAmounts.length,
      )
    : 0;
  const maxDay = days.reduce<((typeof days)[number] | null)>(
    (best, day) => (best == null || day.total > best.total ? day : best),
    null,
  );
  const minDay = days.reduce<((typeof days)[number] | null)>(
    (best, day) => (best == null || day.total < best.total ? day : best),
    null,
  );
  const total = expenses.reduce((sum, item) => sum + (item.amount ?? 0), 0);

  return (
    <Page>
      <AppText bold accent style={styles.title}>EXPENSE ANALYTICS</AppText>
      <View style={styles.dates}>
        <DateFilterField
          label="SINCE"
          value={since}
          onChange={value => {
            setSince(value);
            setSelectedDate(null);
          }}
        />
        <DateFilterField
          label="UNTIL"
          value={until}
          onChange={value => {
            setUntil(value);
            setSelectedDate(null);
          }}
        />
      </View>
      <View style={styles.statsGrid}>
        {[
          ['TOTAL', total],
          ['DAILY MEAN', dailyMean],
          ['DAILY MEDIAN', dailyMedian],
          ['STD DEV', dailyStdDev],
          ['MAX DAY', maxDay?.total ?? 0],
          ['MIN DAY', minDay?.total ?? 0],
        ].map(([label, amount]) => (
          <Card key={String(label)} style={styles.stat}>
            <AppText muted style={styles.statLabel}>{label}</AppText>
            <AppText bold accent style={styles.statValue}>
              {Number(amount).toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </AppText>
          </Card>
        ))}
      </View>
      <DailyLineChart
        data={days}
        selectedDate={focusDate}
        onSelect={setSelectedDate}
      />
      <Card>
        <AppText bold accent>
          {focusDate ? `EXPENSES · ${focusDate}` : 'EXPENSES · SELECT A DAY'}
        </AppText>
        {selectedDay.length ? (
          selectedDay.map(expense => {
            const entities = [
              ...expense.tags.map(tag => `#${tag}`),
              ...expense.people.map(person => `@${person}`),
              ...expense.places.map(place => `&${place}`),
            ];
            return (
              <View key={expense.id} style={styles.expenseRow}>
                <AppText>{entities.join(' ') || 'No tags or mentions'}</AppText>
              </View>
            );
          })
        ) : (
          <AppText muted>No expenses on this day.</AppText>
        )}
      </Card>
      <CompositeBarChart title="TOP 20 TAG COMBINATIONS" data={topTags} />
      <CompositeBarChart title="TOP 20 PERSON COMBINATIONS" data={topPeople} />
    </Page>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 18, letterSpacing: 1 },
  dates: { flexDirection: 'row', gap: 8 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  stat: { width: '48%', minHeight: 76, justifyContent: 'space-between' },
  statLabel: { fontSize: 10 },
  statValue: { fontSize: 16 },
  expenseRow: {
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#18351B',
  },
});
