import { useCallback, useRef, useState, Suspense, lazy } from 'react';
import { Animated, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

/* Carga diferida del reproductor de audio (solo se carga cuando se necesita) */
const AudioWordPlayer = lazy(() => import('../../components/AudioWordPlayer'));

/* ─── Datos de palabras ─── */
const PALABRAS = [
  {
    id: 'aau',
    karina: 'Aau',
    espanol: 'Sí / Afirmación',
    descripcion: 'Palabra de afirmación usada por el pueblo Kariña para decir "sí" o para confirmar algo.',
    emoji: '✅',
    color: '#2E7D32',
    silabas: 'A - au',
    tip: 'Pronuncia la "a" abierta y la "u" suave al final.',
  },
  {
    id: 'mojko',
    karina: 'Mojko',
    espanol: 'Pájaro',
    descripcion: 'Palabra Kariña para referirse a las aves. Los pájaros son importantes en la cosmovisión Kariña.',
    emoji: '🐦',
    color: '#1565C0',
    silabas: 'Moj - ko',
    tip: 'La "j" tiene un sonido suave, casi como una "y" en español.',
  },
  {
    id: 'nana',
    karina: "Na'na",
    espanol: 'Abuela / Madre',
    descripcion: "En Kariña, 'Na'na' es un término de cariño para referirse a la abuela o a la madre.",
    emoji: '👵',
    color: '#BF360C',
    silabas: "Na' - na",
    tip: "El apóstrofe indica una pausa glotal breve entre las dos sílabas.",
  },
  {
    id: 'nakon',
    karina: "Na'nakon",
    espanol: 'Nuestro camino / Nuestro sendero',
    descripcion: "Palabra que describe el camino o sendero compartido. Representa la unidad del pueblo Kariña.",
    emoji: '🌿',
    color: '#E65100',
    silabas: "Na' - na - kon",
    tip: 'Pronuncia cada sílaba de forma clara y pausada.',
  },
];

/* ─── Tarjeta de cada palabra ─── */
function PalabraCard({
  item,
  isActive,
  onPlay,
}: {
  item: (typeof PALABRAS)[0];
  isActive: boolean;
  onPlay: () => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const [showAudio, setShowAudio] = useState(false);

  const handlePress = () => {
    if (!showAudio) {
      setShowAudio(true);
      onPlay();
    }
  };

  const handlePressIn = () =>
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true }).start();
  const handlePressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Animated.View style={{ transform: [{ scale }], marginBottom: 16 }}>
        <View
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 20,
            overflow: 'hidden',
            borderWidth: isActive ? 2 : 1,
            borderColor: isActive ? item.color : '#F0EDE8',
            boxShadow: isActive
              ? `0 4px 16px ${item.color}33`
              : '0 2px 8px rgba(0,0,0,0.08)',
          }}
        >
          {/* Encabezado de color */}
          <View
            style={{
              backgroundColor: item.color,
              paddingHorizontal: 20,
              paddingVertical: 16,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 10,
                  color: 'rgba(255,255,255,0.75)',
                  fontWeight: '700',
                  letterSpacing: 1,
                }}
              >
                KARIÑA
              </Text>
              <Text
                style={{ fontSize: 28, fontWeight: '900', color: '#FFFFFF', marginTop: 2 }}
              >
                {item.karina}
              </Text>
              <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 2 }}>
                {item.espanol}
              </Text>
            </View>
            {/* Indicador visual de audio */}
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: 'rgba(255,255,255,0.25)',
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 2,
                borderColor: 'rgba(255,255,255,0.6)',
              }}
            >
              <Text style={{ fontSize: 20 }}>{showAudio ? '🔊' : '▶️'}</Text>
            </View>
          </View>

          {/* Cuerpo de la tarjeta */}
          <View style={{ padding: 16 }}>
            {/* Sílabas */}
            <View
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}
            >
              <Text style={{ fontSize: 10, fontWeight: '700', color: '#888', letterSpacing: 1 }}>
                SÍLABAS:
              </Text>
              <View
                style={{
                  backgroundColor: `${item.color}18`,
                  borderRadius: 8,
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                }}
              >
                <Text
                  style={{ fontSize: 14, fontWeight: '800', color: item.color, letterSpacing: 2 }}
                >
                  {item.silabas}
                </Text>
              </View>
            </View>

            {/* Descripción */}
            <Text style={{ fontSize: 12, color: '#555', lineHeight: 18, marginBottom: 10 }}>
              {item.descripcion}
            </Text>

            {/* Consejo de pronunciación */}
            <View
              style={{
                backgroundColor: '#FFF8E7',
                borderRadius: 12,
                padding: 12,
                flexDirection: 'row',
                alignItems: 'flex-start',
                gap: 8,
                borderLeftWidth: 3,
                borderLeftColor: '#F59E0B',
              }}
            >
              <Text style={{ fontSize: 16 }}>💡</Text>
              <View style={{ flex: 1 }}>
                <Text
                  style={{ fontSize: 10, fontWeight: '700', color: '#F59E0B', marginBottom: 3 }}
                >
                  CONSEJO DE PRONUNCIACIÓN
                </Text>
                <Text style={{ fontSize: 12, color: '#666', lineHeight: 16 }}>
                  {item.tip}
                </Text>
              </View>
            </View>

            {/* Reproductor de audio (carga diferida) */}
            {showAudio && (
              <Suspense
                fallback={
                  <View style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 10,
                        borderWidth: 2,
                        borderColor: item.color,
                        borderTopColor: 'transparent',
                      }}
                    />
                    <Text style={{ fontSize: 12, color: item.color }}>
                      Cargando audio...
                    </Text>
                  </View>
                }
              >
                <AudioWordPlayer wordId={item.id} color={item.color} />
              </Suspense>
            )}

            {/* Indicador de "Toca para escuchar" cuando está inactivo */}
            {!showAudio && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 }}>
                <Text style={{ fontSize: 14 }}>{item.emoji}</Text>
                <Text style={{ fontSize: 11, color: item.color, fontWeight: '600' }}>
                  Toca para escuchar la pronunciación
                </Text>
              </View>
            )}
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
}

/* ─── Pantalla principal de Pronunciación ─── */
export default function PronunciacionScreen() {
  const router = useRouter();
  const [activeId, setActiveId] = useState<string | null>(null);

  const handlePlay = useCallback((id: string) => {
    setActiveId(id);
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F9F6F0' }} edges={['top']}>
      {/* Header */}
      <View
        style={{
          backgroundColor: '#1B5E20',
          paddingHorizontal: 20,
          paddingTop: 6,
          paddingBottom: 20,
        }}
      >
        {/* Botón volver */}
        <Pressable
          onPress={() => router.back()}
          style={{ marginBottom: 12, alignSelf: 'flex-start' }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              backgroundColor: 'rgba(255,255,255,0.15)',
              borderRadius: 20,
              paddingHorizontal: 12,
              paddingVertical: 6,
            }}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 16 }}>←</Text>
            <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '600' }}>
              Módulos
            </Text>
          </View>
        </Pressable>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text style={{ fontSize: 32 }}>🗣️</Text>
          <View>
            <Text style={{ color: '#F59E0B', fontSize: 11, fontWeight: '700' }}>
              KARIÑA · NÏWONPÏ
            </Text>
            <Text style={{ color: '#FFFFFF', fontSize: 22, fontWeight: '900' }}>
              Pronunciación
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12 }}>
              {PALABRAS.length} palabras con audio real
            </Text>
          </View>
        </View>

        {/* Indicación de uso */}
        <View
          style={{
            backgroundColor: 'rgba(245,158,11,0.2)',
            borderRadius: 12,
            padding: 12,
            marginTop: 14,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Text style={{ fontSize: 18 }}>🎧</Text>
          <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 12, flex: 1 }}>
            Toca cada tarjeta para escuchar la pronunciación auténtica en idioma Kariña
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 30 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Contador de palabras */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 18,
          }}
        >
          <Text style={{ fontSize: 14, fontWeight: '700', color: '#1A2E1A' }}>
            Palabras Kariña con Audio
          </Text>
          <View
            style={{
              backgroundColor: '#E8F5E9',
              borderRadius: 12,
              paddingHorizontal: 12,
              paddingVertical: 5,
            }}
          >
            <Text style={{ fontSize: 11, color: '#2E7D32', fontWeight: '700' }}>
              {PALABRAS.length} palabras
            </Text>
          </View>
        </View>

        {/* Tarjetas de palabras */}
        {PALABRAS.map((item) => (
          <PalabraCard
            key={item.id}
            item={item}
            isActive={activeId === item.id}
            onPlay={() => handlePlay(item.id)}
          />
        ))}

        {/* Nota cultural */}
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
          <Text style={{ fontSize: 28 }}>🪶</Text>
          <View style={{ flex: 1 }}>
            <Text
              style={{ color: '#F59E0B', fontSize: 12, fontWeight: '800', marginBottom: 4 }}
            >
              Sobre el idioma Kariña
            </Text>
            <Text
              style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, lineHeight: 18 }}
            >
              El Kariña es una lengua caribe hablada en el Estado Bolívar, Venezuela. Cada
              palabra lleva consigo siglos de historia y sabiduría del pueblo Kariña.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
