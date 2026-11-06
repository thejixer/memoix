import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { EntitySuggestion, getEntitySuggestions } from '../database';
import { useTheme } from '../theme';
import { AppText } from './ui';

type Props = {
  label?: string;
  value: string;
  onChangeText: (value: string) => void;
  loadSuggestions?: (
    marker: '#' | '@' | '&',
    query: string,
  ) => Promise<EntitySuggestion[]>;
  multiline?: boolean;
};

export default function EntityInput({
  label,
  value,
  onChangeText,
  loadSuggestions = getEntitySuggestions,
  multiline = false,
}: Props) {
  const { theme } = useTheme();
  const [loadedSuggestions, setLoadedSuggestions] = useState<{
    key: string;
    items: EntitySuggestion[];
  }>({ key: '', items: [] });
  const match = value.match(/([#@&])([\p{L}\p{N}_]*)$/u);
  const marker = match?.[1] as '#' | '@' | '&' | undefined;
  const suggestionQuery = match?.[2] ?? '';
  const suggestionKey = marker ? `${marker}${suggestionQuery}` : '';
  const suggestions =
    loadedSuggestions.key === suggestionKey ? loadedSuggestions.items : [];
  useEffect(() => {
    if (!marker || !suggestionQuery) return;
    let active = true;
    const timer = setTimeout(() => {
      loadSuggestions(marker, suggestionQuery)
        .then(items => {
          if (active) {
            setLoadedSuggestions({ key: suggestionKey, items });
          }
        })
        .catch(error => {
          if (!active) return;
          setLoadedSuggestions({ key: suggestionKey, items: [] });
          Alert.alert(
            'Could not load suggestions',
            error instanceof Error ? error.message : String(error),
          );
        });
    }, 120);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [loadSuggestions, marker, suggestionKey, suggestionQuery]);

  const select = (token: string) => {
    onChangeText(value.replace(/([#@&])([\p{L}\p{N}_]*)$/u, `${token} `));
  };

  return (
    <View style={styles.container}>
      {label ? <AppText muted style={styles.label}>{label}</AppText> : null}
      <View>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          multiline={multiline}
          placeholder="#tags, @mentions and &places"
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
            !multiline && styles.searchInput,
            multiline && styles.multiline,
          ]}
        />
        {!multiline ? (
          <View pointerEvents="none" style={styles.searchIcon}>
            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
              <Circle cx={10.8} cy={10.8} r={6.3} stroke={theme.muted} strokeWidth={2} />
              <Path d="m15.5 15.5 5 5" stroke={theme.muted} strokeWidth={2} strokeLinecap="round" />
            </Svg>
          </View>
        ) : null}
      </View>
      {suggestions.length > 0 && (
        <View
          style={[
            styles.suggestions,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
            },
          ]}
        >
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
  searchInput: { paddingLeft: 38 },
  searchIcon: { position: 'absolute', left: 12, top: 14 },
  multiline: { minHeight: 140, textAlignVertical: 'top' },
  suggestions: {
    borderWidth: 1,
    borderRadius: 6,
    overflow: 'hidden',
  },
  suggestion: { padding: 10, borderBottomWidth: 1 },
});
