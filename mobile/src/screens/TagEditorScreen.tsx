import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { deleteTag, saveTag } from '../database';
import { getTopEntities, Memory, Tag } from '../domain';
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
  const topTags = getTopEntities(linkedMemories, 'tags');
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
          <View style={styles.entitySummaries}>
            <View style={styles.entitySection}>
              <AppText bold accent>TOP TAGS</AppText>
              {topTags.length ? (
                topTags.map(item => (
                  <AppText key={item.name} muted>#{item.name} · {item.usageCount}</AppText>
                ))
              ) : (
                <AppText muted>No tags yet.</AppText>
              )}
            </View>
            <View style={styles.entitySection}>
              <AppText bold accent>TOP MENTIONS</AppText>
              {topMentions.length ? (
                topMentions.map(item => (
                  <AppText key={item.name} muted>@{item.name} · {item.usageCount}</AppText>
                ))
              ) : (
                <AppText muted>No mentions yet.</AppText>
              )}
            </View>
          </View>
          <View style={styles.linkedMemories}>
            <AppText bold accent>LINKED MEMORIES · {linkedMemories.length}</AppText>
            {linkedMemories.length ? (
              linkedMemories.map(memory => (
                <Card key={memory.id}>
                  <AppText>{memory.content}</AppText>
                  <AppText muted style={styles.memoryDate}>
                    {new Date(memory.occurredAt).toLocaleString()}
                  </AppText>
                </Card>
              ))
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
  entitySummaries: { gap: 10 },
  entitySection: { gap: 4 },
  linkedMemories: { gap: 10 },
  memoryDate: { fontSize: 10 },
});
