import { Tabs, useRouter } from 'expo-router';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';

export default function TabLayout() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.green,
        tabBarInactiveTintColor: theme.muted,
        tabBarLabelPosition: 'below-icon',
        tabBarLabelStyle: {
          fontFamily: theme.fontBold,
          fontSize: 11,
          letterSpacing: 0.3,
          marginTop: 1,
          marginBottom: 2,
        },
        tabBarItemStyle: {
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: 2,
        },
        tabBarStyle: {
          backgroundColor: theme.surface,
          borderTopColor: theme.border,
          borderTopWidth: 1,
          height: 58 + insets.bottom,
          paddingTop: 2,
          paddingBottom: Math.max(4, insets.bottom),
          ...Platform.select({
            android: {
              elevation: 8,
            },
            default: {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: -2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
            },
          }),
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Memories',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.tabIconWrapper, focused && { backgroundColor: `${theme.green}18` }]}>
              <Svg width={20} height={20} viewBox="0 0 24 24" fill={color}>
                <Path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
              </Svg>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="people"
        options={{
          title: 'People',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.tabIconWrapper, focused && { backgroundColor: `${theme.green}18` }]}>
              <Svg width={20} height={20} viewBox="0 0 24 24" fill={color}>
                <Path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
              </Svg>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: 'Create',
          tabBarShowLabel: false,
          tabBarButton: ({ onLongPress, style, testID }) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Create a memo or expense"
              onPress={() => router.push('/memory-editor')}
              onLongPress={onLongPress}
              testID={testID}
              style={({ pressed }) => [
                style,
                styles.createButtonContainer,
                pressed && styles.createButtonPressed,
              ]}
            >
              <View
                style={[
                  styles.createButton,
                  {
                    backgroundColor: theme.green,
                    borderColor: theme.surface,
                  },
                ]}
              >
                <Svg width={22} height={22} viewBox="0 0 24 24" fill={theme.black}>
                  <Path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                </Svg>
              </View>
            </Pressable>
          ),
        }}
      />
      <Tabs.Screen
        name="expenses"
        options={{
          title: 'Spend',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.tabIconWrapper, focused && { backgroundColor: `${theme.green}18` }]}>
              <Svg width={20} height={20} viewBox="0 0 24 24" fill={color}>
                <Path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z" />
              </Svg>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="backup"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.tabIconWrapper, focused && { backgroundColor: `${theme.green}18` }]}>
              <Svg width={20} height={20} viewBox="0 0 24 24" fill={color}>
                <Path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
              </Svg>
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabIconWrapper: {
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createButtonContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  createButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      android: {
        elevation: 6,
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 5,
      },
    }),
  },
  createButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.95 }],
  },
});
