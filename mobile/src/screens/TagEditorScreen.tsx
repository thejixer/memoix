import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { deleteTag, saveTag } from '../database';
import { getTopEntities, Memory, Tag } from '../domain';
import { entityColors } from '../theme';
import MemoryCard from '../components/MemoryCard';
import { AppText, Button, Card, Page, TextField } from '../components/ui';

export default function TagEditorScreen({
  tag,
  memories,
  onChanged,
  onClose,
}: {
  tag: Tag | null;
  memories: Memory[];
  onChanged: () => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState(tag?.name ?? '');
  const linkedMemories = tag
    ? memories.filter(memory =>
        memory.tags.some(value => value.toLocaleLowerCase() === tag.name.toLocaleLowerCase()),
      )
    : [];
  const topTags = getTopEntities(linkedMemories, 'tags', tag ? [tag.name] : []);
  const topMentions = getTopEntities(linkedMemories, 'people');

  const submit = async () => {
    try {
      await saveTag({ ...(tag ? { id: tag.id } : {}), name });
      await onChanged();
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
            await onChanged();
            onClose();
          } catch (error) {
            Alert.alert('Could not delete tag', error instanceof Error ? error.message : String(error));
          }
        },
      },
    ]);
  };

  return (
    <Page>
      <Button title="< BACK" secondary onPress={onClose} />
      <AppText bold accent style={{ fontSize: 19, letterSpacing: 1.5 }}>
        {tag ? 'EDIT TAG' : 'NEW TAG'}
      </AppText>
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
          <View style={styles.linkedMemories}>
            <AppText bold accent>LINKED MEMORIES · {linkedMemories.length}</AppText>
            {linkedMemories.length ? (
              linkedMemories.map(memory => <MemoryCard key={memory.id} memory={memory} />)
            ) : (
              <Card><AppText muted>No linked memories yet.</AppText></Card>
            )}
          </View>
        </>
      ) : null}
      <TextField
        label="TAG NAME"
        value={name}
        onChangeText={setName}
        autoCapitalize="none"
        placeholder="e.g. groceries"
      />
      <AppText muted>Use it in memories as #{name.trim().replace(/^#/, '') || 'tag'}.</AppText>
      <Button title="SAVE TAG" onPress={submit} />
      {tag ? (
        <>
          <Card><AppText muted>USED IN {linkedMemories.length} MEMORIES</AppText></Card>
          <Button title="DELETE TAG" danger onPress={remove} />
        </>
      ) : null}
    </Page>
  );
}

const styles = StyleSheet.create({
  topEntities: { gap: 2, paddingHorizontal: 2 },
  entityRow: { flexDirection: 'row', flexWrap: 'nowrap', alignItems: 'center', gap: 8 },
  entityText: { fontSize: 10, lineHeight: 18 },
  emptyEntityText: { fontSize: 9 },
  linkedMemories: { gap: 10 },
});
