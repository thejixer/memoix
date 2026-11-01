import { useState } from 'react';
import { Alert } from 'react-native';
import { deleteTag, saveTag } from '../database';
import { Memory, Tag } from '../domain';
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
  const linkedCount = tag
    ? memories.filter(memory =>
        memory.tags.some(value => value.toLocaleLowerCase() === tag.name.toLocaleLowerCase()),
      ).length
    : 0;

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
          <Card><AppText muted>USED IN {linkedCount} MEMORIES</AppText></Card>
          <Button title="DELETE TAG" danger onPress={remove} />
        </>
      ) : null}
    </Page>
  );
}
