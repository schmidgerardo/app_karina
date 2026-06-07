import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

const JUEGOS = [
  {
    id: 'unir_palabras',
    titulo: 'Une las palabras',
    descripcion: 'Empareja palabras Kariña con su traducción en español',
    emoji: '🔗',
    color: '#2E7D32',
    dificultad: 'Fácil',
  },
  {
    id: 'audio_opciones',
    titulo: 'Escucha y elige',
    descripcion: 'Escucha el audio en Kariña y selecciona la respuesta correcta entre A, B y C',
    emoji: '🎧',
    color: '#1565C0',
    dificultad: 'Medio',
  },
  {
    id: 'dictado',
    titulo: 'Dictado Kariña',
    descripcion: 'Escucha el audio y escribe la palabra Kariña que escuchaste',
    emoji: '✍️',
    color: '#E65100',
    dificultad: 'Difícil',
  },
];

export default function JuegosScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F9F6F0' }} edges={['top']}>
      {/* Header */}
      <View style={{ backgroundColor: '#1B5E20', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 }}>
        <Text style={{ color: '#F59E0B', fontSize: 11, fontWeight: '700' }}>KARIÑA · DIVERSIÓN</Text>
        <Text style={{ color: '#FFFFFF', fontSize: 24, fontWeight: '900', marginTop: 4 }}>Juegos</Text>
        <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 4 }}>Aprende jugando con 3 desafíos</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 30 }} showsVerticalScrollIndicator={false}>
        <Text style={{ fontSize: 13, color: '#888', marginBottom: 16, fontStyle: 'italic' }}>
          Elige un juego para poner a prueba tu conocimiento del Kariña
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
                    <Text style={{ fontSize: 16, fontWeight: '800', color: '#1A2E1A' }}>{juego.titulo}</Text>
                    <View
                      style={{
                        backgroundColor:
                          juego.dificultad === 'Fácil'
                            ? '#E8F5E9'
                            : juego.dificultad === 'Medio'
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
                            juego.dificultad === 'Fácil'
                              ? '#2E7D32'
                              : juego.dificultad === 'Medio'
                                ? '#E65100'
                                : '#C62828',
                        }}
                      >
                        {juego.dificultad}
                      </Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 12, color: '#666', lineHeight: 17 }}>{juego.descripcion}</Text>
                </View>
                <Text style={{ fontSize: 20, color: juego.color }}>→</Text>
              </View>
            </View>
          </Pressable>
        ))}

        {/* Próximamente */}
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
            <Text style={{ color: '#F59E0B', fontSize: 12, fontWeight: '800', marginBottom: 4 }}>Más juegos pronto</Text>
            <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, lineHeight: 18 }}>
              Estamos preparando nuevos desafíos para que sigas aprendiendo el idioma Kariña de forma divertida.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
