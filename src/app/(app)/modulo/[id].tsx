import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/client/supabase';

interface Word {
  id: string;
  palabra_karina: string;
  significado_espanol: string;
}

interface Module {
  id: number;
  titulo?: string;
  titulo_karina?: string;
  imagen_url?: string;
  color?: string | null;
  descripcion?: string;
}

export default function ModuloDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [module, setModule] = useState<Module | null>(null);
  const [words, setWords] = useState<Word[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [id])
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
      .select('id, palabra_karina, significado_espanol')
      .eq('module_id', moduleId)
      .order('palabra_karina');

    if (wordsData) {
      setWords(wordsData as Word[]);
    }

    setLoading(false);
  }

  if (loading || !module) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F9F6F0', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#1B5E20" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F9F6F0' }} edges={['top']}>
      {/* Header */}
      <View style={{ backgroundColor: '#F59E0B', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 20 }}>
        <Pressable onPress={() => router.back()} style={{ marginBottom: 12, alignSelf: 'flex-start' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 }}>
            <Text style={{ color: '#FFFFFF', fontSize: 16 }}>←</Text>
            <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '600' }}>Menú</Text>
          </View>
        </Pressable>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Image source={{ uri: module.imagen_url }} style={{ width: 70, height: 70, borderRadius: 12 }} contentFit="cover" />
          <View style={{ flex: 1 }}>
            <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '700' }}>{module.titulo_karina}</Text>
            <Text style={{ color: '#FFFFFF', fontSize: 20, fontWeight: '900' }}>{module.titulo}</Text>
            <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 2 }}>{module.descripcion}</Text>
          </View>
        </View>
        {/* Botón practicar */}
        <Pressable onPress={() => router.push(`/(app)/practica/${module.id}`)} style={{ marginTop: 14 }}>
          <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' }}>
            <Text style={{ fontSize: 20 }}>🎯</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '800' }}>Practicar este módulo</Text>
              <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11 }}>3 ejercicios · Empareja, dictado y opciones</Text>
            </View>
            <Text style={{ color: '#FFFFFF', fontSize: 18 }}>→</Text>
          </View>
        </Pressable>
      </View>

      {/* Lista de palabras */}
      <FlatList
        data={words}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 20, paddingBottom: 30 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#1A2E1A' }}>Palabras del módulo</Text>
            <View style={{ backgroundColor: `${module.color || '#1B5E20'}18`, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 5 }}>
              <Text style={{ fontSize: 11, color: module.color || '#1B5E20', fontWeight: '700' }}>{words.length} palabras</Text>
            </View>
          </View>
        }
        renderItem={({ item, index }) => (
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 14,
              padding: 14,
              marginBottom: 10,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              borderWidth: 1,
              borderColor: '#F0EDE8',
            }}
          >
            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: `${module.color}18`, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 14, fontWeight: '800', color: module.color }}>{index + 1}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: '#1A2E1A' }}>{item.palabra_karina}</Text>
              <Text style={{ fontSize: 12, color: '#666', marginTop: 2 }}>{item.significado_espanol}</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingVertical: 40 }}>
            <Text style={{ fontSize: 32 }}>📚</Text>
            <Text style={{ fontSize: 14, color: '#888', marginTop: 8 }}>Próximamente más palabras</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}
