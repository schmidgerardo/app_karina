/**
 * MÓDULO 2: Contexto Global de Idioma
 *
 * Sincroniza el idioma activo entre i18next, el perfil de Supabase
 * y la conmutación de campos de BD (titulo vs titulo_ingles).
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { useSession } from '@/ctx';
import { supabase } from '@/client/supabase';
import { changeLanguage } from '@/i18n';

// ─── Tipos ──────────────────────────────────────────────────────────────────────
type AppLanguage = 'es' | 'en';

interface LanguageContextType {
  language: AppLanguage;
  setLanguage: (lang: AppLanguage) => Promise<void>;
  toggleLanguage: () => Promise<void>;
}

// ─── Context ────────────────────────────────────────────────────────────────────
const LanguageContext = createContext<LanguageContextType>({
  language: 'es',
  setLanguage: async () => {},
  toggleLanguage: async () => {},
});

// ─── Provider ──────────────────────────────────────────────────────────────────
export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const { session } = useSession();
  const [language, setLanguageState] = useState<AppLanguage>('es');

  // Al iniciar sesión, cargar el idioma preferido desde el perfil de Supabase
  useEffect(() => {
    if (!session?.user?.id) return;

    supabase
      .from('profiles')
      .select('idioma')
      .eq('id', session.user.id)
      .single()
      .then(({ data }) => {
        if (data?.idioma === 'en' || data?.idioma === 'es') {
          const lang = data.idioma as AppLanguage;
          setLanguageState(lang);
          changeLanguage(lang);
        }
      });
  }, [session?.user?.id]);

  // ── Cambiar idioma y persistir en el perfil ──────────────────────────────────
  const setLanguage = useCallback(
    async (lang: AppLanguage) => {
      setLanguageState(lang);
      changeLanguage(lang);

      if (session?.user?.id) {
        await supabase
          .from('profiles')
          .update({ idioma: lang })
          .eq('id', session.user.id);
      }
    },
    [session?.user?.id]
  );

  // ── Toggle rápido ES ↔ EN ────────────────────────────────────────────────────
  const toggleLanguage = useCallback(async () => {
    const next: AppLanguage = language === 'es' ? 'en' : 'es';
    await setLanguage(next);
  }, [language, setLanguage]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

// ─── Hook de consumo ───────────────────────────────────────────────────────────
export function useLanguage() {
  return useContext(LanguageContext);
}
