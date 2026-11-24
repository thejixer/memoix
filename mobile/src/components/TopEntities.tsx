import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { EntityUsage } from '../domain';
import { entityColorsByTheme, useTheme } from '../theme';
import { AppText } from './ui';

type Props = {
  tags: EntityUsage[];
  mentions: EntityUsage[];
  onSelect?: (query: string) => void;
};

export default function TopEntities({ tags, mentions, onSelect }: Props) {
  const { theme, themeName } = useTheme();
  const colors = entityColorsByTheme[themeName];

  return (
    <View style={styles.section}>
      <EntityRow
        title="TOP TAGS"
        emptyLabel="NO AVAILABLE TAGS"
        entities={tags}
        prefix="#"
        colors={colors}
        surface={theme.surfaceRaised}
        onSelect={onSelect}
      />
      <EntityRow
        title="TOP MENTIONS"
        emptyLabel="NO AVAILABLE MENTIONS"
        entities={mentions}
        prefix="@"
        colorOffset={10}
        colors={colors}
        surface={theme.surfaceRaised}
        onSelect={onSelect}
      />
    </View>
  );
}

function EntityRow({
  title,
  emptyLabel,
  entities,
  prefix,
  colorOffset = 0,
  colors,
  surface,
  onSelect,
}: {
  title: string;
  emptyLabel: string;
  entities: EntityUsage[];
  prefix: string;
  colorOffset?: number;
  colors: readonly string[];
  surface: string;
  onSelect?: (query: string) => void;
}) {
  return (
    <View style={styles.rowGroup}>
      <AppText muted bold style={styles.rowTitle}>{title}</AppText>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.entityRow}>
          {entities.length ? entities.map((entity, index) => {
            const color = colors[colorOffset + index];
            const chipStyle = [
              styles.entityChip,
              { backgroundColor: surface, borderColor: `${color}80` },
            ];
            const text = (
              <AppText numberOfLines={1} style={[styles.entityText, { color }]}>
                {prefix}{entity.name}
                <AppText muted style={styles.usageCount}> · {entity.usageCount}</AppText>
              </AppText>
            );

            return onSelect ? (
              <Pressable
                key={entity.name}
                accessibilityRole="button"
                onPress={() => onSelect(`${prefix}${entity.name}`)}
                style={chipStyle}
              >
                {text}
              </Pressable>
            ) : (
              <View key={entity.name} style={chipStyle}>{text}</View>
            );
          }) : (
            <AppText numberOfLines={1} accent style={styles.emptyEntityText}>{emptyLabel}</AppText>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 8 },
  rowGroup: { gap: 2 },
  rowTitle: { fontSize: 8, letterSpacing: 0.8 },
  entityRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  entityChip: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderWidth: 1,
    borderRadius: 12,
  },
  entityText: { fontSize: 10, lineHeight: 16 },
  usageCount: { fontSize: 9 },
  emptyEntityText: { fontSize: 9 },
});
