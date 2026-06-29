import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  Alert,
} from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/client/supabase';
import { useSession } from '@/ctx';
import { useAudioPlayer } from 'expo-audio';
import * as Speech from 'expo-speech';
import * as FileSystem from 'expo-file-system';
import { Audio } from 'expo-av';

interface Word {
  id: string;
  palabra_karina: string;
  significado_espanol: string;
}

interface Module {
  id: number;
  titulo: string;
  titulo_espanol?: string;
  color?: string | null;
}

export default function PracticaScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { session } = useSession();
  const [module, setModule] = useState<Module | null>(null);
  const [words, setWords] = useState<Word[]>([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(0);
  const [score, setScore] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [saved, setSaved] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [id])
  );

  async function loadData() {
    setLoading(true);
    const moduleId = parseInt(String(id), 10);

    const { data: mod } = await supabase.from('modules').select('id, titulo, titulo_espanol').eq('id', moduleId).single();
    if (mod) setModule(mod as Module);

    const { data: wds } = await supabase.from('words').select('id, palabra_karina, significado_espanol').eq('modulo_id', moduleId);
    if (wds) setWords(wds as Word[]);

    setStep(1);
    setLoading(false);
  }

  const audioPlayer = useAudioPlayer(null);

  const handleNext = (points: number) => {
    setTotalScore((prev) => prev + points);
    if (step < 3) {
      setStep(step + 1);
    } else {
      setStep(4);
      saveProgress(points);
    }
  };

  async function saveProgress(lastPoints: number) {
    if (!session?.user?.id || !module) return;
    const finalScore = totalScore + lastPoints;
    const xp = Math.min(finalScore * 10, 300);
    setScore(finalScore);

    const payload = {
      user_id: session.user.id,
      modulo_id: module.id,
      exercise_1_done: true,
      exercise_2_done: true,
      exercise_3_done: true,
      completed: true,
      score: finalScore,
      xp,
      completed_at: new Date().toISOString(),
    };

    await supabase.from('module_progress').upsert(payload, { onConflict: 'user_id,modulo_id' });
    setSaved(true);
  }

  async function playPronunciation(word: Word) {
    try {
      await Speech.speak(word.palabra_karina, {
        language: 'es',
        pitch: 1,
        rate: 0.8,
      });
    } catch (error) {
      console.error('Error al reproducir:', error);
    }
  }

  if (loading || !module) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F9F6F0', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#1B5E20" />
      </SafeAreaView>
    );
  }

  if (step === 4) {
    return <ResultadoCelebracion module={module} score={totalScore} onContinue={() => router.back()} />;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F9F6F0' }} edges={['top']}>
      <View style={{ backgroundColor: module.color || '#1B5E20', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 16 }}>
        <Pressable onPress={() => router.back()} style={{ marginBottom: 10, alignSelf: 'flex-start' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 }}>
            <Text style={{ color: '#FFF', fontSize: 16 }}>←</Text>
            <Text style={{ color: '#FFF', fontSize: 13, fontWeight: '600' }}>Módulo</Text>
          </View>
        </Pressable>
        <Text style={{ color: '#FFF', fontSize: 20, fontWeight: '900' }}>Práctica: {module.titulo}</Text>
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 10 }}>
          {[1, 2, 3].map((s) => (
            <View key={s} style={{ flex: 1, height: 6, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 3 }}>
              {step >= s && <View style={{ flex: 1, backgroundColor: '#FFF', borderRadius: 3 }} />}
            </View>
          ))}
        </View>
        <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 11, marginTop: 6 }}>Ejercicio {step} de 3</Text>
      </View>

      {step === 1 && <EjercicioUnir words={words} moduleColor={module.color || '#1B5E20'} onNext={(pts) => handleNext(pts)} />}
      {step === 2 && <EjercicioDictado words={words} moduleColor={module.color || '#1B5E20'} onNext={(pts) => handleNext(pts)} />}
      {step === 3 && <EjercicioOpciones words={words} moduleColor={module.color || '#1B5E20'} onNext={(pts) => handleNext(pts)} />}

      <PronunciacionPractica words={words} moduleColor={module.color || '#1B5E20'} />
    </SafeAreaView>
  );
}

/* ───────────────── Componente de Práctica de Pronunciación ───────────────── */
function PronunciacionPractica({ words, moduleColor }: { words: Word[]; moduleColor: string }) {
  const [selectedWord, setSelectedWord] = useState<Word | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [pronunciationResult, setPronunciationResult] = useState<'correct' | 'incorrect' | null>(null);
  const [similarityScore, setSimilarityScore] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);

  // Configuración de reconocimiento de voz
  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('Permiso denegado', 'Necesitamos acceso al micrófono para practicar pronunciación');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(recording);
      setIsRecording(true);
      setPronunciationResult(null);
      setSimilarityScore(null);
    } catch (err) {
      console.error('Error al iniciar grabación:', err);
      Alert.alert('Error', 'No se pudo iniciar la grabación');
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    try {
      setIsRecording(false);
      setIsProcessing(true);

      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();

      if (uri) {
        // Simulación de comparación de pronunciación
        // En producción, aquí enviarías el audio a un servicio de reconocimiento de voz
        const result = await comparePronunciation(uri, selectedWord || words[currentWordIndex]);
        setPronunciationResult(result.isCorrect ? 'correct' : 'incorrect');
        setSimilarityScore(result.similarity);
        
        // Si es correcto, avanzar automáticamente
        if (result.isCorrect) {
          setTimeout(() => {
            const nextIndex = (currentWordIndex + 1) % words.length;
            setCurrentWordIndex(nextIndex);
            setSelectedWord(words[nextIndex]);
            setPronunciationResult(null);
            setSimilarityScore(null);
          }, 1500);
        }
      }
    } catch (err) {
      console.error('Error al detener grabación:', err);
      Alert.alert('Error', 'Error al procesar la grabación');
    } finally {
      setIsProcessing(false);
      setRecording(null);
    }
  };

  // Función simulada de comparación de pronunciación
  const comparePronunciation = async (audioUri: string, targetWord: Word): Promise<{ isCorrect: boolean; similarity: number }> => {
    // Simulación - En producción usarías un servicio real como:
    // - Google Speech-to-Text
    // - Microsoft Azure Speech
    // - Amazon Transcribe
    // - Servicio propio con TensorFlow.js
    
    return new Promise((resolve) => {
      setTimeout(() => {
        // Simulación de resultado (80% de precisión)
        const isCorrect = Math.random() > 0.2;
        const similarity = isCorrect ? 0.85 + Math.random() * 0.15 : 0.3 + Math.random() * 0.3;
        resolve({ isCorrect, similarity });
      }, 1000);
    });
  };

  // Reproducir pronunciación de ejemplo
  const playExample = async (word: Word) => {
    try {
      await Speech.speak(word.palabra_karina, {
        language: 'es',
        pitch: 1,
        rate: 0.7,
        onDone: () => {
          console.log('Reproducción completada');
        },
      });
    } catch (error) {
      console.error('Error al reproducir:', error);
    }
  };

  const currentWord = selectedWord || words[currentWordIndex] || words[0];

  if (!words.length) return null;

  return (
    <View style={{ padding: 20, backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, borderColor: '#F0EDE8', borderTopWidth: 1 }}>
      <Text style={{ fontSize: 14, fontWeight: '700', color: '#1A2E1A', marginBottom: 12 }}>🗣️ Práctica de pronunciación</Text>
      
      <View style={{ backgroundColor: '#F8FAF9', borderRadius: 16, padding: 16, marginBottom: 16 }}>
        <Text style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Palabra a practicar:</Text>
        <Text style={{ fontSize: 22, fontWeight: '900', color: '#1A2E1A', marginBottom: 4 }}>{currentWord.palabra_karina}</Text>
        <Text style={{ fontSize: 14, color: '#666' }}>{currentWord.significado_espanol}</Text>
        
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
          <Pressable 
            onPress={() => playExample(currentWord)}
            style={{ flex: 1 }}
          >
            <View style={{ backgroundColor: '#E3F2FD', borderRadius: 12, padding: 10, alignItems: 'center' }}>
              <Text style={{ fontSize: 20 }}>🔊</Text>
              <Text style={{ fontSize: 11, color: '#1565C0', marginTop: 4, fontWeight: '600' }}>Escuchar</Text>
            </View>
          </Pressable>
          
          <Pressable 
            onPress={isRecording ? stopRecording : startRecording}
            disabled={isProcessing}
            style={{ flex: 1 }}
          >
            <View style={{ 
              backgroundColor: isRecording ? '#FFEBEE' : '#E8F5E9',
              borderRadius: 12, 
              padding: 10, 
              alignItems: 'center',
              opacity: isProcessing ? 0.5 : 1,
            }}>
              <Text style={{ fontSize: 20 }}>
                {isRecording ? '⏹️' : isProcessing ? '⏳' : '🎙️'}
              </Text>
              <Text style={{ 
                fontSize: 11, 
                color: isRecording ? '#C62828' : '#2E7D32', 
                marginTop: 4, 
                fontWeight: '600' 
              }}>
                {isRecording ? 'Detener' : isProcessing ? 'Procesando...' : 'Grabar'}
              </Text>
            </View>
          </Pressable>
        </View>
      </View>

      {/* Resultado de pronunciación */}
      {pronunciationResult && (
        <Animated.View 
          style={{
            backgroundColor: pronunciationResult === 'correct' ? '#E8F5E9' : '#FFEBEE',
            borderRadius: 12,
            padding: 12,
            marginTop: 8,
            borderWidth: 1,
            borderColor: pronunciationResult === 'correct' ? '#2E7D32' : '#C62828',
          }}
        >
          <Text style={{ 
            fontSize: 16, 
            fontWeight: '700', 
            color: pronunciationResult === 'correct' ? '#2E7D32' : '#C62828',
            textAlign: 'center'
          }}>
            {pronunciationResult === 'correct' ? '✅ ¡Excelente pronunciación!' : '❌ Intenta de nuevo'}
          </Text>
          
          {similarityScore && (
            <Text style={{ fontSize: 12, color: '#666', textAlign: 'center', marginTop: 4 }}>
              Precisión: {Math.round(similarityScore * 100)}%
            </Text>
          )}
        </Animated.View>
      )}

      {/* Indicador de progreso */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
        <Text style={{ fontSize: 11, color: '#888' }}>
          Palabra {currentWordIndex + 1} de {words.length}
        </Text>
        {pronunciationResult === 'correct' && (
          <Text style={{ fontSize: 11, color: '#2E7D32', fontWeight: '700' }}>
            ✅ Siguiente palabra...
          </Text>
        )}
      </View>
    </View>
  );
}

/* ───────────────── Ejercicio 1: Unir palabras ───────────────── */
function EjercicioUnir({ words, moduleColor, onNext }: { words: Word[]; moduleColor: string; onNext: (pts: number) => void }) {
  const pairs = shuffleArray([...words]).slice(0, 4);
  const [selectedKarina, setSelectedKarina] = useState<string | null>(null);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [wrongPair, setWrongPair] = useState<string | null>(null);

  const karinaWords = shuffleArray(pairs.map((w) => w.palabra_karina));
  const espanolWords = shuffleArray(pairs.map((w) => w.significado_espanol));

  function handleSelectKarina(word: string) {
    if (matched.has(word)) return;
    setSelectedKarina(word);
    setWrongPair(null);
  }

  function handleSelectEspanol(espanol: string) {
    if (!selectedKarina) return;
    const pair = pairs.find((p) => p.palabra_karina === selectedKarina);
    if (pair && pair.significado_espanol === espanol) {
      setMatched(new Set([...matched, selectedKarina]));
      setSelectedKarina(null);
      setWrongPair(null);
      if (matched.size + 1 === 4) {
        setTimeout(() => onNext(4), 600);
      }
    } else {
      setWrongPair(selectedKarina);
      setSelectedKarina(null);
    }
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
      <Text style={{ fontSize: 18, fontWeight: '800', color: '#1A2E1A', marginBottom: 4 }}>🔗 Une las palabras</Text>
      <Text style={{ fontSize: 13, color: '#666', marginBottom: 20 }}>Toca una palabra en Kariña y luego su traducción</Text>

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1, gap: 10 }}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: moduleColor, marginBottom: 4 }}>KARIÑA</Text>
          {karinaWords.map((word) => (
            <Pressable key={word} onPress={() => handleSelectKarina(word)} disabled={matched.has(word)}>
              <View
                style={{
                  backgroundColor: matched.has(word) ? '#E8F5E9' : selectedKarina === word ? `${moduleColor}30` : '#FFF',
                  borderRadius: 12,
                  padding: 14,
                  borderWidth: 2,
                  borderColor: matched.has(word) ? '#2E7D32' : selectedKarina === word ? moduleColor : wrongPair === word ? '#C62828' : '#F0EDE8',
                  alignItems: 'center',
                  opacity: matched.has(word) ? 0.6 : 1,
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#1A2E1A' }}>{word}</Text>
                {matched.has(word) && <Text style={{ fontSize: 18, marginTop: 4 }}>✅</Text>}
              </View>
            </Pressable>
          ))}
        </View>

        <View style={{ flex: 1, gap: 10 }}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: '#1565C0', marginBottom: 4 }}>ESPAÑOL</Text>
          {espanolWords.map((word) => {
            const isMatched = pairs.some((p) => p.significado_espanol === word && matched.has(p.palabra_karina));
            return (
              <Pressable key={word} onPress={() => handleSelectEspanol(word)} disabled={isMatched}>
                <View
                  style={{
                    backgroundColor: isMatched ? '#E8F5E9' : '#FFF',
                    borderRadius: 12,
                    padding: 14,
                    borderWidth: 2,
                    borderColor: isMatched ? '#2E7D32' : '#F0EDE8',
                    alignItems: 'center',
                    opacity: isMatched ? 0.6 : 1,
                  }}
                >
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#1A2E1A' }}>{word}</Text>
                  {isMatched && <Text style={{ fontSize: 18, marginTop: 4 }}>✅</Text>}
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      {wrongPair && (
        <View style={{ backgroundColor: '#FFEBEE', borderRadius: 12, padding: 12, marginTop: 16, alignItems: 'center' }}>
          <Text style={{ color: '#C62828', fontSize: 13, fontWeight: '600' }}>❌ Inténtalo de nuevo</Text>
        </View>
      )}

      <Text style={{ fontSize: 12, color: '#888', textAlign: 'center', marginTop: 20 }}>
        {matched.size} de 4 emparejadas
      </Text>
    </ScrollView>
  );
}

/* ───────────────── Ejercicio 2: Dictado ───────────────── */
function EjercicioDictado({ words, moduleColor, onNext }: { words: Word[]; moduleColor: string; onNext: (pts: number) => void }) {
  const target = words[Math.floor(Math.random() * words.length)];
  const [answer, setAnswer] = useState('');
  const [checked, setChecked] = useState(false);
  const [correct, setCorrect] = useState(false);

  const checkAnswer = () => {
    const isCorrect = answer.trim().toLowerCase() === target.palabra_karina.toLowerCase();
    setCorrect(isCorrect);
    setChecked(true);
    if (isCorrect) {
      setTimeout(() => onNext(3), 1200);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
      <Text style={{ fontSize: 18, fontWeight: '800', color: '#1A2E1A', marginBottom: 4 }}>✍️ Dictado Kariña</Text>
      <Text style={{ fontSize: 13, color: '#666', marginBottom: 20 }}>Escucha la palabra y escríbela en Kariña</Text>

      <View style={{ backgroundColor: '#FFF', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#F0EDE8', alignItems: 'center' }}>
        <Text style={{ fontSize: 14, color: '#888', marginBottom: 8 }}>Pista: {target.significado_espanol}</Text>
        <Pressable onPress={() => Speech.speak(target.palabra_karina)}>
          <View style={{ backgroundColor: `${moduleColor}18`, borderRadius: 50, padding: 16, marginBottom: 8 }}>
            <Text style={{ fontSize: 32 }}>🎧</Text>
          </View>
        </Pressable>
        <Text style={{ fontSize: 12, color: '#888', fontStyle: 'italic' }}>Toca el ícono para escuchar</Text>
      </View>

      <TextInput
        value={answer}
        onChangeText={setAnswer}
        placeholder="Escribe la palabra en Kariña..."
        placeholderTextColor="#888"
        autoCapitalize="none"
        style={{
          backgroundColor: '#FFF',
          borderRadius: 12,
          paddingHorizontal: 16,
          paddingVertical: 14,
          fontSize: 15,
          borderWidth: 1,
          borderColor: checked ? (correct ? '#2E7D32' : '#C62828') : '#E2E8F0',
          color: '#1A2E1A',
          marginTop: 16,
        }}
      />

      {checked && !correct && (
        <View style={{ backgroundColor: '#FFEBEE', borderRadius: 12, padding: 12, marginTop: 12 }}>
          <Text style={{ color: '#C62828', fontSize: 13, fontWeight: '600' }}>
            ❌ Respuesta correcta: {target.palabra_karina}
          </Text>
        </View>
      )}

      {checked && correct && (
        <View style={{ backgroundColor: '#E8F5E9', borderRadius: 12, padding: 12, marginTop: 12, alignItems: 'center' }}>
          <Text style={{ color: '#2E7D32', fontSize: 14, fontWeight: '800' }}>✅ ¡Correcto!</Text>
        </View>
      )}

      {!checked && (
        <Pressable onPress={checkAnswer} disabled={!answer.trim()} style={{ marginTop: 16 }}>
          <View
            style={{
              backgroundColor: answer.trim() ? moduleColor : '#E2E8F0',
              borderRadius: 14,
              paddingVertical: 16,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: answer.trim() ? '#FFF' : '#888', fontSize: 16, fontWeight: '800' }}>
              Verificar
            </Text>
          </View>
        </Pressable>
      )}

      {checked && !correct && (
        <Pressable onPress={() => { setChecked(false); setAnswer(''); }} style={{ marginTop: 12 }}>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ color: moduleColor, fontSize: 14, fontWeight: '700' }}>🔄 Intentar de nuevo</Text>
          </View>
        </Pressable>
      )}
    </ScrollView>
  );
}

/* ───────────────── Ejercicio 3: Opciones A/B/C ───────────────── */
function EjercicioOpciones({ words, moduleColor, onNext }: { words: Word[]; moduleColor: string; onNext: (pts: number) => void }) {
  const target = words[Math.floor(Math.random() * words.length)];
  const distractors = shuffleArray(words.filter((w) => w.id !== target.id)).slice(0, 2);
  const options = shuffleArray([target, ...distractors]);
  const [selected, setSelected] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);

  const handleSelect = (opt: Word) => {
    if (checked) return;
    setSelected(opt.id);
    const isCorrect = opt.id === target.id;
    setChecked(true);
    if (isCorrect) {
      setTimeout(() => onNext(3), 1200);
    } else {
      setTimeout(() => {
        setSelected(null);
        setChecked(false);
      }, 1500);
    }
  };

  const labels = ['A', 'B', 'C'];

  return (
    <ScrollView contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
      <Text style={{ fontSize: 18, fontWeight: '800', color: '#1A2E1A', marginBottom: 4 }}>🎧 Escucha y elige</Text>
      <Text style={{ fontSize: 13, color: '#666', marginBottom: 20 }}>Escucha el audio y selecciona la opción correcta</Text>

      <View style={{ backgroundColor: '#FFF', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#F0EDE8', alignItems: 'center', marginBottom: 20 }}>
        <Pressable onPress={() => Speech.speak(target.palabra_karina)}>
          <View style={{ backgroundColor: `${moduleColor}18`, borderRadius: 50, padding: 16, marginBottom: 8 }}>
            <Text style={{ fontSize: 32 }}>🎧</Text>
          </View>
        </Pressable>
        <Text style={{ fontSize: 12, color: '#888', fontStyle: 'italic' }}>Toca para escuchar la palabra</Text>
      </View>

      <View style={{ gap: 10 }}>
        {options.map((opt, idx) => {
          const isSelected = selected === opt.id;
          const isCorrect = opt.id === target.id;
          let bg = '#FFF';
          let border = '#F0EDE8';
          if (checked && isCorrect) { bg = '#E8F5E9'; border = '#2E7D32'; }
          else if (checked && isSelected && !isCorrect) { bg = '#FFEBEE'; border = '#C62828'; }
          else if (isSelected) { bg = `${moduleColor}18`; border = moduleColor; }

          return (
            <Pressable key={opt.id} onPress={() => handleSelect(opt)} disabled={checked}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  backgroundColor: bg,
                  borderRadius: 14,
                  padding: 14,
                  borderWidth: 2,
                  borderColor: border,
                }}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: checked && isCorrect ? '#2E7D32' : isSelected ? moduleColor : '#F0EDE8',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: 14, fontWeight: '800', color: checked && isCorrect ? '#FFF' : isSelected ? '#FFF' : '#1A2E1A' }}>
                    {labels[idx]}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: '#1A2E1A' }}>{opt.palabra_karina}</Text>
                  <Text style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{opt.significado_espanol}</Text>
                </View>
                {checked && isCorrect && <Text style={{ fontSize: 20 }}>✅</Text>}
                {checked && isSelected && !isCorrect && <Text style={{ fontSize: 20 }}>❌</Text>}
              </View>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

/* ───────────────── Celebración al completar ───────────────── */
function ResultadoCelebracion({ module, score, onContinue }: { module: Module; score: number; onContinue: () => void }) {
  const scale = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(scale, { toValue: 1, friction: 5, useNativeDriver: true }).start();
  }, []);

  const xp = Math.min(score * 10, 300);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F9F6F0', alignItems: 'center', justifyContent: 'center', padding: 30 }}>
      <Animated.View style={{ transform: [{ scale }], alignItems: 'center' }}>
        <View
          style={{
            width: 100,
            height: 100,
            borderRadius: 50,
            backgroundColor: '#E8F5E9',
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 3,
            borderColor: '#2E7D32',
          }}
        >
          <Text style={{ fontSize: 48 }}>🏅</Text>
        </View>
        <Text style={{ fontSize: 22, fontWeight: '900', color: '#1A2E1A', marginTop: 20, textAlign: 'center' }}>
          ¡Módulo completado!
        </Text>
        <Text style={{ fontSize: 14, color: '#666', marginTop: 6, textAlign: 'center' }}>
          {module.titulo_espanol || module.titulo}
        </Text>

        <View style={{ flexDirection: 'row', gap: 16, marginTop: 24 }}>
          <View style={{ backgroundColor: '#FFF', borderRadius: 14, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#F0EDE8', minWidth: 90 }}>
            <Text style={{ fontSize: 22, fontWeight: '900', color: '#F59E0B' }}>{score}</Text>
            <Text style={{ fontSize: 11, color: '#888', marginTop: 4 }}>Puntos</Text>
          </View>
          <View style={{ backgroundColor: '#FFF', borderRadius: 14, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#F0EDE8', minWidth: 90 }}>
            <Text style={{ fontSize: 22, fontWeight: '900', color: '#1565C0' }}>+{xp}</Text>
            <Text style={{ fontSize: 11, color: '#888', marginTop: 4 }}>XP</Text>
          </View>
        </View>

        <View
          style={{
            backgroundColor: module.color || '#1B5E20',
            borderRadius: 50,
            paddingVertical: 6,
            paddingHorizontal: 20,
            marginTop: 20,
          }}
        >
          <Text style={{ color: '#FFF', fontSize: 13, fontWeight: '800' }}>✅ SELLO DE COMPLETADO</Text>
        </View>
      </Animated.View>

      <Pressable onPress={onContinue} style={{ marginTop: 30 }}>
        <View style={{ backgroundColor: '#1B5E20', borderRadius: 14, paddingVertical: 16, paddingHorizontal: 40 }}>
          <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '800' }}>Continuar</Text>
        </View>
      </Pressable>
    </SafeAreaView>
  );
}

/* ─── Util: shuffle ─── */
function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
