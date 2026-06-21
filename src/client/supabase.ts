import { createClient } from '@supabase/supabase-js'

// Intentamos requerir el polyfill de almacenamiento solo si estamos en un entorno cliente (Navegador o Móvil)
if (typeof window !== 'undefined') {
  require('expo-sqlite/localStorage/install');
}

const supabaseUrl: string = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey: string = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'

// Definimos un almacenamiento seguro que no rompa Node.js durante el build de Render
const safeStorage = typeof window !== 'undefined' ? localStorage : {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: safeStorage, // 👈 Usamos el almacenamiento seguro blindado contra Node.js
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})