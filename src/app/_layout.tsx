import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { PortalHost } from '@rn-primitives/portal';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'nativewind';

import { SessionProvider, useSession } from '@/ctx';
import '../global.css';

function AuthGuard() {
  const { session, isLoading } = useSession();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (isLoading) return;

    const inAppGroup = segments[0] === '(app)';
    const inAuthGroup = segments[0] === '(auth)';

    if (!session && !inAuthGroup) {
      // Si no está logueado y está en la raíz o en una ruta protegida → mandar a login
      router.replace('/(auth)/sign-in');
    } else if (session && !inAppGroup) {
      // Si ya está logueado y está afuera del grupo autenticado → mandar al home interno
      router.replace('/(app)/(tabs)');
    }
    // Otherwise, stay on current route
  }, [session, isLoading, segments, router]);

  if (isLoading) {
    return (
      <View className="flex-1 bg-primary items-center justify-center">
        <ActivityIndicator size="large" color="#F59E0B" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }} initialRouteName="(app)">
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(app)" />
    </Stack>
  );
}

export default function RootLayout() {
  const { colorScheme } = useColorScheme();

  return (
    <GestureHandlerRootView style={{ flex: 1 }} className={colorScheme}>
      <StatusBar
        style={colorScheme === 'dark' ? 'light' : 'dark'}
        backgroundColor={colorScheme === 'dark' ? '#081408' : '#F9F6F0'}
      />
      <SessionProvider>
        <AuthGuard />
      </SessionProvider>
      <PortalHost />
    </GestureHandlerRootView>
  );
}
