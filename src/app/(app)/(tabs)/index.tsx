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
} from 'react-native';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/client/supabase';
import { useSession } from '@/ctx';
import { useLanguage } from '@/context/LanguageContext'; // 👈 Importar contexto
import { useTranslation } from 'react-i18next'; // 👈 Importar i18next

// Constantes (sin cambios)
const HEADER_IMAGE = require('@/../assets/image.png');
const TORTUGA_IMAGE = 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_688f01ac-8453-4ac5-af2d-fee35504e6f5.jpg';
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 40;

// Tipos e interfaces
interface ProgressItem {
  modulo_id: number;
  completed_at?: string | null;
}

const SABIAS_QUE = [
  {
    titulo: '¿Sabías que?',
    texto: 'Los Kariña habitan el territorio del Estado Bolívar, Venezuela, desde tiempos ancestrales. Su name significa "el pueblo".',
    imagen: 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_dc727547-b06b-4d44-a03f-a4cb4506fa18.jpg',
  },
  {
    titulo: '¿Sabías que?',
    texto: 'El territorio Kariña está rodeado de tepuyes y selva amazónica. Cada montaña y río tiene un espíritu protector.',
    imagen: 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_1d848420-04ef-4f88-aadb-8748e1135ff1.jpg',
  },
  {
    titulo: '¿Sabías que?',
    texto: 'La lengua Kariña es una lengua caribe que ha sobrevivido pese a la colonización. Hoy se enseña a nuevas generaciones.',
    imagen: 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_7db21dcd-f48f-411b-9589-22deafac292e.jpg',
  },
  {
    titulo: '¿Sabías que?',
    texto: 'Los artesanos Kariña elaboran cestas y cerámica con técnicas transmitidas de abuela a nieta.',
    imagen: 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_8ad11788-1332-4f29-89ab-6d14f7d0e3ae.jpg',
  },
  {
    titulo: '¿Sabías que?',
    texto: 'Las hachas ceremoniales Kariña son símbolos de poder y conexión con los ancestros.',
    imagen: 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_79a3c4fe-c330-48af-a1f0-7652e49af193.jpg',
  },
];

// Componente rotativo (sin cambios, pero se podría traducir después)
function SabiasQueRotativo() {
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
    <View style={{ marginTop: 20 }}>
      <Text style={{ fontSize: 16, fontWeight: '800', color: '#1A2E1A', marginBottom: 10, marginHorizontal: 20 }}>
        💡 ¿Sabías que?
      </Text>

      <View style={{ marginHorizontal: 20, borderRadius: 18, overflow: 'hidden', backgroundColor: '#1B5E20' }}>
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
              <Image source={{ uri: s.imagen }} style={{ width: '100%', height: 160 }} contentFit="cover" />
              <View style={{ padding: 16 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#F59E0B', marginBottom: 4 }}>{s.titulo}</Text>
                <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.9)', lineHeight: 20 }}>{s.texto}</Text>
              </View>
            </View>
          ))}
        </ScrollView>

        <View style={{ flexDirection: 'row', gap: 6, paddingBottom: 14, justifyContent: 'center', backgroundColor: '#1B5E20' }}>
          {SABIAS_QUE.map((_, i) => (
            <View
              key={i}
              style={{
                width: 8,
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

// Componente tortuga (sin cambios)
function MascotaTortuga() {
  const router = useRouter();
  return (
    <View style={{ marginHorizontal: 20, marginTop: 24, alignItems: 'center' }}>
      <Pressable onPress={() => router.push('/(app)/pronunciacion')}>
        <View style={{ alignItems: 'center' }}>
          <Image
            source={{ uri: TORTUGA_IMAGE }}
            style={{ width: 120, height: 120, borderRadius: 60 }}
            contentFit="cover"
          />
          <View
            style={{
              backgroundColor: '#F59E0B',
              borderRadius: 12,
              paddingHorizontal: 14,
              paddingVertical: 6,
              marginTop: 8,
            }}
          >
            <Text style={{ color: '#FFF', fontSize: 13, fontWeight: '800' }}>🐢 ¡Hola! Soy tu guía Kariña</Text>
          </View>
        </View>
      </Pressable>
    </View>
  );
}

// Pantalla principal
export default function HomeScreen() {
  const router = useRouter();
  const { session } = useSession();
  const { language, toggleLanguage } = useLanguage(); // 👈 Contexto global
  const { t } = useTranslation(); // 👈 Traducciones

  const [modulesCount, setModulesCount] = useState(0);
  const [progress, setProgress] = useState<ProgressItem[]>([]);
  const [totalXp, setTotalXp] = useState(0);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');

  // Estados para el modal de completar perfil
  const [showCompleteProfile, setShowCompleteProfile] = useState(false);
  const [edad, setEdad] = useState('');
  const [comunidad, setComunidad] = useState(false);
  const [saving, setSaving] = useState(false);

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
        .select('full_name, username, edad, pertenece_comunidad')
        .eq('id', session.user.id)
        .single();

      if (profile) {
        setUserName(profile.full_name || profile.username || 'Usuario');
        if (profile.edad === null || profile.edad === undefined) {
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

  // Función para guardar datos adicionales del perfil (sin cambios)
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
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Banner */}
        <View style={{ position: 'relative' }}>
          <Image source={HEADER_IMAGE} style={{ width: '100%', height: 200 }} contentFit="cover" />
          <View style={{ position: 'absolute', top: 16, right: 20 }}>
            <Pressable onPress={toggleLanguage}>
              <View
                style={{
                  backgroundColor: 'rgba(0,0,0,0.4)',
                  borderRadius: 20,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                }}
              >
                <Text style={{ color: '#FFF', fontSize: 13, fontWeight: '700' }}>
                  {language === 'es' ? '🇪🇸 ES → 🇬🇧 EN' : '🇬🇧 EN → 🇪🇸 ES'}
                </Text>
              </View>
            </Pressable>
          </View>
          <View style={{ position: 'absolute', bottom: 16, left: 20 }}>
            <Text style={{ color: '#F59E0B', fontSize: 11, fontWeight: '700' }}>
              {t('home.badge')} {/* "KARIÑA · INDIGENOUS LANGUAGE" */}
            </Text>
            <Text
              style={{
                color: '#FFFFFF',
                fontSize: 22,
                fontWeight: '900',
                textShadowColor: 'rgba(0,0,0,0.5)',
                textShadowOffset: { width: 0, height: 1 },
                textShadowRadius: 3,
              }}
            >
              {t('home.menu_title')} {/* "Menú Interactivo" / "Interactive Menu" */}
            </Text>
          </View>
        </View>

        {/* Bienvenida */}
        <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
          <Text style={{ fontSize: 16, color: '#1A2E1A', fontWeight: '700' }}>
            {t('home.welcome', { name: userName })} {/* "¡Bienvenido, {name}! 👋" */}
          </Text>
          <Text style={{ fontSize: 12, color: '#666', marginTop: 4 }}>{t('home.subtitle')}</Text>
        </View>

        {/* Progreso + XP */}
        <View
          style={{
            marginHorizontal: 20,
            marginTop: 14,
            backgroundColor: '#FFFFFF',
            borderRadius: 16,
            padding: 14,
            borderWidth: 1,
            borderColor: '#F0EDE8',
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#1A2E1A' }}>{t('home.your_progress')}</Text>
            <Text style={{ fontSize: 11, color: '#2E7D32', fontWeight: '700' }}>
              {completedCount} {t('home.of')} {modulesCount} {t('home.modules')}
            </Text>
          </View>
          <View
            style={{
              height: 8,
              backgroundColor: '#E8F5E9',
              borderRadius: 4,
              marginTop: 8,
              overflow: 'hidden',
            }}
          >
            <View
              style={{ width: `${progressPercent}%`, height: '100%', backgroundColor: '#2E7D32', borderRadius: 4 }}
            />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
            <Text style={{ fontSize: 11, color: '#888' }}>
              {Math.round(progressPercent)}% {t('home.completed')}
            </Text>
            <Text style={{ fontSize: 11, color: '#1565C0', fontWeight: '700' }}>⭐ {totalXp} XP</Text>
          </View>
        </View>

        <SabiasQueRotativo />
        <MascotaTortuga />

        {/* Accesos rápidos */}
        <Text
          style={{
            fontSize: 16,
            fontWeight: '800',
            color: '#1A2E1A',
            marginHorizontal: 20,
            marginTop: 24,
            marginBottom: 10,
          }}
        >
          {t('home.learning_units')}
        </Text>

        <View style={{ paddingHorizontal: 20, gap: 10, paddingBottom: 12 }}>
          {/* Módulos de estudio */}
          <Pressable onPress={() => router.push('/(app)/(tabs)/modulos' as any)}>
            <View
              style={{
                backgroundColor: '#FFF',
                borderRadius: 16,
                padding: 16,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                borderWidth: 1,
                borderColor: '#F0EDE8',
              }}
            >
              <View
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: 25,
                  backgroundColor: '#E8F5E9',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 24 }}>🗂️</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '800', color: '#1A2E1A' }}>{t('modules.title')}</Text>
                <Text style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{t('modules.subtitle')}</Text>
              </View>
              <Text style={{ fontSize: 20, color: '#2E7D32' }}>→</Text>
            </View>
          </Pressable>

          {/* Diccionario */}
          <Pressable onPress={() => router.push('/(app)/(tabs)/diccionario')}>
            <View
              style={{
                backgroundColor: '#FFF',
                borderRadius: 16,
                padding: 16,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                borderWidth: 1,
                borderColor: '#F0EDE8',
              }}
            >
              <View
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: 25,
                  backgroundColor: '#FFF3E0',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 24 }}>📖</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '800', color: '#1A2E1A' }}>{t('dictionary.title')}</Text>
                <Text style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{t('dictionary.subtitle')}</Text>
              </View>
              <Text style={{ fontSize: 20, color: '#F59E0B' }}>→</Text>
            </View>
          </Pressable>

          {/* Juegos */}
          <Pressable onPress={() => router.push('/(app)/(tabs)/juegos')}>
            <View
              style={{
                backgroundColor: '#FFF',
                borderRadius: 16,
                padding: 16,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                borderWidth: 1,
                borderColor: '#F0EDE8',
              }}
            >
              <View
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: 25,
                  backgroundColor: '#E3F2FD',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 24 }}>🎮</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '800', color: '#1A2E1A' }}>{t('games.title')}</Text>
                <Text style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{t('games.subtitle')}</Text>
              </View>
              <Text style={{ fontSize: 20, color: '#1565C0' }}>→</Text>
            </View>
          </Pressable>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* Modal para completar perfil (traducido) */}
      <Modal visible={showCompleteProfile} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 24 }}>
          <View style={{ backgroundColor: '#FFF', borderRadius: 20, padding: 25, gap: 15 }}>
            <Text style={{ fontSize: 22, fontWeight: '900', color: '#1B5E20', textAlign: 'center' }}>
              {t('profile.complete_title')}
            </Text>
            <Text style={{ textAlign: 'center', color: '#666' }}>{t('profile.complete_subtitle')}</Text>

            <View>
              <Text style={{ fontWeight: '700', marginBottom: 5 }}>{t('profile.age_question')}</Text>
              <TextInput
                value={edad}
                onChangeText={setEdad}
                placeholder={t('profile.age_placeholder')}
                keyboardType="numeric"
                style={{ backgroundColor: '#F0F0F0', padding: 15, borderRadius: 10 }}
              />
            </View>

            <Pressable
              onPress={() => setComunidad(!comunidad)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 10 }}
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
                {comunidad && <Text style={{ color: '#FFF', fontSize: 14 }}>✓</Text>}
              </View>
              <Text style={{ fontWeight: '600' }}>{t('profile.belongs_to_community')}</Text>
            </Pressable>

            <Pressable
              onPress={saveProfileExtras}
              disabled={saving || !edad}
              style={{
                backgroundColor: '#F59E0B',
                padding: 18,
                borderRadius: 12,
                alignItems: 'center',
                marginTop: 10,
              }}
            >
              {saving ? (
                <ActivityIndicator color="#1B5E20" />
              ) : (
                <Text style={{ fontWeight: '800', color: '#1B5E20' }}>{t('profile.finish_registration')}</Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}