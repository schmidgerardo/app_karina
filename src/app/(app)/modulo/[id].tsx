import { useCallback, useState, useEffect, useRef } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, View, Animated, Easing, LayoutAnimation, UIManager, Platform } from 'react-native';
import { Image } from 'expo-image';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/client/supabase';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '@/context/LanguageContext';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAudioPlayer } from 'expo-audio';

// Habilitar LayoutAnimation para Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface Word {
  id: string;
  palabra_karina: string;
  significado_espanol: string;
  significado_ingles: string | null;
  audio_url: string | null;
  imagen_url: string | null;
}

interface Module {
  id: number;
  titulo?: string;
  titulo_ingles?: string;
  titulo_karina?: string;
  imagen_url?: string;
  color?: string | null;
  descripcion?: string;
  descripcion_ingles?: string;
}

// ✅ Corregido: Ahora usamos el bucket correcto para cada tipo de archivo
const STORAGE_IMAGE_URL = "https://oczoccdlyyhbdvnyjjni.supabase.co/storage/v1/object/public/Image/";
const STORAGE_AUDIO_URL = "https://oczoccdlyyhbdvnyjjni.supabase.co/storage/v1/object/public/audios/";

export default function ModuloDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { t } = useTranslation();
  const { language } = useLanguage();

  const [module, setModule] = useState<Module | null>(null);
  const [words, setWords] = useState<Word[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [playbackProgress, setPlaybackProgress] = useState<{ [key: string]: number }>({});

  const player = useAudioPlayer(null);
  const expandAnimations = useRef<{ [key: string]: Animated.Value }>({});

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

  // Audio progress listener
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

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [id, language])
  );

  async function loadData() {
    setLoading(true);
    const moduleId = parseInt(String(id), 10);

    const { data: modData } = await supabase
      .from('modules')
      .select('*')
      .eq('id', moduleId)
      .single();

    if (modData) {
      setModule(modData as Module);
    }

    const { data: wordsData } = await supabase
      .from('words')
      .select('id, palabra_karina, significado_espanol, significado_ingles, audio_url, imagen_url')
      .eq('modulo_id', moduleId)
      .order('palabra_karina');

    if (wordsData) {
      setWords(wordsData as Word[]);
    }

    setLoading(false);
  }

  const toggleExpand = (wordId: string) => {
    // Verificar si la palabra tiene contenido para mostrar (imagen o audio)
    const word = words.find(w => w.id === wordId);
    if (!word || (!word.imagen_url && !word.audio_url)) return;

    // Crear animación si no existe
    if (!expandAnimations.current[wordId]) {
      expandAnimations.current[wordId] = new Animated.Value(0);
    }

    const isExpanding = expandedId !== wordId;
    setExpandedId(isExpanding ? wordId : null);

    // Animación de altura
    Animated.timing(expandAnimations.current[wordId], {
      toValue: isExpanding ? 1 : 0,
      duration: 300,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: false,
    }).start();
  };

  const handlePlayAudio = async (word: Word) => {
    let finalUrl = word.audio_url;
    
    // ✅ Corregido: Usamos el bucket de audios, no el de imágenes
    if (finalUrl && !finalUrl.startsWith('http')) {
      finalUrl = `${STORAGE_AUDIO_URL}${finalUrl}`;
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

  if (loading || !module) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F9F6F0', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#1B5E20" />
      </SafeAreaView>
    );
  }

  const tituloMostrado = language === 'en' && module.titulo_ingles ? module.titulo_ingles : module.titulo;
  const descMostrada = language === 'en' && module.descripcion_ingles ? module.descripcion_ingles : module.descripcion;

  // Función para obtener la URL completa de la imagen
  const getImageUrl = (imagePath: string | null) => {
    if (!imagePath) return null;
    if (imagePath.startsWith('http')) return imagePath;
    
    const { data } = supabase.storage
      .from('Image')
      .getPublicUrl(imagePath);
    
    return data?.publicUrl || null;
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F9F6F0' }} edges={['top']}>
      <FlatList
        data={words}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 30 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            {/* Header con gradiente */}
            <LinearGradient
              colors={[module.color || '#1B5E20', (module.color || '#1B5E20') + 'CC']}
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
              <Pressable onPress={() => router.back()} style={{ marginBottom: 16, alignSelf: 'flex-start' }}>
                <View style={{ 
                  flexDirection: 'row', 
                  alignItems: 'center', 
                  gap: 6, 
                  backgroundColor: 'rgba(255,255,255,0.2)', 
                  borderRadius: 20, 
                  paddingHorizontal: 12, 
                  paddingVertical: 6 
                }}>
                  <Ionicons name="arrow-back" size={16} color="#FFFFFF" />
                  <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '600' }}>{t('games.back_menu')}</Text>
                </View>
              </Pressable>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                <View style={{ 
                  backgroundColor: 'rgba(255,255,255,0.1)', 
                  padding: 10, 
                  borderRadius: 50,
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.2)',
                }}>
                  <Ionicons name="book-outline" size={28} color="#F59E0B" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#F59E0B', fontSize: 11, fontWeight: '700', letterSpacing: 1 }}>
                    {module.titulo_karina?.toUpperCase()}
                  </Text>
                  <Text style={{ color: '#FFFFFF', fontSize: 24, fontWeight: '900', marginTop: 2, textShadowColor: 'rgba(0,0,0,0.2)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 }}>
                    {tituloMostrado}
                  </Text>
                  <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 4 }}>
                    {descMostrada}
                  </Text>
                </View>
              </View>

              {/* Botón Practicar - Único */}
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: '/(app)/juego/unir',
                    params: { modulo_id: module.id },
                  })
                }
                style={{ marginTop: 16 }}
              >
                <LinearGradient
                  colors={['rgba(255,255,255,0.25)', 'rgba(255,255,255,0.15)']}
                  style={{
                    borderRadius: 16,
                    paddingVertical: 14,
                    paddingHorizontal: 20,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.3)',
                  }}
                >
                  <View style={{
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    padding: 6,
                    borderRadius: 10,
                  }}>
                    <Ionicons name="play-circle" size={24} color="#FFFFFF" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '800' }}>
                      {t('unir.title')}
                    </Text>
                    <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>
                      {language === 'es' ? '3 ejercicios de práctica' : '3 practice exercises'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={24} color="#FFFFFF" />
                </LinearGradient>
              </Pressable>
            </LinearGradient>

            {/* Subtítulo */}
            <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="list-outline" size={18} color="#F59E0B" />
                <Text style={{ fontSize: 13, color: '#888', fontStyle: 'italic' }}>
                  {language === 'es' ? 'Vocabulario del módulo' : 'Module vocabulary'}
                </Text>
                <View style={{
                  backgroundColor: `${module.color || '#1B5E20'}18`,
                  borderRadius: 12,
                  paddingHorizontal: 10,
                  paddingVertical: 3,
                  marginLeft: 'auto',
                }}>
                  <Text style={{ fontSize: 11, color: module.color || '#1B5E20', fontWeight: '700' }}>
                    {words.length} {language === 'es' ? 'palabras' : 'words'}
                  </Text>
                </View>
              </View>
            </View>
          </Animated.View>
        }
        renderItem={({ item, index }) => {
          const isExpanded = expandedId === item.id;
          const isPlaying = playingId === item.id;
          const hasAudio = !!item.audio_url;
          const hasImage = !!item.imagen_url;
          const hasContent = hasAudio || hasImage;
          const progress = playbackProgress[item.id] || 0;
          const significado = language === 'en' && item.significado_ingles 
            ? item.significado_ingles 
            : item.significado_espanol;
          const imageUrl = getImageUrl(item.imagen_url);
          
          // Obtener o crear valor de animación
          if (!expandAnimations.current[item.id]) {
            expandAnimations.current[item.id] = new Animated.Value(isExpanded ? 1 : 0);
          }
          const expandAnim = expandAnimations.current[item.id];

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
                {/* Contenido principal */}
                <Pressable onPress={() => toggleExpand(item.id)} disabled={!hasContent}>
                  <View style={{
                    padding: 16,
                    flexDirection: 'row',
                    alignItems: 'center',
                  }}>
                    <View style={{
                      width: 40,
                      height: 40,
                      borderRadius: 12,
                      backgroundColor: `${module.color || '#1B5E20'}18`,
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 14,
                    }}>
                      <Text style={{ fontSize: 16, fontWeight: '800', color: module.color || '#1B5E20' }}>
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
                    </View>
                    {hasContent && (
                      <Ionicons 
                        name={isExpanded ? 'chevron-up' : 'chevron-down'} 
                        size={20} 
                        color="#94A3B8" 
                      />
                    )}
                  </View>
                </Pressable>

                {/* Barra de progreso del audio */}
                {isPlaying && hasAudio && (
                  <View style={{
                    height: 3,
                    backgroundColor: '#F0EDE8',
                    width: '100%',
                  }}>
                    <Animated.View style={{
                      height: '100%',
                      width: `${progress * 100}%`,
                      backgroundColor: '#F59E0B',
                    }} />
                  </View>
                )}

                {/* Contenido expandido con animación */}
                {hasContent && (
                  <Animated.View style={{
                    maxHeight: expandAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 500],
                    }),
                    opacity: expandAnim,
                    overflow: 'hidden',
                  }}>
                    <View style={{
                      paddingHorizontal: 16,
                      paddingBottom: 16,
                      borderTopWidth: isExpanded ? 1 : 0,
                      borderTopColor: '#F0EDE8',
                      paddingTop: isExpanded ? 14 : 0,
                    }}>
                      {/* ✅ CORREGIDO: Imagen con contenedor que mantiene la relación de aspecto */}
                      {hasImage && imageUrl && (
                        <View style={{ 
                          marginBottom: hasAudio ? 12 : 0,
                          width: '100%',
                          aspectRatio: 16 / 9, // Relación de aspecto fija
                          borderRadius: 12,
                          overflow: 'hidden',
                          backgroundColor: '#F5F5F5',
                        }}>
                          <Image 
                            source={{ uri: imageUrl }} 
                            style={{ 
                              width: '100%',
                              height: '100%',
                            }} 
                            // ✅ CORREGIDO: Usamos 'contain' para mostrar la imagen completa sin recortar
                            contentFit="contain"
                            transition={300}
                          />
                        </View>
                      )}

                      {/* Botones de audio */}
                      {hasAudio && (
                        <Pressable
                          onPress={() => handlePlayAudio(item)}
                          style={{
                            backgroundColor: isPlaying ? '#E8F5E9' : '#FFF3E0',
                            borderRadius: 12,
                            paddingVertical: 10,
                            paddingHorizontal: 16,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 8,
                          }}
                        >
                          <Ionicons 
                            name={isPlaying ? 'pause-circle' : 'play-circle'} 
                            size={20} 
                            color={isPlaying ? '#2E7D32' : '#E65100'} 
                          />
                          <Text style={{ 
                            fontSize: 13, 
                            fontWeight: '700', 
                            color: isPlaying ? '#2E7D32' : '#E65100' 
                          }}>
                            {isPlaying 
                              ? (language === 'es' ? 'Reproduciendo...' : 'Playing...')
                              : (language === 'es' ? 'Escuchar audio' : 'Listen to audio')}
                          </Text>
                        </Pressable>
                      )}
                    </View>
                  </Animated.View>
                )}
              </View>
            </Animated.View>
          );
        }}
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
              <Ionicons name="book-outline" size={48} color="#94A3B8" />
            </View>
            <Text style={{ color: '#94A3B8', fontSize: 16, fontWeight: '600' }}>
              {language === 'es' ? 'No hay palabras disponibles' : 'No words available'}
            </Text>
            <Text style={{ color: '#B0B0B0', fontSize: 13, marginTop: 4 }}>
              {language === 'es' ? 'Próximamente más contenido' : 'More content coming soon'}
            </Text>
          </Animated.View>
        }
      />
    </SafeAreaView>
  );
}
