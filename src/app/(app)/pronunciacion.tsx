import { useState, useEffect, useRef } from 'react';
import { View, Text, ActivityIndicator, Pressable, Platform } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Audio } from 'expo-av';
import * as Network from 'expo-network';
import { supabase } from '@/client/supabase';
import { Button } from '@/components/ui/button';

export default function PronunciacionScreen() {
  const { word_id } = useLocalSearchParams();
  const [isConnected, setIsConnected] = useState<boolean>(true);

  // Estados de grabación y evaluación
  const [isRecording, setIsRecording] = useState(false);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [evaluationScore, setEvaluationScore] = useState<number | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isPlayingNative, setIsPlayingNative] = useState(false);

  // Estados de Autoevaluación (modo offline/fallback)
  const [modoAutoevaluacion, setModoAutoevaluacion] = useState(false);
  const [isPlayingSuperpuesto, setIsPlayingSuperpuesto] = useState(false);

  const [palabraActual, setPalabraActual] = useState<any>(null);
  const [loadingPalabra, setLoadingPalabra] = useState(true);

  // Referencias para controlar el hardware de audio y evitar ráfagas
  const recordingRef = useRef<Audio.Recording | null>(null);
  const soundProfesorRef = useRef<Audio.Sound | null>(null);
  const soundAlumnoRef = useRef<Audio.Sound | null>(null);
  const isActionLocked = useRef<boolean>(false); // Candado anti-ráfagas (especialmente en web)

  // -----------------------------------------------------------------
  // Inicialización: cargar palabra y comprobar conectividad
  // -----------------------------------------------------------------
  useEffect(() => {
    async function inicializarPantalla() {
      // Estado de red
      const status = await Network.getNetworkStateAsync();
      setIsConnected(status.isConnected ?? false);

      // URL base del bucket público de Supabase (inyección automática)
      const SUPABASE_STORAGE_URL =
        'https://oczoccdlyyhbdvnyjjni.supabase.co/storage/v1/object/public/audios/';

      try {
        let dataWord: any = null;
        if (word_id) {
          const { data } = await supabase
            .from('words')
            .select('*')
            .eq('id', word_id)
            .single();
          dataWord = data;
        } else {
          // Si no se pasa ID, se toma la primera palabra que tenga audio
          const { data } = await supabase
            .from('words')
            .select('*')
            .not('audio_url', 'is', null)
            .limit(1);
          if (data && data.length > 0) dataWord = data[0];
        }

        if (dataWord) {
          // Si la URL es relativa, se completa con la base del bucket
          if (dataWord.audio_url && !dataWord.audio_url.startsWith('http')) {
            dataWord.audio_url = `${SUPABASE_STORAGE_URL}${dataWord.audio_url}`;
          }
          setPalabraActual(dataWord);
        }
      } catch (err) {
        console.error('Error inicializando palabra:', err);
      } finally {
        setLoadingPalabra(false);
      }
    }

    inicializarPantalla();

    // Limpieza al desmontar
    return () => {
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync().catch(() => {});
      }
      if (soundProfesorRef.current) {
        soundProfesorRef.current.unloadAsync().catch(() => {});
      }
      if (soundAlumnoRef.current) {
        soundAlumnoRef.current.unloadAsync().catch(() => {});
      }
    };
  }, [word_id]);

  // -----------------------------------------------------------------
  // Reproducir audio del profesor (muestra nativa)
  // -----------------------------------------------------------------
  async function escucharProfesor() {
    if (!palabraActual?.audio_url || isPlayingNative) return;
    try {
      setIsPlayingNative(true);
      const { sound } = await Audio.Sound.createAsync(
        { uri: palabraActual.audio_url },
        { shouldPlay: true }
      );
      soundProfesorRef.current = sound;
      sound.setOnPlaybackStatusUpdate((s: any) => {
        if (s.didJustFinish) {
          setIsPlayingNative(false);
        }
      });
    } catch (err) {
      console.error('Error al reproducir profesor:', err);
      setIsPlayingNative(false);
    }
  }

  // -----------------------------------------------------------------
  // Reproducción superpuesta (alumno + profesor) para autoevaluación
  // -----------------------------------------------------------------
  async function reproducirSuperpuestos() {
    if (!palabraActual?.audio_url || !recordingUri || isPlayingSuperpuesto) return;
    try {
      setIsPlayingSuperpuesto(true);

      const { sound: soundProf } = await Audio.Sound.createAsync({
        uri: palabraActual.audio_url,
      });
      const { sound: soundAlum } = await Audio.Sound.createAsync({
        uri: recordingUri,
      });

      soundProfesorRef.current = soundProf;
      soundAlumnoRef.current = soundAlum;

      // Iniciar ambos simultáneamente
      await soundProf.playAsync();
      await soundAlum.playAsync();

      // Cuando termine el profesor, damos por finalizada la reproducción
      soundProf.setOnPlaybackStatusUpdate((s: any) => {
        if (s.didJustFinish) {
          setIsPlayingSuperpuesto(false);
          soundProf.unloadAsync().catch(() => {});
          soundAlum.unloadAsync().catch(() => {});
        }
      });
    } catch (err) {
      console.error('Error en reproducción superpuesta:', err);
      setIsPlayingSuperpuesto(false);
    }
  }

  // -----------------------------------------------------------------
  // Grabación: inicio (press-in)
  // -----------------------------------------------------------------
  async function startRecording() {
    // Evita múltiples llamadas simultáneas (especialmente en web)
    if (isActionLocked.current || isRecording) return;
    try {
      isActionLocked.current = true;
      setEvaluationScore(null);
      setModoAutoevaluacion(false);

      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = recording;
      setIsRecording(true);
    } catch (err) {
      console.error('Error al iniciar grabación:', err);
    } finally {
      isActionLocked.current = false;
    }
  }

  // -----------------------------------------------------------------
  // Grabación: parada y evaluación automática (press-out)
  // -----------------------------------------------------------------
  async function stopAndAutoEvaluate() {
    if (!recordingRef.current || !isRecording) return;
    try {
      setIsRecording(false);
      await recordingRef.current.stopAndUnloadAsync().catch(() => {});
      const uri = recordingRef.current.getURI();

      if (uri) {
        setRecordingUri(uri);
        // Si hay conexión, se envía a la API; si no, se activa autoevaluación
        if (isConnected) {
          evaluarAudioDirecto(uri);
        } else {
          setModoAutoevaluacion(true);
        }
      }
    } catch (err) {
      console.error('Error al detener grabación:', err);
    } finally {
      recordingRef.current = null;
    }
  }

  // -----------------------------------------------------------------
  // Llamada a la API con timeout de 3.5 segundos
  // -----------------------------------------------------------------
  async function evaluarAudioDirecto(uriParaEvaluar: string) {
    setIsEvaluating(true);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    try {
      const formData = new FormData();

      // Adaptación para web: obtener Blob a partir de la URI
      if (Platform.OS === 'web' && !uriParaEvaluar.startsWith('file://')) {
        const responseAudio = await fetch(uriParaEvaluar);
        const audioBlob = await responseAudio.blob();
        formData.append('audio_estudiante', audioBlob, 'intento.wav');
      } else {
        // Móvil: se usa el objeto con uri, name y type
        formData.append('audio_estudiante', {
          uri: uriParaEvaluar,
          name: 'intento.m4a',
          type: 'audio/m4a',
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
        // Si la API devuelve error, se pasa a modo autoevaluación
        setModoAutoevaluacion(true);
      }
    } catch (e) {
      // Timeout, error de red o cualquier excepción → modo offline
      console.warn('Evaluación fallida, conmutando a autoevaluación:', e);
      setModoAutoevaluacion(true);
    } finally {
      setIsEvaluating(false);
    }
  }

  // -----------------------------------------------------------------
  // Renderizado condicional (carga de palabra)
  // -----------------------------------------------------------------
  if (loadingPalabra) {
    return (
      <View className="flex-1 bg-background justify-center items-center">
        <ActivityIndicator size="large" color="#166534" />
      </View>
    );
  }

  // -----------------------------------------------------------------
  // UI principal (sin divs, todo con componentes React Native)
  // -----------------------------------------------------------------
  return (
    <View className="flex-1 bg-background p-6 items-center justify-center">
      {/* Encabezado */}
      <Text className="text-sm uppercase tracking-widest text-muted-foreground mb-1">
        Palabra en evaluación
      </Text>
      <Text className="text-4xl font-black text-primary mb-2 text-center">
        {palabraActual?.palabra_karina}
      </Text>
      <Text className="text-lg italic text-muted-foreground mb-8 text-center">
        "{palabraActual?.significado_espanol}"
      </Text>

      {/* Botón para escuchar al profesor */}
      <Button
        onPress={escucharProfesor}
        variant="outline"
        className="mb-10 w-56 text-primary border-primary"
        disabled={isPlayingNative}
      >
        {isPlayingNative ? '🔊 Escuchando...' : '🔈 Oír Profesor Nativo'}
      </Button>

      {/* Micrófono: Pressable en lugar de div */}
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

      {/* Indicador de evaluación en curso */}
      {isEvaluating && (
        <View className="flex-row items-center mt-4">
          <ActivityIndicator color="#166534" className="mr-2" />
          <Text className="text-primary font-semibold">Procesando acústica en Render...</Text>
        </View>
      )}

      {/* Panel de resultado online */}
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

      {/* Panel de autoevaluación (offline/fallback) */}
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
