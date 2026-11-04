import { StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { Memory } from '../domain';
import { useTheme } from '../theme';
import { AppText, Card } from './ui';

function dateLabel(value: string) {
  return new Date(value).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function MemoryCard({ memory }: { memory: Memory }) {
  const { theme } = useTheme();
  return (
    <Card style={styles.memoryCard}>
      {memory.type === 'expense' ? (
        <>
          <Svg
            accessibilityElementsHidden
            importantForAccessibility="no"
            pointerEvents="none"
            style={styles.expenseRibbon}
            width={26}
            height={26}
            viewBox="0 0 26 26"
          >
            <Defs>
              <LinearGradient id={`expenseRibbonGradient${memory.id}`} x1="0" y1="1" x2="1" y2="0">
                <Stop offset="0" stopColor={theme.greenSoft} stopOpacity="0.9" />
                <Stop offset="0.55" stopColor={theme.green} stopOpacity="0.75" />
                <Stop offset="1" stopColor={theme.green} />
              </LinearGradient>
            </Defs>
            <Path
              d="M0 18 L18 0 H23 L0 23 Z"
              fill={`url(#expenseRibbonGradient${memory.id})`}
            />
          </Svg>
          <AppText>
            <AppText bold style={{ color: theme.green }}>
              {memory.amount?.toLocaleString() ?? ''}
            </AppText>
            {' - '}
            {memory.content}
          </AppText>
        </>
      ) : (
        <AppText>{memory.content}</AppText>
      )}
      <AppText muted style={styles.date}>{dateLabel(memory.occurredAt)}</AppText>
    </Card>
  );
}

const styles = StyleSheet.create({
  memoryCard: { gap: 10, position: 'relative', overflow: 'hidden' },
  expenseRibbon: { position: 'absolute', top: 0, left: 0 },
  date: { fontSize: 10 },
});
