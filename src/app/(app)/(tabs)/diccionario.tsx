import { useCallback, useState, useEffect } from 'react';
import { ActivityIndicator, FlatList, Text, TextInput, View, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { useAudioPlayer } from 'expo-audio'; // Asegúrate de tener expo-audio instalado
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
  audio_url: string | null; // 👈 Campo de audio desde Supabase
  modules: { titulo: string } | null;
}

export default function DiccionarioScreen() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  
  const [words, setWords] = useState<Word[]>([]);
  const [filtered, setFiltered] = useState<Word[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [playingId, setPlayingId] = useState<string | null>(null);

  // Inicializamos el reproductor de audio
  const player = useAudioPlayer(null);

  useFocusEffect(
    useCallback(() => {
      loadWords();
    }, [])
  );

  // Listener para limpiar el icono de "play" cuando termine el audio
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
      // Traemos audio_url y significado_ingles de la base de datos
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

  // ✍️ FUNCIÓN CORREGIDA: Ahora usa la URL de Supabase
  async function handlePlayAudio(word: Word) {
    if (!word.audio_url) return;

    // Si pulsamos el mismo que está sonando, pausamos
    if (playingId === word.id) {
      player.pause();
      setPlayingId(null);
      return;
    }

    try {
      setPlayingId(word.id);
      // Cargamos la URL remota en el reproductor
      await player.replace({ uri: word.audio_url });
      player.play();
    } catch (error) {
      console.error('Error al reproducir audio remoto:', error);
      setPlayingId(null);
      Alert.alert(t('common.no_audio'));
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
      <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950 items-center justify-center">
        <ActivityIndicator size="large" color="#1B5E20" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950" edges={['top']}>
      {/* Header */}
      <View className="bg-primary dark:bg-slate-900 px-6 pt-4 pb-6 rounded-b-[40px] shadow-lg">
        <Text className="text-accent font-bold text-xs tracking-widest uppercase">Kariña · {t('nav.dictionary')}</Text>
        <Text className="text-white text-3xl font-black mt-1">{t('nav.dictionary')}</Text>
        <Text className="text-white/70 text-sm mt-1">{words.length} {t('nav.dictionary').toLowerCase()}</Text>
      </View>

      {/* Buscador */}
      <View className="px-6 py-5">
        <View className="flex-row items-center bg-white dark:bg-slate-800 rounded-full px-5 py-3 shadow-sm border border-slate-100 dark:border-slate-700">
          <Search size={20} color={search ? '#1B5E20' : '#94A3B8'} />
          <TextInput
            value={search}
            onChangeText={handleSearch}
            placeholder={language === 'es' ? "Buscar palabra..." : "Search word..."}
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
              {language === 'es' ? "No se encontraron palabras" : "No words found"}
            </Text>
          </View>
        }
        renderItem={({ item, index }) => {
          const isPlaying = playingId === item.id;
          const hasAudio = !!item.audio_url; // 👈 Ahora depende de la base de datos
          
          const significado = language === 'en' && item.significado_ingles 
            ? item.significado_ingles 
            : item.significado_espanol;

          return (
            <Animated.View entering={FadeInDown.delay(index * 100).springify()}>
              <View className="bg-white dark:bg-slate-800 rounded-3xl p-5 mb-4 flex-row items-center shadow-md border border-slate-50 dark:border-slate-700">
                <View className="w-1.5 h-12 rounded-full mr-4 bg-primary" />
                <View className="flex-1">
                  <Text className="text-xl font-extrabold text-slate-900 dark:text-slate-50">
                    {item.palabra_karina}
                  </Text>
                  <Text className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
                    {significado}
                  </Text>
                  {item.modules && (
                    <Text className="text-[10px] font-bold uppercase tracking-wider mt-1.5 text-primary">
                      {item.modules.titulo}
                    </Text>
                  )}
                </View>
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