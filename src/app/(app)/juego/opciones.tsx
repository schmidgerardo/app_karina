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

export default function JuegoOpcionesScreen() {
  const router = useRouter();
  const [allWords, setAllWords] = useState<Word[]>([]);
  const [target, setTarget] = useState<Word | null>(null);
  const [options, setOptions] = useState<Word[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
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
    const d = shuffleArray(words.filter((w) => w.id !== t.id)).slice(0, 2);
    const opts = shuffleArray([t, ...d]);
    setTarget(t);
    setOptions(opts);
    setSelected(null);
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

  function handleSelect(opt: Word) {
    if (checked) return;
    setSelected(opt.id);
    const isCorrect = opt.id === target?.id;
    setChecked(true);
    if (isCorrect) {
      setScore((s) => s + 20);
      setTimeout(nextRound, 1200);
    } else {
      setTimeout(() => {
        setSelected(null);
        setChecked(false);
      }, 1500);
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

  const labels = ['A', 'B', 'C'];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F9F6F0' }} edges={['top']}>
      <View style={{ backgroundColor: '#1565C0', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 16 }}>
        <Pressable onPress={() => router.back()} style={{ marginBottom: 10, alignSelf: 'flex-start' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 }}>
            <Text style={{ color: '#FFF', fontSize: 16 }}>←</Text>
            <Text style={{ color: '#FFF', fontSize: 13, fontWeight: '600' }}>Juegos</Text>
          </View>
        </Pressable>
        <Text style={{ color: '#FFF', fontSize: 20, fontWeight: '900' }}>🎧 Escucha y elige</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
          <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12 }}>Pregunta {round} de 5</Text>
          <Text style={{ color: '#F59E0B', fontSize: 12, fontWeight: '700' }}>⭐ {score} pts</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
        <Text style={{ fontSize: 14, color: '#666', marginBottom: 16 }}>Escucha el audio y selecciona la palabra Kariña correcta</Text>

        <View style={{ backgroundColor: '#FFF', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#F0EDE8', alignItems: 'center', marginBottom: 20 }}>
          <Text style={{ fontSize: 14, color: '#888', marginBottom: 8 }}>Significado: {target?.traduccion_espanol}</Text>
          <View style={{ backgroundColor: '#E3F2FD', borderRadius: 50, padding: 16, marginBottom: 8 }}>
            <Text style={{ fontSize: 32 }}>🎧</Text>
          </View>
          <Text style={{ fontSize: 12, color: '#888', fontStyle: 'italic' }}>(Audio disponible próximamente)</Text>
        </View>

        <View style={{ gap: 10 }}>
          {options.map((opt, idx) => {
            const isSelected = selected === opt.id;
            const isCorrect = opt.id === target?.id;
            let bg = '#FFF';
            let border = '#F0EDE8';
            if (checked && isCorrect) { bg = '#E8F5E9'; border = '#2E7D32'; }
            else if (checked && isSelected && !isCorrect) { bg = '#FFEBEE'; border = '#C62828'; }
            else if (isSelected) { bg = '#E3F2FD'; border = '#1565C0'; }

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
                      backgroundColor: checked && isCorrect ? '#2E7D32' : isSelected ? '#1565C0' : '#F0EDE8',
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
                    <Text style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{opt.traduccion_espanol}</Text>
                  </View>
                  {checked && isCorrect && <Text style={{ fontSize: 20 }}>✅</Text>}
                  {checked && isSelected && !isCorrect && <Text style={{ fontSize: 20 }}>❌</Text>}
                </View>
              </Pressable>
            );
          })}
        </View>
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
