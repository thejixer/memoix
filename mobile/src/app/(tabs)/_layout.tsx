import { Tabs } from 'expo-router';
import { AppText } from '../../components/ui';
import { theme } from '../../theme';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: theme.background },
        headerTintColor: theme.green,
        headerTitle: () => (
          <>
            <AppText bold accent style={{ letterSpacing: 3 }}>MEMOIX</AppText>
            <AppText muted style={{ fontSize: 8, letterSpacing: 1 }}>
              OFFLINE MEMORY SYSTEM
            </AppText>
          </>
        ),
        tabBarActiveTintColor: theme.green,
        tabBarInactiveTintColor: theme.muted,
        tabBarLabelStyle: { fontFamily: theme.fontBold, fontSize: 9 },
        tabBarStyle: {
          backgroundColor: '#080D08',
          borderTopColor: theme.border,
        },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'MEMORIES' }} />
      <Tabs.Screen name="people" options={{ title: 'PEOPLE' }} />
      <Tabs.Screen name="tags" options={{ title: 'TAGS' }} />
      <Tabs.Screen name="expenses" options={{ title: 'SPEND' }} />
      <Tabs.Screen name="backup" options={{ title: 'BACKUP' }} />
    </Tabs>
  );
}
