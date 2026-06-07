import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/client/supabase';
import { useSession } from '@/ctx';

const HEADER_IMAGE =
  'https://miaoda-conversation-file.s3cdn.medo.dev/user-c6js8p49d4ao/app-c6jsx92bbkld/20260607/1000861193.jpg';

const TORTUGA_IMAGE = 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_688f01ac-8453-4ac5-af2d-fee35504e6f5.jpg';

interface ProgressItem {
  module_id: number;
  completed: boolean;
  xp: number;
}

const SABIAS_QUE = [
  {
    titulo: '¿Sabías que?',
    texto: 'Los Kariña habitan el territorio del Estado Bolívar, Venezuela, desde tiempos ancestrales. Su nombre significa "el pueblo".',
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

function SabiasQueRotativo() {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setIdx((prev) => (prev + 1) % SABIAS_QUE.length);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const s = SABIAS_QUE[idx];

  return (
    <View style={{ marginHorizontal: 20, marginTop: 20 }}>
      <Text style={{ fontSize: 16, fontWeight: '800', color: '#1A2E1A', marginBottom: 10 }}>
        💡 ¿Sabías que?
      </Text>
      <View style={{ borderRadius: 18, overflow: 'hidden', backgroundColor: '#1B5E20' }}>
        <Image source={{ uri: s.imagen }} style={{ width: '100%', height: 160 }} contentFit="cover" />
        <View style={{ padding: 16 }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: '#F59E0B', marginBottom: 4 }}>{s.titulo}</Text>
          <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.9)', lineHeight: 20 }}>{s.texto}</Text>
        </View>
        {/* Indicadores */}
        <View style={{ flexDirection: 'row', gap: 6, paddingBottom: 14, justifyContent: 'center' }}>
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
          <View style={{ backgroundColor: '#F59E0B', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 6, marginTop: 8 }}>
            <Text style={{ color: '#FFF', fontSize: 13, fontWeight: '800' }}>🐢 ¡Hola! Soy tu guía Kariña</Text>
          </View>
        </View>
      </Pressable>
    </View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { session } = useSession();
  const [modulesCount, setModulesCount] = useState(0);
  const [progress, setProgress] = useState<ProgressItem[]>([]);
  const [totalXp, setTotalXp] = useState(0);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const [idioma, setIdioma] = useState('es');

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
        .select('nombre, username, idioma')
        .eq('id', session.user.id)
        .single();
      if (profile) {
        setUserName(profile.nombre || profile.username || 'Usuario');
        if (profile.idioma) setIdioma(profile.idioma);
      }

      const { data: progData } = await supabase
        .from('module_progress')
        .select('module_id, completed, xp')
        .eq('user_id', session.user.id);

      if (progData) {
        setProgress(progData as ProgressItem[]);
        setTotalXp(progData.reduce((sum, p) => sum + (p.xp || 0), 0));
      }
    }

    setLoading(false);
  }

  async function toggleIdioma() {
    if (!session?.user?.id) return;
    const nuevo = idioma === 'es' ? 'en' : 'es';
    await supabase.from('profiles').update({ idioma: nuevo }).eq('id', session.user.id);
    setIdioma(nuevo);
  }

  const completedCount = progress.filter((p) => p.completed).length;
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
          <Image source={{ uri: HEADER_IMAGE }} style={{ width: '100%', height: 200 }} contentFit="cover" />
          <View
            style={{
              position: 'absolute',
              top: 16,
              right: 20,
            }}
          >
            <Pressable onPress={toggleIdioma}>
              <View style={{ backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 }}>
                <Text style={{ color: '#FFF', fontSize: 13, fontWeight: '700' }}>
                  {idioma === 'es' ? '🇪🇸 ES → 🇬🇧 EN' : '🇬🇧 EN → 🇪🇸 ES'}
                </Text>
              </View>
            </Pressable>
          </View>
          <View style={{ position: 'absolute', bottom: 16, left: 20 }}>
            <Text style={{ color: '#F59E0B', fontSize: 11, fontWeight: '700' }}>KARIÑA · INDIGENOUS LANGUAGE</Text>
            <Text style={{ color: '#FFFFFF', fontSize: 22, fontWeight: '900', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 }}>
              {idioma === 'es' ? 'Menú Interactivo' : 'Interactive Menu'}
            </Text>
          </View>
        </View>

        {/* Bienvenida */}
        <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
          <Text style={{ fontSize: 16, color: '#1A2E1A', fontWeight: '700' }}>
            {idioma === 'es' ? `¡Bienvenido, ${userName}! 👋` : `Welcome, ${userName}! 👋`}
          </Text>
          <Text style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
            {idioma === 'es' ? 'Aprende el idioma Kariña de forma divertida' : 'Learn the Kariña language in a fun way'}
          </Text>
        </View>

        {/* Progreso + XP */}
        <View style={{ marginHorizontal: 20, marginTop: 14, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#F0EDE8' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#1A2E1A' }}>{idioma === 'es' ? 'Tu progreso' : 'Your progress'}</Text>
            <Text style={{ fontSize: 11, color: '#2E7D32', fontWeight: '700' }}>{completedCount} {idioma === 'es' ? 'de' : 'of'} {modulesCount} {idioma === 'es' ? 'módulos' : 'modules'}</Text>
          </View>
          <View style={{ height: 8, backgroundColor: '#E8F5E9', borderRadius: 4, marginTop: 8, overflow: 'hidden' }}>
            <View style={{ width: `${progressPercent}%`, height: '100%', backgroundColor: '#2E7D32', borderRadius: 4 }} />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
            <Text style={{ fontSize: 11, color: '#888' }}>{Math.round(progressPercent)}% {idioma === 'es' ? 'completado' : 'completed'}</Text>
            <Text style={{ fontSize: 11, color: '#1565C0', fontWeight: '700' }}>⭐ {totalXp} XP</Text>
          </View>
        </View>

        {/* ¿Sabías que? con imágenes indígenas */}
        <SabiasQueRotativo />

        {/* Mascota tortuga guía */}
        <MascotaTortuga />

        {/* Accesos rápidos */}
        <Text style={{ fontSize: 16, fontWeight: '800', color: '#1A2E1A', marginHorizontal: 20, marginTop: 24, marginBottom: 10 }}>
          📚 {idioma === 'es' ? 'Áreas de repaso' : 'Review areas'}
        </Text>

        <View style={{ paddingHorizontal: 20, gap: 10, paddingBottom: 12 }}>
          {/* Audio repaso */}
          <Pressable onPress={() => router.push('/(app)/audios')}>
            <View style={{ backgroundColor: '#FFF', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: '#F0EDE8' }}>
              <View style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: '#FFF3E0', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 24 }}>🔊</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '800', color: '#1A2E1A' }}>{idioma === 'es' ? 'Audios de repaso' : 'Audio review'}</Text>
                <Text style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{idioma === 'es' ? 'Escucha todas las palabras en Kariña' : 'Listen to all Kariña words'}</Text>
              </View>
              <Text style={{ fontSize: 20, color: '#F59E0B' }}>→</Text>
            </View>
          </Pressable>

          {/* Diccionario */}
          <Pressable onPress={() => router.push('/(app)/(tabs)/diccionario')}>
            <View style={{ backgroundColor: '#FFF', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: '#F0EDE8' }}>
              <View style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: '#E8F5E9', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 24 }}>📖</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '800', color: '#1A2E1A' }}>{idioma === 'es' ? 'Diccionario de repaso' : 'Review dictionary'}</Text>
                <Text style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{idioma === 'es' ? 'Busca cualquier palabra Kariña o español' : 'Search any Kariña or Spanish word'}</Text>
              </View>
              <Text style={{ fontSize: 20, color: '#2E7D32' }}>→</Text>
            </View>
          </Pressable>

          {/* Juegos */}
          <Pressable onPress={() => router.push('/(app)/(tabs)/juegos')}>
            <View style={{ backgroundColor: '#FFF', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: '#F0EDE8' }}>
              <View style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: '#E3F2FD', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 24 }}>🎮</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '800', color: '#1A2E1A' }}>{idioma === 'es' ? 'Juegos de repaso' : 'Review games'}</Text>
                <Text style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{idioma === 'es' ? 'Practica con 3 juegos divertidos' : 'Practice with 3 fun games'}</Text>
              </View>
              <Text style={{ fontSize: 20, color: '#1565C0' }}>→</Text>
            </View>
          </Pressable>
        </View>

        {/* Espacio inferior */}
        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
