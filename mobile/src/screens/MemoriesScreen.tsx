import { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import {
  calculateGapStats,
  filterMemories,
  getUpcomingBirthdays,
  getTopEntities,
  extractEntities,
  Memory,
  Person,
  Tag,
} from '../domain';
import { entityColors, theme } from '../theme';
import ActivityHeatmap from '../components/ActivityHeatmap';
import EntityInput from '../components/EntityInput';
import MemoryCard from '../components/MemoryCard';
import { AppText, Button, Card, DateFilterField, Page } from '../components/ui';

type Props = {
  memories: Memory[];
  people: Person[];
  tags: Tag[];
  onEdit: (memory: Memory) => void;
};

function dateLabel(value: string) {
  return new Date(value).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function days(value: number) {
  return `${value.toFixed(2)} d`;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card style={styles.stat}>
      <AppText muted style={styles.statLabel}>{label}</AppText>
      <AppText bold accent style={styles.statValue}>{value}</AppText>
    </Card>
  );
}

export default function MemoriesScreen({
  memories,
  people,
  tags,
  onEdit,
}: Props) {
  const [tab, setTab] = useState<'memories' | 'analytics'>('memories');
  const [query, setQuery] = useState('');
  const [since, setSince] = useState('');
  const [until, setUntil] = useState('');
  const [heatmapYear, setHeatmapYear] = useState(() => new Date().getFullYear());
  const filtered = useMemo(
    () => filterMemories(memories, query, since, until),
    [memories, query, since, until],
  );
  const stats = useMemo(() => calculateGapStats(filtered), [filtered]);
  const upcomingBirthdays = useMemo(() => getUpcomingBirthdays(people), [people]);
  const searchedEntities = useMemo(() => extractEntities(query), [query]);
  const topTags = useMemo(
    () => getTopEntities(filtered, 'tags', searchedEntities.tags),
    [filtered, searchedEntities.tags],
  );
  const topMentions = useMemo(
    () => getTopEntities(filtered, 'people', searchedEntities.people),
    [filtered, searchedEntities.people],
  );

  const addEntityFilter = (token: string) => {
    const nextQuery = `${query.trim()} ${token} `.trimStart();
    setQuery(nextQuery);
  };

  return (
    <View style={styles.screen}>
      <Page style={styles.page}>
        <View style={styles.titleRow}>
          <AppText bold accent style={styles.title}>MEMORIES</AppText>
        </View>
        <View style={styles.filterRow}>
          <View style={styles.search}>
            <EntityInput
              value={query}
              onChangeText={setQuery}
              people={people}
              tags={tags}
              memories={memories}
            />
          </View>
          <Button
            title="CLEAR"
            secondary
            onPress={() => {
              setQuery('');
              setSince('');
              setUntil('');
            }}
            style={styles.clearButton}
          />
        </View>
        <View style={styles.dateRow}>
          <DateFilterField
            compact
            label="SINCE"
            value={since}
            onChange={setSince}
          />
          <DateFilterField
            compact
            label="UNTIL"
            value={until}
            onChange={setUntil}
          />
        </View>
        <View style={styles.topEntities}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.entityRow}
          >
            {topTags.length ? (
              topTags.map((tag, index) => (
                <Pressable key={tag.name} onPress={() => addEntityFilter(`#${tag.name}`)}>
                  <AppText numberOfLines={1} style={[styles.entityText, { color: entityColors[index % entityColors.length] }]}>
                    {tag.name} ({tag.usageCount})
                  </AppText>
                </Pressable>
              ))
            ) : (
              <AppText numberOfLines={1} accent style={styles.emptyEntityText}>NO AVAILABLE TAGS</AppText>
            )}
          </ScrollView>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.entityRow}
          >
            {topMentions.length ? (
              topMentions.map((mention, index) => (
                <Pressable key={mention.name} onPress={() => addEntityFilter(`@${mention.name}`)}>
                  <AppText
                    numberOfLines={1}
                    style={[
                      styles.entityText,
                      { color: entityColors[(index + topTags.length) % entityColors.length] },
                    ]}
                  >
                    @{mention.name} ({mention.usageCount})
                  </AppText>
                </Pressable>
              ))
            ) : (
              <AppText numberOfLines={1} accent style={styles.emptyEntityText}>NO AVAILABLE MENTIONS</AppText>
            )}
          </ScrollView>
        </View>
        {upcomingBirthdays.length > 0 && (
          <View style={styles.birthdays}>
            {upcomingBirthdays.map(({ person, date }) => (
              <AppText key={person.id} muted>
                {(person.fullName.trim() || `@${person.mentionKey}`)} has birthday on{' '}
                <AppText accent>{date.toLocaleDateString([], { month: 'short', day: 'numeric' })}</AppText>.
              </AppText>
            ))}
          </View>
        )}
        <View style={styles.tabs}>
          {(['memories', 'analytics'] as const).map(item => (
            <Pressable
              key={item}
              onPress={() => setTab(item)}
              style={[styles.tab, tab === item && styles.activeTab]}
            >
              <AppText bold accent={tab === item}>{item.toUpperCase()}</AppText>
            </Pressable>
          ))}
        </View>
        {tab === 'memories' ? (
          <View style={styles.list}>
            {filtered.length === 0 ? (
              <Card><AppText muted>No memories match these filters.</AppText></Card>
            ) : (
              filtered.map(memory => (
                <Pressable key={memory.id} onPress={() => onEdit(memory)}>
                  <MemoryCard memory={memory} />
                </Pressable>
              ))
            )}
          </View>
        ) : (
          <View style={styles.analytics}>
            <Card>
              <View style={styles.heatmapHeader}>
                <AppText bold accent>ACTIVITY</AppText>
                <View style={styles.yearNavigation}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Show ${heatmapYear - 1}`}
                    onPress={() => setHeatmapYear(year => year - 1)}
                    hitSlop={8}
                  >
                    <AppText accent style={styles.yearArrow}>‹</AppText>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Show next year after ${heatmapYear}`}
                    onPress={() => setHeatmapYear(year => year + 1)}
                    hitSlop={8}
                  >
                    <AppText bold accent style={styles.yearLabel}>{heatmapYear}</AppText>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Show ${heatmapYear + 1}`}
                    onPress={() => setHeatmapYear(year => year + 1)}
                    hitSlop={8}
                  >
                    <AppText accent style={styles.yearArrow}>›</AppText>
                  </Pressable>
                </View>
              </View>
              <ActivityHeatmap
                memories={filtered}
                year={heatmapYear}
              />
              <AppText muted style={styles.hint}>
                {filtered.length} matching memories across your selected filters.
              </AppText>
            </Card>
            <View style={styles.statsGrid}>
              <Stat label="TOTAL" value={String(stats.count)} />
              <Stat label="MEAN GAP" value={days(stats.mean)} />
              <Stat label="MEDIAN GAP" value={days(stats.median)} />
              <Stat label="STD DEV" value={days(stats.standardDeviation)} />
              <Stat label="MIN GAP" value={days(stats.minimum)} />
              <Stat label="MAX GAP" value={days(stats.maximum)} />
            </View>
            <Card>
              <AppText muted>FIRST MEMORY</AppText>
              <AppText accent>{stats.firstDate ? dateLabel(stats.firstDate) : '—'}</AppText>
              <AppText muted>LAST MEMORY</AppText>
              <AppText accent>{stats.lastDate ? dateLabel(stats.lastDate) : '—'}</AppText>
            </Card>
          </View>
        )}
      </Page>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  page: { paddingBottom: 16 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 19, letterSpacing: 1.5 },
  hint: { fontSize: 10 },
  filterRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  search: { flex: 1 },
  clearButton: { minHeight: 46, paddingHorizontal: 10 },
  dateRow: { flexDirection: 'row', justifyContent: 'flex-start', gap: 8, marginTop: -8 },
  topEntities: { gap: 2, paddingHorizontal: 2 },
  birthdays: { gap: 2 },
  entityRow: { flexDirection: 'row', flexWrap: 'nowrap', alignItems: 'center', gap: 8 },
  entityText: { fontSize: 10, lineHeight: 18 },
  emptyEntityText: { fontSize: 9 },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: theme.border },
  heatmapHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  yearNavigation: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  yearArrow: { fontSize: 24, lineHeight: 28 },
  yearLabel: { fontSize: 14, minWidth: 42, textAlign: 'center' },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  activeTab: { borderBottomColor: theme.green },
  list: { gap: 10 },
  analytics: { gap: 12 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  stat: { width: '48%', minHeight: 78, justifyContent: 'space-between' },
  statLabel: { fontSize: 10 },
  statValue: { fontSize: 18 },
});
