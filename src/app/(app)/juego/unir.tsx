import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/client/supabase';

interface Word {
  id: string;
  palabra_karina: string;
  traduccion_espanol: string;
}

export default function JuegoUnirScreen() {
  const router = useRouter();
  const [allWords, setAllWords] = useState<Word[]>([]);
  const [pairs, setPairs] = useState<Word[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedKarina, setSelectedKarina] = useState<string | null>(null);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [wrongPair, setWrongPair] = useState<string | null>(null);
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
    const selected = shuffleArray(words).slice(0, 4);
    setPairs(selected);
    setMatched(new Set());
    setSelectedKarina(null);
    setWrongPair(null);
  }

  function nextRound() {
    if (round >= 3) {
      setGameOver(true);
      return;
    }
    setRound((r) => r + 1);
    startRound(allWords);
  }

  const karinaWords = shuffleArray(pairs.map((w) => w.palabra_karina));
  const espanolWords = shuffleArray(pairs.map((w) => w.traduccion_espanol));

  function handleSelectKarina(word: string) {
    if (matched.has(word)) return;
    setSelectedKarina(word);
    setWrongPair(null);
  }

  function handleSelectEspanol(espanol: string) {
    if (!selectedKarina) return;
    const pair = pairs.find((p) => p.palabra_karina === selectedKarina);
    if (pair && pair.traduccion_espanol === espanol) {
      setMatched((prev) => {
        const next = new Set(prev);
        next.add(selectedKarina);
        if (next.size === 4) {
          setTimeout(() => nextRound(), 600);
        }
        return next;
      });
      setSelectedKarina(null);
      setWrongPair(null);
      setScore((s) => s + 10);
    } else {
      setWrongPair(selectedKarina);
      setSelectedKarina(null);
    }
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
      <View style={{ backgroundColor: '#2E7D32', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 16 }}>
        <Pressable onPress={() => router.back()} style={{ marginBottom: 10, alignSelf: 'flex-start' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 }}>
            <Text style={{ color: '#FFF', fontSize: 16 }}>←</Text>
            <Text style={{ color: '#FFF', fontSize: 13, fontWeight: '600' }}>Juegos</Text>
          </View>
        </Pressable>
        <Text style={{ color: '#FFF', fontSize: 20, fontWeight: '900' }}>🔗 Une las palabras</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
          <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12 }}>Ronda {round} de 3</Text>
          <Text style={{ color: '#F59E0B', fontSize: 12, fontWeight: '700' }}>⭐ {score} pts</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
        <Text style={{ fontSize: 14, color: '#666', marginBottom: 16 }}>Toca una palabra en Kariña y luego su traducción</Text>

        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1, gap: 10 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#2E7D32', marginBottom: 4 }}>KARIÑA</Text>
            {karinaWords.map((word) => (
              <Pressable key={word} onPress={() => handleSelectKarina(word)} disabled={matched.has(word)}>
                <View
                  style={{
                    backgroundColor: matched.has(word) ? '#E8F5E9' : selectedKarina === word ? '#2E7D3230' : '#FFF',
                    borderRadius: 12,
                    padding: 14,
                    borderWidth: 2,
                    borderColor: matched.has(word) ? '#2E7D32' : selectedKarina === word ? '#2E7D32' : wrongPair === word ? '#C62828' : '#F0EDE8',
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
              const isMatched = pairs.some((p) => p.traduccion_espanol === word && matched.has(p.palabra_karina));
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
      </ScrollView>
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
