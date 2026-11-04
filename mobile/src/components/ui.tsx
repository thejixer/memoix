import { ReactNode, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme';

export function Page({
  children,
  scroll = true,
  style,
}: {
  children: ReactNode;
  scroll?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const safeAreaPadding = {
    paddingTop: 16 + insets.top,
    paddingBottom: 16 + insets.bottom,
  };
  const content = scroll ? (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[styles.pageContent, style, safeAreaPadding]}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.pageContent, styles.fill, style, safeAreaPadding]}>{children}</View>
  );
  return <View style={[styles.page, { backgroundColor: theme.background }]}>{content}</View>;
}

export function AppText({
  children,
  style,
  bold = false,
  muted = false,
  accent = false,
  numberOfLines,
}: {
  children: ReactNode;
  style?: StyleProp<TextStyle>;
  bold?: boolean;
  muted?: boolean;
  accent?: boolean;
  numberOfLines?: number;
}) {
  const { theme } = useTheme();
  return (
    <Text
      style={[
        styles.text,
        {
          color: accent ? theme.green : muted ? theme.muted : theme.white,
          fontFamily: theme.font,
          ...(bold ? { fontWeight: '700' as const } : {}),
        },
        style,
      ]}
      numberOfLines={numberOfLines}
    >
      {children}
    </Text>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  const { theme } = useTheme();
  return <AppText bold accent style={[styles.sectionTitle, { borderBottomColor: theme.border }]}>{children}</AppText>;
}

export function Card({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { theme } = useTheme();
  return <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }, style]}>{children}</View>;
}

export function Button({
  title,
  onPress,
  secondary = false,
  danger = false,
  disabled = false,
  style,
}: {
  title: string;
  onPress: () => void;
  secondary?: boolean;
  danger?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { theme } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        disabled && styles.buttonDisabled,
        pressed && !disabled && styles.pressed,
        {
          borderColor: danger ? theme.danger : secondary ? theme.border : theme.green,
          backgroundColor: secondary || danger ? theme.surface : theme.surfaceRaised,
        },
        style,
      ]}
    >
      <AppText
        bold
        accent={!secondary && !danger}
        style={danger ? { color: theme.danger } : secondary ? { color: theme.greenSoft } : undefined}
      >
        {title}
      </AppText>
    </Pressable>
  );
}

export function TextField({
  label,
  multiline = false,
  style,
  ...props
}: TextInputProps & { label: string; multiline?: boolean }) {
  const { theme } = useTheme();
  return (
    <View style={styles.field}>
      <AppText muted style={styles.fieldLabel}>{label}</AppText>
      <TextInput
        placeholderTextColor={theme.muted}
        selectionColor={theme.green}
        style={[
          styles.input,
          inputThemeStyle(theme),
          multiline && styles.multiline,
          style,
        ]}
        multiline={multiline}
        {...props}
      />
    </View>
  );
}

export function DateField({
  label,
  value,
  onChange,
  mode = 'date',
}: {
  label: string;
  value: Date;
  onChange: (date: Date) => void;
  mode?: 'date' | 'datetime' | 'time';
}) {
  const { theme } = useTheme();
  const [open, setOpen] = useState(false);
  const display = mode === 'time'
    ? value.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : mode === 'datetime'
      ? value.toLocaleString()
      : value.toLocaleDateString();
  const onPickerChange = (event: DateTimePickerEvent, date?: Date) => {
    setOpen(false);
    if (event.type === 'set' && date) onChange(date);
  };

  return (
    <View style={styles.field}>
      <AppText muted style={styles.fieldLabel}>{label}</AppText>
      <Pressable style={[styles.input, inputThemeStyle(theme)]} onPress={() => setOpen(true)}>
        <AppText>{display}</AppText>
      </Pressable>
      {open && (
        <DateTimePicker
          value={value}
          mode={mode === 'datetime' ? 'date' : mode}
          display="default"
          onChange={onPickerChange}
        />
      )}
    </View>
  );
}

export function OptionalDateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Date | null;
  onChange: (date: Date | null) => void;
}) {
  const { theme } = useTheme();
  const [open, setOpen] = useState(false);
  const selected = value ?? new Date();
  const onPickerChange = (event: DateTimePickerEvent, date?: Date) => {
    setOpen(false);
    if (event.type === 'set' && date) onChange(date);
  };

  return (
    <View style={styles.field}>
      <AppText muted style={styles.fieldLabel}>{label}</AppText>
      <View style={styles.optionalDateRow}>
        <Pressable
          accessibilityRole="button"
          onPress={() => setOpen(true)}
          style={[styles.input, inputThemeStyle(theme), styles.optionalDateInput]}
        >
          <AppText>{value ? value.toLocaleDateString() : 'Not specified'}</AppText>
        </Pressable>
        {value ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Clear date"
            onPress={() => onChange(null)}
            style={styles.clearDate}
          >
            <AppText accent>CLEAR</AppText>
          </Pressable>
        ) : null}
      </View>
      {open && (
        <DateTimePicker
          value={selected}
          mode="date"
          display="default"
          onChange={onPickerChange}
        />
      )}
    </View>
  );
}

export function DateFilterField({
  label,
  value,
  onChange,
  compact = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  compact?: boolean;
}) {
  const { theme } = useTheme();
  const [open, setOpen] = useState(false);
  const selected = value ? new Date(`${value}T12:00:00`) : new Date();

  const onPickerChange = (event: DateTimePickerEvent, date?: Date) => {
    setOpen(false);
    if (event.type !== 'set' || !date) return;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    onChange(`${year}-${month}-${day}`);
  };

  return (
    <View style={[styles.field, compact && styles.compactDateField]}>
      <View style={[styles.dateFilterRow, compact && styles.compactDateRow]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label} date`}
          style={[styles.input, inputThemeStyle(theme), compact && styles.compactDateInput]}
          onPress={() => setOpen(true)}
          onLongPress={() => value && onChange('')}
        >
          <AppText numberOfLines={1} style={compact && styles.compactDateText}>
            {label}: {value || 'N/A'}
          </AppText>
        </Pressable>
        {value ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Clear ${label} date`}
            onPress={() => onChange('')}
            style={compact ? styles.clearDateCompact : styles.clearDate}
          >
            <AppText accent style={compact && styles.compactDateText}>
              ×
            </AppText>
          </Pressable>
        ) : null}
      </View>
      {open && (
        <DateTimePicker
          value={selected}
          mode="date"
          display="default"
          onChange={onPickerChange}
        />
      )}
    </View>
  );
}


export function Chip({
  title,
  onPress,
  selected = false,
}: {
  title: string;
  onPress?: () => void;
  selected?: boolean;
}) {
  const { theme } = useTheme();
  const content = (
    <AppText accent={selected} style={styles.chipText}>{title}</AppText>
  );
  if (!onPress) {
    return <View style={[styles.chip, { borderColor: theme.border, backgroundColor: theme.surface }]}>{content}</View>;
  }
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        {
          borderColor: selected ? theme.green : theme.border,
          backgroundColor: selected ? theme.surfaceRaised : theme.surface,
        },
      ]}
    >
      {content}
    </Pressable>
  );
}

export function BackButton({ onPress }: { onPress: () => void }) {
  return <Button title="< BACK" secondary onPress={onPress} style={styles.backButton} />;
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  pageContent: { padding: 16, gap: 14 },
  fill: { flex: 1 },
  text: { fontSize: 13, lineHeight: 20 },
  sectionTitle: {
    fontSize: 15,
    borderBottomWidth: 1,
    paddingBottom: 8,
  },
  card: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 14,
    gap: 8,
  },
  button: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: { opacity: 0.4 },
  pressed: { opacity: 0.7 },
  field: { gap: 6, flex: 1 },
  dateFilterRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  optionalDateRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  optionalDateInput: { flex: 1 },
  clearDate: { paddingHorizontal: 4, paddingVertical: 8 },
  clearDateCompact: { paddingHorizontal: 4, paddingVertical: 4 },
  compactDateField: { flex: 0, flexDirection: 'row', alignItems: 'center' },
  compactDateRow: { flex: 0 },
  compactDateInput: {
    minWidth: 110,
    minHeight: 34,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: 'center',
  },
  compactDateText: { fontSize: 10 },
  fieldLabel: { fontSize: 11 },
  input: {
    minHeight: 46,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  multiline: { minHeight: 150, textAlignVertical: 'top' },
  chip: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  chipText: { fontSize: 11 },
  backButton: { alignSelf: 'flex-start', paddingHorizontal: 10, minHeight: 38 },
});

function inputThemeStyle(theme: ReturnType<typeof useTheme>['theme']) {
  return {
    borderColor: theme.border,
    backgroundColor: theme.surface,
    color: theme.white,
    fontFamily: theme.font,
  };
}