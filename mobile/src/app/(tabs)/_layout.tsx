import { Tabs, useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { theme } from '../../theme';

export default function TabLayout() {
  const router = useRouter();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarIcon: () => null,
        tabBarActiveTintColor: theme.green,
        tabBarInactiveTintColor: theme.muted,
        tabBarLabelStyle: { fontFamily: theme.fontBold, fontSize: 8 },
        tabBarStyle: {
          backgroundColor: '#080D08',
          borderTopColor: theme.border,
        },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'MEMORIES' }} />
      <Tabs.Screen name="people" options={{ title: 'PEOPLE & TAGS' }} />
      <Tabs.Screen
        name="create"
        options={{
          title: 'CREATE',
          tabBarShowLabel: false,
          tabBarButton: ({ style, onLongPress, testID }) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Create a memo or expense"
              onPress={() => router.push('/memory-editor')}
              onLongPress={onLongPress}
              testID={testID}
              style={[style, styles.createButton]}
            >
              <View style={styles.plusIcon}>
                <View style={styles.plusHorizontal} />
                <View style={styles.plusVertical} />
              </View>
            </Pressable>
          ),
        }}
      />
      <Tabs.Screen name="expenses" options={{ title: 'SPEND' }} />
      <Tabs.Screen name="backup" options={{ title: 'SETTINGS' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  createButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusIcon: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusHorizontal: {
    position: 'absolute',
    width: 20,
    height: 2,
    borderRadius: 1,
    backgroundColor: theme.green,
  },
  plusVertical: {
    position: 'absolute',
    width: 2,
    height: 20,
    borderRadius: 1,
    backgroundColor: theme.green,
  },
});
