import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next'; // 👈 Importar

export default function JuegosScreen() {
  const router = useRouter();
  const { t } = useTranslation(); // 👈 Inicializar

  // Definición de juegos dentro del componente para acceder a t()
  const JUEGOS = [
    {
      id: 'unir',
      titulo: t('unir.title'),
      descripcion: t('unir.instructions'),
      emoji: '🔗',
      color: '#2E7D32',
      dificultad: t('common.easy') || 'Fácil',
    },
    {
      id: 'opciones',
      titulo: t('opciones.title'),
      descripcion: t('opciones.instructions'),
      emoji: '🎧',
      color: '#1565C0',
      dificultad: t('common.medium') || 'Medio',
    },
    {
      id: 'dictado',
      titulo: t('dictado.title'),
      descripcion: t('dictado.instructions'),
      emoji: '✍️',
      color: '#E65100',
      dificultad: t('common.hard') || 'Difícil',
    },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F9F6F0' }} edges={['top']}>
      {/* Header traducido */}
      <View style={{ backgroundColor: '#1B5E20', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 }}>
        <Text style={{ color: '#F59E0B', fontSize: 11, fontWeight: '700' }}>
          KARIÑA · {t('nav.games').toUpperCase()}
        </Text>
        <Text style={{ color: '#FFFFFF', fontSize: 24, fontWeight: '900', marginTop: 4 }}>
          {t('nav.games')}
        </Text>
        <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 4 }}>
          {t('modules.subtitle')}
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 30 }} showsVerticalScrollIndicator={false}>
        <Text style={{ fontSize: 13, color: '#888', marginBottom: 16, fontStyle: 'italic' }}>
          {t('modules.select')}
        </Text>

        {JUEGOS.map((juego) => (
          <Pressable key={juego.id} onPress={() => router.push(`/(app)/juego/${juego.id}` as any)}>
            <View
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 18,
                padding: 18,
                marginBottom: 14,
                borderWidth: 1,
                borderColor: '#F0EDE8',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 16,
                    backgroundColor: `${juego.color}18`,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: 28 }}>{juego.emoji}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 }}>
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
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 10,
                          fontWeight: '700',
                          color:
                            juego.dificultad === (t('common.easy') || 'Fácil')
                              ? '#2E7D32'
                              : juego.dificultad === (t('common.medium') || 'Medio')
                                ? '#E65100'
                                : '#C62828',
                        }}
                      >
                        {juego.dificultad}
                      </Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 12, color: '#666', lineHeight: 17 }}>
                    {juego.descripcion}
                  </Text>
                </View>
                <Text style={{ fontSize: 20, color: juego.color }}>→</Text>
              </View>
            </View>
          </Pressable>
        ))}

        {/* Sección "Próximamente" traducida */}
        <View
          style={{
            backgroundColor: '#1B5E20',
            borderRadius: 16,
            padding: 16,
            marginTop: 8,
            flexDirection: 'row',
            gap: 12,
            alignItems: 'flex-start',
          }}
        >
          <Text style={{ fontSize: 28 }}>🎮</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#F59E0B', fontSize: 12, fontWeight: '800', marginBottom: 4 }}>
              {t('common.coming_soon')}
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, lineHeight: 18 }}>
              {t('common.more_games')}
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}