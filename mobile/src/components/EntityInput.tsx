import { useMemo } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Memory, Person, Tag } from '../domain';
import { useTheme } from '../theme';
import { AppText } from './ui';

type Props = {
  label?: string;
  value: string;
  onChangeText: (value: string) => void;
  people: Person[];
  tags: Tag[];
  memories: Memory[];
  multiline?: boolean;
};

export default function EntityInput({
  label,
  value,
  onChangeText,
  people,
  tags,
  memories,
  multiline = false,
}: Props) {
  const { theme } = useTheme();
  const suggestions = useMemo(() => {
    const match = value.match(/([#@&])([\p{L}\p{N}_]*)$/u);
    if (!match || match[2].length === 0) return [];
    const marker = match[1];
    const query = match[2].toLocaleLowerCase();
    const mostRecentUse = new Map<string, number>();
    for (const memory of memories) {
      const occurredAt = new Date(memory.occurredAt).getTime();
      if (!Number.isFinite(occurredAt)) continue;
      for (const name of [...memory.people, ...memory.tags, ...memory.places]) {
        const normalizedName = name.toLocaleLowerCase();
        if (occurredAt > (mostRecentUse.get(normalizedName) ?? -Infinity)) {
          mostRecentUse.set(normalizedName, occurredAt);
        }
      }
    }

    const items = marker === '@'
      ? people.map(person => ({
          token: `@${person.mentionKey}`,
          label: person.fullName.trim()
            ? `@${person.mentionKey} · ${person.fullName}`
            : `@${person.mentionKey}`,
          lastUsedAt: mostRecentUse.get(person.mentionKey.toLocaleLowerCase()) ?? -Infinity,
        }))
      : marker === '#'
        ? tags.map(tag => ({
            token: `#${tag.name}`,
            label: `#${tag.name}`,
            lastUsedAt: mostRecentUse.get(tag.name.toLocaleLowerCase()) ?? -Infinity,
          }))
        : [...new Map(
            memories.flatMap(memory => memory.places).map(place => [
              place.toLocaleLowerCase(),
              place,
            ]),
          ).values()].map(place => ({
            token: `&${place}`,
            label: `&${place}`,
            lastUsedAt: mostRecentUse.get(place.toLocaleLowerCase()) ?? -Infinity,
          }));
    return items
      .filter(item => item.token.slice(1).toLocaleLowerCase().includes(query))
      .sort((a, b) => b.lastUsedAt - a.lastUsedAt || a.token.localeCompare(b.token))
      .slice(0, 5);
  }, [memories, people, tags, value]);

  const select = (token: string) => {
    onChangeText(value.replace(/([#@&])([\p{L}\p{N}_]*)$/u, `${token} `));
  };

  return (
    <View style={styles.container}>
      {label ? <AppText muted style={styles.label}>{label}</AppText> : null}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        placeholder="Write freely; use #tags, @people, &places"
        placeholderTextColor={theme.muted}
        selectionColor={theme.green}
        autoCapitalize="sentences"
        style={[
          styles.input,
          {
            color: theme.white,
            backgroundColor: theme.surface,
            borderColor: theme.border,
            fontFamily: theme.font,
          },
          multiline && styles.multiline,
        ]}
      />
      {suggestions.length > 0 && (
        <View style={styles.suggestions}>
          {suggestions.map(item => (
            <Pressable
              key={item.token}
              onPress={() => select(item.token)}
              style={[styles.suggestion, { borderBottomColor: theme.border }]}
            >
              <AppText accent>{item.label}</AppText>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 6 },
  label: { fontSize: 11 },
  input: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 46,
  },
  multiline: { minHeight: 140, textAlignVertical: 'top' },
  suggestions: {
    borderWidth: 1,
    borderRadius: 6,
  },
  suggestion: { padding: 10, borderBottomWidth: 1 },
});
