import { useCallback, useRef, useState } from 'react';
import { Alert, NativeScrollEvent, NativeSyntheticEvent, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import {
  deleteTag,
  EntityMemoryOverview,
  getEntityMemoryOverview,
  getEntityMemoryPage,
  saveTag,
} from '../database';
import { Memory, Tag } from '../domain';
import { entityColors, useTheme } from '../theme';
import MemoryCard from '../components/MemoryCard';
import { AppText, Button, Card, Page, TextField } from '../components/ui';

const MEMORY_BATCH_SIZE = 40;
const SCROLL_LOAD_THRESHOLD = 240;
const emptyOverview: EntityMemoryOverview = { total: 0, topTags: [], topPeople: [] };

export default function TagEditorScreen({
  tag,
  onClose,
}: {
  tag: Tag | null;
  onClose: () => void;
}) {
  const { theme } = useTheme();
  const [tab, setTab] = useState<'memories' | 'edit'>(tag ? 'memories' : 'edit');
  const [name, setName] = useState(tag?.name ?? '');
  const [linkedMemories, setLinkedMemories] = useState<Memory[]>([]);
  const [overview, setOverview] = useState<EntityMemoryOverview>(emptyOverview);
  const [loadingMemories, setLoadingMemories] = useState(Boolean(tag));
  const [loadingMore, setLoadingMore] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const loadMoreLock = useRef(false);
  const requestGeneration = useRef(0);
  const topTags = overview.topTags;
  const topMentions = overview.topPeople;

  useFocusEffect(
    useCallback(() => {
      if (!tag) return;
      let active = true;
      const generation = ++requestGeneration.current;
      setLoadingMemories(true);
      setLoadingMore(false);
      setLinkedMemories([]);
      setOverview(emptyOverview);
      setFailure(null);
      Promise.all([
        getEntityMemoryPage('tag', tag.id, MEMORY_BATCH_SIZE, 0),
        getEntityMemoryOverview('tag', tag.id),
      ])
        .then(([page, entityOverview]) => {
          if (!active) return;
          setLinkedMemories(page.items);
          setOverview(entityOverview);
        })
        .catch(error => {
          if (active) {
            setFailure(error instanceof Error ? error.message : String(error));
          }
        })
        .finally(() => {
          if (active) setLoadingMemories(false);
        });
      return () => {
        active = false;
        if (requestGeneration.current === generation) {
          requestGeneration.current += 1;
        }
        loadMoreLock.current = false;
      };
    }, [tag]),
  );

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (
      tab !== 'memories' ||
      !tag ||
      loadingMemories ||
      loadingMore ||
      loadMoreLock.current ||
      linkedMemories.length >= overview.total
    ) return;
    const { contentOffset, layoutMeasurement, contentSize } = event.nativeEvent;
    if (
      contentOffset.y + layoutMeasurement.height >=
      contentSize.height - SCROLL_LOAD_THRESHOLD
    ) {
      loadMoreLock.current = true;
      setLoadingMore(true);
      const generation = requestGeneration.current;
      getEntityMemoryPage('tag', tag.id, MEMORY_BATCH_SIZE, linkedMemories.length)
        .then(page => {
          if (requestGeneration.current === generation) {
            setLinkedMemories(current => [...current, ...page.items]);
          }
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

  const submit = async () => {
    try {
      await saveTag({ ...(tag ? { id: tag.id } : {}), name });
      onClose();
    } catch (error) {
      Alert.alert('Could not save tag', error instanceof Error ? error.message : String(error));
    }
  };

  const remove = () => {
    if (!tag) return;
    Alert.alert('Delete tag?', 'This removes the tag association from matching memories.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteTag(tag.id);
            onClose();
          } catch (error) {
            Alert.alert('Could not delete tag', error instanceof Error ? error.message : String(error));
          }
        },
      },
    ]);
  };

  return (
    <Page style={styles.page} onScroll={onScroll}>
      <Pressable onPress={onClose} style={styles.backButton}>
        <AppText accent>{'< BACK'}</AppText>
      </Pressable>
      <View style={styles.tagHeader}>
        <View style={[styles.tagMark, { backgroundColor: theme.surfaceRaised, borderColor: theme.green }]}>
          <AppText bold accent style={styles.tagGlyph}>#</AppText>
        </View>
        <View style={styles.tagHeading}>
          <AppText bold accent style={styles.tagName} numberOfLines={1}>
            #{name.trim().replace(/^#/, '') || 'tag'}
          </AppText>
          <AppText bold accent style={styles.title}>
            {tag ? '' : 'NEW TAG'}
          </AppText>
        </View>
      </View>
      {tag ? (
        <>
          <View style={styles.topEntities}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.entityRow}
            >
              {topTags.length ? (
                topTags.map((topTag, index) => (
                  <AppText
                    key={topTag.name}
                    numberOfLines={1}
                    style={[styles.entityText, { color: entityColors[index % entityColors.length] }]}
                  >
                    {topTag.name} ({topTag.usageCount})
                  </AppText>
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
                  <AppText
                    key={mention.name}
                    numberOfLines={1}
                    style={[
                      styles.entityText,
                      { color: entityColors[(index + topTags.length) % entityColors.length] },
                    ]}
                  >
                    @{mention.name} ({mention.usageCount})
                  </AppText>
                ))
              ) : (
                <AppText numberOfLines={1} accent style={styles.emptyEntityText}>NO AVAILABLE MENTIONS</AppText>
              )}
            </ScrollView>
          </View>
        </>
      ) : null}
      {tag ? (
        <View style={[styles.tabs, { borderBottomColor: theme.border }]}>
          {(['memories', 'edit'] as const).map(item => (
            <Pressable
              key={item}
              accessibilityRole="tab"
              accessibilityState={{ selected: tab === item }}
              onPress={() => setTab(item)}
              style={[styles.tab, tab === item && { borderBottomColor: theme.green }]}
            >
              <AppText bold accent={tab === item}>{item.toUpperCase()}</AppText>
            </Pressable>
          ))}
        </View>
      ) : null}
      {tab === 'memories' && tag ? (
        <View style={styles.linkedMemories}>
          <AppText bold accent>LINKED MEMORIES · {overview.total}</AppText>
          {failure ? <Card><AppText>{failure}</AppText></Card> : null}
          {loadingMemories && !linkedMemories.length ? (
            <AppText muted>Loading memories…</AppText>
          ) : linkedMemories.length ? (
            linkedMemories.map(memory => <MemoryCard key={memory.id} memory={memory} />)
          ) : (
            <Card><AppText muted>No linked memories yet.</AppText></Card>
          )}
          {loadingMore ? <AppText muted>Loading more…</AppText> : null}
        </View>
      ) : (
        <View style={styles.form}>
          <TextField
            label="TAG NAME"
            value={name}
            onChangeText={setName}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="e.g. groceries"
          />
          <AppText muted style={styles.hint}>
            Use it in memories as #{name.trim().replace(/^#/, '') || 'tag'}.
          </AppText>
          <Button title="SAVE TAG" onPress={submit} />
          {tag ? <Button title="DELETE TAG" danger onPress={remove} /> : null}
        </View>
      )}
    </Page>
  );
}

const styles = StyleSheet.create({
  page: { gap: 14 },
  backButton: { alignSelf: 'flex-start', paddingVertical: 2 },
  tagHeader: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  tagHeading: { flex: 1, gap: 3 },
  tagName: { fontSize: 18 },
  title: { fontSize: 19, letterSpacing: 1.5 },
  tagMark: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagGlyph: { fontSize: 32 },
  topEntities: { gap: 2, paddingHorizontal: 2 },
  entityRow: { flexDirection: 'row', flexWrap: 'nowrap', alignItems: 'center', gap: 8 },
  entityText: { fontSize: 10, lineHeight: 18 },
  emptyEntityText: { fontSize: 9 },
  tabs: { flexDirection: 'row', borderBottomWidth: 1 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  form: { gap: 14 },
  hint: { fontSize: 10 },
  linkedMemories: { gap: 10 },
});
