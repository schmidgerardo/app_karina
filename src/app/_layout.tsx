import { useEffect, useRef } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { PortalHost } from '@rn-primitives/portal';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'nativewind';

import { SessionProvider, useSession } from '@/ctx';
import { DatabaseProvider, useDatabaseContext } from '@/context/DatabaseContext';
import { LanguageProvider } from '@/context/LanguageContext';

// Inicializar i18n al arrancar la app (efecto de módulo, sin hooks)
import '@/i18n';

import '../global.css';

function AuthGuard() {
  const { session, isLoading } = useSession();
  const router = useRouter();
  const segments = useSegments();
  const { syncRecursos } = useDatabaseContext();
  const lastSessionId = useRef<string | null>(null);

  useEffect(() => {
    if (isLoading) return;

    const inAppGroup = segments[0] === '(app)';
    const inAuthGroup = segments[0] === '(auth)';
    
    // Identificamos si el usuario está exactamente en la pantalla de reset-password
    const isResettingPassword = segments[0] === '(auth)' && segments[1] === 'reset-password';

    if (!session && !inAuthGroup) {
      // No hay sesión y trata de entrar a la app -> pa' fuera
      router.replace('/(auth)/sign-in');
    } else if (session && !inAppGroup && !isResettingPassword) {
      // HAY sesión, no está en la app, Y NO ESTÁ CAMBIANDO CONTRASEÑA -> mándalo al home
      // La magia es el !isResettingPassword. Si está ahí, lo dejamos quieto.
      router.replace('/(app)/(tabs)');
    }
  }, [session, isLoading, segments, router]);

  useEffect(() => {
    if (isLoading || Platform.OS === 'web' || !session) return;

    const currentUserId = session.user?.id ?? null;
    if (lastSessionId.current === currentUserId) return;
    lastSessionId.current = currentUserId;

    syncRecursos().catch((error) => {
      console.error('[DB] syncRecursos after auth confirmation failed:', error);
    });
  }, [session, isLoading, syncRecursos]);

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
        {/* Módulo 1: Motor SQLite offline disponible globalmente */}
        <DatabaseProvider>
          {/* Módulo 2: Idioma global sincronizado con Supabase */}
          <LanguageProvider>
            <AuthGuard />
          </LanguageProvider>
        </DatabaseProvider>
      </SessionProvider>
      <PortalHost />
    </GestureHandlerRootView>
  );
}