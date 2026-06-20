import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
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
  x: number;
  y: number;
  width: number;
  height: number;
}

const AnimatedLine = Animated.createAnimatedComponent(Line);

export default function JuegoUnirScreen() {
  const router = useRouter();
  const [allWords, setAllWords] = useState<Word[]>([]);
  const [currentWords, setCurrentWords] = useState<Word[]>([]);
  const [loading, setLoading] = useState(true);
  const [matchedKarina, setMatchedKarina] = useState<Set<string>>(new Set());
  const [matchedEspanol, setMatchedEspanol] = useState<Set<string>>(new Set());
  const [round, setRound] = useState(1);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  const [karinaList, setKarinaList] = useState<string[]>([]);
  const [espanolList, setEspanolList] = useState<string[]>([]);
  
  const [karinaBoxes, setKarinaBoxes] = useState<Record<string, WordBox>>({});
  const [espanolBoxes, setEspanolBoxes] = useState<Record<string, WordBox>>({});
  
  // Shared values para las líneas del arrastre
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
    }, [])
  );

  async function loadWords() {
    setLoading(true);
    const { data, error } = await supabase
      .from('words')
      .select('id, palabra_karina, significado_espanol') 
      .limit(50);

    if (error) {
      console.error("Error cargando palabras:", error.message);
      setLoading(false);
      return;
    }

    if (data && data.length > 0) {
      const words = shuffleArray([...data] as Word[]);
      setAllWords(words);
      startNewRound(words);
    }
    setLoading(false);
  }

  function startNewRound(words: Word[]) {
    if (!words || words.length < 4) return;
    
    const selected = shuffleArray([...words]).slice(0, 4);
    setCurrentWords(selected);
    setMatchedKarina(new Set());
    setMatchedEspanol(new Set());
    setActiveWord(null);
    setFeedback(null);
    
    const karinas = selected.map(w => w.palabra_karina);
    const espanols = selected.map(w => w.significado_espanol);
    
    setKarinaList(shuffleArray(karinas));
    setEspanolList(shuffleArray(espanols));
    
    setKarinaBoxes({});
    setEspanolBoxes({});
  }

  function nextRound() {
    if (round >= 3) {
      setGameOver(true);
      return;
    }
    setRound(r => r + 1);
    startNewRound(allWords);
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
      showFeedback(`❌ "${karinaWord}" significa "${correctMatch?.significado_espanol}"`, 'error');
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

  const gesture = Gesture.Pan()
    .onBegin((e) => {
      if (isProcessing) return;
      
      const { absoluteX, absoluteY } = e;
      
      for (const [word, box] of Object.entries(karinaBoxes)) {
        if (!matchedKarina.has(word) && box &&
            absoluteX >= box.x && absoluteX <= box.x + box.width &&
            absoluteY >= box.y && absoluteY <= box.y + box.height) {
          runOnJS(setActiveWord)(word);
          startX.value = absoluteX;
          startY.value = absoluteY;
          endX.value = absoluteX;
          endY.value = absoluteY;
          isDragging.value = true;
          break;
        }
      }
    })
    .onUpdate((e) => {
      if (isDragging.value && !isProcessing) {
        endX.value = e.absoluteX;
        endY.value = e.absoluteY;
      }
    })
    .onEnd((e) => {
      if (isDragging.value && !isProcessing && activeWord) {
        const { absoluteX, absoluteY } = e;
        let found = false;
        
        for (const [word, box] of Object.entries(espanolBoxes)) {
          if (!matchedEspanol.has(word) && box &&
              absoluteX >= box.x && absoluteX <= box.x + box.width &&
              absoluteY >= box.y && absoluteY <= box.y + box.height) {
            found = true;
            runOnJS(checkMatch)(activeWord, word);
            break;
          }
        }
        
        if (!found) {
          runOnJS(showFeedback)('💡 Arrastra hasta una palabra en español', 'error');
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

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#2E7D32" />
      </SafeAreaView>
    );
  }

  if (gameOver) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text style={{ fontSize: 64 }}>🏆</Text>
        <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#2E7D32', marginTop: 20 }}>¡Juego Completado!</Text>
        <Text style={{ fontSize: 20, color: '#FF9800', fontWeight: 'bold', marginTop: 10 }}>Puntaje: {score} pts</Text>
        <Pressable 
          onPress={() => {
            setGameOver(false);
            setScore(0);
            setRound(1);
            loadWords();
          }} 
          style={{ marginTop: 30 }}
        >
          <View style={{ backgroundColor: '#2E7D32', paddingHorizontal: 30, paddingVertical: 12, borderRadius: 25 }}>
            <Text style={{ color: '#FFF', fontSize: 16, fontWeight: 'bold' }}>Jugar de nuevo</Text>
          </View>
        </Pressable>
        <Pressable onPress={() => router.back()} style={{ marginTop: 15 }}>
          <Text style={{ color: '#666', fontSize: 14 }}>← Volver</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F5F5F5' }}>
        {/* Header */}
        <View style={{ backgroundColor: '#2E7D32', padding: 20, paddingTop: 10 }}>
          <Pressable onPress={() => router.back()} style={{ marginBottom: 10 }}>
            <Text style={{ color: '#FFF', fontSize: 16 }}>← Juegos</Text>
          </Pressable>
          <Text style={{ color: '#FFF', fontSize: 24, fontWeight: 'bold' }}>🔗 Une las palabras</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
            <Text style={{ color: '#FFF' }}>Ronda {round} de 3</Text>
            <Text style={{ color: '#FFD700', fontWeight: 'bold' }}>⭐ {score} pts</Text>
          </View>
        </View>

        {/* Feedback */}
        {feedback && (
          <View style={{
            position: 'absolute',
            top: '40%', left: '10%', right: '10%',
            backgroundColor: feedback.type === 'success' ? '#4CAF50' : '#F44336',
            padding: 15, borderRadius: 10, zIndex: 1000, alignItems: 'center', elevation: 5,
          }}>
            <Text style={{ color: '#FFF', fontSize: 16, fontWeight: 'bold', textAlign: 'center' }}>
              {feedback.message}
            </Text>
          </View>
        )}

        {/* Area del Juego */}
        <ScrollView contentContainerStyle={{ padding: 20 }} scrollEnabled={false}>
          <Text style={{ textAlign: 'center', color: '#666', marginBottom: 20 }}>
            Arrastra desde la palabra Kariña hasta su traducción en español
          </Text>

          <GestureDetector gesture={gesture}>
            <View style={{ flexDirection: 'row', gap: 20, position: 'relative' }}>
              
              {/* Capa SVG para las líneas animadas */}
              <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none', zIndex: 10 }}>
                <Svg style={{ width: '100%', height: '100%' }}>
                  <AnimatedLine animatedProps={animatedLineProps} />
                </Svg>
              </View>

              {/* Columna Kariña */}
              <View style={{ flex: 1, gap: 12 }}>
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#2E7D32', marginBottom: 10, textAlign: 'center' }}>
                  KARIÑA
                </Text>
                {karinaList.map((word) => {
                  const isMatched = matchedKarina.has(word);
                  return (
                    <View
                      key={word}
                      onLayout={(e) => {
                        // Agregamos un leve delay asíncrono para asegurar que measure capture las coordenadas reales en Web
                        setTimeout(() => {
                          e.target.measure((x, y, width, height, pageX, pageY) => {
                            if (width && height && pageX && pageY) {
                              setKarinaBoxes(prev => ({ ...prev, [word]: { word, x: pageX, y: pageY, width, height } }));
                            }
                          });
                        }, 100);
                      }}
                      style={{
                        backgroundColor: isMatched ? '#C8E6C9' : activeWord === word ? '#A5D6A7' : '#FFF',
                        padding: 16, borderRadius: 12, borderWidth: 2,
                        borderColor: isMatched ? '#4CAF50' : activeWord === word ? '#4CAF50' : '#E0E0E0',
                        opacity: isMatched ? 0.6 : 1, alignItems: 'center',
                      }}
                    >
                      <Text style={{ fontSize: 16, fontWeight: '600', color: '#333' }}>{word}</Text>
                      {isMatched && <Text style={{ fontSize: 20, marginTop: 5 }}>✓</Text>}
                    </View>
                  );
                })}
              </View>

              {/* Columna Español */}
              <View style={{ flex: 1, gap: 12 }}>
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1565C0', marginBottom: 10, textAlign: 'center' }}>
                  ESPAÑOL
                </Text>
                {espanolList.map((word) => {
                  const isMatched = matchedEspanol.has(word);
                  return (
                    <View
                      key={word}
                      onLayout={(e) => {
                        setTimeout(() => {
                          e.target.measure((x, y, width, height, pageX, pageY) => {
                            if (width && height && pageX && pageY) {
                              setEspanolBoxes(prev => ({ ...prev, [word]: { word, x: pageX, y: pageY, width, height } }));
                            }
                          });
                        }, 100);
                      }}
                      style={{
                        backgroundColor: isMatched ? '#C8E6C9' : '#FFF',
                        padding: 16, borderRadius: 12, borderWidth: 2,
                        borderColor: isMatched ? '#4CAF50' : '#E0E0E0',
                        opacity: isMatched ? 0.6 : 1, alignItems: 'center',
                      }}
                    >
                      <Text style={{ fontSize: 16, fontWeight: '600', color: '#333' }}>{word}</Text>
                      {isMatched && <Text style={{ fontSize: 20, marginTop: 5 }}>✓</Text>}
                    </View>
                  );
                })}
              </View>
            </View>
          </GestureDetector>

          {/* Barra de Progreso */}
          <View style={{ marginTop: 30, alignItems: 'center' }}>
            <Text style={{ color: '#666' }}>
              Emparejadas: {matchedKarina.size} de {currentWords.length}
            </Text>
            <View style={{ width: 200, height: 8, backgroundColor: '#E0E0E0', borderRadius: 4, marginTop: 10, overflow: 'hidden' }}>
              <View style={{ width: `${currentWords.length ? (matchedKarina.size / currentWords.length) * 100 : 0}%`, height: '100%', backgroundColor: '#4CAF50' }} />
            </View>
          </View>
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