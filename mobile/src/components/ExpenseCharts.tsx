import { useMemo } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Line, Polyline, Text as SvgText } from 'react-native-svg';
import { CompositeTotal, DayTotal } from '../domain';
import { theme } from '../theme';
import { AppText, Card } from './ui';

export function DailyLineChart({
  data,
  selectedDate,
  onSelect,
}: {
  data: DayTotal[];
  selectedDate: string | null;
  onSelect: (date: string) => void;
}) {
  const { width: screenWidth } = useWindowDimensions();
  const width = Math.max(280, screenWidth - 64);
  const height = 190;
  const padding = { left: 36, right: 12, top: 14, bottom: 30 };
  const maximum = Math.max(1, ...data.map(item => item.total));
  const coordinates = data.map((item, index) => {
    const ratio = data.length <= 1 ? 0.5 : index / (data.length - 1);
    return {
      ...item,
      x: padding.left + ratio * (width - padding.left - padding.right),
      y: height - padding.bottom -
        (item.total / maximum) * (height - padding.top - padding.bottom),
    };
  });
  const points = coordinates.map(point => `${point.x},${point.y}`).join(' ');
  const labels =
    data.length <= 7
      ? coordinates
      : coordinates.filter((_, index) => index % Math.ceil(data.length / 7) === 0);

  return (
    <Card>
      <AppText bold accent>DAILY EXPENSES</AppText>
      <AppText muted style={styles.chartHint}>Tap a day to inspect its expenses.</AppText>
      <View>
        <Svg width={width} height={height}>
          <Line
            x1={padding.left}
            y1={height - padding.bottom}
            x2={width - padding.right}
            y2={height - padding.bottom}
            stroke={theme.border}
            strokeWidth={1}
          />
          <Line
            x1={padding.left}
            y1={padding.top}
            x2={padding.left}
            y2={height - padding.bottom}
            stroke={theme.border}
            strokeWidth={1}
          />
          {points ? (
            <Polyline points={points} fill="none" stroke={theme.green} strokeWidth={2} />
          ) : null}
          {coordinates.map(point => (
            <Circle
              key={point.date}
              cx={point.x}
              cy={point.y}
              r={selectedDate === point.date ? 6 : 4}
              fill={selectedDate === point.date ? theme.white : theme.green}
              stroke={theme.background}
              strokeWidth={2}
              onPress={() => onSelect(point.date)}
            />
          ))}
          {labels.map(point => (
            <SvgText
              key={`label-${point.date}`}
              x={point.x}
              y={height - 8}
              fill={theme.muted}
              fontSize={9}
              textAnchor="middle"
            >
              {point.date.slice(5)}
            </SvgText>
          ))}
        </Svg>
        <View style={StyleSheet.absoluteFill}>
          {coordinates.map(point => (
            <Pressable
              key={`touch-${point.date}`}
              accessibilityRole="button"
              accessibilityLabel={`${point.date}: ${point.total}`}
              onPress={() => onSelect(point.date)}
              style={{
                position: 'absolute',
                left: point.x - 12,
                top: point.y - 14,
                width: 24,
                height: 28,
              }}
            />
          ))}
        </View>
      </View>
    </Card>
  );
}

export function CompositeBarChart({
  title,
  data,
}: {
  title: string;
  data: CompositeTotal[];
}) {
  const max = Math.max(1, ...data.map(item => item.total));
  const rows = useMemo(() => data.slice(0, 20), [data]);
  return (
    <Card>
      <AppText bold accent>{title}</AppText>
      {rows.length ? (
        rows.map(item => (
          <View key={item.label} style={styles.barRow}>
            <AppText style={styles.barLabel} numberOfLines={1}>{item.label}</AppText>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  { width: `${Math.max(3, (item.total / max) * 100)}%` },
                ]}
              />
            </View>
            <AppText muted style={styles.barValue}>{item.total.toLocaleString()}</AppText>
          </View>
        ))
      ) : (
        <AppText muted>No tagged expenses in this range.</AppText>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  chartHint: { fontSize: 10 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 28 },
  barLabel: { width: '34%', fontSize: 10 },
  barTrack: {
    flex: 1,
    height: 10,
    backgroundColor: '#142516',
    borderRadius: 5,
    overflow: 'hidden',
  },
  barFill: { height: '100%', backgroundColor: theme.green, borderRadius: 5 },
  barValue: { width: 74, textAlign: 'right', fontSize: 10 },
});
