import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, StyleSheet, useColorScheme } from 'react-native';
import {
  getAppSetting,
  getMemories,
  getPeople,
  getTags,
  initializeDatabase,
  setAppSetting,
} from './database';
import { Memory, Person, Tag } from './domain';
import { AppText } from './components/ui';
import { font, isThemeName, ThemeContext, ThemeName, themes } from './theme';

type MemoixContextValue = {
  memories: Memory[];
  people: Person[];
  tags: Tag[];
  refresh: () => Promise<void>;
};

const MemoixContext = createContext<MemoixContextValue | null>(null);

export function MemoixProvider({ children }: { children: ReactNode }) {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const systemColorScheme = useColorScheme();
  const [themePreference, setThemePreference] = useState<ThemeName | null>(null);
  const themeName = themePreference ?? (systemColorScheme === 'light' ? 'Light' : 'Dark');
  const [loading, setLoading] = useState(true);
  const [failure, setFailure] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const [nextMemories, nextPeople, nextTags] = await Promise.all([
      getMemories(),
      getPeople(),
      getTags(),
    ]);
    setMemories(nextMemories);
    setPeople(nextPeople);
    setTags(nextTags);
  }, []);

  useEffect(() => {
    initializeDatabase()
      .then(async () => {
        const savedTheme = await getAppSetting('theme');
        if (isThemeName(savedTheme)) setThemePreference(savedTheme);
        await refresh();
      })
      .catch(error => {
        setFailure(error instanceof Error ? error.message : String(error));
      })
      .finally(() => setLoading(false));
  }, [refresh]);

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
      <MemoixContext.Provider value={{ memories, people, tags, refresh }}>
        {children}
      </MemoixContext.Provider>
    </ThemeContext.Provider>
  );
}

export function useMemoix(): MemoixContextValue {
  const value = useContext(MemoixContext);
  if (!value) throw new Error('useMemoix must be used inside MemoixProvider.');
  return value;
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
