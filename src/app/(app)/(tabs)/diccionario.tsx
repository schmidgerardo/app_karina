import { useCallback, useState, useEffect } from 'react';
import { ActivityIndicator, FlatList, Text, TextInput, View, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { useAudioPlayer } from 'expo-audio'; 
import Animated, { FadeInDown } from 'react-native-reanimated';
import { supabase } from '@/client/supabase';
import { DictionaryAudioButton } from '@/components/DictionaryAudioButton';
import { Search, SearchX } from 'lucide-react-native';
import { useTranslation } from 'react-i18next'; 
import { useLanguage } from '@/context/LanguageContext';

interface Word {
  id: string;
  palabra_karina: string;
  significado_espanol: string;
  significado_ingles: string | null;
  audio_url: string | null; // URL o nombre del archivo en Supabase
  modules: { titulo: string } | null;
}

// URL BASE de tu bucket de Supabase (sacada de tu ejemplo)
const STORAGE_URL = "https://oczoccdlyyhbdvnyjjni.supabase.co/storage/v1/object/public/audios/";

export default function DiccionarioScreen() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const [words, setWords] = useState<Word[]>([]);
  const [filtered, setFiltered] = useState<Word[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [playingId, setPlayingId] = useState<string | null>(null);

  const player = useAudioPlayer(null);

  useFocusEffect(
    useCallback(() => {
      loadWords();
    }, [])
  );

  useEffect(() => {
    const subscription = player.addListener('playbackStatusUpdate', (status) => {
      if (!status.playing && status.currentTime >= status.duration && status.duration > 0) {
        setPlayingId(null);
      }
    });
    return () => subscription.remove();
  }, [player]);

  async function loadWords() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('words')
        .select(`
          id, 
          palabra_karina, 
          significado_espanol, 
          significado_ingles,
          audio_url,
          modules (titulo)
        `)
        .order('palabra_karina');

      if (error) throw error;
      if (data) {
        setWords(data as any);
        setFiltered(data as any);
      }
    } catch (error) {
      console.error("Error cargando palabras:", error);
    } finally {
      setLoading(false);
    }
  }

  // 🔥 FUNCIÓN CRUCIAL: Reproducir desde Supabase
  const handlePlayAudio = async (word: Word) => {
    // 1. Intentamos sacar la URL. 
    // Si en la DB solo guardaste "aau.mp3", le pegamos la URL del storage.
    // Si ya guardaste la URL completa, la usamos tal cual.
    let finalUrl = word.audio_url;
    
    if (finalUrl && !finalUrl.startsWith('http')) {
      finalUrl = `${STORAGE_URL}${finalUrl}`;
    }

    if (!finalUrl) return;

    if (playingId === word.id) {
      player.pause();
      setPlayingId(null);
      return;
    }

    try {
      setPlayingId(word.id);
      await player.replace({ uri: finalUrl });
      player.play();
    } catch (error) {
      console.error('Error de reproducción:', error);
      setPlayingId(null);
    }
  };

  function handleSearch(text: string) {
    setSearch(text);
    const q = text.toLowerCase().trim();
    if (!q) {
      setFiltered(words);
      return;
    }
    setFiltered(
      words.filter((w) => {
        const matchKarina = w.palabra_karina.toLowerCase().includes(q);
        const matchEspanol = w.significado_espanol.toLowerCase().includes(q);
        const matchIngles = w.significado_ingles?.toLowerCase().includes(q);
        return matchKarina || matchEspanol || matchIngles;
      })
    );
  }

  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#1B5E20" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950" edges={['top']}>
      {/* Header (se mantiene igual) */}
      <View className="bg-primary px-6 pt-4 pb-6 rounded-b-[40px] shadow-lg">
        <Text className="text-white text-3xl font-black mt-1">{t('nav.dictionary')}</Text>
        <Text className="text-white/70 text-sm mt-1">{words.length} {t('nav.dictionary').toLowerCase()}</Text>
      </View>

      {/* Buscador */}
      <View className="px-6 py-5">
        <View className="flex-row items-center bg-white rounded-full px-5 py-3 shadow-sm border border-slate-100">
          <Search size={20} color="#94A3B8" />
          <TextInput
            value={search}
            onChangeText={handleSearch}
            placeholder={language === 'es' ? "Buscar palabra..." : "Search word..."}
            className="flex-1 ml-3 text-base"
          />
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => {
          const isPlaying = playingId === item.id;
          const hasAudio = !!item.audio_url; 
          const significado = language === 'en' && item.significado_ingles 
            ? item.significado_ingles 
            : item.significado_espanol;

          return (
            <Animated.View entering={FadeInDown.delay(index * 100)}>
              <View className="bg-white rounded-3xl p-5 mb-4 flex-row items-center shadow-md">
                <View className="w-1.5 h-12 rounded-full mr-4 bg-primary" />
                <View className="flex-1">
                  <Text className="text-xl font-extrabold text-slate-900">{item.palabra_karina}</Text>
                  <Text className="text-slate-500 text-sm mt-0.5">{significado}</Text>
                </View>
                {/* 🎧 BOTÓN LLAMANDO A LA FUNCIÓN CORREGIDA */}
                <DictionaryAudioButton
                  hasAudio={hasAudio}
                  isPlaying={isPlaying}
                  onPress={() => handlePlayAudio(item)}
                  color="#1B5E20"
                />
              </View>
            </Animated.View>
          );
        }}
      />
    </SafeAreaView>
  );
}