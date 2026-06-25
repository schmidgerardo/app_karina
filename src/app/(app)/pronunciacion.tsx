import { useState, useEffect, useRef } from 'react';
import { View, Text, ActivityIndicator, Pressable, Platform } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import * as Network from 'expo-network';
import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from '@/client/supabase';
import { useDatabaseContext } from '@/context/DatabaseContext';
import { Button } from '@/components/ui/button';

export default function PronunciacionScreen() {
  const { word_id } = useLocalSearchParams();
  const [isConnected, setIsConnected] = useState<boolean>(true);

  const [isRecording, setIsRecording] = useState(false);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [evaluationScore, setEvaluationScore] = useState<number | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isPlayingNative, setIsPlayingNative] = useState(false);

  const [modoAutoevaluacion, setModoAutoevaluacion] = useState(false);
  const [isPlayingSuperpuesto, setIsPlayingSuperpuesto] = useState(false);

  const [palabraActual, setPalabraActual] = useState<any>(null);
  const [loadingPalabra, setLoadingPalabra] = useState(true);

  const { getLocalWordById } = useDatabaseContext();
  const recordingRef = useRef<any>(null);
  const isActionLocked = useRef<boolean>(false);
  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);

  // -----------------------------------------------------------------
  // Inicialización
  // -----------------------------------------------------------------
  useEffect(() => {
    async function inicializar() {
      const networkStatus = await Network.getNetworkStateAsync();
      setIsConnected(networkStatus.isConnected ?? false);

      const SUPABASE_STORAGE_URL =
        'https://oczoccdlyyhbdvnyjjni.supabase.co/storage/v1/object/public/audios/';

      try {
        let dataWord: any = null;
        const isMobile = Platform.OS !== 'web';

        if (isMobile && word_id) {
          const localWord = await getLocalWordById(Number(word_id));
          if (localWord) {
            if (localWord.audio_url && !localWord.audio_url.startsWith('http')) {
              localWord.audio_url = `${SUPABASE_STORAGE_URL}${localWord.audio_url}`;
            }
            setPalabraActual(localWord);
            return;
          }
        }

        if (word_id) {
          const { data } = await supabase
            .from('words')
            .select('*')
            .eq('id', word_id)
            .single();
          dataWord = data;
        } else {
          const { data } = await supabase
            .from('words')
            .select('*')
            .not('audio_url', 'is', null)
            .limit(1);
          if (data && data.length > 0) dataWord = data[0];
        }

        if (dataWord) {
          if (isMobile) {
            const localWord = await getLocalWordById(Number(dataWord.id));
            if (localWord?.local_audio_path) {
              setPalabraActual({
                ...dataWord,
                local_audio_path: localWord.local_audio_path,
                audio_url: dataWord.audio_url && !dataWord.audio_url.startsWith('http')
                  ? `${SUPABASE_STORAGE_URL}${dataWord.audio_url}`
                  : dataWord.audio_url,
              });
              return;
            }
          }

          if (dataWord.audio_url && !dataWord.audio_url.startsWith('http')) {
            dataWord.audio_url = `${SUPABASE_STORAGE_URL}${dataWord.audio_url}`;
          }
          setPalabraActual(dataWord);
        }
      } catch (err) {
        console.error('Error inicializando:', err);
      } finally {
        setLoadingPalabra(false);
      }
    }

    inicializar();

    return () => {
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync?.().catch(() => {});
      }
      player.pause().catch(() => {});
    };
  }, [word_id, getLocalWordById]);

  // -----------------------------------------------------------------
  // Reproducir profesor
  // -----------------------------------------------------------------
  async function escucharProfesor() {
    if (!palabraActual?.audio_url && !palabraActual?.local_audio_path) return;

    let audioUrl = null;

    if (Platform.OS !== 'web' && palabraActual.local_audio_path) {
      const fileInfo = await FileSystem.getInfoAsync(palabraActual.local_audio_path);
      if (fileInfo.exists) {
        audioUrl = palabraActual.local_audio_path;
      }
    }

    if (!audioUrl && palabraActual.audio_url) {
      audioUrl = palabraActual.audio_url.startsWith('http')
        ? palabraActual.audio_url
        : `https://oczoccdlyyhbdvnyjjni.supabase.co/storage/v1/object/public/audios/${palabraActual.audio_url}`;
    }

    if (!audioUrl) return;

    try {
      if (status.playing) {
        await player.pause();
        setIsPlayingNative(false);
        return;
      }

      await player.replace(audioUrl);
      await player.play();
      setIsPlayingNative(true);
    } catch (err) {
      console.error('[AUDIO] Error al reproducir audio profesor:', err);
      setIsPlayingNative(false);
    }
  }

  // -----------------------------------------------------------------
  // Reproducción superpuesta
  // -----------------------------------------------------------------
  async function reproducirSuperpuestos() {
    // Temporalmente desactivado mientras se trabaja en el login.
    if (isPlayingSuperpuesto) return;
    setIsPlayingSuperpuesto(false);
  }

  // -----------------------------------------------------------------
  // Grabación – CONFIGURACIÓN CORREGIDA (sin extension en web)
  // -----------------------------------------------------------------
  const getRecordingOptions = (): any => {
    if (Platform.OS === 'web') {
      return {
        android: {},
        ios: {},
        web: {
          mimeType: 'audio/webm',
          bitsPerSecond: 128000,
        },
      };
    }
    return {};
  };

  async function startRecording() {
    // Temporalmente desactivado para evitar usar expo-av.
    if (isActionLocked.current || isRecording) return;
    isActionLocked.current = false;
  }

  async function stopAndAutoEvaluate() {
    // Temporalmente desactivado para evitar usar expo-av.
    if (!isRecording) return;
    setIsRecording(false);
    setModoAutoevaluacion(true);
  }

  // -----------------------------------------------------------------
  // Envío a la API con timeout de 3.5 s
  // -----------------------------------------------------------------
  async function evaluarAudioDirecto(uriParaEvaluar: string) {
    setIsEvaluating(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    try {
      const formData = new FormData();

      if (Platform.OS === 'web') {
        const responseAudio = await fetch(uriParaEvaluar);
        const audioBlob = await responseAudio.blob();
        // Se envía con extensión .webm (el backend lo manejará con fallback)
        formData.append('audio_estudiante', audioBlob, 'intento.webm');
      } else {
        // En móvil, HIGH_QUALITY produce .m4a o .wav; lo enviamos como .wav
        formData.append('audio_estudiante', {
          uri: uriParaEvaluar,
          name: 'intento.wav',
          type: 'audio/wav',
        } as any);
      }

      formData.append('audio_profesor_url', palabraActual.audio_url);

      const res = await fetch(
        'https://api-pronunciacion-karina.onrender.com/comparar',
        {
          method: 'POST',
          body: formData,
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);
      const data = await res.json();

      if (data.success) {
        setEvaluationScore(data.score);
      } else {
        setModoAutoevaluacion(true);
      }
    } catch (e) {
      console.warn('Evaluación fallida, conmutando a autoevaluación:', e);
      setModoAutoevaluacion(true);
    } finally {
      setIsEvaluating(false);
    }
  }

  // -----------------------------------------------------------------
  // Renderizado
  // -----------------------------------------------------------------
  if (loadingPalabra) {
    return (
      <View className="flex-1 bg-background justify-center items-center">
        <ActivityIndicator size="large" color="#166534" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background p-6 items-center justify-center">
      <Text className="text-sm uppercase tracking-widest text-muted-foreground mb-1">
        Palabra en evaluación
      </Text>
      <Text className="text-4xl font-black text-primary mb-2 text-center">
        {palabraActual?.palabra_karina}
      </Text>
      <Text className="text-lg italic text-muted-foreground mb-8 text-center">
        "{palabraActual?.significado_espanol}"
      </Text>

      <Button
        onPress={escucharProfesor}
        variant="outline"
        className="mb-10 w-56 text-primary border-primary"
        disabled={isPlayingNative}
      >
        {isPlayingNative ? '🔊 Escuchando...' : '🔈 Oír Profesor Nativo'}
      </Button>

      <View className="items-center justify-center mb-6">
        <Pressable
          onPressIn={startRecording}
          onPressOut={stopAndAutoEvaluate}
          style={Platform.select({ web: { cursor: 'pointer', userSelect: 'none' } })}
          className={`w-28 h-28 rounded-full items-center justify-center shadow-lg ${
            isRecording ? 'bg-destructive scale-95' : 'bg-primary'
          }`}
        >
          <Text className="text-white text-3xl">{isRecording ? '🛑' : '🎙️'}</Text>
        </Pressable>
        <Text className="text-xs text-muted-foreground mt-3 font-medium text-center">
          {isRecording ? '¡Suelta para procesar!' : 'Mantén presionado para hablar'}
        </Text>
      </View>

      {isEvaluating && (
        <View className="flex-row items-center mt-4">
          <ActivityIndicator color="#166534" className="mr-2" />
          <Text className="text-primary font-semibold">Procesando acústica en Render...</Text>
        </View>
      )}

      {evaluationScore !== null && !isEvaluating && (
        <View className="mt-6 p-4 rounded-xl bg-card border border-border items-center w-full max-w-xs">
          <Text className="text-sm text-muted-foreground">Resultado obtenido por la IA</Text>
          <Text
            className={`text-3xl font-extrabold my-1 ${
              evaluationScore >= 75 ? 'text-green-600' : 'text-destructive'
            }`}
          >
            {evaluationScore.toFixed(1)}%
          </Text>
          <Text className="font-medium text-center">
            {evaluationScore >= 75 ? '✅ ¡Excelente!' : '❌ Inténtalo de nuevo'}
          </Text>
        </View>
      )}

      {modoAutoevaluacion && (
        <View className="mt-4 p-5 rounded-2xl bg-emerald-50 border border-emerald-200 items-center w-full max-w-sm shadow-sm">
          <Text className="font-bold text-emerald-800 text-center mb-2">
            🎧 Modo Comparativo Offline
          </Text>
          <Text className="text-xs text-emerald-700 text-center mb-4">
            Escucha los dos audios superpuestos al mismo tiempo para calibrar tu oído:
          </Text>

          <Button
            onPress={reproducirSuperpuestos}
            className="bg-emerald-700 w-full mb-4 text-white"
          >
            {isPlayingSuperpuesto ? '🔊 Escuchando Ambos...' : '🎵 Oír Voces Superpuestas'}
          </Button>

          <Text className="text-xs font-semibold text-muted-foreground mb-2">
            ¿Consideras que sonaste igual?
          </Text>
          <View className="flex-row gap-3 w-full">
            <Button
              onPress={() => {
                setModoAutoevaluacion(false);
                setEvaluationScore(95);
              }}
              className="flex-1 bg-green-600 text-white"
            >
              👍 Sí, suena igual
            </Button>
            <Button
              onPress={() => setModoAutoevaluacion(false)}
              variant="destructive"
              className="flex-1"
            >
              👎 Probar de nuevo
            </Button>
          </View>
        </View>
      )}
    </View>
  );
}
