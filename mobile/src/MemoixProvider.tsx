import {
  ReactNode,
  useCallback,
  useEffect,
  useState,
} from 'react';
import {
  SafeAreaView,
  StyleSheet,
  useColorScheme,
} from 'react-native';
import { getAppSetting, initializeDatabase, setAppSetting } from './database';
import { AppText } from './components/ui';
import StartupSplash from './components/StartupSplash';
import { font, isThemeName, ThemeContext, ThemeName, themes } from './theme';

const MINIMUM_SPLASH_DURATION_MS = 1000;

export function MemoixProvider({ children }: { children: ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [themePreference, setThemePreference] = useState<ThemeName | null>(null);
  const themeName = themePreference ?? (systemColorScheme === 'light' ? 'Light' : 'Dark');
  const [loading, setLoading] = useState(true);
  const [failure, setFailure] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const startedAt = Date.now();
    let hideSplashTimeout: ReturnType<typeof setTimeout> | null = null;

    initializeDatabase()
      .then(async () => {
        const savedTheme = await getAppSetting('theme');
        if (active && isThemeName(savedTheme)) setThemePreference(savedTheme);
      })
      .catch(error => {
        if (active) {
          setFailure(error instanceof Error ? error.message : String(error));
        }
      })
      .finally(() => {
        const remainingSplashTime = Math.max(
          0,
          MINIMUM_SPLASH_DURATION_MS - (Date.now() - startedAt),
        );
        hideSplashTimeout = setTimeout(() => {
          if (active) setLoading(false);
        }, remainingSplashTime);
      });

    return () => {
      active = false;
      if (hideSplashTimeout) clearTimeout(hideSplashTimeout);
    };
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
        <StartupSplash />
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
