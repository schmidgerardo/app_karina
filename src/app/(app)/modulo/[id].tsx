import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/client/supabase';

interface Word {
  id: string;
  palabra_karina: string;
  traduccion_espanol: string;
}

interface Module {
  id: number;
  titulo_espanol: string;
  titulo_karina: string;
  emoji: string;
  color: string;
  descripcion: string;
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
      .select('id, palabra_karina, traduccion_espanol')
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
      <View style={{ backgroundColor: module.color, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 20 }}>
        <Pressable onPress={() => router.back()} style={{ marginBottom: 12, alignSelf: 'flex-start' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 }}>
            <Text style={{ color: '#FFFFFF', fontSize: 16 }}>←</Text>
            <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '600' }}>Menú</Text>
          </View>
        </Pressable>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text style={{ fontSize: 40 }}>{module.emoji}</Text>
          <View>
            <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '700' }}>{module.titulo_karina}</Text>
            <Text style={{ color: '#FFFFFF', fontSize: 22, fontWeight: '900' }}>{module.titulo_espanol}</Text>
            <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 2 }}>{module.descripcion}</Text>
          </View>
        </View>
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
            <View style={{ backgroundColor: `${module.color}18`, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 5 }}>
              <Text style={{ fontSize: 11, color: module.color, fontWeight: '700' }}>{words.length} palabras</Text>
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
              <Text style={{ fontSize: 12, color: '#666', marginTop: 2 }}>{item.traduccion_espanol}</Text>
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
