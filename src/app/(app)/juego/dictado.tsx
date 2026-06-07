import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/client/supabase';

interface Word {
  id: string;
  palabra_karina: string;
  traduccion_espanol: string;
}

export default function JuegoDictadoScreen() {
  const router = useRouter();
  const [allWords, setAllWords] = useState<Word[]>([]);
  const [target, setTarget] = useState<Word | null>(null);
  const [loading, setLoading] = useState(true);
  const [answer, setAnswer] = useState('');
  const [checked, setChecked] = useState(false);
  const [round, setRound] = useState(1);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);

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
      startRound(words);
    }
    setLoading(false);
  }

  function startRound(words: Word[]) {
    const t = words[Math.floor(Math.random() * words.length)];
    setTarget(t);
    setAnswer('');
    setChecked(false);
  }

  function nextRound() {
    if (round >= 5) {
      setGameOver(true);
      return;
    }
    setRound((r) => r + 1);
    startRound(allWords);
  }

  function checkAnswer() {
    if (!answer.trim()) return;
    const isCorrect = answer.trim().toLowerCase() === target?.palabra_karina.toLowerCase();
    setChecked(true);
    if (isCorrect) {
      setScore((s) => s + 25);
      setTimeout(nextRound, 1200);
    }
  }

  function skipRound() {
    setChecked(true);
  }

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F9F6F0', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#1B5E20" />
      </SafeAreaView>
    );
  }

  if (gameOver) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F9F6F0', alignItems: 'center', justifyContent: 'center', padding: 30 }}>
        <Text style={{ fontSize: 56 }}>🎉</Text>
        <Text style={{ fontSize: 24, fontWeight: '900', color: '#1A2E1A', marginTop: 16 }}>¡Juego terminado!</Text>
        <Text style={{ fontSize: 18, color: '#F59E0B', fontWeight: '800', marginTop: 8 }}>{score} puntos</Text>
        <Pressable onPress={() => { setGameOver(false); setScore(0); setRound(1); loadWords(); }} style={{ marginTop: 24 }}>
          <View style={{ backgroundColor: '#1B5E20', borderRadius: 14, paddingVertical: 16, paddingHorizontal: 40 }}>
            <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '800' }}>Jugar otra vez</Text>
          </View>
        </Pressable>
        <Pressable onPress={() => router.back()} style={{ marginTop: 12 }}>
          <Text style={{ color: '#666', fontSize: 14 }}>← Volver a juegos</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F9F6F0' }} edges={['top']}>
      <View style={{ backgroundColor: '#E65100', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 16 }}>
        <Pressable onPress={() => router.back()} style={{ marginBottom: 10, alignSelf: 'flex-start' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 }}>
            <Text style={{ color: '#FFF', fontSize: 16 }}>←</Text>
            <Text style={{ color: '#FFF', fontSize: 13, fontWeight: '600' }}>Juegos</Text>
          </View>
        </Pressable>
        <Text style={{ color: '#FFF', fontSize: 20, fontWeight: '900' }}>✍️ Dictado Kariña</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
          <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12 }}>Palabra {round} de 5</Text>
          <Text style={{ color: '#F59E0B', fontSize: 12, fontWeight: '700' }}>⭐ {score} pts</Text>
        </View>
      </View>

      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Text style={{ fontSize: 14, color: '#666', marginBottom: 16 }}>Escucha la pista y escribe la palabra en Kariña</Text>

          <View style={{ backgroundColor: '#FFF', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#F0EDE8', alignItems: 'center', marginBottom: 20 }}>
            <Text style={{ fontSize: 14, color: '#888', marginBottom: 8 }}>Significado: {target?.traduccion_espanol}</Text>
            <View style={{ backgroundColor: '#FFF3E0', borderRadius: 50, padding: 16, marginBottom: 8 }}>
              <Text style={{ fontSize: 32 }}>🎧</Text>
            </View>
            <Text style={{ fontSize: 12, color: '#888', fontStyle: 'italic' }}>(Audio disponible próximamente)</Text>
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
              borderColor: checked
                ? answer.trim().toLowerCase() === target?.palabra_karina.toLowerCase()
                  ? '#2E7D32'
                  : '#C62828'
                : '#E2E8F0',
              color: '#1A2E1A',
            }}
          />

          {checked && (
            <View
              style={{
                backgroundColor:
                  answer.trim().toLowerCase() === target?.palabra_karina.toLowerCase()
                    ? '#E8F5E9'
                    : '#FFEBEE',
                borderRadius: 12,
                padding: 12,
                marginTop: 12,
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '800',
                  color:
                    answer.trim().toLowerCase() === target?.palabra_karina.toLowerCase()
                      ? '#2E7D32'
                      : '#C62828',
                  textAlign: 'center',
                }}
              >
                {answer.trim().toLowerCase() === target?.palabra_karina.toLowerCase()
                  ? '✅ ¡Correcto!'
                  : `❌ Respuesta: ${target?.palabra_karina}`}
              </Text>
            </View>
          )}

          {!checked ? (
            <View style={{ gap: 10, marginTop: 16 }}>
              <Pressable onPress={checkAnswer} disabled={!answer.trim()}>
                <View
                  style={{
                    backgroundColor: answer.trim() ? '#E65100' : '#E2E8F0',
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
              <Pressable onPress={skipRound}>
                <View style={{ alignItems: 'center', paddingVertical: 8 }}>
                  <Text style={{ color: '#888', fontSize: 13 }}>Saltar palabra →</Text>
                </View>
              </Pressable>
            </View>
          ) : (
            <View style={{ gap: 10, marginTop: 16 }}>
              <Pressable onPress={nextRound}>
                <View style={{ backgroundColor: '#1B5E20', borderRadius: 14, paddingVertical: 16, alignItems: 'center' }}>
                  <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '800' }}>
                    {round >= 5 ? 'Ver resultado' : 'Siguiente palabra'}
                  </Text>
                </View>
              </Pressable>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
