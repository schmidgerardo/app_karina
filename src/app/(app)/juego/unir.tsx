import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View, StyleSheet, ScrollView } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedProps, useSharedValue, runOnJS } from 'react-native-reanimated';
import Svg, { Line } from 'react-native-svg';
import { supabase } from '@/client/supabase';

interface Word {
  id: string;
  palabra_karina: string;
  significado_espanol: string;
}

interface WordBox {
  word: string;
  x: number; // pageX (absolute)
  y: number; // pageY (absolute)
  width: number;
  height: number;
}

const AnimatedLine = Animated.createAnimatedComponent(Line);

export default function JuegoUnirScreen() {
  const router = useRouter();
  const { modulo_id } = useLocalSearchParams();

  // Parse and normalize modulo_id (could be number or uuid string)
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
  const [gameOver, setGameOver] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const [karinaList, setKarinaList] = useState<string[]>([]);
  const [espanolList, setEspanolList] = useState<string[]>([]);

  // Page offsets for aligning absolute page coordinates to the SVG local coordinates
  const [containerOffset, setContainerOffset] = useState({ x: 0, y: 0 });
  const containerRef = useRef<View>(null);

  // References and boxes coordinates
  const karinaRefs = useRef<Record<string, View | null>>({});
  const espanolRefs = useRef<Record<string, View | null>>({});
  const [karinaBoxes, setKarinaBoxes] = useState<Record<string, WordBox>>({});
  const [espanolBoxes, setEspanolBoxes] = useState<Record<string, WordBox>>({});

  // Shared values for the dragging line
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
        .select('id, palabra_karina, significado_espanol');

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
        setAllWords([]); // This triggers the Escudo Protector
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

    // Get 4 random words from pool for this round
    const selected = shuffleArray([...wordsPool]).slice(0, 4);
    setCurrentWords(selected);
    setMatchedKarina(new Set());
    setMatchedEspanol(new Set());
    setMatchedPairs([]);
    setActiveWord(null);
    setFeedback(null);

    const karinas = selected.map(w => w.palabra_karina);
    const espanols = selected.map(w => w.significado_espanol);

    setKarinaList(shuffleArray(karinas));
    setEspanolList(shuffleArray(espanols));

    // Clear boxes, they will be measured again on layout
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
    if (round >= 3) {
      setGameOver(true);
      return;
    }
    setRound(r => r + 1);
    startNewRound(allWords, round + 1);
  }

  function showFeedback(message: string, type: 'success' | 'error') {
    setFeedback({ message, type });
    setTimeout(() => setFeedback(null), 1500);
  }

  function checkMatch(karinaWord: string, espanolWord: string) {
    if (isProcessing) return;

    const pair = currentWords.find(w => w.palabra_karina === karinaWord);

    if (!pair) {
      showFeedback('❌ Error interno', 'error');
      resetLine();
      return;
    }

    if (pair.significado_espanol === espanolWord) {
      showFeedback('✅ ¡Correcto! +10 puntos', 'success');
      setMatchedKarina(prev => new Set([...prev, karinaWord]));
      setMatchedEspanol(prev => new Set([...prev, espanolWord]));
      setMatchedPairs(prev => [...prev, { karina: karinaWord, espanol: espanolWord }]);
      setScore(s => s + 10);
      lineColor.value = '#4CAF50';

      if (matchedKarina.size + 1 === currentWords.length) {
        setTimeout(() => {
          if (round >= 3) {
            setGameOver(true);
          } else {
            nextRound();
          }
        }, 1500);
      }
    } else {
      const correctMatch = currentWords.find(w => w.palabra_karina === karinaWord);
      showFeedback(`❌ "${karinaWord}" es "${correctMatch?.significado_espanol}"`, 'error');
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

  // Tap handler fallback
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
        showFeedback('💡 Toca primero una palabra en Kariña', 'error');
      }
    }
  };

  // Gesture Handler
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
          // Set to local coordinates of the container
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
          runOnJS(showFeedback)('💡 Conecta con la palabra correcta', 'error');
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

  // Handle transition to options game
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
        <Text style={styles.loadingText}>Cargando desafío...</Text>
      </SafeAreaView>
    );
  }

  // 🛡️ ESCUDO PROTECTOR: Fallback UI when words count is insufficient
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
    return (
      <SafeAreaView style={styles.victoryContainer}>
        <View style={styles.victoryCard}>
          <Text style={styles.victoryEmoji}>🎉</Text>
          <Text style={styles.victoryTitle}>¡Desafío Completado!</Text>
          <Text style={styles.victorySubtitle}>Puntuación obtenida</Text>
          <View style={styles.scoreBadge}>
            <Text style={styles.scoreText}>⭐ {score} pts</Text>
          </View>
          <Pressable onPress={handleGoToOptions} style={styles.victoryButton}>
            <Text style={styles.victoryButtonText}>Siguiente Juego</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Salir</Text>
          </Pressable>
          <Text style={styles.headerTitle}>🔗 Une las palabras</Text>
          <View style={styles.headerStats}>
            <View style={styles.statBadge}>
              <Text style={styles.statLabel}>Ronda {round} de 3</Text>
            </View>
            <View style={styles.statBadge}>
              <Text style={styles.scoreHighlight}>⭐ {score} pts</Text>
            </View>
          </View>
        </View>

        {/* Feedback Alert Overlay */}
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
            Arrastra de Kariña a Español o toca ambos para unirlos
          </Text>

          <GestureDetector gesture={gesture}>
            <View
              ref={containerRef}
              onLayout={() => {
                setTimeout(measureContainer, 100);
              }}
              style={styles.gameArea}
            >
              {/* SVG Layer for Drawing Lines */}
              <View style={styles.svgContainer}>
                <Svg style={{ width: '100%', height: '100%' }}>
                  {/* Active Dragging Line */}
                  <AnimatedLine animatedProps={animatedLineProps} />
                  {/* Matched Pairs Lines */}
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

              {/* Columns */}
              <View style={styles.columnsContainer}>
                {/* Column Kariña */}
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

                {/* Column Español */}
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