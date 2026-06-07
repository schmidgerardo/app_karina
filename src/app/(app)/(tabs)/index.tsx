import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/client/supabase';
import { useSession } from '@/ctx';

const HEADER_IMAGE =
  'https://miaoda-conversation-file.s3cdn.medo.dev/user-c6js8p49d4ao/app-c6jsx92bbkld/20260607/1000861193.jpg';

interface Module {
  id: number;
  titulo_espanol: string;
  titulo_karina: string;
  emoji: string;
  color: string;
  descripcion: string;
}

interface ProgressItem {
  module_id: number;
  completed: boolean;
  xp: number;
}

const HISTORIAS = [
  {
    titulo: 'Orígenes del Pueblo Kariña',
    texto: 'Los Kariña, también conocidos como Caribes, han habitado las tierras del Estado Bolívar, Venezuela, por siglos. Su nombre significa "el pueblo" y han preservado su lengua y cultura a través de generaciones.',
    emoji: '🌳',
    color: '#2E7D32',
  },
  {
    titulo: 'Los Tepuyes y la Naturaleza',
    texto: 'El territorio Kariña está rodeado de tepuyes y selva amazónica. Para ellos, cada montaña y río tiene un espíritu protector. Su cosmovisión enseña a respetar la Madre Tierra como fuente de vida.',
    emoji: '⛰️',
    color: '#1565C0',
  },
  {
    titulo: 'La Lengua Kariña Hoy',
    texto: 'El idioma Kariña es una lengua caribe que ha sobrevivido pese a los siglos de colonización. Hoy, comunidades enteras trabajan para enseñarlo a las nuevas generaciones y evitar su extinción.',
    emoji: '🗣️',
    color: '#BF360C',
  },
  {
    titulo: 'Tradiciones y Celebraciones',
    texto: 'Los Kariña celebran la cosecha, la pesca y los ciclos de la luna con danzas, cantos y rituales. La chicha de yuca y el cazabe son elementos centrales de su gastronomía tradicional.',
    emoji: '🎉',
    color: '#E65100',
  },
  {
    titulo: 'Arte y Artesanía',
    texto: 'Los artesanos Kariña elaboran cestas, hamacas y cerámica con técnicas transmitidas de abuela a nieta. Cada pieza lleva consigo historias y símbolos de su cosmogonía ancestral.',
    emoji: '🧺',
    color: '#6A1B9A',
  },
];

function HistoriaRotativa() {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setIdx((prev) => (prev + 1) % HISTORIAS.length);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  const h = HISTORIAS[idx];

  return (
    <View style={{ marginHorizontal: 20, marginTop: 20 }}>
      <Text style={{ fontSize: 14, fontWeight: '800', color: '#1A2E1A', marginBottom: 10 }}>
        📖 Historia de la comunidad
      </Text>
      <View
        style={{
          backgroundColor: h.color,
          borderRadius: 18,
          padding: 18,
          overflow: 'hidden',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <Text style={{ fontSize: 28 }}>{h.emoji}</Text>
          <Text style={{ fontSize: 15, fontWeight: '800', color: '#FFFFFF', flex: 1 }}>{h.titulo}</Text>
        </View>
        <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.9)', lineHeight: 20 }}>{h.texto}</Text>
        {/* Indicadores */}
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 14, justifyContent: 'center' }}>
          {HISTORIAS.map((_, i) => (
            <View
              key={i}
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: i === idx ? '#FFFFFF' : 'rgba(255,255,255,0.4)',
              }}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { session } = useSession();
  const [modules, setModules] = useState<Module[]>([]);
  const [progress, setProgress] = useState<ProgressItem[]>([]);
  const [totalXp, setTotalXp] = useState(0);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  async function loadData() {
    setLoading(true);

    const { data: modData } = await supabase
      .from('modules')
      .select('*')
      .order('orden', { ascending: true });

    if (modData) {
      setModules(modData as Module[]);
    }

    if (session?.user?.id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('nombre, username')
        .eq('id', session.user.id)
        .single();
      if (profile) {
        setUserName(profile.nombre || profile.username || 'Usuario');
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

  const completedCount = progress.filter((p) => p.completed).length;
  const progressPercent = modules.length > 0 ? (completedCount / modules.length) * 100 : 0;

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
              bottom: 0,
              left: 0,
              right: 0,
              height: 80,
              backgroundColor: 'transparent',
            }}
          />
          <View style={{ position: 'absolute', bottom: 16, left: 20 }}>
            <Text style={{ color: '#F59E0B', fontSize: 11, fontWeight: '700' }}>KARIÑA · IDIOMA INDÍGENA</Text>
            <Text style={{ color: '#FFFFFF', fontSize: 22, fontWeight: '900', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 }}>
              Menú Interactivo
            </Text>
          </View>
        </View>

        {/* Bienvenida */}
        <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
          <Text style={{ fontSize: 16, color: '#1A2E1A', fontWeight: '700' }}>
            ¡Bienvenido, {userName}! 👋
          </Text>
          <Text style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
            Elige un módulo para comenzar tu aprendizaje del idioma Kariña
          </Text>
        </View>

        {/* Progreso + XP */}
        <View style={{ marginHorizontal: 20, marginTop: 14, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#F0EDE8' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#1A2E1A' }}>Tu progreso</Text>
            <Text style={{ fontSize: 11, color: '#2E7D32', fontWeight: '700' }}>{completedCount} de {modules.length} módulos</Text>
          </View>
          <View style={{ height: 8, backgroundColor: '#E8F5E9', borderRadius: 4, marginTop: 8, overflow: 'hidden' }}>
            <View style={{ width: `${progressPercent}%`, height: '100%', backgroundColor: '#2E7D32', borderRadius: 4 }} />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
            <Text style={{ fontSize: 11, color: '#888' }}>{Math.round(progressPercent)}% completado</Text>
            <Text style={{ fontSize: 11, color: '#1565C0', fontWeight: '700' }}>⭐ {totalXp} XP</Text>
          </View>
        </View>

        {/* Pronunciación destacada */}
        <Pressable onPress={() => router.push('/(app)/pronunciacion')} style={{ marginHorizontal: 20, marginTop: 16 }}>
          <View
            style={{
              backgroundColor: '#1565C0',
              borderRadius: 16,
              padding: 16,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <View
              style={{
                width: 50,
                height: 50,
                borderRadius: 25,
                backgroundColor: 'rgba(255,255,255,0.2)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 24 }}>🗣️</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: '800', color: '#FFFFFF' }}>Pronunciación con Audio</Text>
              <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 2 }}>
                Escucha 4 palabras auténticas en idioma Kariña
              </Text>
            </View>
            <Text style={{ fontSize: 20, color: '#FFFFFF' }}>→</Text>
          </View>
        </Pressable>

        {/* Módulos destacados (carrusel horizontal) */}
        <Text style={{ fontSize: 14, fontWeight: '800', color: '#1A2E1A', marginHorizontal: 20, marginTop: 20, marginBottom: 10 }}>
          Módulos destacados
        </Text>
        <FlatList
          data={modules.slice(0, 4)}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ paddingHorizontal: 20 }}
          renderItem={({ item }) => (
            <Pressable onPress={() => router.push(`/(app)/modulo/${item.id}`)} style={{ marginRight: 12 }}>
              <View
                style={{
                  width: 160,
                  backgroundColor: item.color,
                  borderRadius: 16,
                  padding: 16,
                  height: 140,
                  justifyContent: 'space-between',
                }}
              >
                <Text style={{ fontSize: 28 }}>{item.emoji}</Text>
                <View>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#FFFFFF' }}>{item.titulo_espanol}</Text>
                  <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.8)', marginTop: 2 }}>{item.titulo_karina}</Text>
                </View>
              </View>
            </Pressable>
          )}
        />

        {/* Historia de la comunidad indígena */}
        <HistoriaRotativa />

        {/* Todos los módulos (grid) */}
        <Text style={{ fontSize: 14, fontWeight: '800', color: '#1A2E1A', marginHorizontal: 20, marginTop: 24, marginBottom: 10 }}>
          Todos los módulos
        </Text>
        <View style={{ paddingHorizontal: 20, paddingBottom: 30 }}>
          {modules.map((item) => {
            const modProgress = progress.find((p) => p.module_id === item.id);
            const isCompleted = modProgress?.completed || false;
            return (
              <Pressable
                key={item.id}
                onPress={() => router.push(`/(app)/modulo/${item.id}`)}
                style={{ marginBottom: 10 }}
              >
                <View
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: 14,
                    padding: 14,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    borderWidth: 1,
                    borderColor: isCompleted ? '#2E7D32' : '#F0EDE8',
                  }}
                >
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      backgroundColor: isCompleted ? '#E8F5E9' : `${item.color}18`,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 22 }}>{isCompleted ? '🏅' : item.emoji}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={{ fontSize: 14, fontWeight: '800', color: '#1A2E1A' }}>{item.titulo_espanol}</Text>
                      {isCompleted && (
                        <View style={{ backgroundColor: '#2E7D32', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 }}>
                          <Text style={{ fontSize: 9, color: '#FFF', fontWeight: '700' }}>✓ LISTO</Text>
                        </View>
                      )}
                    </View>
                    <Text style={{ fontSize: 10, color: item.color, fontWeight: '700', marginTop: 1 }}>{item.titulo_karina}</Text>
                    <Text style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{item.descripcion}</Text>
                  </View>
                  <Text style={{ fontSize: 18, color: item.color }}>→</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
