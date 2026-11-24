import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { EntityUsage } from '../domain';
import { entityColorsByTheme, useTheme } from '../theme';
import { AppText, Card } from './ui';

type Props = {
  tags: EntityUsage[];
  mentions: EntityUsage[];
  onSelect?: (query: string) => void;
};

export default function TopEntities({ tags, mentions, onSelect }: Props) {
  const { themeName } = useTheme();
  const colors = entityColorsByTheme[themeName];

  return (
    <Card style={styles.card}>
      <EntityRow
        title="TOP TAGS"
        emptyLabel="NO AVAILABLE TAGS"
        entities={tags}
        prefix=""
        tokenPrefix="#"
        colors={colors}
        onSelect={onSelect}
      />
      <EntityRow
        title="TOP MENTIONS"
        emptyLabel="NO AVAILABLE MENTIONS"
        entities={mentions}
        prefix="@"
        colorOffset={10}
        colors={colors}
        onSelect={onSelect}
      />
    </Card>
  );
}

function EntityRow({
  title,
  emptyLabel,
  entities,
  prefix,
  tokenPrefix,
  colorOffset = 0,
  colors,
  onSelect,
}: {
  title: string;
  emptyLabel: string;
  entities: EntityUsage[];
  prefix: string;
  tokenPrefix?: string;
  colorOffset?: number;
  colors: readonly string[];
  onSelect?: (query: string) => void;
}) {
  return (
    <View style={styles.rowGroup}>
      <AppText muted bold style={styles.rowTitle}>{title}</AppText>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.entityRow}>
          {entities.length ? entities.map((entity, index) => {
            const content = `${prefix}${entity.name} (${entity.usageCount})`;
            const text = (
              <AppText numberOfLines={1} style={[styles.entityText, { color: colors[colorOffset + index] }]}>
                {content}
              </AppText>
            );

            return onSelect ? (
              <Pressable key={entity.name} onPress={() => onSelect(`${tokenPrefix ?? prefix}${entity.name}`)}>
                {text}
              </Pressable>
            ) : (
              <View key={entity.name}>{text}</View>
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
  card: { gap: 8 },
  rowGroup: { gap: 2 },
  rowTitle: { fontSize: 8, letterSpacing: 0.8 },
  entityRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  entityText: { fontSize: 10, lineHeight: 18 },
  emptyEntityText: { fontSize: 9 },
});
