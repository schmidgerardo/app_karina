import { useCallback, useState } from 'react';
import { ActivityIndicator, Animated, FlatList, Pressable, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { useRef } from 'react';
import { supabase } from '@/client/supabase';

interface Module {
  id: number;
  titulo_espanol: string;
  titulo_karina: string;
  emoji: string;
  color: string;
  descripcion: string;
}

export default function ModulosScreen() {
  const router = useRouter();
  const [modules, setModules] = useState<Module[]>([]);
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
            Selecciona un módulo para explorar su contenido
          </Text>
        }
        renderItem={({ item }) => <ModuloItem item={item} />}
      />
    </SafeAreaView>
  );
}

function ModuloItem({ item }: { item: Module }) {
  const scale = useRef(new Animated.Value(1)).current;
  const router = useRouter();

  return (
    <Pressable
      onPress={() => router.push(`/(app)/modulo/${item.id}`)}
      onPressIn={() => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true }).start()}
      onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start()}
    >
      <Animated.View style={{ transform: [{ scale }], marginBottom: 14 }}>
        <View
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 16,
            overflow: 'hidden',
            flexDirection: 'row',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            borderWidth: 1,
            borderColor: '#F0EDE8',
          }}
        >
          <View style={{ width: 90, height: 100, backgroundColor: item.color, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 36 }}>{item.emoji}</Text>
          </View>
          <View style={{ flex: 1, padding: 12, justifyContent: 'space-between' }}>
            <View>
              <Text style={{ fontSize: 14, fontWeight: '800', color: '#1A2E1A' }}>{item.titulo_espanol}</Text>
              <Text style={{ fontSize: 10, color: item.color, fontWeight: '700', marginTop: 1, marginBottom: 4 }}>{item.titulo_karina}</Text>
              <Text style={{ fontSize: 11, color: '#666', lineHeight: 15 }}>{item.descripcion}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
              <Text style={{ fontSize: 10, color: '#888' }}>8 palabras</Text>
              <View style={{ backgroundColor: item.color, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 }}>
                <Text style={{ color: '#FFF', fontSize: 10, fontWeight: '700' }}>Explorar →</Text>
              </View>
            </View>
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
}
