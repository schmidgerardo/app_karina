import { useState, useEffect, useRef } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View, Animated, Easing } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

export default function JuegosScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  // Animación de entrada
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
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
  }, []);

  // Definición de juegos dentro del componente para acceder a t()
  const JUEGOS = [
    {
      id: 'unir',
      titulo: t('unir.title'),
      descripcion: t('unir.instructions'),
      icon: 'link-outline',
      color: '#2E7D32',
      bgColor: '#E8F5E9',
      dificultad: t('common.easy') || 'Fácil',
    },
    {
      id: 'opciones',
      titulo: t('opciones.title'),
      descripcion: t('opciones.instructions'),
      icon: 'headset-outline',
      color: '#1565C0',
      bgColor: '#E3F2FD',
      dificultad: t('common.medium') || 'Medio',
    },
    {
      id: 'dictado',
      titulo: t('dictado.title'),
      descripcion: t('dictado.instructions'),
      icon: 'create-outline',
      color: '#E65100',
      bgColor: '#FFF3E0',
      dificultad: t('common.hard') || 'Difícil',
    },
  ];

  // Función para obtener el icono de dificultad
  const getDifficultyIcon = (dificultad: string) => {
    if (dificultad === (t('common.easy') || 'Fácil')) {
      return 'leaf-outline';
    } else if (dificultad === (t('common.medium') || 'Medio')) {
      return 'water-outline';
    } else {
      return 'flame-outline';
    }
  };

  // Función para obtener el color del icono de dificultad
  const getDifficultyIconColor = (dificultad: string) => {
    if (dificultad === (t('common.easy') || 'Fácil')) {
      return '#2E7D32';
    } else if (dificultad === (t('common.medium') || 'Medio')) {
      return '#1565C0';
    } else {
      return '#C62828';
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F9F6F0' }} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
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
              <View style={{ 
                backgroundColor: 'rgba(255,255,255,0.1)', 
                padding: 10, 
                borderRadius: 50,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.2)',
              }}>
                <Ionicons name="game-controller-outline" size={28} color="#F59E0B" />
              </View>
              <View>
                <Text style={{ color: '#F59E0B', fontSize: 11, fontWeight: '700', letterSpacing: 1 }}>
                  KARIÑA · {t('nav.games').toUpperCase()}
                </Text>
                <Text style={{ color: '#FFFFFF', fontSize: 28, fontWeight: '900', marginTop: 2, textShadowColor: 'rgba(0,0,0,0.2)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 }}>
                  {t('nav.games')}
                </Text>
                <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 4 }}>
                  {t('modules.subtitle')}
                </Text>
              </View>
            </View>
          </LinearGradient>

          {/* Contenido */}
          <View style={{ padding: 20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <Ionicons name="compass-outline" size={20} color="#F59E0B" />
              <Text style={{ fontSize: 14, color: '#888', fontStyle: 'italic' }}>
                {t('modules.select')}
              </Text>
            </View>

            {JUEGOS.map((juego, index) => (
              <Animated.View
                key={juego.id}
                style={{
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                }}
              >
                <Pressable onPress={() => router.push(`/(app)/juego/${juego.id}` as any)}>
                  <LinearGradient
                    colors={['#FFFFFF', juego.bgColor]}
                    style={{
                      borderRadius: 20,
                      padding: 18,
                      marginBottom: 14,
                      borderWidth: 1,
                      borderColor: '#F0EDE8',
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.06,
                      shadowRadius: 10,
                      elevation: 4,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                      <View
                        style={{
                          width: 60,
                          height: 60,
                          borderRadius: 18,
                          backgroundColor: `${juego.color}18`,
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderWidth: 1,
                          borderColor: `${juego.color}30`,
                        }}
                      >
                        <Ionicons name={juego.icon as any} size={30} color={juego.color} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <Text style={{ fontSize: 16, fontWeight: '800', color: '#1A2E1A' }}>
                            {juego.titulo}
                          </Text>
                          <View
                            style={{
                              backgroundColor:
                                juego.dificultad === (t('common.easy') || 'Fácil')
                                  ? '#E8F5E9'
                                  : juego.dificultad === (t('common.medium') || 'Medio')
                                    ? '#FFF3E0'
                                    : '#FFEBEE',
                              borderRadius: 8,
                              paddingHorizontal: 10,
                              paddingVertical: 3,
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            <Ionicons 
                              name={getDifficultyIcon(juego.dificultad)} 
                              size={12} 
                              color={getDifficultyIconColor(juego.dificultad)} 
                            />
                            <Text
                              style={{
                                fontSize: 10,
                                fontWeight: '700',
                                color: getDifficultyIconColor(juego.dificultad),
                              }}
                            >
                              {juego.dificultad}
                            </Text>
                          </View>
                        </View>
                        <Text style={{ fontSize: 12, color: '#666', lineHeight: 17, marginTop: 3 }}>
                          {juego.descripcion}
                        </Text>
                      </View>
                      <View style={{ backgroundColor: `${juego.color}15`, borderRadius: 30, padding: 6 }}>
                        <Ionicons name="chevron-forward" size={20} color={juego.color} />
                      </View>
                    </View>
                  </LinearGradient>
                </Pressable>
              </Animated.View>
            ))}

            {/* Sección "Próximamente" mejorada */}
            <LinearGradient
              colors={['#1B5E20', '#2E7D32']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                borderRadius: 20,
                padding: 18,
                marginTop: 8,
                flexDirection: 'row',
                gap: 14,
                alignItems: 'center',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 12,
                elevation: 6,
              }}
            >
              <View style={{ 
                backgroundColor: 'rgba(255,255,255,0.1)', 
                padding: 12, 
                borderRadius: 50,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.2)',
              }}>
                <Ionicons name="rocket-outline" size={28} color="#F59E0B" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#F59E0B', fontSize: 14, fontWeight: '800', marginBottom: 4 }}>
                  {t('common.coming_soon')}
                </Text>
                <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, lineHeight: 18 }}>
                  {t('common.more_games')}
                </Text>
              </View>
              <Ionicons name="hourglass-outline" size={24} color="#F59E0B" />
            </LinearGradient>
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}