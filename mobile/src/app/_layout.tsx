import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { MemoixProvider } from '../MemoixProvider';
import { theme } from '../theme';

export default function RootLayout() {
  return (
    <MemoixProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.background },
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="memory-editor" options={{ presentation: 'modal' }} />
        <Stack.Screen name="person-editor" options={{ presentation: 'modal' }} />
        <Stack.Screen name="tag-editor" options={{ presentation: 'modal' }} />
      </Stack>
    </MemoixProvider>
  );
}
