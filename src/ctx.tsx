import { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
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

  useEffect(() => {
    const initializeAuth = async () => {
      // 1. Forzar a Supabase a leer el hash de la URL en Web
      if (Platform.OS === 'web' && window.location.hash) {
        await supabase.auth.getSession();
      }

      // 2. Obtener la sesión inicial
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setIsLoading(false);
    };

    initializeAuth();

    // 3. Escuchar cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[AUTH_EVENT]:', event); // Para debug
      setSession(session);
      setIsLoading(false);
    });

    // 4. Manejar Deep Links (Móvil)
    const handleDeepLink = async (url: string) => {
      if (url.includes('#access_token') || url.includes('?code=')) {
        await supabase.auth.getSession(); 
      }
    };

    const linkingSubscription = Linking.addEventListener('url', (event) => {
      handleDeepLink(event.url);
    });

    return () => {
      subscription.unsubscribe();
      linkingSubscription.remove();
    };
  }, []);

  return (
    <SessionContext.Provider value={{ session, isLoading }}>
      {children}
    </SessionContext.Provider>
  );
}

export const useSession = () => useContext(SessionContext);