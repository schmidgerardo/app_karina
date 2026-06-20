import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAudioPlayer } from 'expo-audio';
import { supabase } from '@/client/supabase';

interface Word {
  id: string;
  palabra_karina: string;
  significado_espanol: string;
  audio_url: string | null;
}

/* eslint-disable no-undef */
const AUDIO_FILES: Record<string, any> = {
  aau: require('../../../../assets/sounds/aau.mp3'),
  mojko: require('../../../../assets/sounds/mojko.mp3'),
  nana: require('../../../../assets/sounds/nana.mp3'),
  nakon: require('../../../../assets/sounds/nakon.mp3'),
};
/* eslint-enable no-undef */

export default function AudiosRepasoScreen() {
  const router = useRouter();
  const [words, setWords] = useState<Word[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const player = useAudioPlayer(null);

  useFocusEffect(
    useCallback(() => {
      loadWords();
    }, [])
  );

  async function loadWords() {
    setLoading(true);
    const { data } = await supabase
      .from('words')
      .select('id, palabra_karina, significado_espanol')
      .order('palabra_karina', { ascending: true })
      .limit(80);

    if (data) {
      const mapped = (data as Word[]).map((w) => ({
        ...w,
        audio_url: AUDIO_FILES[w.palabra_karina.toLowerCase()] || null,
      }));
      setWords(mapped);
    }
    setLoading(false);
  }

  async function playAudio(word: Word) {
    if (!word.audio_url) return;
    setPlayingId(word.id);
    try {
      await player.replace(word.audio_url);
      await player.play();
      setTimeout(() => setPlayingId(null), 2000);
    } catch {
      setPlayingId(null);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F9F6F0', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#1B5E20" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F9F6F0' }} edges={['top']}>
      <View style={{ backgroundColor: '#F59E0B', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 16 }}>
        <Pressable onPress={() => router.back()} style={{ marginBottom: 10, alignSelf: 'flex-start' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 }}>
            <Text style={{ color: '#FFF', fontSize: 16 }}>←</Text>
            <Text style={{ color: '#FFF', fontSize: 13, fontWeight: '600' }}>Inicio</Text>
          </View>
        </Pressable>
        <Text style={{ color: '#FFF', fontSize: 20, fontWeight: '900' }}>🔊 Audios de repaso</Text>
        <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 4 }}>Escucha y practica la pronunciación</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
        {words.map((word) => {
          const hasAudio = !!word.audio_url;
          return (
            <View
              key={word.id}
              style={{
                backgroundColor: '#FFF',
                borderRadius: 14,
                padding: 14,
                marginBottom: 10,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                borderWidth: 1,
                borderColor: '#F0EDE8',
              }}
            >
              <Pressable onPress={() => hasAudio && playAudio(word)} disabled={!hasAudio}>
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    backgroundColor: hasAudio ? '#F59E0B' : '#E2E8F0',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: 20 }}>{playingId === word.id ? '⏸️' : '▶️'}</Text>
                </View>
              </Pressable>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '800', color: '#1A2E1A' }}>{word.palabra_karina}</Text>
                <Text style={{ fontSize: 12, color: '#666', marginTop: 2 }}>{word.significado_espanol}</Text>
                {!hasAudio && <Text style={{ fontSize: 10, color: '#888', marginTop: 2 }}>Audio próximamente</Text>}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}
