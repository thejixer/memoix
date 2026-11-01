import { useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { Memory, MemoryType, Person, Tag } from '../domain';
import { theme } from '../theme';
import { saveMemory } from '../database';
import EntityInput from './EntityInput';
import { AppText, Button, DateField, Page, TextField } from './ui';

type Props = {
  memory: Memory | null;
  people: Person[];
  tags: Tag[];
  memories: Memory[];
  onClose: () => void;
  onSaved: () => Promise<void>;
};

export default function MemoryEditor({
  memory,
  people,
  tags,
  memories,
  onClose,
  onSaved,
}: Props) {
  const [type, setType] = useState<MemoryType>(memory?.type ?? 'memo');
  const [content, setContent] = useState(memory?.content ?? '');
  const [amount, setAmount] = useState(
    memory?.amount == null ? '' : String(memory.amount),
  );
  const [occurredAt, setOccurredAt] = useState(
    memory ? new Date(memory.occurredAt) : new Date(),
  );
  const [saving, setSaving] = useState(false);

  const close = () => {
    if (!saving) onClose();
  };

  const submit = async () => {
    if (!content.trim()) {
      Alert.alert('Memory text required', 'Write something before saving.');
      return;
    }
    const numericAmount = type === 'expense' ? Number(amount) : null;
    if (
      type === 'expense' &&
      (!/^\d{1,15}(\.\d{1,2})?$/.test(amount) ||
        !Number.isFinite(numericAmount) ||
        numericAmount! < 0)
    ) {
      Alert.alert('Invalid amount', 'Enter a non-negative expense amount.');
      return;
    }
    setSaving(true);
    try {
      await saveMemory({
        id: memory?.id,
        content: content.trim(),
        type,
        amount: numericAmount,
        occurredAt: occurredAt.toISOString(),
      });
      await onSaved();
      onClose();
    } catch (error) {
      Alert.alert('Could not save memory', error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Page style={styles.page}>
        <View style={styles.header}>
          <Pressable onPress={close}><AppText accent>{'< CLOSE'}</AppText></Pressable>
          <AppText bold accent>{memory ? 'EDIT MEMORY' : 'NEW MEMORY'}</AppText>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.typeRow}>
          {(['memo', 'expense'] as const).map(item => (
            <Button
              key={item}
              title={item.toUpperCase()}
              secondary={type !== item}
              onPress={() => setType(item)}
              style={styles.typeButton}
            />
          ))}
        </View>
        {type === 'expense' && (
          <TextField
            label="AMOUNT · TOMAN"
            value={amount}
            onChangeText={value => setAmount(value.replace(/[^\d.]/g, ''))}
            keyboardType="decimal-pad"
            placeholder="0.00"
          />
        )}
        <EntityInput
          label="MEMORY"
          value={content}
          onChangeText={setContent}
          people={people}
          tags={tags}
          memories={memories}
          multiline
        />
        <DateField
          label="DATE"
          value={occurredAt}
          onChange={date => setOccurredAt(date)}
          mode="date"
        />
        <DateField
          label="TIME"
          value={occurredAt}
          onChange={date => {
            const next = new Date(occurredAt);
            next.setHours(date.getHours(), date.getMinutes());
            setOccurredAt(next);
          }}
          mode="time"
        />
        <AppText muted style={styles.helper}>
          #tag · @person · &place are linked automatically when saved.
        </AppText>
        <Button
          title={saving ? 'SAVING…' : 'SAVE MEMORY'}
          onPress={submit}
          disabled={saving}
        />
    </Page>
  );
}

const styles = StyleSheet.create({
  page: { paddingTop: 16 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 36,
  },
  headerSpacer: { width: 52 },
  typeRow: { flexDirection: 'row', gap: 8 },
  typeButton: { flex: 1 },
  helper: { fontSize: 11, color: theme.muted },
});
