import { createClient } from '@supabase/supabase-js'
import { Platform } from 'react-native'

// Polyfill solo para móvil
if (Platform.OS !== 'web') {
  require('expo-sqlite/localStorage/install');
}

const supabaseUrl: string = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey: string = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'

// Almacenamiento seguro
const safeStorage = typeof window !== 'undefined' 
  ? localStorage 
  : { getItem: () => null, setItem: () => {}, removeItem: () => {} };

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: safeStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true, // 👈 CAMBIADO A TRUE (Crucial para Web)
    flowType: 'implicit',      // 👈 Añade esto para mejorar compatibilidad con hashes
  },
})