/**
 * MÓDULO 1: Motor Offline-First (SQLite + FileSystem)
 *
 * Inicializa karina_local.db con expo-sqlite, crea tablas espejo de
 * words/modules de Supabase, descarga físicamente audios MP3 al
 * almacenamiento del dispositivo y encola resultados de juegos si
 * el usuario está sin conexión.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system';
import { supabase } from '@/client/supabase';

// ─── Constantes ────────────────────────────────────────────────────────────────
const AUDIO_BASE_URL =
  'https://oczoccdlyyhbdvnyjjni.supabase.co/storage/v1/object/public/audios/';
// Directorio local para guardar audios (compatible con expo-file-system SDK 55)
const AUDIO_DIR = (FileSystem.documentDirectory ?? '') + 'karina_audios/';

// ─── Tipos ──────────────────────────────────────────────────────────────────────
interface DatabaseContextType {
  db: SQLite.SQLiteDatabase | null;
  isSyncing: boolean;
  lastSynced: Date | null;
  syncRecursos: () => Promise<void>;
  enqueuePendingScore: (userId: string, moduloId: number, score: number) => Promise<void>;
  flushPendingScores: () => Promise<void>;
  getLocalWords: (moduloId: number) => Promise<LocalWord[]>;
  getLocalModules: () => Promise<LocalModule[]>;
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

// ─── Context ────────────────────────────────────────────────────────────────────
const DatabaseContext = createContext<DatabaseContextType>({
  db: null,
  isSyncing: false,
  lastSynced: null,
  syncRecursos: async () => {},
  enqueuePendingScore: async () => {},
  flushPendingScores: async () => {},
  getLocalWords: async () => [],
  getLocalModules: async () => [],
});

// ─── Helper: obtener URL completa de audio ─────────────────────────────────────
function resolveAudioUrl(audioUrl: string | null): string | null {
  if (!audioUrl) return null;
  if (audioUrl.startsWith('http')) return audioUrl;
  return AUDIO_BASE_URL + audioUrl;
}

// ─── Helper: nombre de archivo local ──────────────────────────────────────────
function localFilename(audioUrl: string): string {
  const parts = audioUrl.split('/');
  return parts[parts.length - 1].replace(/[^a-zA-Z0-9._-]/g, '_');
}

// ─── Provider ──────────────────────────────────────────────────────────────────
export function DatabaseProvider({ children }: { children: React.ReactNode }) {
  const [db, setDb] = useState<SQLite.SQLiteDatabase | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const initDone = useRef(false);

  // ── Inicializar base de datos local ─────────────────────────────────────────
  const initDatabase = useCallback(async () => {
    if (initDone.current) return;
    initDone.current = true;

    try {
      const database = await SQLite.openDatabaseAsync('karina_local.db');

      // Crear tablas espejo
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

      // Asegurar que el directorio de audios existe
      const dirInfo = await FileSystem.getInfoAsync(AUDIO_DIR);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(AUDIO_DIR, { intermediates: true });
      }

      setDb(database);
      console.log('[DB] karina_local.db inicializada correctamente.');
    } catch (error) {
      console.error('[DB] Error al inicializar la base de datos local:', error);
    }
  }, []);

  useEffect(() => {
    initDatabase();
  }, [initDatabase]);

  // ── syncRecursos: descarga datos de Supabase + audios MP3 ───────────────────
  const syncRecursos = useCallback(async () => {
    if (!db || isSyncing) return;
    setIsSyncing(true);

    try {
      console.log('[SYNC] Iniciando sincronización de recursos...');

      // 1. Sincronizar módulos
      const { data: modules, error: modError } = await supabase
        .from('modules')
        .select('id, titulo, titulo_ingles, descripcion, imagen_url, orden')
        .order('orden', { ascending: true });

      if (modError) {
        console.error('[SYNC] Error al obtener módulos:', modError);
      } else if (modules) {
        const now = new Date().toISOString();
        for (const mod of modules) {
          await db.runAsync(
            `INSERT OR REPLACE INTO modules_local
              (id, titulo, titulo_ingles, descripcion, imagen_url, orden, synced_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
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
        console.log(`[SYNC] ${modules.length} módulos sincronizados.`);
      }

      // 2. Sincronizar palabras + descargar audios
      const { data: words, error: wordsError } = await supabase
        .from('words')
        .select(
          'id, modulo_id, palabra_karina, significado_espanol, significado_ingles, audio_url, imagen_url, ejemplo_karina, ejemplo_espanol, ejemplo_ingles'
        );

      if (wordsError) {
        console.error('[SYNC] Error al obtener palabras:', wordsError);
      } else if (words) {
        const now = new Date().toISOString();
        let downloadedCount = 0;

        for (const word of words) {
          let localAudioPath: string | null = null;

          // Intentar descargar el audio si existe
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
                  if (downloadResult.status === 200) {
                    localAudioPath = localPath;
                    downloadedCount++;
                  }
                } catch (dlError) {
                  console.warn(
                    `[SYNC] No se pudo descargar audio para palabra ${word.id}:`,
                    dlError
                  );
                }
              } else {
                localAudioPath = localPath;
              }
            }
          }

          await db.runAsync(
            `INSERT OR REPLACE INTO words_local
              (id, modulo_id, palabra_karina, significado_espanol, significado_ingles,
               audio_url, local_audio_path, imagen_url, ejemplo_karina, ejemplo_espanol,
               ejemplo_ingles, synced_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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

        console.log(
          `[SYNC] ${words.length} palabras sincronizadas, ${downloadedCount} audios descargados.`
        );
      }

      setLastSynced(new Date());
      console.log('[SYNC] Sincronización completada.');
    } catch (error) {
      console.error('[SYNC] Error durante la sincronización:', error);
    } finally {
      setIsSyncing(false);
    }
  }, [db, isSyncing]);

  // ── Encolar score offline ────────────────────────────────────────────────────
  const enqueuePendingScore = useCallback(
    async (userId: string, moduloId: number, score: number) => {
      if (!db) return;
      try {
        await db.runAsync(
          `INSERT INTO pending_scores (user_id, modulo_id, score, created_at, flushed)
           VALUES (?, ?, ?, ?, 0)`,
          [userId, moduloId, score, new Date().toISOString()]
        );
        console.log(
          `[QUEUE] Score encolado offline: user=${userId}, modulo=${moduloId}, score=${score}`
        );
      } catch (error) {
        console.error('[QUEUE] Error al encolar score:', error);
      }
    },
    [db]
  );

  // ── Enviar scores pendientes cuando hay conexión ─────────────────────────────
  const flushPendingScores = useCallback(async () => {
    if (!db) return;

    try {
      const pendingScores = await db.getAllAsync<{
        id: number;
        user_id: string;
        modulo_id: number;
        score: number;
      }>(
        `SELECT id, user_id, modulo_id, score FROM pending_scores WHERE flushed = 0`
      );

      if (pendingScores.length === 0) return;

      console.log(`[FLUSH] Enviando ${pendingScores.length} scores pendientes...`);

      for (const pending of pendingScores) {
        try {
          // Verificar si ya existe progress para este user + modulo
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

          // Marcar como enviado
          await db.runAsync(
            `UPDATE pending_scores SET flushed = 1 WHERE id = ?`,
            [pending.id]
          );
        } catch (flushError) {
          console.error(
            `[FLUSH] Error al enviar score id=${pending.id}:`,
            flushError
          );
        }
      }

      console.log('[FLUSH] Scores pendientes enviados correctamente.');
    } catch (error) {
      console.error('[FLUSH] Error al procesar scores pendientes:', error);
    }
  }, [db]);

  // ── Consultar palabras locales ───────────────────────────────────────────────
  const getLocalWords = useCallback(
    async (moduloId: number): Promise<LocalWord[]> => {
      if (!db) return [];
      try {
        const rows = await db.getAllAsync<LocalWord>(
          `SELECT * FROM words_local WHERE modulo_id = ?`,
          [moduloId]
        );
        return rows;
      } catch (error) {
        console.error('[DB] Error al obtener palabras locales:', error);
        return [];
      }
    },
    [db]
  );

  // ── Consultar módulos locales ────────────────────────────────────────────────
  const getLocalModules = useCallback(async (): Promise<LocalModule[]> => {
    if (!db) return [];
    try {
      const rows = await db.getAllAsync<LocalModule>(
        `SELECT * FROM modules_local ORDER BY orden ASC`
      );
      return rows;
    } catch (error) {
      console.error('[DB] Error al obtener módulos locales:', error);
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
      }}
    >
      {children}
    </DatabaseContext.Provider>
  );
}

// ─── Hook de consumo ───────────────────────────────────────────────────────────
export function useDatabaseContext() {
  return useContext(DatabaseContext);
}
