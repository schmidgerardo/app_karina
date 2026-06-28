import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View, StyleSheet } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { supabase } from '@/client/supabase';
import { useSession } from '@/ctx';
import { useDatabaseContext } from '@/context/DatabaseContext';
import { useTranslation } from 'react-i18next';       // 👈 AÑADIDO
import { useLanguage } from '@/context/LanguageContext'; // 👈 AÑADIDO

// ─── Constantes de juego ──────────────────────────────────────────────────────
const TOTAL_ROUNDS = 2;        // Módulo 3: máximo 2 rondas
const XP_THRESHOLD = 0.7;      // Módulo 5: umbral del 70%
const XP_PER_CORRECT = 50;     // Módulo 5: XP por palabra correcta

interface Word {
  id: string;
  palabra_karina: string;
  significado_espanol: string;
  significado_ingles?: string;   // 👈 NUEVO CAMPO para traducción
  audio_url: string | null;
}

interface AnagramLetter {
  id: string;
  char: string;
  isSelected: boolean;
}

export default function JuegoDictadoScreen() {
  const router = useRouter();
  const { modulo_id } = useLocalSearchParams();
  const { session } = useSession();
  const { enqueuePendingScore } = useDatabaseContext();
  const { t } = useTranslation();         // 👈 INICIALIZADO
  const { language } = useLanguage();     // 👈 INICIALIZADO

  // Parse and normalize modulo_id
  const parsedModuloId = modulo_id
    ? (/^\d+$/.test(String(modulo_id)) ? parseInt(String(modulo_id), 10) : String(modulo_id))
    : null;

  const [allWords, setAllWords] = useState<Word[]>([]);
  const [target, setTarget] = useState<Word | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Anagram states
  const [lettersPool, setLettersPool] = useState<AnagramLetter[]>([]);
  const [assembledLetters, setAssembledLetters] = useState<AnagramLetter[]>([]);
  
  const [round, setRound] = useState(1);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [roundChecked, setRoundChecked] = useState(false);
  const [roundCorrect, setRoundCorrect] = useState(false);
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
        .select('id, palabra_karina, significado_espanol, audio_url, significado_ingles'); // 👈 AÑADIDO

      if (parsedModuloId !== null) {
        query = query.eq('modulo_id', parsedModuloId);
      } else {
        query = query.limit(40);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        console.error('Error fetching words in Dictado:', fetchError);
        setError('No se pudo conectar a la base de datos.');
        setLoading(false);
        return;
      }

      if (data && data.length >= 4) {
        setAllWords(data as Word[]);
        startRound(data as Word[], 1);
      } else {
        setAllWords([]); // Triggers the Escudo Protector
      }
    } catch (e) {
      console.error('Excepción al cargar palabras en Dictado:', e);
      setError('Ocurrió un error inesperado.');
    } finally {
      setLoading(false);
    }
  }

  function startRound(wordsPool: Word[], currentRound: number) {
    if (!wordsPool || wordsPool.length < 4) return;

    // Pick a target word randomly
    const wordsWithAudio = wordsPool.filter(w => w.audio_url);
    const selectionPool = wordsWithAudio.length > 0 ? wordsWithAudio : wordsPool;
    const t = selectionPool[Math.floor(Math.random() * selectionPool.length)];

    setTarget(t);
    setRoundChecked(false);
    setRoundCorrect(false);
    setAssembledLetters([]);

    // Prepare scrambled letters pool
    const letters = t.palabra_karina.split('').map((char, index) => ({
      id: `${char}-${index}`,
      char,
      isSelected: false,
    }));
    setLettersPool(shuffleArray(letters));

    // Play the audio for the new word
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
      console.error('Error playing audio in dictado:', err);
    }
  };

  // Letter interaction
  const handleSelectLetter = (letter: AnagramLetter) => {
    if (roundChecked || letter.isSelected) return;

    // Mark as selected in pool
    setLettersPool(prev => prev.map(l => l.id === letter.id ? { ...l, isSelected: true } : l));
    // Append to assembled
    setAssembledLetters(prev => [...prev, letter]);
  };

  const handleRemoveLetter = (letter: AnagramLetter) => {
    if (roundChecked) return;

    // Remove from assembled
    setAssembledLetters(prev => prev.filter(l => l.id !== letter.id));
    // Mark as unselected in pool
    setLettersPool(prev => prev.map(l => l.id === letter.id ? { ...l, isSelected: false } : l));
  };

  const handleClear = () => {
    if (roundChecked) return;
    setAssembledLetters([]);
    setLettersPool(prev => prev.map(l => ({ ...l, isSelected: false })));
  };

  const handleCheck = () => {
    if (!target) return;
    const attempt = assembledLetters.map(l => l.char).join('');
    const correct = attempt.toLowerCase() === target.palabra_karina.toLowerCase();

    setRoundCorrect(correct);
    setRoundChecked(true);

    if (correct) {
      setScore(s => s + XP_PER_CORRECT);
      setCorrectCount(c => c + 1);
      setTimeout(() => {
        handleNextStep();
      }, 1500);
    }
  };

  const handleNextStep = () => {
    // Módulo 3: usar TOTAL_ROUNDS en lugar de 3
    if (round >= TOTAL_ROUNDS) {
      // Trigger Game Completion & database update
      setGameOver(true);
      if (parsedModuloId !== null) {
        saveProgressToDatabase();
      }
    } else {
      const nextR = round + 1;
      setRound(nextR);
      startRound(allWords, nextR);
    }
  };

  async function saveProgressToDatabase() {
    if (!session?.user?.id || parsedModuloId === null) return;

    const userId = session.user.id;

    // Módulo 5: Calcular umbral del 70% (correctCount sobre TOTAL_ROUNDS)
    // correctCount se actualiza en handleCheck antes de que se llame a esta función
    // Usamos score como proxy: score / (TOTAL_ROUNDS * XP_PER_CORRECT)
    const pctAciertos = score / (TOTAL_ROUNDS * XP_PER_CORRECT);
    if (pctAciertos < XP_THRESHOLD) {
      // No supera el umbral, no guardar XP
      console.log(`[DICTADO] Umbral no superado: ${Math.round(pctAciertos * 100)}% < 70%`);
      return;
    }

    const dynamicXp = score;

    try {
      setSavingProgress(true);

      // Fetch existing progress
      const { data: existingProgress, error: fetchError } = await supabase
        .from('module_progress')
        .select('*')
        .eq('user_id', userId)
        .eq('modulo_id', parsedModuloId)
        .maybeSingle();

      if (fetchError) {
        console.error('Error fetching progress:', fetchError);
      }

      if (existingProgress) {
        await supabase
          .from('module_progress')
          .update({
            completed: true,
            xp: (existingProgress.xp || 0) + dynamicXp,
            completed_at: new Date().toISOString(),
          })
          .eq('id', existingProgress.id);
      } else {
        await supabase.from('module_progress').insert({
          user_id: userId,
          modulo_id: parsedModuloId,
          completed: true,
          xp: dynamicXp,
          completed_at: new Date().toISOString(),
        });
      }
    } catch (e) {
      // Sin conexión → encolar en SQLite (Módulo 1)
      console.warn('[DICTADO] Sin conexión, encolando score offline:', e);
      await enqueuePendingScore(userId, Number(parsedModuloId), dynamicXp);
    } finally {
      setSavingProgress(false);
    }
  }

  const handleFinishGame = () => {
    if (parsedModuloId !== null) {
      router.replace(`/modulo/${parsedModuloId}`);
    } else {
      router.replace('/(tabs)/juegos');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#E65100" />
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
    const pctAciertos = TOTAL_ROUNDS > 0 ? score / (TOTAL_ROUNDS * XP_PER_CORRECT) : 0;
    const passed = pctAciertos >= XP_THRESHOLD;

    return (
      <SafeAreaView style={styles.victoryContainer}>
        <View style={styles.victoryCard}>
          {passed ? (
            <>
              <Text style={styles.victoryEmoji}>🏆</Text>
              <Text style={styles.victoryTitle}>¡Felicitaciones!</Text>
              <Text style={styles.victorySubtitle}>Completaste el flujo de prácticas</Text>

              <View style={styles.rewardsContainer}>
                <View style={styles.rewardBox}>
                  <Text style={styles.rewardValue}>⭐ {score}</Text>
                  <Text style={styles.rewardLabel}>Puntos</Text>
                </View>
                {parsedModuloId !== null && (
                  <View style={styles.rewardBox}>
                    <Text style={[styles.rewardValue, { color: '#2E7D32' }]}>+{score}</Text>
                    <Text style={styles.rewardLabel}>XP Ganado</Text>
                  </View>
                )}
              </View>

              <Pressable
                onPress={handleFinishGame}
                style={styles.victoryButton}
                disabled={savingProgress}
              >
                {savingProgress ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.victoryButtonText}>Finalizar práctica</Text>
                )}
              </Pressable>
            </>
          ) : (
            <>
              <Text style={styles.victoryEmoji}>😓</Text>
              <Text style={[styles.victoryTitle, { color: '#C62828' }]}>Sección no superada</Text>
              <Text style={[styles.victorySubtitle, { textAlign: 'center', marginTop: 8 }]}>
                Necesitas al menos el 70% de aciertos para avanzar. ¡Sigue practicando!
              </Text>
              <View style={[styles.rewardsContainer]}>
                <View style={[styles.rewardBox, { borderColor: '#EF9A9A', backgroundColor: '#FFEBEE' }]}>
                  <Text style={[styles.rewardValue, { color: '#C62828' }]}>
                    {Math.round(pctAciertos * 100)}%
                  </Text>
                  <Text style={[styles.rewardLabel, { color: '#C62828' }]}>Aciertos</Text>
                </View>
              </View>
              <Pressable
                onPress={() => {
                  setGameOver(false);
                  setRound(1);
                  setScore(0);
                  setCorrectCount(0);
                  startRound(allWords, 1);
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

  const attemptWord = assembledLetters.map(l => l.char).join('');

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.replace('/(app)/(tabs)')} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Salir</Text>
        </Pressable>
        <Text style={styles.headerTitle}>✍️ Dictado Kariña</Text>
        <View style={styles.headerStats}>
          <View style={styles.statBadge}>
            <Text style={styles.statLabel}>Palabra {round} de {TOTAL_ROUNDS}</Text>
          </View>
          <View style={styles.statBadge}>
            <Text style={styles.scoreHighlight}>⭐ {score} pts</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.instructions}>
          Escucha el audio y ordena las letras para escribir la palabra
        </Text>

        {/* Audio Card - MODIFICADO */}
        <View style={styles.audioCard}>
          <Text style={styles.audioCardSubtitle}>{t('common.spanish_clue')}</Text>  {/* 👈 CLAVE */}
          <Text style={styles.targetMeaning}>
            {language === 'en' && target?.significado_ingles
              ? target.significado_ingles
              : target?.significado_espanol}
          </Text>

          <Pressable
            onPress={() => target?.audio_url && playAudio(target.audio_url)}
            style={({ pressed }) => [styles.playButton, pressed && styles.playButtonPressed]}
            disabled={!target?.audio_url}
          >
            <Text style={styles.playIcon}>{isPlaying ? '⏸️' : '▶️'}</Text>
          </Pressable>
          <Text style={styles.playHint}>
            {target?.audio_url ? 'Toca para escuchar de nuevo' : 'Audio no disponible'}
          </Text>
        </View>

        {/* Assembled Letters Section */}
        <View style={styles.assembledSection}>
          <View style={styles.assembledContainer}>
            {assembledLetters.length === 0 ? (
              <Text style={styles.placeholderText}>Toca las letras de abajo...</Text>
            ) : (
              <View style={styles.lettersRow}>
                {assembledLetters.map((letter) => {
                  let borderCol = '#E65100';
                  let bgCol = '#FFFFFF';
                  let textCol = '#E65100';

                  if (roundChecked) {
                    borderCol = roundCorrect ? '#2E7D32' : '#C62828';
                    bgCol = roundCorrect ? '#E8F5E9' : '#FFEBEE';
                    textCol = roundCorrect ? '#2E7D32' : '#C62828';
                  }

                  return (
                    <Pressable
                      key={letter.id}
                      onPress={() => handleRemoveLetter(letter)}
                      disabled={roundChecked}
                      style={[styles.letterSquare, { borderColor: borderCol, backgroundColor: bgCol }]}
                    >
                      <Text style={[styles.letterText, { color: textCol }]}>{letter.char}</Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>

          {assembledLetters.length > 0 && !roundChecked && (
            <Pressable onPress={handleClear} style={styles.clearButton}>
              <Text style={styles.clearButtonText}>Borrar todo</Text>
            </Pressable>
          )}
        </View>

        {/* Feedback Alert */}
        {roundChecked && (
          <View
            style={[
              styles.feedbackAlert,
              { backgroundColor: roundCorrect ? '#E8F5E9' : '#FFEBEE', borderColor: roundCorrect ? '#81C784' : '#E57373' },
            ]}
          >
            <Text style={[styles.feedbackAlertText, { color: roundCorrect ? '#2E7D32' : '#C62828' }]}>
              {roundCorrect ? '¡Excelente trabajo! ¡Correcto!' : `Incorrecto. Era: ${target?.palabra_karina}`}
            </Text>
          </View>
        )}

        {/* Letters Scrambled Pool */}
        {!roundChecked && (
          <View style={styles.poolContainer}>
            {lettersPool.map((letter) => (
              <Pressable
                key={letter.id}
                onPress={() => handleSelectLetter(letter)}
                disabled={letter.isSelected}
                style={[
                  styles.poolLetterSquare,
                  letter.isSelected && styles.poolLetterSquareSelected,
                ]}
              >
                <Text
                  style={[
                    styles.poolLetterText,
                    letter.isSelected && styles.poolLetterTextSelected,
                  ]}
                >
                  {letter.char}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        {/* Action Button - MODIFICADO */}
        <View style={styles.actionContainer}>
          {!roundChecked ? (
            <Pressable
              onPress={handleCheck}
              disabled={assembledLetters.length === 0}
              style={[
                styles.actionButton,
                assembledLetters.length === 0 && styles.actionButtonDisabled,
              ]}
            >
              <Text style={styles.actionButtonText}>{t('common.verify')}</Text>  {/* 👈 CLAVE */}
            </Pressable>
          ) : (
            !roundCorrect && (
              <Pressable onPress={handleNextStep} style={styles.actionButton}>
                <Text style={styles.actionButtonText}>Continuar</Text>
              </Pressable>
            )
          )}
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
    color: '#E65100',
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
    color: '#E65100',
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
    backgroundColor: '#E65100',
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
  rewardsContainer: {
    flexDirection: 'row',
    gap: 16,
    marginVertical: 24,
    width: '100%',
    justifyContent: 'center',
  },
  rewardBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EFECE6',
    minWidth: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  rewardValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#F59E0B',
  },
  rewardLabel: {
    fontSize: 11,
    color: '#888',
    marginTop: 4,
    fontWeight: '600',
  },
  victoryButton: {
    backgroundColor: '#E65100',
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
    backgroundColor: '#E65100',
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
    backgroundColor: '#E65100',
    borderRadius: 45,
    width: 90,
    height: 90,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#E65100',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  playButtonPressed: {
    transform: [{ scale: 0.95 }],
    backgroundColor: '#BF360C',
  },
  playIcon: {
    fontSize: 36,
    marginLeft: 4,
  },
  playHint: {
    fontSize: 12,
    color: '#888',
    marginTop: 14,
    fontWeight: '500',
  },
  assembledSection: {
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    marginBottom: 20,
  },
  assembledContainer: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#EFECE6',
    borderRadius: 16,
    minHeight: 80,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  placeholderText: {
    color: '#AAA',
    fontSize: 14,
    fontStyle: 'italic',
  },
  lettersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  letterSquare: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  letterText: {
    fontSize: 18,
    fontWeight: '900',
  },
  clearButton: {
    marginTop: 10,
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  clearButtonText: {
    color: '#E65100',
    fontWeight: '700',
    fontSize: 13,
  },
  feedbackAlert: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 20,
    alignItems: 'center',
  },
  feedbackAlertText: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  poolContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
    width: '100%',
    maxWidth: 360,
    marginBottom: 24,
  },
  poolLetterSquare: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#EFECE6',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  poolLetterSquareSelected: {
    backgroundColor: '#F0EDE8',
    borderColor: '#F0EDE8',
    opacity: 0.4,
  },
  poolLetterText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1A2E1A',
  },
  poolLetterTextSelected: {
    color: '#AAA',
  },
  actionContainer: {
    width: '100%',
    maxWidth: 360,
    marginBottom: 20,
  },
  actionButton: {
    backgroundColor: '#E65100',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  actionButtonDisabled: {
    backgroundColor: '#EFECE6',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
});