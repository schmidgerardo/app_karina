import { useCallback, useState, useEffect } from 'react';
import { ActivityIndicator, FlatList, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { useAudioPlayer } from 'expo-audio';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { supabase } from '@/client/supabase';
import { DictionaryAudioButton } from '@/components/DictionaryAudioButton';
import { Search, SearchX } from 'lucide-react-native';
import { useTranslation } from 'react-i18next'; // 👈 Importar

interface Word {
  id: string;
  palabra_karina: string;
  significado_espanol: string;
  modules: { titulo: string; color?: string }[] | null;
}

const AUDIO_FILES: Record<string, any> = {
  aau: require('../../../../assets/sounds/aau.mp3'),
  mojko: require('../../../../assets/sounds/mojko.mp3'),
  nana: require('../../../../assets/sounds/nana.mp3'),
  nakon: require('../../../../assets/sounds/nakon.mp3'),
};

export default function DiccionarioScreen() {
  const { t } = useTranslation(); // 👈 Inicializar
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
    const { data } = await supabase
      .from('words')
      .select('id, palabra_karina, significado_espanol, modules(titulo, color)')
      .order('palabra_karina');

    if (data) {
      const typed = data as unknown as Word[];
      setWords(typed);
      setFiltered(typed);
    }
    setLoading(false);
  }

  async function handlePlayAudio(word: Word) {
    const audioSource = AUDIO_FILES[word.palabra_karina.toLowerCase()];
    if (!audioSource) return;

    if (playingId === word.id) {
      player.pause();
      setPlayingId(null);
      return;
    }

    try {
      setPlayingId(word.id);
      await player.replace(audioSource);
      player.play();
    } catch (error) {
      console.error('Error al reproducir audio:', error);
      setPlayingId(null);
    }
  }

  function handleSearch(text: string) {
    setSearch(text);
    const q = text.toLowerCase().trim();
    if (!q) {
      setFiltered(words);
      return;
    }
    setFiltered(
      words.filter(
        (w) =>
          w.palabra_karina.toLowerCase().includes(q) ||
          w.significado_espanol.toLowerCase().includes(q)
      )
    );
  }

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950 items-center justify-center">
        <ActivityIndicator size="large" color="#1B5E20" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950" edges={['top']}>
      {/* Header */}
      <View className="bg-primary dark:bg-slate-900 px-6 pt-4 pb-6 rounded-b-[40px] shadow-lg">
        <Text className="text-accent font-bold text-xs tracking-widest uppercase">
          Kariña · {t('dictionary.reference')}
        </Text>
        <Text className="text-white text-3xl font-black mt-1">{t('nav.dictionary')}</Text>
        <Text className="text-white/70 text-sm mt-1">
          {t('dictionary.word_count', { count: words.length })}
        </Text>
      </View>

      {/* Buscador */}
      <View className="px-6 py-5">
        <View className="flex-row items-center bg-white dark:bg-slate-800 rounded-full px-5 py-3 shadow-sm border border-slate-100 dark:border-slate-700">
          <Search size={20} color={search ? '#1B5E20' : '#94A3B8'} />
          <TextInput
            value={search}
            onChangeText={handleSearch}
            placeholder={t('dictionary.search_placeholder')}
            placeholderTextColor="#94A3B8"
            className="flex-1 ml-3 text-slate-900 dark:text-slate-100 text-base"
          />
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View className="items-center py-12">
            <SearchX size={48} color="#94A3B8" />
            <Text className="text-slate-400 dark:text-slate-500 mt-4 text-base font-medium">
              {t('dictionary.no_results')}
            </Text>
          </View>
        }
        renderItem={({ item, index }) => {
          const hasAudio = !!AUDIO_FILES[item.palabra_karina.toLowerCase()];
          const isPlaying = playingId === item.id;
          const moduleColor = item.modules?.[0]?.color || '#1B5E20';

          return (
            <Animated.View entering={FadeInDown.delay(index * 100).springify()}>
              <View className="bg-white dark:bg-slate-800 rounded-3xl p-5 mb-4 flex-row items-center shadow-md shadow-slate-200 dark:shadow-none border border-slate-50 dark:border-slate-700">
                <View
                  className="w-1.5 h-12 rounded-full mr-4"
                  style={{ backgroundColor: moduleColor }}
                />
                <View className="flex-1">
                  <Text className="text-xl font-extrabold text-slate-900 dark:text-slate-50">
                    {item.palabra_karina}
                  </Text>
                  <Text className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
                    {item.significado_espanol}
                  </Text>
                  {item.modules?.[0] && (
                    <Text
                      className="text-[10px] font-bold uppercase tracking-wider mt-1.5"
                      style={{ color: moduleColor }}
                    >
                      {item.modules[0].titulo}
                    </Text>
                  )}
                </View>
                <DictionaryAudioButton
                  hasAudio={hasAudio}
                  isPlaying={isPlaying}
                  onPress={() => handlePlayAudio(item)}
                  color={moduleColor}
                />
              </View>
            </Animated.View>
          );
        }}
      />
    </SafeAreaView>
  );
}