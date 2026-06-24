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
  
  // Estado para la palabra mapeada de la base de datos
  const [palabraActual, setPalabraActual] = useState<any>(null);
  const [loadingPalabra, setLoadingPalabra] = useState(true);

  // 1. Cargar conexión e inicializar palabra de Supabase
  useEffect(() => {
    async function inicializarPantalla() {
      const status = await Network.getNetworkStateAsync();
      setIsConnected(status.isConnected ?? false);

      // ✅ URL oficial de tu Bucket de Audios en Supabase configurada
      const SUPABASE_STORAGE_URL = "https://oczoccdlyyhbdvnyjjni.supabase.co/storage/v1/object/public/audios/";

      try {
        let dataWord: any = null;
        
        if (word_id) {
          // Si viene un ID del Home
          const { data } = await supabase.from('words').select('*').eq('id', word_id).single();
          dataWord = data;
        } else {
          // Si entra directo, traer la primera palabra de la tabla que tenga un audio asociado
          const { data } = await supabase
            .from('words')
            .select('*')
            .not('audio_url', 'is', null)
            .limit(1);
            
          if (data && data.length > 0) {
            dataWord = data[0];
          }
        }

        if (dataWord) {
          // Si en la base de datos solo está "aau.mp3", le construimos la URL completa para el reproductor
          if (dataWord.audio_url && !dataWord.audio_url.startsWith('http')) {
            dataWord.audio_url = `${SUPABASE_STORAGE_URL}${dataWord.audio_url}`;
          }
          setPalabraActual(dataWord);
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

  // ==========================================
  // 3. Control de Grabación Nativa Blindada
  // ==========================================
  async function startRecording() {
    try {
      setEvaluationScore(null);

      if (recordingInstance) {
        try { await recordingInstance.stopAndUnloadAsync(); } catch (e) {}
      }

      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({ 
        allowsRecordingIOS: true, 
        playsInSilentModeIOS: true 
      });
      
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      
      setRecordingInstance(recording);
      setIsRecording(true);
      console.log("🎙️ Grabación iniciada con éxito.");
    } catch (err) {
      console.error("❌ Fallo al iniciar grabación:", err);
    }
  }

  async function stopAndAutoEvaluate() {
    if (!recordingInstance) {
      console.log("⚠️ No se detectó ninguna instancia de grabación activa al soltar.");
      setIsRecording(false);
      return;
    }

    try {
      setIsRecording(false);
      console.log("🛑 Deteniendo grabación...");
      
      // Forzamos la descarga directa
      await recordingInstance.stopAndUnloadAsync().catch(() => {});
      const uri = recordingInstance.getURI();
      
      if (uri) {
        setRecordingUri(uri);
        console.log("💾 Audio capturado en URI:", uri);
        // Disparamos la evaluación
        evaluarAudioDirecto(uri);
      } else {
        console.error("❌ No se pudo recuperar el URI del audio.");
      }
    } catch (err) {
      console.warn("⚠️ Aviso controlado al soltar micrófono:", err);
    } finally {
      setRecordingInstance(null);
    }
  }

  // ==========================================
  // 4. Lógica de envío automático a Python
  // ==========================================
  async function evaluarAudioDirecto(uriParaEvaluar: string) {
    if (!isConnected || !palabraActual) {
      console.log("⚠️ Abortando evaluación: Sin conexión o sin palabra cargada.");
      return;
    }
    setIsEvaluating(true);
    console.log("🚀 Enviando audio al servidor de Render...");

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

      formData.append('audio_profesor_url', palabraActual.audio_url);

      const res = await fetch('https://api-pronunciacion-karina.onrender.com/comparar', {
        method: 'POST',
        body: formData,
      });
      
      const data = await res.json();
      console.log("📥 Respuesta recibida del servidor:", data);

      if (data.success) {
        setEvaluationScore(data.score);
      } else {
        console.error("❌ Error devuelto por la API:", data.error);
      }
    } catch (e) {
      console.error("❌ Error crítico de red al conectar con Python:", e);
    } finally {
      setIsEvaluating(false);
    }
  }

  if (loadingPalabra) {
    return (
      <View className="flex-1 bg-background justify-center items-center">
        <ActivityIndicator size="large" color="#166534" />
        <Text className="mt-2 text-muted-foreground">Buscando palabras en Kariña...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background p-6 items-center justify-center">
      <Text className="text-sm uppercase tracking-widest text-muted-foreground mb-1">Palabra en evaluación</Text>
      
      {/* Usando tus columnas reales de Supabase: palabra_karina y significado_espanol */}
      <Text className="text-4xl font-black text-primary mb-2">{palabraActual?.palabra_karina || "No hay palabras"}</Text>
      <Text className="text-lg italic text-muted-foreground mb-8">"{palabraActual?.significado_espanol}"</Text>

      {/* Botón para escuchar al profesor */}
      <Button 
        onPress={escucharProfesor} 
        variant="outline" 
        className="mb-10 w-56 border-primary text-primary"
        disabled={isPlayingNative || !palabraActual?.audio_url}
      >
        {isPlayingNative ? "🔊 Escuchando..." : "🔈 Oír Profesor Nativo"}
      </Button>

      {/* 🕹️ BOTÓN AJUSTADO PARA EVITAR CONFLICTOS DE INTERFAZ WEB/MÓVIL */}
      <View className="items-center justify-center mb-6">
        <div
          onMouseDown={startRecording}
          onMouseUp={stopAndAutoEvaluate}
          onTouchStart={startRecording}
          onTouchEnd={stopAndAutoEvaluate}
          style={{
            width: 112,
            height: 112,
            borderRadius: '50%',
            backgroundColor: isRecording ? '#ef4444' : '#166534',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            userSelect: 'none',
            transform: isRecording ? 'scale(0.95)' : 'scale(1)',
            transition: 'all 0.1s ease',
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
          }}
        >
          <Text className="text-white text-3xl">{isRecording ? "🛑" : "🎙️"}</Text>
        </div>
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
