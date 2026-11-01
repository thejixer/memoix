import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Memory, Tag } from '../domain';
import { AppText, Button, Card, Page, TextField } from '../components/ui';

export default function TagsScreen({
  tags,
  memories,
  onOpenTag,
}: {
  tags: Tag[];
  memories: Memory[];
  onOpenTag: (tag: Tag | null) => void;
}) {
  const [query, setQuery] = useState('');
  const shownTags = tags.filter(item =>
    item.name.toLocaleLowerCase().includes(query.toLocaleLowerCase()),
  );

  return (
    <Page>
      <View style={styles.titleRow}>
        <AppText bold accent style={styles.title}>TAGS</AppText>
        <Button title="+ ADD" onPress={() => onOpenTag(null)} style={styles.addButton} />
      </View>
      <TextField label="FIND A TAG" value={query} onChangeText={setQuery} />
      {shownTags.length ? (
        shownTags.map(item => (
          <Pressable key={item.id} onPress={() => onOpenTag(item)}>
            <Card style={styles.tagCard}>
              <AppText bold accent>#{item.name}</AppText>
              <AppText muted>
                {memories.filter(memory =>
                  memory.tags.some(
                    value => value.toLocaleLowerCase() === item.name.toLocaleLowerCase(),
                  ),
                ).length} memories
              </AppText>
            </Card>
          </Pressable>
        ))
      ) : (
        <Card><AppText muted>No tags yet. Add one or use #tag in a memory.</AppText></Card>
      )}
    </Page>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 19, letterSpacing: 1.5 },
  addButton: { minHeight: 38 },
  tagCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
