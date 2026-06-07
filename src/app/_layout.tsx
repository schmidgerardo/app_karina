import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { PortalHost } from '@rn-primitives/portal';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';

import { SessionProvider, useSession } from '@/ctx';
import '../global.css';

function AuthGuard() {
  const { session, isLoading } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (session) {
        router.replace('/(app)/(tabs)');
      } else {
        router.replace('/(auth)/sign-in');
      }
    }
  }, [session, isLoading, router]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#1B5E20', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#F59E0B" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(app)" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" backgroundColor="#1B5E20" />
      <SessionProvider>
        <AuthGuard />
      </SessionProvider>
      <PortalHost />
    </GestureHandlerRootView>
  );
}
