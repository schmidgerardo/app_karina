import { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator, Pressable } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Audio } from 'expo-av';
import * as Network from 'expo-network';
import { supabase } from '@/client/supabase';
import { Button } from '@/components/ui/button';

export default function PronunciacionScreen() {
  const { word_id } = useLocalSearchParams();
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [recordingInstance, setRecordingInstance] = useState<Audio.Recording | null>(null);
  const [evaluationScore, setEvaluationScore] = useState<number | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isPlayingNative, setIsPlayingNative] = useState(false);
  
  // Estado para la palabra de la base de datos
  const [palabraActual, setPalabraActual] = useState<any>(null);
  const [loadingPalabra, setLoadingPalabra] = useState(true);

  // 1. Cargar conexión e inicializar palabra de Supabase
  useEffect(() => {
    async function inicializarPantalla() {
      const status = await Network.getNetworkStateAsync();
      setIsConnected(status.isConnected ?? false);

      try {
        if (word_id) {
          const { data } = await supabase.from('words').select('*').eq('id', word_id).single();
          setPalabraActual(data);
        } else {
          // Traer una palabra al azar que tenga audio del profesor cargado
          const { data } = await supabase
            .from('words')
            .select('*')
            .not('audio_url', 'is', null)
            .limit(1)
            .single();
          setPalabraActual(data);
        }
      } catch (err) {
        console.error("Error cargando palabra de Supabase:", err);
      } finally {
        setLoadingPalabra(false);
      }
    }
    inicializarPantalla();
  }, [word_id]);

  // 2. Reproducir Audio Nativo del Profesor
  async function escucharProfesor() {
    if (!palabraActual?.audio_url) return;
    try {
      setIsPlayingNative(true);
      const { sound } = await Audio.Sound.createAsync(
        { uri: palabraActual.audio_url },
        { shouldPlay: true }
      );
      sound.setOnPlaybackStatusUpdate((status: any) => {
        if (status.didJustFinish) {
          setIsPlayingNative(false);
          sound.unloadAsync();
        }
      });
    } catch (err) {
      console.error("Error al reproducir audio nativo:", err);
      setIsPlayingNative(false);
    }
  }

  // 3. Control de Grabación Nativa Blindada
  async function startRecording() {
    try {
      if (recordingInstance) {
        try { await recordingInstance.stopAndUnloadAsync(); } catch (e) {}
      }
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecordingInstance(recording);
      setIsRecording(true);
      setEvaluationScore(null);
    } catch (err) {
      console.error("Fallo al iniciar grabación", err);
    }
  }

  // Al soltar el botón, detiene la grabación y auto-evalúa
  async function stopAndAutoEvaluate() {
    if (!recordingInstance) return;
    try {
      setIsRecording(false);
      const status = await recordingInstance.getStatusAsync().catch(() => null);
      
      if (status && status.isPrepared && !status.isDoneRecording) {
        await recordingInstance.stopAndUnloadAsync();
        const uri = recordingInstance.getURI();
        if (uri) {
          setRecordingUri(uri);
          // 🚀 DISPARO AUTOMÁTICO: Evaluamos pasando el URI directo
          evaluarAudioDirecto(uri);
        }
      }
    } catch (err) {
      console.warn("Aviso controlado al soltar micrófono:", err);
    } finally {
      setRecordingInstance(null);
    }
  }

  // 4. Lógica de envío automático a Python
  async function evaluarAudioDirecto(uriParaEvaluar: string) {
    if (!isConnected || !palabraActual) return;
    setIsEvaluating(true);

    try {
      const formData = new FormData();
      
      if (typeof window !== 'undefined' && !uriParaEvaluar.startsWith('file://')) {
        const responseAudio = await fetch(uriParaEvaluar);
        const audioBlob = await responseAudio.blob();
        formData.append('audio_estudiante', audioBlob, 'intento.wav');
      } else {
        formData.append('audio_estudiante', {
          uri: uriParaEvaluar,
          name: 'intento.m4a',
          type: 'audio/m4a',
        } as any);
      }

      // Mandamos la URL real del profesor para que Python la descargue y compare
      formData.append('audio_profesor_url', palabraActual.audio_url);

      const res = await fetch('https://api-pronunciacion-karina.onrender.com/comparar', {
        method: 'POST',
        body: formData,
      });
      
      const data = await res.json();
      if (data.success) {
        setEvaluationScore(data.score);
      } else {
        console.error("Error de la API:", data.error);
      }
    } catch (e) {
      console.error("Error de red:", e);
    } finally {
      setIsEvaluating(false);
    }
  }

  if (loadingPalabra) {
    return (
      <View className="flex-1 bg-background justify-center items-center">
        <ActivityIndicator size="large" color="#166534" />
        <Text className="mt-2 text-muted-foreground">Buscando palabra en Kariña...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background p-6 items-center justify-center">
      <Text className="text-sm uppercase tracking-widest text-muted-foreground mb-1">Palabra en evaluación</Text>
      
      {/* Palabra en grande traída de Supabase */}
      <Text className="text-4xl font-black text-primary mb-2">{palabraActual?.word_karina || "No hay palabras"}</Text>
      <Text className="text-lg italic text-muted-foreground mb-8">"{palabraActual?.translation_es}"</Text>

      {/* Botón para escuchar al profesor */}
      <Button 
        onPress={escucharProfesor} 
        variant="outline" 
        className="mb-10 w-56 border-primary text-primary"
        disabled={isPlayingNative}
      >
        {isPlayingNative ? "🔊 Escuchando..." : "🔈 Oír Profesor Nativo"}
      </Button>

      {/* Botón de mantener presionado interactivo hibrido web/móvil */}
      <View className="items-center justify-center mb-6">
        <Pressable 
          onPressIn={startRecording} 
          onPressOut={stopAndAutoEvaluate}
          // @ts-ignore - Parche de compatibilidad limpio para clicks en navegadores de escritorio
          onMouseDown={startRecording}
          onMouseUp={stopAndAutoEvaluate}
          className={`w-28 h-28 rounded-full items-center justify-center shadow-lg ${isRecording ? 'bg-destructive scale-95' : 'bg-primary'}`}
        >
          <Text className="text-white text-3xl">{isRecording ? "🛑" : "🎙️"}</Text>
        </Pressable>
        <Text className="text-xs text-muted-foreground mt-3 font-medium">
          {isRecording ? "¡Suelta para evaluar inmediatamente!" : "Mantén presionado para hablar"}
        </Text>
      </View>

      {isEvaluating && (
        <View className="flex-row items-center mt-4">
          <ActivityIndicator color="#166534" className="mr-2" />
          <Text className="text-primary font-semibold">Procesando ondas acústicas en Render...</Text>
        </View>
      )}

      {evaluationScore !== null && !isEvaluating && (
        <View className="mt-6 p-4 rounded-xl bg-card border border-border items-center w-full max-w-xs">
          <Text className="text-sm text-muted-foreground">Resultado obtenido</Text>
          <Text className={`text-3xl font-extrabold my-1 ${evaluationScore >= 75 ? 'text-green-600' : 'text-destructive'}`}>
            {evaluationScore.toFixed(1)}%
          </Text>
          <Text className="font-medium text-center">
            {evaluationScore >= 75 ? "✅ ¡Excelente pronunciación!" : "❌ Ajusta el tono e inténtalo de nuevo"}
          </Text>
        </View>
      )}
    </View>
  );
}
