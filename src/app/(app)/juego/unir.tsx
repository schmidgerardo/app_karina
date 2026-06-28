import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View, StyleSheet, ScrollView } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedProps, useSharedValue, runOnJS } from 'react-native-reanimated';
import Svg, { Line } from 'react-native-svg';
import { supabase } from '@/client/supabase';
import { useSession } from '@/ctx';
import { useDatabaseContext } from '@/context/DatabaseContext';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '@/context/LanguageContext';

interface Word {
  id: string;
  palabra_karina: string;
  significado_espanol: string;
  significado_ingles?: string;  // 👈 Añadido
}

interface WordBox {
  word: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

const AnimatedLine = Animated.createAnimatedComponent(Line);

// ─── Constantes de juego ──────────────────────────────────────────────────────
const TOTAL_ROUNDS = 2;
const XP_THRESHOLD = 0.7;
const XP_PER_MATCH = 10;

export default function JuegoUnirScreen() {
  const router = useRouter();
  const { session } = useSession();
  const { enqueuePendingScore } = useDatabaseContext();
  const { modulo_id } = useLocalSearchParams();
  const { t } = useTranslation();
  const { language } = useLanguage();

  const parsedModuloId = modulo_id
    ? (/^\d+$/.test(String(modulo_id)) ? parseInt(String(modulo_id), 10) : String(modulo_id))
    : null;

  const [allWords, setAllWords] = useState<Word[]>([]);
  const [currentWords, setCurrentWords] = useState<Word[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [matchedKarina, setMatchedKarina] = useState<Set<string>>(new Set());
  const [matchedEspanol, setMatchedEspanol] = useState<Set<string>>(new Set());
  const [matchedPairs, setMatchedPairs] = useState<{ karina: string; espanol: string }[]>([]);

  const [round, setRound] = useState(1);
  const [score, setScore] = useState(0);
  const [totalMatches, setTotalMatches] = useState(0);
  const [totalPossible, setTotalPossible] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [savingProgress, setSavingProgress] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const [karinaList, setKarinaList] = useState<string[]>([]);
  const [espanolList, setEspanolList] = useState<string[]>([]);

  const [containerOffset, setContainerOffset] = useState({ x: 0, y: 0 });
  const containerRef = useRef<View>(null);

  const karinaRefs = useRef<Record<string, View | null>>({});
  const espanolRefs = useRef<Record<string, View | null>>({});
  const [karinaBoxes, setKarinaBoxes] = useState<Record<string, WordBox>>({});
  const [espanolBoxes, setEspanolBoxes] = useState<Record<string, WordBox>>({});

  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const endX = useSharedValue(0);
  const endY = useSharedValue(0);
  const isDragging = useSharedValue(false);
  const lineColor = useSharedValue('#4CAF50');

  const [activeWord, setActiveWord] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

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
        .select('id, palabra_karina, significado_espanol, significado_ingles'); // 👈 Añadido

      if (parsedModuloId !== null) {
        query = query.eq('modulo_id', parsedModuloId);
      } else {
        query = query.limit(40);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        console.error('Error fetching words from Supabase:', fetchError);
        setError('No se pudo conectar a la base de datos.');
        setLoading(false);
        return;
      }

      if (data && data.length >= 4) {
        const shuffled = shuffleArray(data as Word[]);
        setAllWords(shuffled);
        startNewRound(shuffled, 1);
      } else {
        setAllWords([]);
      }
    } catch (e) {
      console.error('Excepción al cargar palabras:', e);
      setError('Ocurrió un error inesperado.');
    } finally {
      setLoading(false);
    }
  }

  function startNewRound(wordsPool: Word[], currentRound: number) {
    if (!wordsPool || wordsPool.length < 4) return;

    const selected = shuffleArray([...wordsPool]).slice(0, 4);
    setTotalPossible(prev => prev + selected.length);
    setCurrentWords(selected);
    setMatchedKarina(new Set());
    setMatchedEspanol(new Set());
    setMatchedPairs([]);
    setActiveWord(null);
    setFeedback(null);

    const karinas = selected.map(w => w.palabra_karina);
    // 👇 Usar significado traducido según idioma
    const espanols = selected.map(w =>
      language === 'en' && w.significado_ingles ? w.significado_ingles : w.significado_espanol
    );

    setKarinaList(shuffleArray(karinas));
    setEspanolList(shuffleArray(espanols));

    setKarinaBoxes({});
    setEspanolBoxes({});
  }

  const measureBox = (word: string, isKarina: boolean) => {
    const ref = isKarina ? karinaRefs.current[word] : espanolRefs.current[word];
    if (ref) {
      ref.measure((x, y, width, height, pageX, pageY) => {
        if (width && height && pageX && pageY) {
          const box = { word, x: pageX, y: pageY, width, height };
          if (isKarina) {
            setKarinaBoxes(prev => ({ ...prev, [word]: box }));
          } else {
            setEspanolBoxes(prev => ({ ...prev, [word]: box }));
          }
        }
      });
    }
  };

  const measureContainer = () => {
    containerRef.current?.measure((x, y, width, height, pageX, pageY) => {
      if (pageX !== undefined && pageY !== undefined) {
        setContainerOffset({ x: pageX, y: pageY });
      }
    });
  };

  function nextRound() {
    if (round >= TOTAL_ROUNDS) {
      setGameOver(true);
      handleSaveProgress();
      return;
    }
    setRound(r => r + 1);
    startNewRound(allWords, round + 1);
  }

  async function handleSaveProgress() {
    if (parsedModuloId === null || !session?.user?.id) return;

    const userId = session.user.id;
    const xpGanado = score;

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
      console.warn('[UNIR] Sin conexión, encolando score offline:', err);
      await enqueuePendingScore(userId, Number(parsedModuloId), xpGanado);
    } finally {
      setSavingProgress(false);
    }
  }

  function showFeedback(message: string, type: 'success' | 'error') {
    setFeedback({ message, type });
    setTimeout(() => setFeedback(null), 1500);
  }

  function checkMatch(karinaWord: string, espanolWord: string) {
    if (isProcessing) return;

    const pair = currentWords.find(w => w.palabra_karina === karinaWord);
    if (!pair) {
      showFeedback('❌ ' + t('common.error'), 'error');
      resetLine();
      return;
    }

    const targetEspanol = language === 'en' && pair.significado_ingles
      ? pair.significado_ingles
      : pair.significado_espanol;

    if (targetEspanol === espanolWord) {
      showFeedback(`✅ ${t('games.correct')} +${XP_PER_MATCH} ${t('games.score')}`, 'success');
      setMatchedKarina(prev => new Set([...prev, karinaWord]));
      setMatchedEspanol(prev => new Set([...prev, espanolWord]));
      setMatchedPairs(prev => [...prev, { karina: karinaWord, espanol: espanolWord }]);
      setScore(s => s + XP_PER_MATCH);
      setTotalMatches(m => m + 1);
      lineColor.value = '#4CAF50';

      if (matchedKarina.size + 1 === currentWords.length) {
        setTimeout(() => {
          if (round >= TOTAL_ROUNDS) {
            setGameOver(true);
            handleSaveProgress();
          } else {
            nextRound();
          }
        }, 1500);
      }
    } else {
      const correctMatch = currentWords.find(w => w.palabra_karina === karinaWord);
      const correctText = language === 'en' && correctMatch?.significado_ingles
        ? correctMatch.significado_ingles
        : correctMatch?.significado_espanol;
      showFeedback(`❌ "${karinaWord}" ${t('games.is')} "${correctText}"`, 'error');
      lineColor.value = '#F44336';
    }

    setIsProcessing(true);
    setTimeout(() => resetLine(), 800);
  }

  function resetLine() {
    isDragging.value = false;
    setActiveWord(null);
    setIsProcessing(false);
    setTimeout(() => {
      lineColor.value = '#4CAF50';
    }, 300);
  }

  const handleTapWord = (word: string, isKarina: boolean) => {
    if (isProcessing) return;

    if (isKarina) {
      if (matchedKarina.has(word)) return;
      setActiveWord(word);
    } else {
      if (matchedEspanol.has(word)) return;
      if (activeWord) {
        checkMatch(activeWord, word);
      } else {
        showFeedback('💡 ' + t('unir.tap_karina_first'), 'error');
      }
    }
  };

  const gesture = Gesture.Pan()
    .onBegin((e) => {
      if (isProcessing) return;

      const touchX = e.x + containerOffset.x;
      const touchY = e.y + containerOffset.y;

      for (const [word, box] of Object.entries(karinaBoxes)) {
        if (
          !matchedKarina.has(word) &&
          touchX >= box.x &&
          touchX <= box.x + box.width &&
          touchY >= box.y &&
          touchY <= box.y + box.height
        ) {
          runOnJS(setActiveWord)(word);
          startX.value = box.x + box.width / 2 - containerOffset.x;
          startY.value = box.y + box.height / 2 - containerOffset.y;
          endX.value = touchX - containerOffset.x;
          endY.value = touchY - containerOffset.y;
          isDragging.value = true;
          break;
        }
      }
    })
    .onUpdate((e) => {
      if (isDragging.value && !isProcessing) {
        endX.value = e.x;
        endY.value = e.y;
      }
    })
    .onEnd((e) => {
      if (isDragging.value && !isProcessing && activeWord) {
        const touchX = e.x + containerOffset.x;
        const touchY = e.y + containerOffset.y;
        let found = false;

        for (const [word, box] of Object.entries(espanolBoxes)) {
          if (
            !matchedEspanol.has(word) &&
            touchX >= box.x &&
            touchX <= box.x + box.width &&
            touchY >= box.y &&
            touchY <= box.y + box.height
          ) {
            found = true;
            runOnJS(checkMatch)(activeWord, word);
            break;
          }
        }

        if (!found) {
          runOnJS(showFeedback)('💡 ' + t('unir.drag_to_correct'), 'error');
          runOnJS(resetLine)();
        }
      } else {
        runOnJS(resetLine)();
      }
    });

  const animatedLineProps = useAnimatedProps(() => ({
    x1: startX.value,
    y1: startY.value,
    x2: endX.value,
    y2: endY.value,
    stroke: lineColor.value,
    strokeWidth: 4,
    strokeOpacity: isDragging.value ? 0.8 : 0,
  }));

  const handleGoToOptions = () => {
    if (parsedModuloId !== null) {
      router.push(`/juego/opciones?modulo_id=${parsedModuloId}`);
    } else {
      router.push('/juego/opciones');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1B5E20" />
        <Text style={styles.loadingText}>{t('games.loading')}</Text>
      </SafeAreaView>
    );
  }

  if (error || !allWords || allWords.length < 4) {
    return (
      <SafeAreaView style={styles.fallbackContainer}>
        <View style={styles.fallbackCard}>
          <Text style={styles.fallbackEmoji}>⚠️</Text>
          <Text style={styles.fallbackTitle}>{t('games.insufficient_words')}</Text>
          <Text style={styles.fallbackDescription}>
            {t('games.insufficient_words_desc')}
          </Text>
          <Pressable onPress={() => router.back()} style={styles.fallbackButton}>
            <Text style={styles.fallbackButtonText}>{t('games.back_menu')}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (gameOver) {
    const pctAciertos = totalPossible > 0 ? totalMatches / totalPossible : 0;
    const passed = pctAciertos >= XP_THRESHOLD;
    const xpGanado = passed ? score : 0;

    return (
      <SafeAreaView style={styles.victoryContainer}>
        <View style={styles.victoryCard}>
          {passed ? (
            <>
              <Text style={styles.victoryEmoji}>🎉</Text>
              <Text style={styles.victoryTitle}>{t('unir.victory_title')}</Text>
              <Text style={styles.victorySubtitle}>{t('unir.victory_subtitle')}</Text>
              <View style={styles.scoreBadge}>
                <Text style={styles.scoreText}>⭐ {score} {t('games.score')}</Text>
              </View>
              {parsedModuloId !== null && (
                <View style={[styles.scoreBadge, { backgroundColor: '#E8F5E9', borderColor: '#81C784', marginTop: 8 }]}>
                  <Text style={[styles.scoreText, { color: '#2E7D32' }]}>+{xpGanado} {t('games.xp_earned')}</Text>
                </View>
              )}
              <Pressable
                onPress={handleGoToOptions}
                style={[styles.victoryButton, savingProgress && { opacity: 0.7 }]}
                disabled={savingProgress}
              >
                {savingProgress
                  ? <ActivityIndicator color="#FFFFFF" size="small" />
                  : <Text style={styles.victoryButtonText}>{t('games.next_game')}</Text>
                }
              </Pressable>
            </>
          ) : (
            <>
              <Text style={styles.victoryEmoji}>😓</Text>
              <Text style={[styles.victoryTitle, { color: '#C62828' }]}>{t('games.not_passed')}</Text>
              <Text style={[styles.victorySubtitle, { textAlign: 'center', marginTop: 8 }]}>
                {t('games.not_passed_desc')}
              </Text>
              <View style={[styles.scoreBadge, { backgroundColor: '#FFEBEE', borderColor: '#EF9A9A', marginTop: 16 }]}>
                <Text style={[styles.scoreText, { color: '#C62828' }]}>
                  {totalMatches} / {totalPossible} {t('games.correct_lower')} ({Math.round(pctAciertos * 100)}%)
                </Text>
              </View>
              <Pressable
                onPress={() => {
                  setGameOver(false);
                  setRound(1);
                  setScore(0);
                  setTotalMatches(0);
                  setTotalPossible(0);
                  startNewRound(allWords, 1);
                }}
                style={[styles.victoryButton, { backgroundColor: '#C62828' }]}
              >
                <Text style={styles.victoryButtonText}>{t('games.retry')}</Text>
              </Pressable>
            </>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.replace('/(app)/(tabs)')} style={styles.backButton}>
            <Text style={styles.backButtonText}>{t('games.exit')}</Text>
          </Pressable>
          <Text style={styles.headerTitle}>{t('unir.title')}</Text>
          <View style={styles.headerStats}>
            <View style={styles.statBadge}>
              <Text style={styles.statLabel}>
                {t('games.round_of', { current: round, total: TOTAL_ROUNDS })}
              </Text>
            </View>
            <View style={styles.statBadge}>
              <Text style={styles.scoreHighlight}>⭐ {score} {t('games.score')}</Text>
            </View>
          </View>
        </View>

        {feedback && (
          <View
            style={[
              styles.feedbackOverlay,
              { backgroundColor: feedback.type === 'success' ? '#2E7D32' : '#C62828' },
            ]}
          >
            <Text style={styles.feedbackText}>{feedback.message}</Text>
          </View>
        )}

        <ScrollView contentContainerStyle={styles.scrollContent} scrollEnabled={false}>
          <Text style={styles.instructions}>
            {t('unir.instructions')}
          </Text>

          <GestureDetector gesture={gesture}>
            <View
              ref={containerRef}
              onLayout={() => {
                setTimeout(measureContainer, 100);
              }}
              style={styles.gameArea}
            >
              <View style={styles.svgContainer}>
                <Svg style={{ width: '100%', height: '100%' }}>
                  <AnimatedLine animatedProps={animatedLineProps} />
                  {matchedPairs.map(pair => {
                    const kBox = karinaBoxes[pair.karina];
                    const eBox = espanolBoxes[pair.espanol];
                    if (kBox && eBox) {
                      const kX = kBox.x + kBox.width / 2 - containerOffset.x;
                      const kY = kBox.y + kBox.height / 2 - containerOffset.y;
                      const eX = eBox.x + eBox.width / 2 - containerOffset.x;
                      const eY = eBox.y + eBox.height / 2 - containerOffset.y;
                      return (
                        <Line
                          key={`${pair.karina}-${pair.espanol}`}
                          x1={kX}
                          y1={kY}
                          x2={eX}
                          y2={eY}
                          stroke="#2E7D32"
                          strokeWidth={4}
                          strokeOpacity={0.8}
                        />
                      );
                    }
                    return null;
                  })}
                </Svg>
              </View>

              <View style={styles.columnsContainer}>
                <View style={styles.column}>
                  <Text style={styles.columnHeader}>KARIÑA</Text>
                  {karinaList.map(word => {
                    const isMatched = matchedKarina.has(word);
                    const isActive = activeWord === word;

                    return (
                      <View
                        key={word}
                        ref={el => {
                          karinaRefs.current[word] = el;
                        }}
                        onLayout={() => {
                          setTimeout(() => measureBox(word, true), 100);
                        }}
                        style={[
                          styles.wordCard,
                          isMatched && styles.matchedWordCard,
                          isActive && styles.activeWordCard,
                        ]}
                      >
                        <Pressable
                          onPress={() => handleTapWord(word, true)}
                          style={styles.pressableArea}
                          disabled={isMatched}
                        >
                          <Text
                            style={[
                              styles.wordText,
                              isMatched && styles.matchedWordText,
                              isActive && styles.activeWordText,
                            ]}
                          >
                            {word}
                          </Text>
                        </Pressable>
                      </View>
                    );
                  })}
                </View>

                <View style={styles.column}>
                  <Text style={[styles.columnHeader, { color: '#1565C0' }]}>ESPAÑOL</Text>
                  {espanolList.map(word => {
                    const isMatched = matchedEspanol.has(word);

                    return (
                      <View
                        key={word}
                        ref={el => {
                          espanolRefs.current[word] = el;
                        }}
                        onLayout={() => {
                          setTimeout(() => measureBox(word, false), 100);
                        }}
                        style={[styles.wordCard, isMatched && styles.matchedWordCard]}
                      >
                        <Pressable
                          onPress={() => handleTapWord(word, false)}
                          style={styles.pressableArea}
                          disabled={isMatched}
                        >
                          <Text style={[styles.wordText, isMatched && styles.matchedWordText]}>
                            {word}
                          </Text>
                        </Pressable>
                      </View>
                    );
                  })}
                </View>
              </View>
            </View>
          </GestureDetector>
        </ScrollView>
      </SafeAreaView>
    </GestureHandlerRootView>
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
    color: '#1B5E20',
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
    color: '#1B5E20',
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
    backgroundColor: '#1B5E20',
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
    backgroundColor: '#1B5E20',
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
    backgroundColor: '#1B5E20',
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
  feedbackOverlay: {
    position: 'absolute',
    top: 130,
    left: 20,
    right: 20,
    borderRadius: 12,
    padding: 14,
    zIndex: 100,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  feedbackText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
    textAlign: 'center',
  },
  scrollContent: {
    padding: 16,
    flex: 1,
  },
  instructions: {
    textAlign: 'center',
    color: '#666',
    fontSize: 13,
    marginBottom: 16,
  },
  gameArea: {
    flex: 1,
    position: 'relative',
  },
  svgContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
    zIndex: 10,
  },
  columnsContainer: {
    flexDirection: 'row',
    gap: 16,
    flex: 1,
  },
  column: {
    flex: 1,
    gap: 12,
  },
  columnHeader: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1B5E20',
    textAlign: 'center',
    marginBottom: 4,
    letterSpacing: 1,
  },
  wordCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#EFECE6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
    overflow: 'hidden',
  },
  pressableArea: {
    paddingVertical: 18,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  wordText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2A3B2A',
    textAlign: 'center',
  },
  matchedWordCard: {
    backgroundColor: '#E8F5E9',
    borderColor: '#81C784',
    opacity: 0.5,
  },
  matchedWordText: {
    color: '#2E7D32',
    textDecorationLine: 'line-through',
  },
  activeWordCard: {
    backgroundColor: '#E8F5E9',
    borderColor: '#2E7D32',
  },
  activeWordText: {
    color: '#2E7D32',
  },
});