import {
  ReactNode,
  useCallback,
  useEffect,
  useState,
} from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  StyleSheet,
  useColorScheme,
} from 'react-native';
import { getAppSetting, initializeDatabase, setAppSetting } from './database';
import { AppText } from './components/ui';
import { font, isThemeName, ThemeContext, ThemeName, themes } from './theme';

export function MemoixProvider({ children }: { children: ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [themePreference, setThemePreference] = useState<ThemeName | null>(null);
  const themeName = themePreference ?? (systemColorScheme === 'light' ? 'Light' : 'Dark');
  const [loading, setLoading] = useState(true);
  const [failure, setFailure] = useState<string | null>(null);

  useEffect(() => {
    initializeDatabase()
      .then(async () => {
        const savedTheme = await getAppSetting('theme');
        if (isThemeName(savedTheme)) setThemePreference(savedTheme);
      })
      .catch(error => {
        setFailure(error instanceof Error ? error.message : String(error));
      })
      .finally(() => setLoading(false));
  }, []);

  const setTheme = useCallback(async (nextTheme: ThemeName) => {
    await setAppSetting('theme', nextTheme);
    setThemePreference(nextTheme);
  }, []);

  const themeContext = {
    theme: { ...themes[themeName], font, fontBold: font },
    themeName,
    setTheme,
  };

  if (loading) {
    return (
      <ThemeContext.Provider value={themeContext}>
        <SafeAreaView style={[styles.centered, { backgroundColor: themeContext.theme.background }]}>
          <ActivityIndicator color={themeContext.theme.green} />
          <AppText accent>OPENING LOCAL DATABASE…</AppText>
        </SafeAreaView>
      </ThemeContext.Provider>
    );
  }

  if (failure) {
    return (
      <ThemeContext.Provider value={themeContext}>
        <SafeAreaView style={[styles.centered, { backgroundColor: themeContext.theme.background }]}>
          <AppText bold style={[styles.error, { color: themeContext.theme.danger }]}>DATABASE ERROR</AppText>
          <AppText>{failure}</AppText>
          <AppText muted>Restart the app after resolving the local storage issue.</AppText>
        </SafeAreaView>
      </ThemeContext.Provider>
    );
  }

  return (
    <ThemeContext.Provider value={themeContext}>
      {children}
    </ThemeContext.Provider>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  error: { fontSize: 16 },
});
