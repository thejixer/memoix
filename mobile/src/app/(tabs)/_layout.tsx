import { Tabs, useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '../../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabLayout() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarIconStyle: { display: 'none' },
        tabBarActiveTintColor: theme.green,
        tabBarInactiveTintColor: theme.muted,
        tabBarLabelPosition: 'beside-icon',
        tabBarLabelStyle: {
          fontFamily: theme.fontBold,
          fontSize: 10,
          marginLeft: 0,
          marginBottom: 0,
        },
        tabBarItemStyle: {
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: 0,
        },
        tabBarStyle: {
          backgroundColor: theme.surface,
          borderTopColor: theme.border,
          height: 40 + insets.bottom,
          paddingTop: 0,
          paddingBottom: insets.bottom,
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
                <View style={[styles.plusHorizontal, { backgroundColor: theme.green }]} />
                <View style={[styles.plusVertical, { backgroundColor: theme.green }]} />
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

const PLUS_LENGTH = 10;
const PLUS_THICKNESS = 2;

const styles = StyleSheet.create({
  createButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusIcon: {
    width: PLUS_LENGTH,
    height: PLUS_LENGTH,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusHorizontal: {
    position: 'absolute',
    width: PLUS_LENGTH,
    height: PLUS_THICKNESS,
  },
  plusVertical: {
    position: 'absolute',
    width: PLUS_THICKNESS,
    height: PLUS_LENGTH,
  },
});
