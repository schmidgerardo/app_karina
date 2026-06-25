import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View, StyleSheet } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { supabase } from '@/client/supabase';
import { useSession } from '@/ctx';
import { useDatabaseContext } from '@/context/DatabaseContext';

// ─── Constantes de juego ──────────────────────────────────────────────────────
const TARGET_SUCCESSES = 2;   // Módulo 3: máximo 2 aciertos requeridos
const XP_THRESHOLD = 0.7;     // Módulo 5: umbral del 70%
const XP_PER_SUCCESS = 10;    // Módulo 5: XP por acierto

interface Word {
  id: string;
  palabra_karina: string;
  significado_espanol: string;
  audio_url: string | null;
}

export default function JuegoOpcionesScreen() {
  const router = useRouter();
  const { session } = useSession();
  const { enqueuePendingScore } = useDatabaseContext();
  const { modulo_id } = useLocalSearchParams();

  // Parse and normalize modulo_id
  const parsedModuloId = modulo_id
    ? (/^\d+$/.test(String(modulo_id)) ? parseInt(String(modulo_id), 10) : String(modulo_id))
    : null;

  const [allWords, setAllWords] = useState<Word[]>([]);
  const [target, setTarget] = useState<Word | null>(null);
  const [options, setOptions] = useState<Word[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [successCount, setSuccessCount] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [savingProgress, setSavingProgress] = useState(false);

  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);
  const isPlaying = status.playing;

  useFocusEffect(
    useCallback(() => {
      loadWords();
    }, [modulo_id])
  );

  async function loadWords() {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('words')
        .select('id, palabra_karina, significado_espanol, audio_url');

      if (parsedModuloId !== null) {
        query = query.eq('modulo_id', parsedModuloId);
      } else {
        query = query.limit(40);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        console.error('Error fetching words in Opciones:', fetchError);
        setError('No se pudo conectar a la base de datos.');
        setLoading(false);
        return;
      }

      if (data && data.length >= 4) {
        setAllWords(data as Word[]);
        startRound(data as Word[], 0);
      } else {
        setAllWords([]); // Triggers the Escudo Protector
      }
    } catch (e) {
      console.error('Excepción al cargar palabras en Opciones:', e);
      setError('Ocurrió un error inesperado.');
    } finally {
      setLoading(false);
    }
  }

  function startRound(wordsPool: Word[], currentSuccesses: number) {
    if (!wordsPool || wordsPool.length < 4) return;

    // Pick a random target word that has an audio URL if possible
    const wordsWithAudio = wordsPool.filter(w => w.audio_url);
    const selectionPool = wordsWithAudio.length > 0 ? wordsWithAudio : wordsPool;
    const t = selectionPool[Math.floor(Math.random() * selectionPool.length)];

    // Get 2 distractors from the pool (excluding the target)
    const distractors = shuffleArray(wordsPool.filter(w => w.id !== t.id)).slice(0, 2);
    const opts = shuffleArray([t, ...distractors]);

    setTarget(t);
    setOptions(opts);
    setSelectedId(null);
    setChecked(false);

    // Auto-play the audio
    if (t.audio_url) {
      setTimeout(() => {
        playAudio(t.audio_url!);
      }, 500);
    }
  }

  const getAudioUrl = (audioUrl: string) => {
    if (!audioUrl) return '';
    if (audioUrl.startsWith('http')) return audioUrl;
    const { data } = supabase.storage.from('audios').getPublicUrl(audioUrl);
    return data?.publicUrl || '';
  };

  const playAudio = async (audioPath: string) => {
    const url = getAudioUrl(audioPath);
    if (!url) return;
    try {
      await player.replace(url);
      await player.play();
    } catch (err) {
      console.error('Error playing audio in opciones:', err);
    }
  };

  const handleSelect = (opt: Word) => {
    if (checked) return;
    setSelectedId(opt.id);
    setChecked(true);
    setTotalQuestions(q => q + 1);

    const isCorrect = opt.id === target?.id;
    if (isCorrect) {
      const nextSuccesses = successCount + 1;
      setSuccessCount(nextSuccesses);
      setScore(s => s + XP_PER_SUCCESS);

      setTimeout(() => {
        // Módulo 3: usar TARGET_SUCCESSES en lugar de 3
        if (nextSuccesses >= TARGET_SUCCESSES) {
          setGameOver(true);
          handleSaveProgress(nextSuccesses);
        } else {
          startRound(allWords, nextSuccesses);
        }
      }, 1200);
    } else {
      setTimeout(() => {
        startRound(allWords, successCount);
      }, 2000);
    }
  };

  // ── Módulo 5: Guardar XP con umbral del 70% ──────────────────────────────────
  async function handleSaveProgress(aciertos: number) {
    if (parsedModuloId === null || !session?.user?.id) return;

    const userId = session.user.id;
    const pctAciertos = TARGET_SUCCESSES > 0 ? aciertos / TARGET_SUCCESSES : 0;
    if (pctAciertos < XP_THRESHOLD) return; // No superado, no guardar XP

    const xpGanado = aciertos * XP_PER_SUCCESS;

    try {
      setSavingProgress(true);
      const { data: existing } = await supabase
        .from('module_progress')
        .select('id, xp')
        .eq('user_id', userId)
        .eq('modulo_id', parsedModuloId)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('module_progress')
          .update({
            xp: (existing.xp || 0) + xpGanado,
            completed: true,
            completed_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
      } else {
        await supabase.from('module_progress').insert({
          user_id: userId,
          modulo_id: parsedModuloId,
          xp: xpGanado,
          completed: true,
          completed_at: new Date().toISOString(),
        });
      }
    } catch (err) {
      // Sin conexión → encolar en SQLite (Módulo 1)
      console.warn('[OPCIONES] Sin conexión, encolando score offline:', err);
      await enqueuePendingScore(userId, Number(parsedModuloId), xpGanado);
    } finally {
      setSavingProgress(false);
    }
  }

  const handleGoToDictation = () => {
    if (parsedModuloId !== null) {
      router.push(`/juego/dictado?modulo_id=${parsedModuloId}`);
    } else {
      router.push('/juego/dictado');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1565C0" />
        <Text style={styles.loadingText}>Cargando desafío...</Text>
      </SafeAreaView>
    );
  }

  // 🛡️ ESCUDO PROTECTOR: Fallback UI
  if (error || !allWords || allWords.length < 4) {
    return (
      <SafeAreaView style={styles.fallbackContainer}>
        <View style={styles.fallbackCard}>
          <Text style={styles.fallbackEmoji}>⚠️</Text>
          <Text style={styles.fallbackTitle}>No hay suficientes palabras</Text>
          <Text style={styles.fallbackDescription}>
            Este módulo no cuenta con palabras suficientes para iniciar este minijuego (se requieren al menos 4).
          </Text>
          <Pressable onPress={() => router.back()} style={styles.fallbackButton}>
            <Text style={styles.fallbackButtonText}>Volver al menú</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (gameOver) {
    // Módulo 5: calcular porcentaje de aciertos
    const pctAciertos = TARGET_SUCCESSES > 0 ? successCount / TARGET_SUCCESSES : 0;
    const passed = pctAciertos >= XP_THRESHOLD;
    const xpGanado = passed ? successCount * XP_PER_SUCCESS : 0;

    return (
      <SafeAreaView style={styles.victoryContainer}>
        <View style={styles.victoryCard}>
          {passed ? (
            <>
              <Text style={styles.victoryEmoji}>🎉</Text>
              <Text style={styles.victoryTitle}>¡Buen trabajo!</Text>
              <Text style={styles.victorySubtitle}>Acertaste {successCount} de {TARGET_SUCCESSES} palabras</Text>
              <View style={styles.scoreBadge}>
                <Text style={styles.scoreText}>⭐ {score} pts</Text>
              </View>
              {parsedModuloId !== null && (
                <View style={[styles.scoreBadge, { backgroundColor: '#E8F5E9', borderColor: '#81C784', marginTop: 8 }]}>
                  <Text style={[styles.scoreText, { color: '#2E7D32' }]}>+{xpGanado} XP</Text>
                </View>
              )}
              <Pressable
                onPress={handleGoToDictation}
                style={[styles.victoryButton, savingProgress && { opacity: 0.7 }]}
                disabled={savingProgress}
              >
                {savingProgress
                  ? <ActivityIndicator color="#FFFFFF" size="small" />
                  : <Text style={styles.victoryButtonText}>Siguiente Juego</Text>
                }
              </Pressable>
            </>
          ) : (
            <>
              <Text style={styles.victoryEmoji}>😓</Text>
              <Text style={[styles.victoryTitle, { color: '#C62828' }]}>Sección no superada</Text>
              <Text style={[styles.victorySubtitle, { textAlign: 'center', marginTop: 8 }]}>
                Necesitas al menos el 70% de aciertos para avanzar. ¡Sigue practicando!
              </Text>
              <View style={[styles.scoreBadge, { backgroundColor: '#FFEBEE', borderColor: '#EF9A9A', marginTop: 16 }]}>
                <Text style={[styles.scoreText, { color: '#C62828' }]}>
                  {successCount} / {TARGET_SUCCESSES} correctos ({Math.round(pctAciertos * 100)}%)
                </Text>
              </View>
              <Pressable
                onPress={() => {
                  setGameOver(false);
                  setSuccessCount(0);
                  setTotalQuestions(0);
                  setScore(0);
                  startRound(allWords, 0);
                }}
                style={[styles.victoryButton, { backgroundColor: '#C62828' }]}
              >
                <Text style={styles.victoryButtonText}>Reintentar</Text>
              </Pressable>
            </>
          )}
        </View>
      </SafeAreaView>
    );
  }

  const labels = ['A', 'B', 'C'];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        {/* Módulo 4: router.replace para destruir pila de navegación */}
        <Pressable onPress={() => router.replace('/(app)/(tabs)')} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Salir</Text>
        </Pressable>
        <Text style={styles.headerTitle}>🎧 Escucha y elige</Text>
        <View style={styles.headerStats}>
          <View style={styles.statBadge}>
            {/* Módulo 3: mostrar TARGET_SUCCESSES */}
            <Text style={styles.statLabel}>Aciertos: {successCount} de {TARGET_SUCCESSES}</Text>
          </View>
          <View style={styles.statBadge}>
            <Text style={styles.scoreHighlight}>⭐ {score} pts</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.instructions}>
          Escucha el audio y selecciona la traducción Kariña correcta
        </Text>

        {/* Audio Player Card */}
        <View style={styles.audioCard}>
          <Text style={styles.audioCardSubtitle}>Significado en Español:</Text>
          <Text style={styles.targetMeaning}>{target?.significado_espanol}</Text>

          <Pressable
            onPress={() => target?.audio_url && playAudio(target.audio_url)}
            style={({ pressed }) => [styles.playButton, pressed && styles.playButtonPressed]}
            disabled={!target?.audio_url}
          >
            <Text style={styles.playIcon}>{isPlaying ? '⏸️' : '▶️'}</Text>
          </Pressable>
          <Text style={styles.playHint}>
            {target?.audio_url ? 'Toca para reproducir pronunciación' : 'Audio no disponible'}
          </Text>
        </View>

        {/* Options */}
        <View style={styles.optionsContainer}>
          {options.map((opt, idx) => {
            const isSelected = selectedId === opt.id;
            const isCorrect = opt.id === target?.id;

            let cardStyle = styles.optionCard;
            let labelBadgeStyle = styles.labelBadge;
            let labelTextStyle = styles.labelText;

            if (checked) {
              if (isCorrect) {
                cardStyle = [styles.optionCard, styles.correctOptionCard];
                labelBadgeStyle = [styles.labelBadge, styles.correctLabelBadge];
                labelTextStyle = styles.correctLabelText;
              } else if (isSelected) {
                cardStyle = [styles.optionCard, styles.incorrectOptionCard];
                labelBadgeStyle = [styles.labelBadge, styles.incorrectLabelBadge];
                labelTextStyle = styles.incorrectLabelText;
              }
            } else if (isSelected) {
              cardStyle = [styles.optionCard, styles.selectedOptionCard];
              labelBadgeStyle = [styles.labelBadge, styles.selectedLabelBadge];
              labelTextStyle = styles.selectedLabelText;
            }

            return (
              <Pressable
                key={opt.id}
                onPress={() => handleSelect(opt)}
                disabled={checked}
                style={cardStyle}
              >
                <View style={labelBadgeStyle}>
                  <Text style={labelTextStyle}>{labels[idx]}</Text>
                </View>
                <View style={styles.optionContent}>
                  <Text style={styles.optionWord}>{opt.palabra_karina}</Text>
                  <Text style={styles.optionMeaning}>{opt.significado_espanol}</Text>
                </View>
                {checked && isCorrect && <Text style={styles.checkIcon}>✅</Text>}
                {checked && isSelected && !isCorrect && <Text style={styles.checkIcon}>❌</Text>}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function shuffleArray<T>(arr: T[]): T[] {
  const newArr = [...arr];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F9F6F0',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#F9F6F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    fontWeight: '600',
    color: '#1565C0',
  },
  fallbackContainer: {
    flex: 1,
    backgroundColor: '#F9F6F0',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  fallbackCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
    borderWidth: 1,
    borderColor: '#EFECE6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  fallbackEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  fallbackTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1565C0',
    textAlign: 'center',
    marginBottom: 8,
  },
  fallbackDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  fallbackButton: {
    backgroundColor: '#1565C0',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 30,
  },
  fallbackButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 15,
  },
  victoryContainer: {
    flex: 1,
    backgroundColor: '#F9F6F0',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  victoryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 35,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
    borderWidth: 1,
    borderColor: '#EFECE6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  victoryEmoji: {
    fontSize: 56,
    marginBottom: 16,
  },
  victoryTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1A2E1A',
    textAlign: 'center',
  },
  victorySubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  scoreBadge: {
    backgroundColor: '#FFF8E1',
    borderWidth: 1,
    borderColor: '#FFE082',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 24,
    marginTop: 14,
    marginBottom: 24,
  },
  scoreText: {
    color: '#F59E0B',
    fontSize: 20,
    fontWeight: '900',
  },
  victoryButton: {
    backgroundColor: '#1565C0',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 40,
    width: '100%',
    alignItems: 'center',
  },
  victoryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  header: {
    backgroundColor: '#1565C0',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 18,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  backButton: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 12,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
  },
  headerStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  statBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  statLabel: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 12,
    fontWeight: '600',
  },
  scoreHighlight: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: '900',
  },
  scrollContent: {
    padding: 20,
    alignItems: 'center',
  },
  instructions: {
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
    marginBottom: 20,
  },
  audioCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    width: '100%',
    maxWidth: 360,
    borderWidth: 1,
    borderColor: '#EFECE6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 24,
  },
  audioCardSubtitle: {
    fontSize: 12,
    color: '#888',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  targetMeaning: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1A2E1A',
    marginTop: 6,
    marginBottom: 16,
    textAlign: 'center',
  },
  playButton: {
    backgroundColor: '#1565C0',
    borderRadius: 45,
    width: 90,
    height: 90,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1565C0',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  playButtonPressed: {
    transform: [{ scale: 0.95 }],
    backgroundColor: '#0D47A1',
  },
  playIcon: {
    fontSize: 36,
    marginLeft: 4, // centering visual fix for play arrow
  },
  playHint: {
    fontSize: 12,
    color: '#888',
    marginTop: 14,
    fontWeight: '500',
  },
  optionsContainer: {
    width: '100%',
    maxWidth: 360,
    gap: 12,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: '#EFECE6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  selectedOptionCard: {
    borderColor: '#1565C0',
    backgroundColor: '#E3F2FD',
  },
  correctOptionCard: {
    borderColor: '#2E7D32',
    backgroundColor: '#E8F5E9',
  },
  incorrectOptionCard: {
    borderColor: '#C62828',
    backgroundColor: '#FFEBEE',
  },
  labelBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F0EDE8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  selectedLabelBadge: {
    backgroundColor: '#1565C0',
  },
  correctLabelBadge: {
    backgroundColor: '#2E7D32',
  },
  incorrectLabelBadge: {
    backgroundColor: '#C62828',
  },
  labelText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1A2E1A',
  },
  selectedLabelText: {
    color: '#FFFFFF',
  },
  correctLabelText: {
    color: '#FFFFFF',
  },
  incorrectLabelText: {
    color: '#FFFFFF',
  },
  optionContent: {
    flex: 1,
  },
  optionWord: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A2E1A',
  },
  optionMeaning: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  checkIcon: {
    fontSize: 22,
  },
});
