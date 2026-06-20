import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Stack, usePathname, useRouter } from 'expo-router';
import { PortalHost } from '@rn-primitives/portal';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'nativewind';

import { SessionProvider, useSession } from '@/ctx';
import '../global.css';

function AuthGuard() {
  const { session, isLoading } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading) return;

    const isAuthRoute = pathname === '/sign-in' || pathname === '/sign-up';

    if (!session && !isAuthRoute) {
      // Unauthenticated user on a protected route → redirect to sign-in
      router.replace('/(auth)/sign-in');
    } else if (session && isAuthRoute) {
      // Authenticated user on an auth route → redirect to home
      router.replace('/(app)/(tabs)');
    }
    // Otherwise, stay on current route
  }, [session, isLoading, pathname, router]);

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
