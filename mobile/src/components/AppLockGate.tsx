import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';
import { AppText, Button } from './ui';
import { useTheme } from '../theme';

export default function AppLockGate({
  mode,
  busy = false,
  error,
  onUnlock,
}: {
  mode: 'loading' | 'locked' | 'error';
  busy?: boolean;
  error?: string | null;
  onUnlock?: () => void;
}) {
  const { theme } = useTheme();
  const isLoading = mode === 'loading';

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.brand}>
        <View style={[styles.markFrame, { borderColor: theme.border, backgroundColor: theme.surface }]}>
          <Image
            source={require('../../assets/splash-icon.png')}
            resizeMode="contain"
            style={styles.mark}
          />
        </View>
        <Text style={[styles.wordmark, { color: theme.white }]}>
          memo<Text style={{ color: theme.green }}>ix</Text>
        </Text>
        <Text style={[styles.tagline, { color: theme.muted }]}>
          CHERISH EVERY MOMENT
        </Text>
      </View>

      <View style={styles.content}>
        {isLoading ? (
          <>
            <ActivityIndicator color={theme.green} />
            <AppText accent>SECURING YOUR MEMORIES…</AppText>
          </>
        ) : (
          <>
            <AppText bold accent style={styles.lockedTitle}>
              {mode === 'error' ? 'PRIVACY LOCK' : 'MEMOIX IS LOCKED'}
            </AppText>
            <AppText muted style={styles.message}>
              {mode === 'error'
                ? 'Memoix could not verify its app-lock settings. Retry to keep your data protected.'
                : 'Authenticate with your device to continue.'}
            </AppText>
            {error ? <AppText style={[styles.error, { color: theme.danger }]}>{error}</AppText> : null}
            <Button
              title={busy ? 'PLEASE WAIT…' : mode === 'error' ? 'RETRY' : 'UNLOCK MEMOIX'}
              onPress={onUnlock ?? (() => undefined)}
              disabled={busy}
            />
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  brand: { alignItems: 'center' },
  markFrame: {
    width: 176,
    height: 176,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 48,
    borderWidth: 1,
  },
  mark: { width: '100%', height: '100%' },
  wordmark: { marginTop: 22, fontSize: 44, fontWeight: '700', letterSpacing: -3, lineHeight: 52 },
  tagline: { marginTop: 10, fontSize: 9, fontWeight: '600', letterSpacing: 2 },
  content: { width: '100%', maxWidth: 340, alignItems: 'center', gap: 14, marginTop: 36 },
  lockedTitle: { fontSize: 16, letterSpacing: 1 },
  message: { textAlign: 'center' },
  error: { textAlign: 'center', fontSize: 11 },
});
