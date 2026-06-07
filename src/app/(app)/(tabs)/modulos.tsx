import { useCallback, useState } from 'react';
import { ActivityIndicator, Animated, FlatList, Pressable, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { useRef } from 'react';
import { supabase } from '@/client/supabase';
import { useSession } from '@/ctx';

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
}

export default function ModulosScreen() {
  const router = useRouter();
  const { session } = useSession();
  const [modules, setModules] = useState<Module[]>([]);
  const [progress, setProgress] = useState<ProgressItem[]>([]);
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
      const { data: progData } = await supabase
        .from('module_progress')
        .select('module_id, completed')
        .eq('user_id', session.user.id);
      if (progData) setProgress(progData as ProgressItem[]);
    }

    setLoading(false);
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
        <Text style={{ color: '#F59E0B', fontSize: 11, fontWeight: '700' }}>KARIÑA · IDIOMA INDÍGENA</Text>
        <Text style={{ color: '#FFFFFF', fontSize: 24, fontWeight: '900', marginTop: 4 }}>10 Módulos</Text>
        <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 4 }}>Aprende paso a paso el idioma Kariña</Text>
      </View>

      <FlatList
        data={modules}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: 20 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <Text style={{ fontSize: 13, color: '#888', marginBottom: 16, fontStyle: 'italic' }}>
            Selecciona un módulo para explorar su contenido o practicar
          </Text>
        }
        renderItem={({ item }) => {
          const modProgress = progress.find((p) => p.module_id === item.id);
          return <ModuloItem item={item} isCompleted={modProgress?.completed || false} />;
        }}
      />
    </SafeAreaView>
  );
}

function ModuloItem({ item, isCompleted }: { item: Module; isCompleted: boolean }) {
  const scale = useRef(new Animated.Value(1)).current;
  const router = useRouter();

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
              flexDirection: 'row',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              borderWidth: 1,
              borderColor: isCompleted ? '#2E7D32' : '#F0EDE8',
            }}
          >
            <View style={{ width: 90, height: 120, backgroundColor: isCompleted ? '#2E7D32' : item.color, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 36 }}>{isCompleted ? '🏅' : item.emoji}</Text>
              {isCompleted && <Text style={{ fontSize: 10, color: '#FFF', fontWeight: '700', marginTop: 4 }}>COMPLETADO</Text>}
            </View>
            <View style={{ flex: 1, padding: 12, justifyContent: 'space-between' }}>
              <View>
                <Text style={{ fontSize: 14, fontWeight: '800', color: '#1A2E1A' }}>{item.titulo_espanol}</Text>
                <Text style={{ fontSize: 10, color: isCompleted ? '#2E7D32' : item.color, fontWeight: '700', marginTop: 1, marginBottom: 4 }}>{item.titulo_karina}</Text>
                <Text style={{ fontSize: 11, color: '#666', lineHeight: 15 }}>{item.descripcion}</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                <Text style={{ fontSize: 10, color: '#888' }}>8 palabras</Text>
                <View style={{ backgroundColor: isCompleted ? '#E8F5E9' : item.color, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 }}>
                  <Text style={{ color: isCompleted ? '#2E7D32' : '#FFF', fontSize: 10, fontWeight: '700' }}>
                    {isCompleted ? '✅ Listo' : 'Explorar →'}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </Animated.View>
      </Pressable>

      {/* Botón de práctica */}
      <Pressable onPress={() => router.push(`/(app)/practica/${item.id}`)} style={{ marginTop: 8, marginLeft: 90 }}>
        <View
          style={{
            backgroundColor: isCompleted ? '#E8F5E9' : `${item.color}18`,
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
          <Text style={{ fontSize: 12, fontWeight: '700', color: isCompleted ? '#2E7D32' : item.color }}>
            {isCompleted ? 'Practicar de nuevo' : 'Practicar módulo'}
          </Text>
        </View>
      </Pressable>
    </View>
  );
}
