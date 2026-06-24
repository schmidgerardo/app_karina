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
  
  // Modo Offline de Autoevaluación Coexistente
  const [modoAutoevaluacion, setModoAutoevaluacion] = useState(false);
  const [isPlayingSuperpuesto, setIsPlayingSuperpuesto] = useState(false);

  const [palabraActual, setPalabraActual] = useState<any>(null);
  const [loadingPalabra, setLoadingPalabra] = useState(true);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const soundProfesorRef = useRef<Audio.Sound | null>(null);
  const soundAlumnoRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    async function inicializarPantalla() {
      const status = await Network.getNetworkStateAsync();
      setIsConnected(status.isConnected ?? false);

      const SUPABASE_STORAGE_URL = "https://oczoccdlyyhbdvnyjjni.supabase.co/storage/v1/object/public/audios/";

      try {
        let dataWord: any = null;
        if (word_id) {
          const { data } = await supabase.from('words').select('*').eq('id', word_id).single();
          dataWord = data;
        } else {
          const { data } = await supabase.from('words').select('*').not('audio_url', 'is', null).limit(1);
          if (data && data.length > 0) dataWord = data[0];
        }

        if (dataWord) {
          if (dataWord.audio_url && !dataWord.audio_url.startsWith('http')) {
            dataWord.audio_url = `${SUPABASE_STORAGE_URL}${dataWord.audio_url}`;
          }
          setPalabraActual(dataWord);
        }
      } catch (err) {
        console.error("Error cargando base de datos:", err);
      } finally {
        setLoadingPalabra(false);
      }
    }
    inicializarPantalla();

    return () => {
      if (recordingRef.current) recordingRef.current.stopAndUnloadAsync().catch(() => {});
      if (soundProfesorRef.current) soundProfesorRef.current.unloadAsync().catch(() => {});
      if (soundAlumnoRef.current) soundAlumnoRef.current.unloadAsync().catch(() => {});
    };
  }, [word_id]);

  async function escucharProfesor() {
    if (!palabraActual?.audio_url || isPlayingNative) return;
    try {
      setIsPlayingNative(true);
      const { sound } = await Audio.Sound.createAsync({ uri: palabraActual.audio_url }, { shouldPlay: true });
      soundProfesorRef.current = sound;
      sound.setOnPlaybackStatusUpdate((s: any) => { if (s.didJustFinish) setIsPlayingNative(false); });
    } catch (err) {
      setIsPlayingNative(false);
    }
  }

  // 🎧 TU IDEA MAGIAL: Escuchar ambos audios superpuestos / combinados en paralelo
  async function reproducirSuperpuestos() {
    if (!palabraActual?.audio_url || !recordingUri || isPlayingSuperpuesto) return;
    try {
      setIsPlayingSuperpuesto(true);
      console.log("🔊 Mezclando audio nativo y voz del alumno en paralelo...");

      // Cargamos el audio del profesor y el del alumno al mismo tiempo
      const { sound: soundProf } = await Audio.Sound.createAsync({ uri: palabraActual.audio_url });
      const { sound: soundAlum } = await Audio.Sound.createAsync({ uri: recordingUri });

      soundProfesorRef.current = soundProf;
      soundAlumnoRef.current = soundAlum;

      // Disparamos ambos audios de inmediato (Superposición acústica)
      await soundProf.playAsync();
      await soundAlum.playAsync();

      soundProf.setOnPlaybackStatusUpdate((s: any) => {
        if (s.didJustFinish) {
          setIsPlayingSuperpuesto(false);
          soundProf.unloadAsync();
          soundAlum.unloadAsync();
        }
      });
    } catch (err) {
      console.error("Error en superposición:", err);
      setIsPlayingSuperpuesto(false);
    }
  }

  async function startRecording() {
    try {
      setEvaluationScore(null);
      setModoAutoevaluacion(false);

      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      recordingRef.current = recording;
      setIsRecording(true);
    } catch (err) {
      console.error("Error al iniciar grabación:", err);
    }
  }

  async function stopAndAutoEvaluate() {
    if (!recordingRef.current || !isRecording) return;
    try {
      setIsRecording(false);
      await recordingRef.current.stopAndUnloadAsync().catch(() => {});
      const uri = recordingRef.current.getURI();
      
      if (uri) {
        setRecordingUri(uri);
        
        // 🛰️ BIFURCACIÓN DE ENTORNO: Si hay internet evalúa la IA, si no, activa el reproductor de superposición
        if (isConnected) {
          evaluarAudioDirecto(uri);
        } else {
          console.log("📴 Dispositivo offline. Activando modo autoevaluación interactiva.");
          setModoAutoevaluacion(true);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      recordingRef.current = null;
    }
  }

  async function evaluarAudioDirecto(uriParaEvaluar: string) {
    setIsEvaluating(true);
    try {
      const formData = new FormData();
      if (Platform.OS === 'web' && !uriParaEvaluar.startsWith('file://')) {
        const responseAudio = await fetch(uriParaEvaluar);
        const audioBlob = await responseAudio.blob();
        formData.append('audio_estudiante', audioBlob, 'intento.wav');
      } else {
        formData.append('audio_estudiante', { uri: uriParaEvaluar, name: 'intento.m4a', type: 'audio/m4a' } as any);
      }

      formData.append('audio_profesor_url', palabraActual.audio_url);

      const res = await fetch('https://api-pronunciacion-karina.onrender.com/comparar', { method: 'POST', body: formData });
      const data = await res.json();

      if (data.success) {
        setEvaluationScore(data.score);
      } else {
        // En caso de que falle la API en Render, habilitamos el modo interactivo como plan de rescate
        console.warn("API colgada. Pasando a autoevaluación de emergencia.");
        setModoAutoevaluacion(true);
      }
    } catch (e) {
      setModoAutoevaluacion(true);
    } finally {
      setIsEvaluating(false);
    }
  }

  if (loadingPalabra) {
    return (
      <View className="flex-1 bg-background justify-center items-center">
        <ActivityIndicator size="large" color="#166534" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background p-6 items-center justify-center">
      <Text className="text-sm uppercase tracking-widest text-muted-foreground mb-1">Palabra en evaluación</Text>
      <Text className="text-4xl font-black text-primary mb-2 text-center">{palabraActual?.palabra_karina}</Text>
      <Text className="text-lg italic text-muted-foreground mb-8 text-center">"{palabraActual?.significado_espanol}"</Text>

      <Button onPress={escucharProfesor} variant="outline" className="mb-10 w-56 text-primary border-primary" disabled={isPlayingNative}>
        {isPlayingNative ? "🔊 Escuchando..." : "🔈 Oír Profesor Nativo"}
      </Button>

      {/* Micrófono interactivo */}
      <View className="items-center justify-center mb-6">
        <Pressable
          onPressIn={startRecording}
          onPressOut={stopAndAutoEvaluate}
          style={Platform.select({ web: { cursor: 'pointer', userSelect: 'none' } })}
          className={`w-28 h-28 rounded-full items-center justify-center shadow-lg ${isRecording ? 'bg-destructive scale-95' : 'bg-primary'}`}
        >
          <Text className="text-white text-3xl">{isRecording ? "🛑" : "🎙️"}</Text>
        </Pressable>
        <Text className="text-xs text-muted-foreground mt-3 font-medium text-center">
          {isRecording ? "¡Suelta para procesar!" : "Mantén presionado para hablar"}
        </Text>
      </View>

      {isEvaluating && (
        <View className="flex-row items-center mt-4">
          <ActivityIndicator color="#166534" className="mr-2" />
          <Text className="text-primary font-semibold">Procesando acústica en Render...</Text>
        </View>
      )}

      {/* 📊 PANEL DE EVALUACIÓN INTELIGENTE (ONLINE) */}
      {evaluationScore !== null && !isEvaluating && (
        <View className="mt-6 p-4 rounded-xl bg-card border border-border items-center w-full max-w-xs">
          <Text className="text-sm text-muted-foreground">Resultado obtenido por la IA</Text>
          <Text className={`text-3xl font-extrabold my-1 ${evaluationScore >= 75 ? 'text-green-600' : 'text-destructive'}`}>
            {evaluationScore.toFixed(1)}%
          </Text>
          <Text className="font-medium text-center">{evaluationScore >= 75 ? "✅ ¡Excelente!" : "❌ Inténtalo de nuevo"}</Text>
        </View>
      )}

      {/* 🎧 PANEL TU IDEA: MEZCLA Y AUTOEVALUACIÓN INTERACTIVA (OFFLINE / FALLBACK) */}
      {modoAutoevaluacion && (
        <View className="mt-4 p-5 rounded-2xl bg-emerald-50 border border-emerald-200 items-center w-full max-w-sm shadow-sm">
          <Text className="font-bold text-emerald-800 text-center mb-2">🎧 Modo Comparativo Offline</Text>
          <Text className="text-xs text-emerald-700 text-center mb-4">Escucha los dos audios superpuestos al mismo tiempo para calibrar tu oído:</Text>
          
          <Button onPress={reproducirSuperpuestos} className="bg-emerald-700 w-full mb-4 text-white">
            {isPlayingSuperpuesto ? "🔊 Escuchando Ambos..." : "🎵 Oír Voces Superpuestas"}
          </Button>

          <Text className="text-xs font-semibold text-muted-foreground mb-2">¿Consideras que sonaste igual?</Text>
          <View className="flex-row gap-3 w-full">
            <Button onPress={() => { setModoAutoevaluacion(false); setEvaluationScore(95); }} className="flex-1 bg-green-600 text-white">👍 Sí, suena igual</Button>
            <Button onPress={() => setModoAutoevaluacion(false)} variant="destructive" className="flex-1">👎 Probar de nuevo</Button>
          </View>
        </View>
      )}
    </View>
  );
}
