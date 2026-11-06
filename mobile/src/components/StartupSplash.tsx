import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';
import { AppText } from './ui';
import { useTheme } from '../theme';

export default function StartupSplash() {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      <View style={styles.brand}>
        <View style={styles.markFrame}>
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
        <View style={[styles.accentLine, { backgroundColor: theme.green }]} />
      </View>
      <View style={styles.loading}>
        <ActivityIndicator color={theme.green} />
        <AppText accent>OPENING LOCAL DATABASE…</AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#070b08',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  brand: { alignItems: 'center' },
  markFrame: {
    width: 224,
    height: 224,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 64,
    borderWidth: 1,
    borderColor: 'rgba(139, 224, 164, 0.16)',
    backgroundColor: '#0d150f',
  },
  mark: { width: '100%', height: '100%' },
  wordmark: {
    marginTop: 28,
    fontSize: 50,
    fontWeight: '700',
    letterSpacing: -3.5,
    lineHeight: 58,
  },
  tagline: {
    marginTop: 12,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 2.4,
  },
  accentLine: {
    width: 34,
    height: 2,
    marginTop: 24,
    borderRadius: 2,
  },
  loading: {
    position: 'absolute',
    bottom: 56,
    alignItems: 'center',
    gap: 12,
  },
});
