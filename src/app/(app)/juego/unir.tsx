import { useCallback, useEffect, useState, useRef } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View, Dimensions } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedProps, useSharedValue, runOnJS } from 'react-native-reanimated';
import Svg, { Line } from 'react-native-svg';
import { supabase } from '@/client/supabase';

interface Word {
  id: string;
  palabra_karina: string;
  traduccion_espanol: string;
}

interface WordBox {
  word: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

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
  
  // Estado para las palabras mezcladas
  const [karinaList, setKarinaList] = useState<string[]>([]);
  const [espanolList, setEspanolList] = useState<string[]>([]);
  
  // Posiciones de los elementos
  const [karinaBoxes, setKarinaBoxes] = useState<Record<string, WordBox>>({});
  const [espanolBoxes, setEspanolBoxes] = useState<Record<string, WordBox>>({});
  
  // Gestos
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
    const { data } = await supabase
      .from('words')
      .select('id, palabra_karina, traduccion_espanol')
      .limit(50);
    if (data) {
      const words = shuffleArray(data as Word[]);
      setAllWords(words);
      startNewRound(words);
    }
    setLoading(false);
  }

  function startNewRound(words: Word[]) {
    const selected = shuffleArray(words).slice(0, 4);
    setCurrentWords(selected);
    setMatchedKarina(new Set());
    setMatchedEspanol(new Set());
    setActiveWord(null);
    setFeedback(null);
    
    // Mezclar las listas
    const karinas = selected.map(w => w.palabra_karina);
    const espanols = selected.map(w => w.traduccion_espanol);
    setKarinaList(shuffleArray(karinas));
    setEspanolList(shuffleArray(espanols));
    
    // Limpiar posiciones
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
      showFeedback('❌ Error', 'error');
      resetLine();
      return;
    }
    
    if (pair.traduccion_espanol === espanolWord) {
      // Acierto
      if (!matchedKarina.has(karinaWord)) {
        showFeedback('✅ ¡Correcto! +10 puntos', 'success');
        setMatchedKarina(prev => new Set([...prev, karinaWord]));
        setMatchedEspanol(prev => new Set([...prev, espanolWord]));
        setScore(s => s + 10);
        lineColor.value = '#4CAF50';
        
        // Verificar si completó la ronda
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
        showFeedback('⚠️ Ya emparejaste esta palabra', 'error');
        lineColor.value = '#FF9800';
      }
    } else {
      // Error
      const correctMatch = currentWords.find(w => w.palabra_karina === karinaWord);
      showFeedback(`❌ "${karinaWord}" significa "${correctMatch?.traduccion_espanol}", no "${espanolWord}"`, 'error');
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
      
      // Buscar qué palabra Kariña fue tocada
      for (const [word, box] of Object.entries(karinaBoxes)) {
        if (!matchedKarina.has(word) &&
            absoluteX >= box.x && absoluteX <= box.x + box.width &&
            absoluteY >= box.y && absoluteY <= box.y + box.height) {
          setActiveWord(word);
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
        
        // Buscar sobre qué palabra Español se soltó
        for (const [word, box] of Object.entries(espanolBoxes)) {
          if (!matchedEspanol.has(word) &&
              absoluteX >= box.x && absoluteX <= box.x + box.width &&
              absoluteY >= box.y && absoluteY <= box.y + box.height) {
            runOnJS(checkMatch)(activeWord, word);
            return;
          }
        }
        
        // No se soltó sobre ninguna palabra válida
        showFeedback('💡 Arrastra hasta una palabra en español', 'error');
        resetLine();
      } else {
        resetLine();
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
            top: '40%',
            left: '10%',
            right: '10%',
            backgroundColor: feedback.type === 'success' ? '#4CAF50' : '#F44336',
            padding: 15,
            borderRadius: 10,
            zIndex: 1000,
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.3,
            shadowRadius: 4,
            elevation: 5,
          }}>
            <Text style={{ color: '#FFF', fontSize: 16, fontWeight: 'bold', textAlign: 'center' }}>
              {feedback.message}
            </Text>
          </View>
        )}

        {/* Game Area */}
        <ScrollView 
          contentContainerStyle={{ padding: 20 }}
          scrollEnabled={false}
        >
          <Text style={{ textAlign: 'center', color: '#666', marginBottom: 20 }}>
            Arrastra desde la palabra Kariña hasta su traducción en español
          </Text>

          <GestureDetector gesture={gesture}>
            <View style={{ flexDirection: 'row', gap: 20, position: 'relative' }}>
              {/* SVG Layer */}
              <View style={{ 
                position: 'absolute', 
                top: 0, 
                left: 0, 
                right: 0, 
                bottom: 0, 
                pointerEvents: 'none',
                zIndex: 10 
              }}>
                <Svg style={{ width: '100%', height: '100%' }}>
                  <AnimatedLine animatedProps={animatedLineProps} />
                </Svg>
              </View>

              {/* Kariña Column */}
              <View style={{ flex: 1, gap: 12 }}>
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#2E7D32', marginBottom: 10, textAlign: 'center' }}>
                  KARIÑA
                </Text>
                {karinaList.map((word) => {
                  const isMatched = matchedKarina.has(word);
                  return (
                    <View
                      key={word}
                      ref={ref => {
                        if (ref && !isMatched) {
                          ref.measure((x, y, width, height, pageX, pageY) => {
                            setKarinaBoxes(prev => ({
                              ...prev,
                              [word]: { word, x: pageX, y: pageY, width, height }
                            }));
                          });
                        }
                      }}
                      style={{
                        backgroundColor: isMatched ? '#C8E6C9' : activeWord === word ? '#A5D6A7' : '#FFF',
                        padding: 16,
                        borderRadius: 12,
                        borderWidth: 2,
                        borderColor: isMatched ? '#4CAF50' : activeWord === word ? '#4CAF50' : '#E0E0E0',
                        opacity: isMatched ? 0.6 : 1,
                        alignItems: 'center',
                      }}
                    >
                      <Text style={{ fontSize: 16, fontWeight: '600', color: '#333' }}>{word}</Text>
                      {isMatched && <Text style={{ fontSize: 20, marginTop: 5 }}>✓</Text>}
                    </View>
                  );
                })}
              </View>

              {/* Español Column */}
              <View style={{ flex: 1, gap: 12 }}>
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1565C0', marginBottom: 10, textAlign: 'center' }}>
                  ESPAÑOL
                </Text>
                {espanolList.map((word) => {
                  const isMatched = matchedEspanol.has(word);
                  return (
                    <View
                      key={word}
                      ref={ref => {
                        if (ref && !isMatched) {
                          ref.measure((x, y, width, height, pageX, pageY) => {
                            setEspanolBoxes(prev => ({
                              ...prev,
                              [word]: { word, x: pageX, y: pageY, width, height }
                            }));
                          });
                        }
                      }}
                      style={{
                        backgroundColor: isMatched ? '#C8E6C9' : '#FFF',
                        padding: 16,
                        borderRadius: 12,
                        borderWidth: 2,
                        borderColor: isMatched ? '#4CAF50' : '#E0E0E0',
                        opacity: isMatched ? 0.6 : 1,
                        alignItems: 'center',
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

          {/* Progress indicator */}
          <View style={{ marginTop: 30, alignItems: 'center' }}>
            <Text style={{ color: '#666' }}>
              Emparejadas: {matchedKarina.size} de {currentWords.length}
            </Text>
            <View style={{ 
              width: 200, 
              height: 8, 
              backgroundColor: '#E0E0E0', 
              borderRadius: 4,
              marginTop: 10,
              overflow: 'hidden'
            }}>
              <View style={{ 
                width: `${(matchedKarina.size / currentWords.length) * 100}%`, 
                height: '100%', 
                backgroundColor: '#4CAF50' 
              }} />
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const AnimatedLine = Animated.createAnimatedComponent(Line);

function shuffleArray<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}