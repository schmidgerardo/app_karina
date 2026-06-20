import { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';

import aauAudio from '../../assets/sounds/aau.mp3';
import mojkoAudio from '../../assets/sounds/mojko.mp3';
import nanaAudio from '../../assets/sounds/nana.mp3';
import nakonAudio from '../../assets/sounds/nakon.mp3';

const AUDIO_MAP: Record<string, number> = {
  aau: aauAudio,
  mojko: mojkoAudio,
  nana: nanaAudio,
  nakon: nakonAudio,
};

interface AudioWordPlayerProps {
  wordId: string;
  color: string;
  onError?: (msg: string) => void;
}

export default function AudioWordPlayer({ wordId, color, onError }: AudioWordPlayerProps) {
  const audioSource = AUDIO_MAP[wordId];
  const [hasError, setHasError] = useState(false);
  const player = useAudioPlayer(audioSource ?? null);
  const status = useAudioPlayerStatus(player);
  const isPlaying = status.playing;
  const progress =
    status.duration > 0 ? (status.currentTime / status.duration) * 100 : 0;

  /* Pausar al desmontar */
  const didUnmount = useRef(false);
  useEffect(() => {
    return () => {
      didUnmount.current = true;
      try {
        player.pause();
      } catch {
        // ignorar
      }
    };
  }, [player]);

  /* Detectar si el audio terminó y reiniciar progreso visual */
  useEffect(() => {
    if (!isPlaying && status.currentTime >= status.duration && status.duration > 0) {
      try {
        player.seekTo(0);
      } catch {
        // ignorar
      }
    }
  }, [isPlaying, status.currentTime, status.duration, player]);

  if (!audioSource) {
    return (
      <Text style={{ fontSize: 12, color: '#888', marginTop: 10 }}>
        🔇 Audio no disponible para esta palabra
      </Text>
    );
  }

  if (hasError) {
    return (
      <Text style={{ fontSize: 12, color: '#888', marginTop: 10 }}>
        🔇 No se pudo reproducir el audio
      </Text>
    );
  }

  const handlePress = () => {
    try {
      if (isPlaying) {
        player.pause();
      } else {
        player.seekTo(0);
        player.play();
      }
    } catch (e) {
      setHasError(true);
      onError?.(String(e));
    }
  };

  return (
    <View style={{ marginTop: 12 }}>
      {/* Botón de reproducción */}
      <Pressable onPress={handlePress}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            backgroundColor: `${color}18`,
            borderRadius: 10,
            paddingHorizontal: 14,
            paddingVertical: 8,
            alignSelf: 'flex-start',
          }}
        >
          <Text style={{ fontSize: 18 }}>{isPlaying ? '⏸' : '▶️'}</Text>
          <Text style={{ fontSize: 13, fontWeight: '700', color }}>
            {isPlaying ? 'Pausar' : 'Escuchar pronunciación'}
          </Text>
        </View>
      </Pressable>

      {/* Barra de progreso */}
      {isPlaying && (
        <View style={{ marginTop: 10 }}>
          <View
            style={{
              height: 4,
              backgroundColor: '#E8F5E9',
              borderRadius: 4,
              overflow: 'hidden',
            }}
          >
            <View
              style={{
                height: '100%',
                backgroundColor: color,
                borderRadius: 4,
                width: `${progress}%`,
              }}
            />
          </View>
          <Text style={{ fontSize: 10, color: '#888', marginTop: 4, textAlign: 'right' }}>
            {Math.floor(status.currentTime)}s / {Math.floor(status.duration)}s
          </Text>
        </View>
      )}
    </View>
  );
}
