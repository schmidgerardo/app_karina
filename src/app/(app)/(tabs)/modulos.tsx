import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, FlatList, Pressable, Text, View, Easing } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { supabase } from '@/client/supabase';
import { useSession } from '@/ctx';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '@/context/LanguageContext';

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
  modulo_id: number;
  completed: boolean;
}

export default function ModulosScreen() {
  const router = useRouter();
  const { session } = useSession();
  const { t } = useTranslation();
  const { language } = useLanguage();
  const [modules, setModules] = useState<Module[]>([]);
  const [progress, setProgress] = useState<ProgressItem[]>([]);
  const [loading, setLoading] = useState(true);

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
        .select('modulo_id, completed')
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
      <FlatList
        data={modules}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ paddingBottom: 30 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            {/* Header con gradiente */}
            <LinearGradient
              colors={['#1B5E20', '#2E7D32']}
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
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ backgroundColor: 'rgba(255,255,255,0.1)', padding: 10, borderRadius: 50 }}>
                  <Text style={{ fontSize: 28 }}>📚</Text>
                </View>
                <View>
                  <Text style={{ color: '#F59E0B', fontSize: 11, fontWeight: '700', letterSpacing: 1 }}>
                    KARIÑA · {t('nav.modules').toUpperCase()}
                  </Text>
                  <Text style={{ color: '#FFFFFF', fontSize: 28, fontWeight: '900', marginTop: 2, textShadowColor: 'rgba(0,0,0,0.2)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 }}>
                    {t('nav.modules')}
                  </Text>
                  <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 4 }}>
                    {t('modules.subtitle')}
                  </Text>
                </View>
              </View>
            </LinearGradient>

            {/* Subtítulo */}
            <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="book-outline" size={18} color="#F59E0B" />
                <Text style={{ fontSize: 13, color: '#888', fontStyle: 'italic' }}>
                  {t('modules.select')}
                </Text>
              </View>
            </View>
          </Animated.View>
        }
        renderItem={({ item, index }) => {
          const modProgress = progress.find((p) => p.modulo_id === item.id);
          return (
            <Animated.View
              style={{
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
                paddingHorizontal: 20,
                marginBottom: 8,
              }}
            >
              <ModuloItem 
                item={item} 
                isCompleted={modProgress?.completed || false} 
                index={index}
              />
            </Animated.View>
          );
        }}
      />
    </SafeAreaView>
  );
}

function ModuloItem({ item, isCompleted, index }: { item: Module; isCompleted: boolean; index: number }) {
  const scale = useRef(new Animated.Value(1)).current;
  const router = useRouter();
  const { t } = useTranslation();
  const { language } = useLanguage();

  const titulo = language === 'es' ? item.titulo_espanol : item.titulo_ingles;
  const desc = language === 'es' ? item.descripcion : item.descripcion_ingles;

  return (
    <View style={{ marginBottom: 14 }}>
      <Pressable
        onPress={() => router.push(`/(app)/modulo/${item.id}`)}
        onPressIn={() => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true }).start()}
        onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start()}
      >
        <Animated.View style={{ transform: [{ scale }] }}>
          <LinearGradient
            colors={['#FFFFFF', '#F9F6F0']}
            style={{
              borderRadius: 20,
              overflow: 'hidden',
              borderWidth: 1,
              borderColor: isCompleted ? '#2E7D32' : '#F0EDE8',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.06,
              shadowRadius: 10,
              elevation: 4,
            }}
          >
            <Image source={{ uri: item.imagen_url }} style={{ width: '100%', height: 160 }} contentFit="cover" />
            <View style={{ padding: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ fontSize: 16, fontWeight: '800', color: '#1A2E1A', flex: 1 }}>
                      {titulo}
                    </Text>
                    {isCompleted && (
                      <View style={{ backgroundColor: '#E8F5E9', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4 }}>
                        <Text style={{ fontSize: 12 }}>✅</Text>
                      </View>
                    )}
                  </View>
                  <Text style={{ fontSize: 11, color: '#F59E0B', fontWeight: '700', marginTop: 2 }}>
                    {item.titulo_karina}
                  </Text>
                </View>
              </View>
              <Text style={{ fontSize: 12, color: '#666', lineHeight: 17, marginTop: 6 }}>
                {desc}
              </Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Ionicons name="book-outline" size={14} color="#888" />
                  <Text style={{ fontSize: 11, color: '#888' }}>8 {language === 'es' ? 'palabras' : 'words'}</Text>
                </View>
                <LinearGradient
                  colors={isCompleted ? ['#E8F5E9', '#C8E6C9'] : ['#F59E0B', '#F97316']}
                  style={{
                    borderRadius: 12,
                    paddingHorizontal: 14,
                    paddingVertical: 6,
                  }}
                >
                  <Text style={{ color: isCompleted ? '#2E7D32' : '#FFF', fontSize: 11, fontWeight: '700' }}>
                    {isCompleted ? '✅ ' + (language === 'es' ? 'Listo' : 'Done') : (language === 'es' ? 'Explorar →' : 'Explore →')}
                  </Text>
                </LinearGradient>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>
      </Pressable>

      {/* Botón de práctica mejorado */}
      <Pressable
        onPress={() => router.push({
          pathname: '/(app)/juego/unir',
          params: { modulo_id: item.id },
        })}
        style={{ marginTop: 8 }}
      >
        <LinearGradient
          colors={isCompleted ? ['#E8F5E9', '#C8E6C9'] : ['#FFF3E0', '#FFE0B2']}
          style={{
            borderRadius: 12,
            paddingVertical: 10,
            paddingHorizontal: 16,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            alignSelf: 'flex-start',
          }}
        >
          <Text style={{ fontSize: 16 }}>{isCompleted ? '🔄' : '🎯'}</Text>
          <Text style={{ fontSize: 13, fontWeight: '700', color: isCompleted ? '#2E7D32' : '#E65100' }}>
            {isCompleted
              ? (language === 'es' ? 'Practicar de nuevo' : 'Practice again')
              : (language === 'es' ? 'Practicar módulo' : 'Practice module')}
          </Text>
          <Ionicons 
            name="chevron-forward" 
            size={16} 
            color={isCompleted ? '#2E7D32' : '#E65100'} 
          />
        </LinearGradient>
      </Pressable>
    </View>
  );
}