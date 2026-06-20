import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Animated, FlatList, Pressable, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { supabase } from '@/client/supabase';
import { useSession } from '@/ctx';

interface Module {
  id: number;
  titulo_espanol: string;
  titulo_karina: string;
  titulo_ingles: string;
  descripcion: string;
  descripcion_ingles: string;
  imagen_url: string;
  color: string;
}

interface ProgressItem {
  module_id: number;
  completed: boolean;
}

export default function ModulosScreen() {
  const router = useRouter();
  const { session } = useSession();
  const [modules, setModules] = useState<Module[]>([]);
  const [progress, setProgress] = useState<ProgressItem[]>([]);
  const [idioma, setIdioma] = useState('es');
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      loadModules();
    }, [])
  );

  async function loadModules() {
    setLoading(true);
    const { data } = await supabase.from('modules').select('*').order('orden', { ascending: true });
    if (data) setModules(data as Module[]);

    if (session?.user?.id) {
      const [{ data: progData }, { data: profile }] = await Promise.all([
        supabase.from('module_progress').select('module_id, completed').eq('user_id', session.user.id),
        supabase.from('profiles').select('idioma').eq('id', session.user.id).single(),
      ]);
      if (progData) setProgress(progData as ProgressItem[]);
      if (profile?.idioma) setIdioma(profile.idioma);
    }

    setLoading(false);
  }

  async function toggleIdioma() {
    if (!session?.user?.id) return;
    const nuevo = idioma === 'es' ? 'en' : 'es';
    await supabase.from('profiles').update({ idioma: nuevo }).eq('id', session.user.id);
    setIdioma(nuevo);
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
      {/* Header */}
      <View style={{ backgroundColor: '#1B5E20', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View>
            <Text style={{ color: '#F59E0B', fontSize: 11, fontWeight: '700' }}>KARIÑA · IDIOMA INDÍGENA</Text>
            <Text style={{ color: '#FFFFFF', fontSize: 24, fontWeight: '900', marginTop: 4 }}>{idioma === 'es' ? '10 Módulos' : '10 Modules'}</Text>
          </View>
          <Pressable onPress={toggleIdioma}>
            <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 }}>
              <Text style={{ color: '#FFF', fontSize: 13, fontWeight: '700' }}>
                {idioma === 'es' ? '🇪🇸 ES → 🇬🇧 EN' : '🇬🇧 EN → 🇪🇸 ES'}
              </Text>
            </View>
          </Pressable>
        </View>
        <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 4 }}>
          {idioma === 'es' ? 'Aprende paso a paso el idioma Kariña' : 'Learn the Kariña language step by step'}
        </Text>
      </View>

      <FlatList
        data={modules}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: 20 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <Text style={{ fontSize: 13, color: '#888', marginBottom: 16, fontStyle: 'italic' }}>
            {idioma === 'es' ? 'Selecciona un módulo para explorar o practicar' : 'Select a module to explore or practice'}
          </Text>
        }
        renderItem={({ item }) => {
          const modProgress = progress.find((p) => p.module_id === item.id);
          return <ModuloItem item={item} isCompleted={modProgress?.completed || false} idioma={idioma} />;
        }}
      />
    </SafeAreaView>
  );
}

function ModuloItem({ item, isCompleted, idioma }: { item: Module; isCompleted: boolean; idioma: string }) {
  const scale = useRef(new Animated.Value(1)).current;
  const router = useRouter();
  const titulo = idioma === 'es' ? item.titulo_espanol : item.titulo_ingles;
  const desc = idioma === 'es' ? item.descripcion : item.descripcion_ingles;

  return (
    <View style={{ marginBottom: 14 }}>
      <Pressable
        onPress={() => router.push(`/(app)/modulo/${item.id}`)}
        onPressIn={() => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true }).start()}
        onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start()}
      >
        <Animated.View style={{ transform: [{ scale }] }}>
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 16,
              overflow: 'hidden',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              borderWidth: 1,
              borderColor: isCompleted ? '#2E7D32' : '#F0EDE8',
            }}
          >
            <Image source={{ uri: item.imagen_url }} style={{ width: '100%', height: 140 }} contentFit="cover" />
            <View style={{ padding: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 14, fontWeight: '800', color: '#1A2E1A', flex: 1 }}>{titulo}</Text>
                {isCompleted && (
                  <View style={{ backgroundColor: '#E8F5E9', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                    <Text style={{ fontSize: 10, color: '#2E7D32', fontWeight: '700' }}>✅</Text>
                  </View>
                )}
              </View>
              <Text style={{ fontSize: 10, color: '#F59E0B', fontWeight: '700', marginTop: 2 }}>{item.titulo_karina}</Text>
              <Text style={{ fontSize: 11, color: '#666', lineHeight: 15, marginTop: 4 }}>{desc}</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                <Text style={{ fontSize: 10, color: '#888' }}>8 {idioma === 'es' ? 'palabras' : 'words'}</Text>
                <View style={{ backgroundColor: isCompleted ? '#E8F5E9' : '#F59E0B', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 }}>
                  <Text style={{ color: isCompleted ? '#2E7D32' : '#FFF', fontSize: 10, fontWeight: '700' }}>
                    {isCompleted ? (idioma === 'es' ? '✅ Listo' : '✅ Done') : (idioma === 'es' ? 'Explorar →' : 'Explore →')}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </Animated.View>
      </Pressable>

      {/* Botón de práctica */}
      <Pressable onPress={() => router.push(`/(app)/practica/${item.id}`)} style={{ marginTop: 8 }}>
        <View
          style={{
            backgroundColor: isCompleted ? '#E8F5E9' : '#FFF3E0',
            borderRadius: 10,
            paddingVertical: 8,
            paddingHorizontal: 14,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            alignSelf: 'flex-start',
          }}
        >
          <Text style={{ fontSize: 14 }}>{isCompleted ? '🔄' : '🎯'}</Text>
          <Text style={{ fontSize: 12, fontWeight: '700', color: isCompleted ? '#2E7D32' : '#F59E0B' }}>
            {isCompleted
              ? (idioma === 'es' ? 'Practicar de nuevo' : 'Practice again')
              : (idioma === 'es' ? 'Practicar módulo' : 'Practice module')}
          </Text>
        </View>
      </Pressable>
    </View>
  );
}
