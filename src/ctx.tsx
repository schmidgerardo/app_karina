import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { Session } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import { supabase } from '@/client/supabase';

type SessionContextType = {
  session: Session | null;
  isLoading: boolean;
};

const SessionContext = createContext<SessionContextType>({
  session: null,
  isLoading: true,
});

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    // 1. Cargar sesión inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsLoading(false);
    });

    // 2. Escuchar cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setIsLoading(false);
    });

    // 3. Manejar Deep Links (Google Auth / Reset Password)
    const handleDeepLink = async (url: string) => {
      const { query } = Linking.parse(url);
      if (url.includes('#access_token') || url.includes('?code=')) {
        // Esto procesa la URL y activa la sesión en el cliente de Supabase
        await supabase.auth.getSession(); 
      }
    };

    // Listener para links entrantes
    const linkingSubscription = Linking.addEventListener('url', (event) => {
      handleDeepLink(event.url);
    });

    // 4. Refresco de sesión al volver de segundo plano (Móvil)
    const appStateSubscription = AppState.addEventListener('change', async (nextState) => {
      if (Platform.OS !== 'web' && appState.current.match(/inactive|background/) && nextState === 'active') {
        const { error } = await supabase.auth.refreshSession();
        if (error) await supabase.auth.signOut();
      }
      appState.current = nextState;
    });

    return () => {
      subscription.unsubscribe();
      linkingSubscription.remove();
      appStateSubscription.remove();
    };
  }, []);

  return (
    <SessionContext.Provider value={{ session, isLoading }}>
      {children}
    </SessionContext.Provider>
  );
}

export const useSession = () => useContext(SessionContext);