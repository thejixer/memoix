import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import * as ScreenCapture from 'expo-screen-capture';
import * as SecureStore from 'expo-secure-store';
import AppLockGate from './components/AppLockGate';

const APP_LOCK_KEY = 'memoix.app-lock.enabled';
const SCREEN_CAPTURE_KEY = 'memoix-app-lock';

type AppLockContextValue = {
  enabled: boolean;
  deviceAuthenticationAvailable: boolean;
  busy: boolean;
  enable: () => Promise<void>;
  disable: () => Promise<void>;
};

const AppLockContext = createContext<AppLockContextValue | null>(null);

export function useAppLock() {
  const value = useContext(AppLockContext);
  if (!value) throw new Error('useAppLock must be used inside AppLockProvider.');
  return value;
}

async function checkDeviceAuthentication() {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') return false;
  const [hasHardware, isEnrolled] = await Promise.all([
    LocalAuthentication.hasHardwareAsync(),
    LocalAuthentication.isEnrolledAsync(),
  ]);
  return hasHardware && isEnrolled;
}

async function enablePrivacyProtection() {
  if (Platform.OS === 'ios') {
    await ScreenCapture.enableAppSwitcherProtectionAsync(0.8);
  } else if (Platform.OS === 'android') {
    await ScreenCapture.preventScreenCaptureAsync(SCREEN_CAPTURE_KEY);
  }
}

async function disablePrivacyProtection() {
  if (Platform.OS === 'ios') {
    await ScreenCapture.disableAppSwitcherProtectionAsync();
  } else if (Platform.OS === 'android') {
    await ScreenCapture.allowScreenCaptureAsync(SCREEN_CAPTURE_KEY);
  }
}

export function AppLockProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [locked, setLocked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [deviceAuthenticationAvailable, setDeviceAuthenticationAvailable] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [initializationError, setInitializationError] = useState<string | null>(null);
  const enabledRef = useRef(false);
  const busyRef = useRef(false);
  const autoPromptedRef = useRef(false);
  const authErrorRef = useRef<string | null>(null);

  const setEnabledState = useCallback((value: boolean) => {
    enabledRef.current = value;
    setEnabled(value);
  }, []);

  const setAuthErrorState = useCallback((value: string | null) => {
    authErrorRef.current = value;
    setAuthError(value);
  }, []);

  const initialize = useCallback(async () => {
    try {
      if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
        setDeviceAuthenticationAvailable(false);
        setEnabledState(false);
        setLocked(false);
        setInitializationError(null);
        setReady(true);
        return;
      }
      const savedSetting = await SecureStore.getItemAsync(APP_LOCK_KEY);
      const available = await checkDeviceAuthentication().catch(() => false);
      const isEnabled = savedSetting === 'true';
      setDeviceAuthenticationAvailable(available);
      setEnabledState(isEnabled);
      setLocked(isEnabled);
      if (isEnabled) await enablePrivacyProtection();
      setInitializationError(null);
      setReady(true);
    } catch (error) {
      setInitializationError(
        error instanceof Error ? error.message : 'Could not load the app lock setting.',
      );
      setLocked(true);
      setReady(true);
    }
  }, [setEnabledState]);

  useEffect(() => {
    const task = Promise.resolve().then(initialize);
    void task;
  }, [initialize]);

  const promptForAuthentication = useCallback(async () => {
    if (busyRef.current) return false;
    busyRef.current = true;
    setBusy(true);
    setAuthErrorState(null);
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock Memoix',
        disableDeviceFallback: false,
        fallbackLabel: 'Use device passcode',
        ...(Platform.OS === 'android' ? { biometricsSecurityLevel: 'strong' as const } : {}),
      });
      if (result.success) return true;
      const message = result.error === 'user_cancel'
        ? 'Authentication cancelled. Memoix remains locked.'
        : result.error === 'lockout'
          ? 'Authentication is temporarily locked by the device. Try the device passcode or wait and retry.'
          : 'Authentication failed. Memoix remains locked.';
      setAuthErrorState(message);
      return false;
    } catch (error) {
      setAuthErrorState(error instanceof Error ? error.message : 'Authentication failed.');
      return false;
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, [setAuthErrorState]);

  const unlock = useCallback(async () => {
    if (await promptForAuthentication()) {
      setAuthErrorState(null);
      setLocked(false);
    }
  }, [promptForAuthentication, setAuthErrorState]);

  useEffect(() => {
    if (ready && enabled && locked && !initializationError && !autoPromptedRef.current) {
      autoPromptedRef.current = true;
      void unlock();
    }
  }, [enabled, initializationError, locked, ready, unlock]);

  useEffect(() => {
    const initialState = AppState.currentState;
    let previousState: AppStateStatus =
      initialState === 'background' || initialState === 'inactive' || initialState === 'active'
        ? initialState
        : 'active';
    const subscription = AppState.addEventListener('change', nextState => {
      if (nextState === 'background' && enabledRef.current) {
        setLocked(true);
        setAuthErrorState(null);
      }
      if (previousState === 'background' && nextState === 'active' && enabledRef.current) {
        void unlock();
      }
      previousState = nextState;
    });
    return () => subscription.remove();
  }, [setAuthErrorState, unlock]);

  const enable = useCallback(async () => {
    const available = await checkDeviceAuthentication();
    setDeviceAuthenticationAvailable(available);
    if (!available) {
      throw new Error('Set up Face ID, fingerprint, or another biometric in your device settings first.');
    }
    if (!(await promptForAuthentication())) {
      throw new Error(authErrorRef.current ?? 'Authentication was cancelled.');
    }

    await enablePrivacyProtection();
    try {
      await SecureStore.setItemAsync(APP_LOCK_KEY, 'true');
    } catch (error) {
      await disablePrivacyProtection().catch(() => undefined);
      throw error;
    }
    setEnabledState(true);
    setLocked(false);
    setAuthErrorState(null);
  }, [promptForAuthentication, setAuthErrorState, setEnabledState]);

  const disable = useCallback(async () => {
    if (!(await promptForAuthentication())) {
      throw new Error(authErrorRef.current ?? 'Authentication was cancelled.');
    }

    await disablePrivacyProtection();
    try {
      await SecureStore.deleteItemAsync(APP_LOCK_KEY);
    } catch (error) {
      await enablePrivacyProtection().catch(() => undefined);
      throw error;
    }
    setEnabledState(false);
    setLocked(false);
    setAuthErrorState(null);
  }, [promptForAuthentication, setAuthErrorState, setEnabledState]);

  if (!ready) {
    return <AppLockGate mode="loading" />;
  }

  if (locked || initializationError) {
    return (
      <AppLockGate
        mode={initializationError ? 'error' : 'locked'}
        busy={busy}
        error={initializationError ?? authError}
        onUnlock={() => {
          if (initializationError) {
            setReady(false);
            void initialize();
          } else {
            void unlock();
          }
        }}
      />
    );
  }

  return (
    <AppLockContext.Provider
      value={{ enabled, deviceAuthenticationAvailable, busy, enable, disable }}
    >
      {children}
    </AppLockContext.Provider>
  );
}
