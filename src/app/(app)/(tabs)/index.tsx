import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Modal,
  TextInput,
  Animated,
  Easing,
} from 'react-native';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/client/supabase';
import { useSession } from '@/ctx';
import { useLanguage } from '@/context/LanguageContext';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

// Constantes
const HEADER_IMAGE = require('@/../assets/image.png');
const TORTUGA_IMAGE = 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_688f01ac-8453-4ac5-af2d-fee35504e6f5.jpg';
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const isSmallScreen = SCREEN_WIDTH < 380;
const CARD_WIDTH = SCREEN_WIDTH - 40;

// Importar imágenes de la carpeta assets
const MODULES_ICON = require('@/../assets/modulos.png');
const DICTIONARY_ICON = require('@/../assets/diccionario.png');
const GAMES_ICON = require('@/../assets/juegos.png');

// Tipos
interface ProgressItem {
  modulo_id: number;
  completed_at?: string | null;
}

// Datos de "Sabías que" con traducciones
const SABIAS_QUE = [
  {
    id: 'sabias_1',
    tituloKey: 'sabias_que.titulo_1',
    textoKey: 'sabias_que.texto_1',
    imagen: 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_dc727547-b06b-4d44-a03f-a4cb4506fa18.jpg',
  },
  {
    id: 'sabias_2',
    tituloKey: 'sabias_que.titulo_2',
    textoKey: 'sabias_que.texto_2',
    imagen: 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_1d848420-04ef-4f88-aadb-8748e1135ff1.jpg',
  },
  {
    id: 'sabias_3',
    tituloKey: 'sabias_que.titulo_3',
    textoKey: 'sabias_que.texto_3',
    imagen: 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_7db21dcd-f48f-411b-9589-22deafac292e.jpg',
  },
  {
    id: 'sabias_4',
    tituloKey: 'sabias_que.titulo_4',
    textoKey: 'sabias_que.texto_4',
    imagen: 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_8ad11788-1332-4f29-89ab-6d14f7d0e3ae.jpg',
  },
  {
    id: 'sabias_5',
    tituloKey: 'sabias_que.titulo_5',
    textoKey: 'sabias_que.texto_5',
    imagen: 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_79a3c4fe-c330-48af-a1f0-7652e49af193.jpg',
  },
];

// Componente SabíasQueRotativo mejorado - CON IMAGEN COMPLETA
function SabiasQueRotativo() {
  const { t } = useTranslation();
  const [idx, setIdx] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      const nextIdx = (idx + 1) % SABIAS_QUE.length;
      setIdx(nextIdx);
      scrollViewRef.current?.scrollTo({
        x: nextIdx * CARD_WIDTH,
        animated: true,
      });
    }, 8000);
    return () => clearInterval(interval);
  }, [idx]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const currentIdx = Math.round(contentOffsetX / CARD_WIDTH);
    if (currentIdx !== idx && currentIdx >= 0 && currentIdx < SABIAS_QUE.length) {
      setIdx(currentIdx);
    }
  };

  return (
    <View style={{ marginTop: 28, paddingHorizontal: 20 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <Ionicons name="bulb-outline" size={22} color="#1A2E1A" />
        <Text style={{ fontSize: 18, fontWeight: '800', color: '#1A2E1A' }}>
          {t('sabias_que.title')}
        </Text>
      </View>

      <View style={{ borderRadius: 24, overflow: 'hidden', backgroundColor: '#1B5E20', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 6 }}>
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          snapToInterval={CARD_WIDTH}
          decelerationRate="fast"
          contentContainerStyle={{ width: CARD_WIDTH * SABIAS_QUE.length }}
        >
          {SABIAS_QUE.map((s, i) => (
            <View key={i} style={{ width: CARD_WIDTH }}>
              {/* Contenedor de la imagen - MODIFICADO PARA MOSTRAR COMPLETA */}
              <View style={{ 
                width: '100%', 
                height: 180, 
                backgroundColor: '#1B5E20',
                justifyContent: 'center',
                alignItems: 'center',
                overflow: 'hidden'
              }}>
                <Image 
                  source={{ uri: s.imagen }} 
                  style={{ 
                    width: '100%', 
                    height: '100%' 
                  }} 
                  contentFit="contain"  // <--- CAMBIADO DE "cover" A "contain"
                />
              </View>
              <View style={{ padding: 16, backgroundColor: '#1B5E20' }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#F59E0B', marginBottom: 4 }}>
                  {t(s.tituloKey)}
                </Text>
                <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.9)', lineHeight: 20 }}>
                  {t(s.textoKey)}
                </Text>
              </View>
            </View>
          ))}
        </ScrollView>

        {/* Indicadores modernos */}
        <View style={{ flexDirection: 'row', gap: 8, paddingBottom: 16, justifyContent: 'center', backgroundColor: '#1B5E20' }}>
          {SABIAS_QUE.map((_, i) => (
            <View
              key={i}
              style={{
                width: i === idx ? 20 : 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: i === idx ? '#F59E0B' : 'rgba(255,255,255,0.3)',
              }}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

// Componente MascotaTortuga mejorado
function MascotaTortuga() {
  const { t } = useTranslation();
  const router = useRouter();
  return (
    <View style={{ marginTop: 28, paddingHorizontal: 20, alignItems: 'center' }}>
      <Pressable onPress={() => router.push('/(app)/pronunciacion')} style={{ width: '100%' }}>
        <LinearGradient
          colors={['#F59E0B', '#F97316']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{
            borderRadius: 24,
            padding: 16,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 14,
            shadowColor: '#F59E0B',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.25,
            shadowRadius: 12,
            elevation: 8,
          }}
        >
          <Image
            source={{ uri: TORTUGA_IMAGE }}
            style={{ width: 70, height: 70, borderRadius: 35, borderWidth: 2, borderColor: '#FFFFFF' }}
            contentFit="cover"
          />
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '800' }}>
              {t('mascota.saludo')}
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 2 }}>
              {t('mascota.subtitulo')}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#FFFFFF" />
        </LinearGradient>
      </Pressable>
    </View>
  );
}

// Pantalla principal rediseñada
export default function HomeScreen() {
  const router = useRouter();
  const { session } = useSession();
  const { language, toggleLanguage } = useLanguage();
  const { t } = useTranslation();

  const [modulesCount, setModulesCount] = useState(0);
  const [progress, setProgress] = useState<ProgressItem[]>([]);
  const [totalXp, setTotalXp] = useState(0);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const [userAvatar, setUserAvatar] = useState<string | null>(null);

  const [showCompleteProfile, setShowCompleteProfile] = useState(false);
  const [edad, setEdad] = useState('');
  const [comunidad, setComunidad] = useState(false);
  const [saving, setSaving] = useState(false);

  // Animaciones de entrada
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
      loadData();
    }, [])
  );

  async function loadData() {
    setLoading(true);

    const { count } = await supabase.from('modules').select('*', { count: 'exact', head: true });
    if (count !== null) setModulesCount(count);

    if (session?.user?.id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, username, edad, pertenece_comunidad, avatar_url')
        .eq('id', session.user.id)
        .single();

      if (profile) {
        setUserName(profile.full_name || profile.username || 'Usuario');
        setUserAvatar(profile.avatar_url || null);
        if (
          profile.edad === null ||
          profile.edad === undefined ||
          profile.pertenece_comunidad === null ||
          profile.pertenece_comunidad === undefined
        ) {
          setShowCompleteProfile(true);
        } else {
          setShowCompleteProfile(false);
        }
        setEdad(profile.edad?.toString() || '');
        setComunidad(profile.pertenece_comunidad || false);
      }

      const { data: progData } = await supabase
        .from('module_progress')
        .select('modulo_id, completed_at')
        .eq('user_id', session.user.id);

      if (progData) {
        setProgress(progData as ProgressItem[]);
        setTotalXp(0);
      }
    }

    setLoading(false);
  }

  const saveProfileExtras = async () => {
    if (!edad) return;
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        edad: parseInt(edad),
        pertenece_comunidad: comunidad,
        updated_at: new Date(),
      })
      .eq('id', session?.user?.id);

    if (!error) {
      setShowCompleteProfile(false);
      await loadData();
    }
    setSaving(false);
  };

  const completedCount = progress.filter((p) => Boolean(p.completed_at)).length;
  const progressPercent = modulesCount > 0 ? (completedCount / modulesCount) * 100 : 0;

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#F9F6F0', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#1B5E20" />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F9F6F0' }} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 80 }}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          {/* Banner mejorado con gradiente */}
          <LinearGradient
            colors={['#1B5E20', '#2E7D32']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ position: 'relative', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 20, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={{ color: '#F59E0B', fontSize: 10, fontWeight: '700', letterSpacing: 0.5 }}>
                  {t('home.badge')}
                </Text>
                <Text
                  numberOfLines={1}
                  style={{ color: '#FFFFFF', fontSize: 22, fontWeight: '900', marginTop: 2, textShadowColor: 'rgba(0,0,0,0.2)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 }}
                >
                  {t('home.menu_title')}
                </Text>
              </View>
              <Pressable
                onPress={toggleLanguage}
                style={{
                  backgroundColor: 'rgba(255,255,255,0.15)',
                  paddingHorizontal: isSmallScreen ? 8 : 10,
                  paddingVertical: isSmallScreen ? 5 : 6,
                  borderRadius: 30,
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.2)',
                  flexShrink: 0,
                }}
              >
                <Text style={{ color: '#FFFFFF', fontSize: isSmallScreen ? 9 : 10, fontWeight: '700' }}>{language === 'es' ? 'ES' : 'EN'}</Text>
              </Pressable>
            </View>
          </LinearGradient>

          {/* Bienvenida mejorada CON FOTO DE PERFIL */}
          <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'nowrap' }}>
              {/* Foto de perfil del usuario */}
              <Image
                source={
                  userAvatar
                    ? { uri: userAvatar }
                    : require('@/../assets/image.png')
                }
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  borderWidth: 2,
                  borderColor: '#F59E0B',
                  flexShrink: 0,
                }}
                contentFit="cover"
              />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text
                  numberOfLines={1}
                  ellipsizeMode="tail"
                  style={{
                    fontSize: 16,
                    color: '#1A2E1A',
                    fontWeight: '800',
                    flexShrink: 1,
                  }}
                >
                  {t('home.welcome', { name: userName })}
                </Text>
                <Text
                  numberOfLines={1}
                  ellipsizeMode="tail"
                  style={{
                    fontSize: 11,
                    color: '#666',
                    marginTop: 1,
                  }}
                >
                  {t('home.subtitle')}
                </Text>
              </View>
            </View>
          </View>

          {/* Progreso mejorado */}
          <View style={{ marginHorizontal: 20, marginTop: 20 }}>
            <LinearGradient
              colors={['#FFFFFF', '#F9F6F0']}
              style={{
                borderRadius: 20,
                padding: 18,
                borderWidth: 1,
                borderColor: '#E8E5E0',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.05,
                shadowRadius: 8,
                elevation: 4,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="trending-up" size={18} color="#2E7D32" />
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#1A2E1A' }}>{t('home.your_progress')}</Text>
                </View>
                <View style={{ backgroundColor: '#E8F5E9', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4 }}>
                  <Text style={{ fontSize: 11, color: '#2E7D32', fontWeight: '700' }}>
                    {completedCount} {t('home.of')} {modulesCount} {t('home.modules')}
                  </Text>
                </View>
              </View>
              <View style={{ height: 8, backgroundColor: '#E8F5E9', borderRadius: 4, marginTop: 12, overflow: 'hidden' }}>
                <View style={{ width: `${progressPercent}%`, height: '100%', backgroundColor: '#2E7D32', borderRadius: 4 }} />
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                <Text style={{ fontSize: 12, color: '#888' }}>
                  {Math.round(progressPercent)}% {t('home.completed')}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Ionicons name="star" size={14} color="#F59E0B" />
                  <Text style={{ fontSize: 12, color: '#1565C0', fontWeight: '700' }}>{totalXp} XP</Text>
                </View>
              </View>
            </LinearGradient>
          </View>

          {/* Sabías que y Tortuga */}
          <SabiasQueRotativo />
          <MascotaTortuga />

          {/* Accesos rápidos rediseñados con imágenes */}
          <View style={{ marginTop: 32, paddingHorizontal: 20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <Ionicons name="apps" size={22} color="#1B5E20" />
              <Text style={{ fontSize: 18, fontWeight: '800', color: '#1A2E1A' }}>{t('home.learning_units')}</Text>
            </View>

            <View style={{ gap: 12 }}>
              {/* Módulos de estudio */}
              <Pressable onPress={() => router.push('/(app)/(tabs)/modulos')}>
                <LinearGradient
                  colors={['#FFFFFF', '#F5F9F5']}
                  style={{
                    borderRadius: 20,
                    padding: 16,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 14,
                    borderWidth: 1,
                    borderColor: '#E8E5E0',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.04,
                    shadowRadius: 6,
                    elevation: 2,
                  }}
                >
                  <Image
                    source={MODULES_ICON}
                    style={{ width: 52, height: 52, borderRadius: 12 }}
                    contentFit="contain"
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, fontWeight: '800', color: '#1A2E1A' }}>{t('modules.title')}</Text>
                    <Text style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{t('modules.subtitle')}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#2E7D32" />
                </LinearGradient>
              </Pressable>

              {/* Diccionario */}
              <Pressable onPress={() => router.push('/(app)/(tabs)/diccionario')}>
                <LinearGradient
                  colors={['#FFFFFF', '#F9F5F0']}
                  style={{
                    borderRadius: 20,
                    padding: 16,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 14,
                    borderWidth: 1,
                    borderColor: '#E8E5E0',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.04,
                    shadowRadius: 6,
                    elevation: 2,
                  }}
                >
                  <Image
                    source={DICTIONARY_ICON}
                    style={{ width: 52, height: 52, borderRadius: 12 }}
                    contentFit="contain"
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, fontWeight: '800', color: '#1A2E1A' }}>{t('dictionary.title')}</Text>
                    <Text style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{t('dictionary.subtitle')}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#F59E0B" />
                </LinearGradient>
              </Pressable>

              {/* Juegos */}
              <Pressable onPress={() => router.push('/(app)/(tabs)/juegos')}>
                <LinearGradient
                  colors={['#FFFFFF', '#F0F4F9']}
                  style={{
                    borderRadius: 20,
                    padding: 16,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 14,
                    borderWidth: 1,
                    borderColor: '#E8E5E0',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.04,
                    shadowRadius: 6,
                    elevation: 2,
                  }}
                >
                  <Image
                    source={GAMES_ICON}
                    style={{ width: 52, height: 52, borderRadius: 12 }}
                    contentFit="contain"
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, fontWeight: '800', color: '#1A2E1A' }}>{t('games.title')}</Text>
                    <Text style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{t('games.subtitle')}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#1565C0" />
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        </Animated.View>
      </ScrollView>

      {/* Modal mejorado para completar perfil */}
      <Modal visible={showCompleteProfile} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 24 }}>
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 28, padding: 28, gap: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 24, elevation: 10 }}>
            <View style={{ alignItems: 'center' }}>
              <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: '#E8F5E9', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="person-add" size={32} color="#1B5E20" />
              </View>
            </View>
            <Text style={{ fontSize: 22, fontWeight: '900', color: '#1B5E20', textAlign: 'center' }}>
              {t('profile.complete_title')}
            </Text>
            <Text style={{ textAlign: 'center', color: '#666', fontSize: 14 }}>{t('profile.complete_subtitle')}</Text>

            <View>
              <Text style={{ fontWeight: '700', marginBottom: 6, color: '#1A2E1A' }}>{t('profile.age_question')}</Text>
              <TextInput
                value={edad}
                onChangeText={setEdad}
                placeholder={t('profile.age_placeholder')}
                keyboardType="numeric"
                style={{ backgroundColor: '#F5F5F5', padding: 16, borderRadius: 14, fontSize: 16 }}
              />
            </View>

            <Pressable
              onPress={() => setComunidad(!comunidad)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 }}
            >
              <View
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 6,
                  borderWidth: 2,
                  borderColor: '#1B5E20',
                  backgroundColor: comunidad ? '#1B5E20' : 'transparent',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                {comunidad && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
              </View>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#1A2E1A' }}>{t('profile.belongs_to_community')}</Text>
            </Pressable>

            <Pressable
              onPress={saveProfileExtras}
              disabled={saving || !edad}
              style={[
                {
                  backgroundColor: '#F59E0B',
                  padding: 18,
                  borderRadius: 14,
                  alignItems: 'center',
                  marginTop: 8,
                },
                (saving || !edad) && { opacity: 0.6 },
              ]}
            >
              {saving ? (
                <ActivityIndicator color="#1B5E20" />
              ) : (
                <Text style={{ fontWeight: '800', color: '#1B5E20', fontSize: 16 }}>{t('profile.finish_registration')}</Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
