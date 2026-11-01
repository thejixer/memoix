import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, StyleSheet } from 'react-native';
import { useFonts } from 'expo-font';
import {
  SpaceMono_400Regular,
  SpaceMono_700Bold,
} from '@expo-google-fonts/space-mono';
import { getMemories, getPeople, getTags, initializeDatabase } from './database';
import { Memory, Person, Tag } from './domain';
import { AppText } from './components/ui';
import { theme } from './theme';

type MemoixContextValue = {
  memories: Memory[];
  people: Person[];
  tags: Tag[];
  refresh: () => Promise<void>;
};

const MemoixContext = createContext<MemoixContextValue | null>(null);

export function MemoixProvider({ children }: { children: ReactNode }) {
  const [fontsLoaded, fontError] = useFonts({
    SpaceMono_400Regular,
    SpaceMono_700Bold,
  });
  const [memories, setMemories] = useState<Memory[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
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
      .then(refresh)
      .catch(error => {
        setFailure(error instanceof Error ? error.message : String(error));
      })
      .finally(() => setLoading(false));
  }, [refresh]);

  if ((!fontsLoaded && !fontError) || loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator color={theme.green} />
        <AppText accent>{loading ? 'OPENING LOCAL DATABASE…' : 'STARTING MEMOIX…'}</AppText>
      </SafeAreaView>
    );
  }

  if (failure) {
    return (
      <SafeAreaView style={styles.centered}>
        <AppText bold style={styles.error}>DATABASE ERROR</AppText>
        <AppText>{failure}</AppText>
        <AppText muted>Restart the app after resolving the local storage issue.</AppText>
      </SafeAreaView>
    );
  }

  return (
    <MemoixContext.Provider value={{ memories, people, tags, refresh }}>
      {children}
    </MemoixContext.Provider>
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
    backgroundColor: theme.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  error: { color: theme.danger, fontSize: 16 },
});
