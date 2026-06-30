import { useCallback, useState, useEffect, useRef } from 'react';
import { 
  ActivityIndicator, 
  FlatList, 
  Text, 
  TextInput, 
  View, 
  Animated, 
  Easing,
  Pressable
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { useAudioPlayer } from 'expo-audio';
import { supabase } from '@/client/supabase';
import { DictionaryAudioButton } from '@/components/DictionaryAudioButton';
import { Search, SearchX } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '@/context/LanguageContext';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

interface Word {
  id: string;
  palabra_karina: string;
  significado_espanol: string;
  significado_ingles: string | null;
  audio_url: string | null;
  modules: { titulo: string } | null;
}

const STORAGE_URL = "https://oczoccdlyyhbdvnyjjni.supabase.co/storage/v1/object/public/audios/";

export default function DiccionarioScreen() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const insets = useSafeAreaInsets();
  const [words, setWords] = useState<Word[]>([]);
  const [filtered, setFiltered] = useState<Word[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [playbackProgress, setPlaybackProgress] = useState<{ [key: string]: number }>({});

  const player = useAudioPlayer(null);

  // Animación de entrada
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    if (!loading) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 600,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [loading]);

  useFocusEffect(
    useCallback(() => {
      loadWords();
    }, [])
  );

  useEffect(() => {
    const subscription = player.addListener('playbackStatusUpdate', (status) => {
      if (status.duration && status.currentTime !== undefined) {
        const progress = status.duration > 0 ? status.currentTime / status.duration : 0;
        setPlaybackProgress(prev => ({
          ...prev,
          [playingId || '']: progress
        }));
      }
      
      if (!status.playing && status.currentTime >= status.duration && status.duration > 0) {
        setPlayingId(null);
        setPlaybackProgress(prev => ({
          ...prev,
          [playingId || '']: 0
        }));
      }
    });
    return () => subscription.remove();
  }, [player, playingId]);

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

  const handlePlayAudio = async (word: Word) => {
    let finalUrl = word.audio_url;
    
    if (finalUrl && !finalUrl.startsWith('http')) {
      finalUrl = `${STORAGE_URL}${finalUrl}`;
    }

    if (!finalUrl) return;

    if (playingId === word.id) {
      player.pause();
      setPlayingId(null);
      setPlaybackProgress(prev => ({
        ...prev,
        [word.id]: 0
      }));
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
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F9F6F0', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#1B5E20" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F9F6F0' }} edges={['top']}>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ 
          paddingBottom: insets.bottom + 90, // 👈 Espacio para la barra de navegación
          paddingTop: 0
        }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            {/* Header con gradiente */}
            <LinearGradient
              colors={['#1B5E20', '#2E7D32']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                paddingHorizontal: 24,
                paddingTop: 20,
                paddingBottom: 28,
                borderBottomLeftRadius: 32,
                borderBottomRightRadius: 32,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ backgroundColor: 'rgba(255,255,255,0.1)', padding: 10, borderRadius: 50 }}>
                  <Ionicons name="book-outline" size={28} color="#F59E0B" />
                </View>
                <View>
                  <Text style={{ color: '#F59E0B', fontSize: 11, fontWeight: '700', letterSpacing: 1 }}>
                    KARIÑA · {t('nav.dictionary').toUpperCase()}
                  </Text>
                  <Text style={{ color: '#FFFFFF', fontSize: 28, fontWeight: '900', marginTop: 2, textShadowColor: 'rgba(0,0,0,0.2)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 }}>
                    {t('nav.dictionary')}
                  </Text>
                  <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 4 }}>
                    {words.length} {language === 'es' ? 'palabras registradas' : 'registered words'}
                  </Text>
                </View>
              </View>
            </LinearGradient>

            {/* Buscador mejorado */}
            <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 }}>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#FFFFFF',
                borderRadius: 16,
                paddingHorizontal: 16,
                paddingVertical: 4,
                borderWidth: 1,
                borderColor: '#F0EDE8',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.04,
                shadowRadius: 4,
                elevation: 2,
              }}>
                <Search size={20} color={search ? '#1B5E20' : '#94A3B8'} />
                <TextInput
                  value={search}
                  onChangeText={handleSearch}
                  placeholder={language === 'es' ? "Buscar palabra..." : "Search word..."}
                  placeholderTextColor="#94A3B8"
                  style={{
                    flex: 1,
                    padding: 14,
                    fontSize: 15,
                    color: '#1A2E1A',
                  }}
                />
                {search.length > 0 && (
                  <Pressable onPress={() => handleSearch('')}>
                    <Ionicons name="close-circle" size={20} color="#94A3B8" />
                  </Pressable>
                )}
              </View>
            </View>
          </Animated.View>
        }
        ListEmptyComponent={
          <Animated.View style={{ 
            opacity: fadeAnim, 
            transform: [{ translateY: slideAnim }],
            alignItems: 'center',
            paddingVertical: 60,
          }}>
            <View style={{ 
              backgroundColor: '#F5F5F5', 
              padding: 20, 
              borderRadius: 50,
              marginBottom: 16,
            }}>
              <SearchX size={48} color="#94A3B8" />
            </View>
            <Text style={{ color: '#94A3B8', fontSize: 16, fontWeight: '600' }}>
              {language === 'es' ? 'No se encontraron palabras' : 'No words found'}
            </Text>
            <Text style={{ color: '#B0B0B0', fontSize: 13, marginTop: 4 }}>
              {language === 'es' ? 'Intenta con otro término' : 'Try another term'}
            </Text>
          </Animated.View>
        }
        renderItem={({ item, index }) => {
          const isPlaying = playingId === item.id;
          const hasAudio = !!item.audio_url;
          const progress = playbackProgress[item.id] || 0;
          const significado = language === 'en' && item.significado_ingles 
            ? item.significado_ingles 
            : item.significado_espanol;

          return (
            <Animated.View 
              style={{
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
                paddingHorizontal: 20,
                marginBottom: 12,
              }}
            >
              <View style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 18,
                borderWidth: 1,
                borderColor: '#F0EDE8',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.04,
                shadowRadius: 6,
                elevation: 2,
                overflow: 'hidden',
              }}>
                {/* Contenido de la tarjeta */}
                <View style={{
                  padding: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                }}>
                  <View style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    backgroundColor: '#E8F5E9',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 14,
                  }}>
                    <Text style={{ fontSize: 16, fontWeight: '800', color: '#1B5E20' }}>
                      {index + 1}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 17, fontWeight: '800', color: '#1A2E1A' }}>
                      {item.palabra_karina}
                    </Text>
                    <Text style={{ color: '#666', fontSize: 13, marginTop: 2 }}>
                      {significado}
                    </Text>
                    {item.modules?.titulo && (
                      <View style={{ 
                        backgroundColor: '#F0EDE8', 
                        borderRadius: 6, 
                        paddingHorizontal: 8, 
                        paddingVertical: 2,
                        alignSelf: 'flex-start',
                        marginTop: 4,
                      }}>
                        <Text style={{ fontSize: 9, color: '#888', fontWeight: '600' }}>
                          {item.modules.titulo}
                        </Text>
                      </View>
                    )}
                  </View>
                  <DictionaryAudioButton
                    hasAudio={hasAudio}
                    isPlaying={isPlaying}
                    onPress={() => handlePlayAudio(item)}
                    color="#1B5E20"
                  />
                </View>

                {/* Barra de progreso del audio */}
                {isPlaying && hasAudio && (
                  <View style={{
                    height: 4,
                    backgroundColor: '#F0EDE8',
                    width: '100%',
                  }}>
                    <Animated.View style={{
                      height: '100%',
                      width: `${progress * 100}%`,
                      backgroundColor: '#F59E0B',
                      borderRadius: 2,
                    }} />
                  </View>
                )}
              </View>
            </Animated.View>
          );
        }}
      />
    </SafeAreaView>
  );
}
