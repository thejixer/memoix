import { useCallback, useRef, useState } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent, StyleSheet, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import {
  ExpenseAnalytics,
  getExpenseAnalytics,
  getExpensesOnDate,
} from '../database';
import { Memory } from '../domain';
import { AppText, Card, DateFilterField, Page } from '../components/ui';
import { CompositeBarChart, DailyLineChart } from '../components/ExpenseCharts';

const EXPENSES_BATCH_SIZE = 40;
const SCROLL_LOAD_THRESHOLD = 240;

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

const emptyAnalytics: ExpenseAnalytics = {
  days: [],
  total: 0,
  topTags: [],
  topPeople: [],
};

export default function ExpenseAnalyticsScreen() {
  const [since, setSince] = useState(() => getDefaultDateRange().since);
  const [until, setUntil] = useState(() => getDefaultDateRange().until);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState(emptyAnalytics);
  const [selectedDay, setSelectedDay] = useState<Memory[]>([]);
  const [selectedDayTotal, setSelectedDayTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const loadMoreLock = useRef(false);
  const requestGeneration = useRef(0);
  const currentFocusDate = selectedDate ?? analytics.days[analytics.days.length - 1]?.date ?? null;

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const generation = ++requestGeneration.current;
      setLoading(true);
      setLoadingMore(false);
      setFailure(null);
      setSelectedDay([]);
      setSelectedDayTotal(0);
      loadMoreLock.current = false;
      const fallback = getDefaultDateRange();
      getExpenseAnalytics(since, until, fallback.since, fallback.until)
        .then(async nextAnalytics => {
          if (!active) return;
          setAnalytics(nextAnalytics);
          const date = selectedDate ?? nextAnalytics.days[nextAnalytics.days.length - 1]?.date;
          if (!date) {
            setSelectedDay([]);
            setSelectedDayTotal(0);
            return;
          }
          const page = await getExpensesOnDate(date, EXPENSES_BATCH_SIZE, 0);
          if (!active) return;
          setSelectedDay(page.items);
          setSelectedDayTotal(page.total);
        })
        .catch(error => {
          if (active) {
            setFailure(error instanceof Error ? error.message : String(error));
          }
        })
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => {
        active = false;
        if (requestGeneration.current === generation) {
          requestGeneration.current += 1;
        }
        loadMoreLock.current = false;
      };
    }, [selectedDate, since, until]),
  );

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

  const focusDate = currentFocusDate;
  const dailyAmounts = analytics.days.map(day => day.total);
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
        dailyAmounts.reduce(
          (sum, amount) => sum + (amount - dailyMean) ** 2,
          0,
        ) / dailyAmounts.length,
      )
    : 0;
  const maxDay = analytics.days.reduce<(typeof analytics.days)[number] | null>(
    (best, day) => (best == null || day.total > best.total ? day : best),
    null,
  );
  const minDay = analytics.days.reduce<(typeof analytics.days)[number] | null>(
    (best, day) => (best == null || day.total < best.total ? day : best),
    null,
  );

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (
      !focusDate ||
      loading ||
      loadingMore ||
      loadMoreLock.current ||
      selectedDay.length >= selectedDayTotal
    ) return;
    const { contentOffset, layoutMeasurement, contentSize } = event.nativeEvent;
    if (
      contentOffset.y + layoutMeasurement.height >=
      contentSize.height - SCROLL_LOAD_THRESHOLD
    ) {
      loadMoreLock.current = true;
      setLoadingMore(true);
      const generation = requestGeneration.current;
      getExpensesOnDate(focusDate, EXPENSES_BATCH_SIZE, selectedDay.length)
        .then(page => {
          if (requestGeneration.current !== generation) return;
          setSelectedDay(current => [...current, ...page.items]);
          setSelectedDayTotal(page.total);
        })
        .catch(error => {
          if (requestGeneration.current === generation) {
            setFailure(error instanceof Error ? error.message : String(error));
          }
        })
        .finally(() => {
          if (requestGeneration.current === generation) {
            loadMoreLock.current = false;
            setLoadingMore(false);
          }
        });
    }
  };

  return (
    <Page onScroll={onScroll}>
      <AppText bold accent style={styles.title}>EXPENSE ANALYTICS</AppText>
      <View style={styles.dates}>
        <View style={styles.dateSlot}>
          <DateFilterField
            label="SINCE"
            value={since}
            compact
            clearInside
            onChange={value => {
              setSince(value);
              setSelectedDate(null);
            }}
          />
        </View>
        <View style={styles.dateSlot}>
          <DateFilterField
            label="UNTIL"
            value={until}
            compact
            clearInside
            onChange={value => {
              setUntil(value);
              setSelectedDate(null);
            }}
          />
        </View>
      </View>
      {failure ? <Card><AppText>{failure}</AppText></Card> : null}
      <View style={styles.statsGrid}>
        {[
          ['TOTAL', analytics.total],
          ['MEAN', dailyMean],
          ['MEDIAN', dailyMedian],
          ['STDV', dailyStdDev],
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
        data={analytics.days}
        selectedDate={focusDate}
        onSelect={setSelectedDate}
      />
      <Card>
        <AppText bold accent>
          {focusDate ? `EXPENSES · ${focusDate}` : 'EXPENSES · SELECT A DAY'}
        </AppText>
        {loading && !selectedDay.length ? (
          <AppText muted>Loading expenses…</AppText>
        ) : selectedDay.length ? (
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
        {loadingMore ? <AppText muted>Loading more…</AppText> : null}
      </Card>
      <CompositeBarChart title="TOP 20 TAG COMBINATIONS" data={analytics.topTags} />
      <CompositeBarChart title="TOP 20 PERSON COMBINATIONS" data={analytics.topPeople} />
    </Page>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 18, letterSpacing: 1 },
  dates: { flexDirection: 'row', width: '100%', gap: 8 },
  dateSlot: { width: '48%' },
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
