import { useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { deleteMemory } from '../database';
import {
  calculateGapStats,
  filterMemories,
  Memory,
  Person,
  Tag,
} from '../domain';
import { theme } from '../theme';
import ActivityHeatmap from '../components/ActivityHeatmap';
import EntityInput from '../components/EntityInput';
import { AppText, Button, Card, DateFilterField, Page } from '../components/ui';

type Props = {
  memories: Memory[];
  people: Person[];
  tags: Tag[];
  onCreate: () => void;
  onEdit: (memory: Memory) => void;
  onChanged: () => Promise<void>;
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
  onCreate,
  onEdit,
  onChanged,
}: Props) {
  const [tab, setTab] = useState<'memories' | 'analytics'>('memories');
  const [query, setQuery] = useState('');
  const [since, setSince] = useState('');
  const [until, setUntil] = useState('');
  const filtered = useMemo(
    () => filterMemories(memories, query, since, until),
    [memories, query, since, until],
  );
  const stats = useMemo(() => calculateGapStats(filtered), [filtered]);

  const remove = (memory: Memory) => {
    Alert.alert('Delete memory?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteMemory(memory.id);
            await onChanged();
          } catch (error) {
            Alert.alert('Could not delete memory', error instanceof Error ? error.message : String(error));
          }
        },
      },
    ]);
  };

  return (
    <Page>
      <View style={styles.titleRow}>
        <AppText bold accent style={styles.title}>MEMORIES</AppText>
        <Button title="+ NEW" onPress={onCreate} style={styles.newButton} />
      </View>
      <EntityInput
        label="FILTER BY ENTITIES ONLY"
        value={query}
        onChangeText={setQuery}
        people={people}
        tags={tags}
        memories={memories}
      />
      <AppText muted style={styles.hint}>
        Plain text is ignored. Add #tag, @person, or &amp;place to filter.
      </AppText>
      <View style={styles.dateRow}>
        <DateFilterField
          label="SINCE"
          value={since}
          onChange={setSince}
        />
        <DateFilterField
          label="UNTIL"
          value={until}
          onChange={setUntil}
        />
      </View>
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
                <Card style={styles.memoryCard}>
                  <View style={styles.memoryTop}>
                    <AppText bold accent>
                      {memory.type === 'expense' ? 'EXPENSE' : 'MEMO'}
                      {memory.amount != null ? `  ·  ${memory.amount.toLocaleString()} Toman` : ''}
                    </AppText>
                    <Pressable
                      accessibilityRole="button"
                      onPress={event => {
                        event.stopPropagation();
                        remove(memory);
                      }}
                    >
                      <AppText style={styles.delete}>DELETE</AppText>
                    </Pressable>
                  </View>
                  <AppText>{memory.content}</AppText>
                  <AppText muted style={styles.date}>{dateLabel(memory.occurredAt)}</AppText>
                </Card>
              </Pressable>
            ))
          )}
        </View>
      ) : (
        <View style={styles.analytics}>
          <Card>
            <AppText bold accent>ACTIVITY · LAST 12 MONTHS</AppText>
            <ActivityHeatmap memories={filtered} />
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
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 19, letterSpacing: 1.5 },
  newButton: { minHeight: 38 },
  hint: { fontSize: 10 },
  dateRow: { flexDirection: 'row', gap: 8 },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: theme.border },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  activeTab: { borderBottomColor: theme.green },
  list: { gap: 10 },
  memoryCard: { gap: 10 },
  memoryTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  delete: { color: theme.danger, fontSize: 10 },
  date: { fontSize: 10 },
  analytics: { gap: 12 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  stat: { width: '48%', minHeight: 78, justifyContent: 'space-between' },
  statLabel: { fontSize: 10 },
  statValue: { fontSize: 18 },
});
