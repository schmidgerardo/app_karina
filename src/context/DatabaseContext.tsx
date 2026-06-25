/**
 * MÓDULO 1: Motor Offline-First (SQLite + FileSystem) - Versión Blindada Híbrida
 * - Web: bypass de SQLite, se usa Supabase directamente.
 * - Móvil: SQLite con WAL, descarga de audios y cola de puntuaciones offline.
 * - Importación de FileSystem desde /legacy para compatibilidad en Expo Go.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Platform } from 'react-native';
import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system/legacy'; // <--- Forzamos la compatibilidad nativa en Expo Go
import { supabase } from '@/client/supabase';

const AUDIO_BASE_URL =
  'https://oczoccdlyyhbdvnyjjni.supabase.co/storage/v1/object/public/audios/';
const AUDIO_DIR =
  Platform.OS === 'web'
    ? ''
    : (FileSystem.documentDirectory ?? '') + 'karina_audios/';

interface DatabaseContextType {
  db: any | null;
  isSyncing: boolean;
  lastSynced: Date | null;
  syncRecursos: () => Promise<void>;
  enqueuePendingScore: (userId: string, moduloId: number, score: number) => Promise<void>;
  flushPendingScores: () => Promise<void>;
  getLocalWords: (moduloId: number) => Promise<LocalWord[]>;
  getLocalModules: () => Promise<LocalModule[]>;
  getLocalWordById: (wordId: number) => Promise<LocalWord | null>;
}

export interface LocalWord {
  id: number;
  modulo_id: number;
  palabra_karina: string;
  significado_espanol: string;
  significado_ingles: string | null;
  audio_url: string | null;
  local_audio_path: string | null;
  imagen_url: string | null;
  ejemplo_karina: string | null;
  ejemplo_espanol: string | null;
  ejemplo_ingles: string | null;
}

export interface LocalModule {
  id: number;
  titulo: string;
  titulo_ingles: string | null;
  descripcion: string | null;
  imagen_url: string | null;
  orden: number;
}

const DatabaseContext = createContext<DatabaseContextType>({
  db: null,
  isSyncing: false,
  lastSynced: null,
  syncRecursos: async () => {},
  enqueuePendingScore: async () => {},
  flushPendingScores: async () => {},
  getLocalWords: async () => [],
  getLocalModules: async () => [],
  getLocalWordById: async () => null,
});

function resolveAudioUrl(audioUrl: string | null): string | null {
  if (!audioUrl) return null;
  if (audioUrl.startsWith('http')) return audioUrl;
  return AUDIO_BASE_URL + audioUrl;
}

function localFilename(audioUrl: string): string {
  const parts = audioUrl.split('/');
  return parts[parts.length - 1].replace(/[^a-zA-Z0-9._-]/g, '_');
}

async function fetchRemoteModules(): Promise<LocalModule[]> {
  const { data: modules, error } = await supabase
    .from('modules')
    .select('id, titulo, titulo_ingles, descripcion, imagen_url, orden')
    .order('orden', { ascending: true });

  if (error || !modules) return [];

  return modules.map((mod) => ({
    id: mod.id,
    titulo: mod.titulo,
    titulo_ingles: mod.titulo_ingles ?? null,
    descripcion: mod.descripcion ?? null,
    imagen_url: mod.imagen_url ?? null,
    orden: mod.orden ?? 0,
  }));
}

async function fetchRemoteWords(moduloId?: number): Promise<LocalWord[]> {
  let query = supabase
    .from('words')
    .select(
      'id, modulo_id, palabra_karina, significado_espanol, significado_ingles, audio_url, imagen_url, ejemplo_karina, ejemplo_espanol, ejemplo_ingles'
    );

  if (moduloId !== undefined) {
    query = query.eq('modulo_id', moduloId);
  }

  const { data: words, error } = await query;
  if (error || !words) return [];

  return words.map((word) => ({
    id: word.id,
    modulo_id: word.modulo_id,
    palabra_karina: word.palabra_karina,
    significado_espanol: word.significado_espanol,
    significado_ingles: word.significado_ingles ?? null,
    audio_url: word.audio_url ?? null,
    local_audio_path: null,
    imagen_url: word.imagen_url ?? null,
    ejemplo_karina: word.ejemplo_karina ?? null,
    ejemplo_espanol: word.ejemplo_espanol ?? null,
    ejemplo_ingles: word.ejemplo_ingles ?? null,
  }));
}

export function DatabaseProvider({ children }: { children: React.ReactNode }) {
  const [db, setDb] = useState<any | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const initDone = useRef(false);

  // ── Inicializar base de datos local ─────────────────────────────────────────
  const initDatabase = useCallback(async () => {
    if (initDone.current) return;
    initDone.current = true;

    // BYPASS CRUCIAL PARA WEB: Si es navegador, no tocamos SQLite para evitar bloqueos de pestañas
    if (Platform.OS === 'web') {
      console.log(
        '[DB] Entorno Web detectado. Bypass de SQLite activo para multi-pestaña.'
      );
      setDb(null); // No hay base de datos local en web, se usa Supabase directo
      return;
    }

    try {
      const database = await SQLite.openDatabaseAsync('karina_local.db');

      await database.execAsync(`
        PRAGMA journal_mode = WAL;

        CREATE TABLE IF NOT EXISTS modules_local (
          id INTEGER PRIMARY KEY,
          titulo TEXT NOT NULL,
          titulo_ingles TEXT,
          descripcion TEXT,
          imagen_url TEXT,
          orden INTEGER DEFAULT 0,
          synced_at TEXT
        );

        CREATE TABLE IF NOT EXISTS words_local (
          id INTEGER PRIMARY KEY,
          modulo_id INTEGER NOT NULL,
          palabra_karina TEXT NOT NULL,
          significado_espanol TEXT NOT NULL,
          significado_ingles TEXT,
          audio_url TEXT,
          local_audio_path TEXT,
          imagen_url TEXT,
          ejemplo_karina TEXT,
          ejemplo_espanol TEXT,
          ejemplo_ingles TEXT,
          synced_at TEXT
        );

        CREATE TABLE IF NOT EXISTS pending_scores (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id TEXT NOT NULL,
          modulo_id INTEGER NOT NULL,
          score INTEGER NOT NULL,
          created_at TEXT NOT NULL,
          flushed INTEGER DEFAULT 0
        );
      `);

      // ── Crear directorio de audios (con manejo de errores silencioso) ──
      try {
        const dirInfo = await FileSystem.getInfoAsync(AUDIO_DIR);
        if (!dirInfo.exists) {
          await FileSystem.makeDirectoryAsync(AUDIO_DIR, { intermediates: true });
        }
      } catch (dirError) {
        console.log('[DB] Directorio de audios manejado en caché.');
      }

      setDb(database);
      console.log('[DB] karina_local.db inicializada en Android de forma nativa.');
    } catch (error) {
      console.error('[DB] Error al inicializar la base de datos local:', error);
    }
  }, []);

  useEffect(() => {
    initDatabase();
  }, [initDatabase]);

  // ── syncRecursos ───────────────────────────────────────────────────────────
  const syncRecursos = useCallback(async () => {
    if (isSyncing) return;
    setIsSyncing(true);

    try {
      if (Platform.OS === 'web') {
        console.log('[SYNC] Entorno Web: cargando recursos desde Supabase directamente.');
        await fetchRemoteModules();
        await fetchRemoteWords();
        setLastSynced(new Date());
        return;
      }

      if (!db) return;

      console.log('[SYNC] Iniciando sincronización de recursos en Android...');
      const { data: modules, error: modError } = await supabase
        .from('modules')
        .select('id, titulo, titulo_ingles, descripcion, imagen_url, orden')
        .order('orden', { ascending: true });

      if (modules && !modError) {
        const now = new Date().toISOString();
        for (const mod of modules) {
          await db.runAsync(
            `INSERT OR REPLACE INTO modules_local (id, titulo, titulo_ingles, descripcion, imagen_url, orden, synced_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              mod.id,
              mod.titulo,
              mod.titulo_ingles ?? null,
              mod.descripcion ?? null,
              mod.imagen_url ?? null,
              mod.orden ?? 0,
              now,
            ]
          );
        }
      }

      const { data: words, error: wordsError } = await supabase
        .from('words')
        .select(
          'id, modulo_id, palabra_karina, significado_espanol, significado_ingles, audio_url, imagen_url, ejemplo_karina, ejemplo_espanol, ejemplo_ingles'
        );

      if (words && !wordsError) {
        const now = new Date().toISOString();
        for (const word of words) {
          let localAudioPath: string | null = null;
          if (word.audio_url) {
            const fullUrl = resolveAudioUrl(word.audio_url);
            if (fullUrl) {
              const filename = localFilename(fullUrl);
              const localPath = AUDIO_DIR + filename;
              const fileInfo = await FileSystem.getInfoAsync(localPath);
              if (!fileInfo.exists) {
                try {
                  const downloadResult = await FileSystem.downloadAsync(
                    fullUrl,
                    localPath
                  );
                  if (downloadResult.status === 200) localAudioPath = localPath;
                } catch (dlError) {
                  console.warn(`[SYNC] Error descarga audio ${word.id}`);
                }
              } else {
                localAudioPath = localPath;
              }
            }
          }

          await db.runAsync(
            `INSERT OR REPLACE INTO words_local (id, modulo_id, palabra_karina, significado_espanol, significado_ingles, audio_url, local_audio_path, imagen_url, ejemplo_karina, ejemplo_espanol, ejemplo_ingles, synced_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              word.id,
              word.modulo_id,
              word.palabra_karina,
              word.significado_espanol,
              word.significado_ingles ?? null,
              word.audio_url ?? null,
              localAudioPath,
              word.imagen_url ?? null,
              word.ejemplo_karina ?? null,
              word.ejemplo_espanol ?? null,
              word.ejemplo_ingles ?? null,
              now,
            ]
          );
        }
      }

      setLastSynced(new Date());
    } catch (error) {
      console.error('[SYNC] Error:', error);
    } finally {
      setIsSyncing(false);
    }
  }, [db, isSyncing]);

  const enqueuePendingScore = useCallback(
    async (userId: string, moduloId: number, score: number) => {
      if (Platform.OS === 'web' || !db) return;
      try {
        await db.runAsync(
          `INSERT INTO pending_scores (user_id, modulo_id, score, created_at, flushed) VALUES (?, ?, ?, ?, 0)`,
          [userId, moduloId, score, new Date().toISOString()]
        );
      } catch (e) {
        console.error(e);
      }
    },
    [db]
  );

  const flushPendingScores = useCallback(async () => {
    if (Platform.OS === 'web' || !db) return;
    try {
      const pendingScores = (await db.getAllAsync(
        'SELECT id, user_id, modulo_id, score FROM pending_scores WHERE flushed = 0'
      )) as Array<{
        id: number;
        user_id: string;
        modulo_id: number;
        score: number;
      }>;
      if (pendingScores.length === 0) return;

      for (const pending of pendingScores) {
        const { data: existing } = await supabase
          .from('module_progress')
          .select('id, xp')
          .eq('user_id', pending.user_id)
          .eq('modulo_id', pending.modulo_id)
          .maybeSingle();
        if (existing) {
          await supabase
            .from('module_progress')
            .update({
              xp: (existing.xp || 0) + pending.score,
              completed: true,
              completed_at: new Date().toISOString(),
            })
            .eq('id', existing.id);
        } else {
          await supabase.from('module_progress').insert({
            user_id: pending.user_id,
            modulo_id: pending.modulo_id,
            xp: pending.score,
            completed: true,
            completed_at: new Date().toISOString(),
          });
        }
        await db.runAsync('UPDATE pending_scores SET flushed = 1 WHERE id = ?', [
          pending.id,
        ]);
      }
    } catch (e) {
      console.error(e);
    }
  }, [db]);

  const getLocalWords = useCallback(
    async (moduloId: number): Promise<LocalWord[]> => {
      if (Platform.OS === 'web') {
        return await fetchRemoteWords(moduloId);
      }
      if (!db) return [];
      try {
        return (await db.getAllAsync(
          'SELECT * FROM words_local WHERE modulo_id = ?',
          [moduloId]
        )) as LocalWord[];
      } catch (e) {
        return [];
      }
    },
    [db]
  );

  const getLocalWordById = useCallback(
    async (wordId: number): Promise<LocalWord | null> => {
      if (Platform.OS === 'web') {
        const words = await fetchRemoteWords();
        return words.find((word) => word.id === wordId) ?? null;
      }
      if (!db) return null;
      try {
        const result = (await db.getAllAsync(
          'SELECT * FROM words_local WHERE id = ? LIMIT 1',
          [wordId]
        )) as LocalWord[];
        return result.length ? result[0] : null;
      } catch (e) {
        return null;
      }
    },
    [db]
  );

  const getLocalModules = useCallback(async (): Promise<LocalModule[]> => {
    if (Platform.OS === 'web') {
      return await fetchRemoteModules();
    }
    if (!db) return [];
    try {
      return (await db.getAllAsync(
        'SELECT * FROM modules_local ORDER BY orden ASC'
      )) as LocalModule[];
    } catch (e) {
      return [];
    }
  }, [db]);

  return (
    <DatabaseContext.Provider
      value={{
        db,
        isSyncing,
        lastSynced,
        syncRecursos,
        enqueuePendingScore,
        flushPendingScores,
        getLocalWords,
        getLocalModules,
        getLocalWordById,
      }}
    >
      {children}
    </DatabaseContext.Provider>
  );
}

export function useDatabaseContext() {
  return useContext(DatabaseContext);
}