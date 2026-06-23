import { useState, useEffect } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useAudioPlayer } from 'expo-audio'; // Tu reproductor estándar
import { Audio } from 'expo-av';             // Para el micrófono (grabar)
import * as Network from 'expo-network';
import { supabase } from '@/client/supabase';
import { Button } from '@/components/ui/button';

export default function PronunciacionScreen() {
  const { modulo_id, word_id } = useLocalSearchParams();
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [recordingInstance, setRecordingInstance] = useState<Audio.Recording | null>(null);
  const [evaluationScore, setEvaluationScore] = useState<number | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);

  // 1. Chequear conexión al entrar
  useEffect(() => {
    async function checkInternet() {
      const status = await Network.getNetworkStateAsync();
      setIsConnected(status.isConnected ?? false);
    }
    checkInternet();
  }, []);

  // 2. Funciones para controlar el micrófono (expo-av) con ESCUDO de liberación
  async function startRecording() {
    try {
      // 🛡️ ESCUDO ANTI-TRABA: Si quedó una instancia colgada en memoria, la limpiamos a la fuerza
      if (recordingInstance) {
        try {
          await recordingInstance.stopAndUnloadAsync();
        } catch (e) {
          // Ya estaba descargada, ignoramos
        }
      }

      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      
      // Creamos la nueva grabación de forma limpia
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      
      setRecordingInstance(recording);
      setIsRecording(true);
      setEvaluationScore(null); // Limpiamos el puntaje anterior al volver a grabar
    } catch (err) {
      console.error("Fallo al iniciar grabación", err);
    }
  }

async function stopRecording() {
  if (!recordingInstance) return;
  
  try {
    setIsRecording(false);
    
    // 🛡️ ESCUDO WEB: Verificamos el estado interno antes de mandar a descargar
    const status = await recordingInstance.getStatusAsync();
    
    if (status.canRecord) {
      await recordingInstance.stopAndUnloadAsync();
      const uri = recordingInstance.getURI();
      setRecordingUri(uri); // Guardamos la ruta local temporal
    } else {
      console.log("⚠️ La grabación ya había sido detenida o descargada internamente.");
    }
  } catch (err) {
    // 🚨 Capturamos el error silenciosamente para que la app web no colapse
    console.warn("Aviso controlado en entorno Web al detener grabación:", err);
  }
}

  // 3. LA BIFURCACIÓN ESTRATÉGICA (Con medición de tiempos reales)
async function evaluarPronunciacion() {
  if (!recordingUri) return;
  setIsEvaluating(true);
  setEvaluationScore(null);

  const tiempoInicio = performance.now();

  try {
    const formData = new FormData();

    // 🌐 EL TRUCO HÍBRIDO (Móvil vs Web)
    if (typeof window !== 'undefined' && !recordingUri.startsWith('file://')) {
      // 🖥️ ENTORNO WEB: El uri de la web es un "blob:http...". 
      // Tenemos que descargar el blob localmente en el navegador y empaquetarlo como un archivo real.
      const responseAudio = await fetch(recordingUri);
      const audioBlob = await responseAudio.blob();
      
      // Enviamos el blob web con tipo genérico de audio, Python se encargará de decodificarlo
      formData.append('audio_estudiante', audioBlob, 'intento.wav');
    } else {
      // 📱 ENTORNO MÓVIL NATIVO (Android/iOS)
      formData.append('audio_estudiante', {
        uri: recordingUri,
        name: 'intento.m4a',
        type: 'audio/m4a',
      } as any);
    }

    const activeWordId = (word_id as string) || 'palabra_prueba_general';
    formData.append('word_id', activeWordId);

    const res = await fetch('https://api-pronunciacion-karina.onrender.com/comparar', {
      method: 'POST',
      body: formData,
    });
    
    const data = await res.json();
    const tiempoFin = performance.now();
    const totalSegundos = ((tiempoFin - tiempoInicio) / 1000).toFixed(2);

    if (data.success) {
      setEvaluationScore(data.score);
      console.log(`🎯 ¡Evaluación exitosa! Servidor tardó exactamente ${totalSegundos} segundos en la versión Web.`);
    } else {
      console.error("Error de la API:", data.error);
    }
  } catch (e) {
    console.error("Error crítico de red en modo Web/Móvil:", e);
  } finally {
    setIsEvaluating(false);
  }
}

  return (
    <View className="flex-1 bg-background p-5 items-center justify-center">
      <Text className="text-xl font-bold text-primary">Práctica de Pronunciación</Text>
      <Text className="text-sm text-muted-foreground mb-4">
        {isConnected ? "📡 Modo Online: Evaluación Algorítmica" : "📴 Modo Offline: Autoevaluación asistida"}
      </Text>

      {/* Botón de mantener presionado para grabar */}
      <Pressable 
        onPressIn={startRecording} 
        onPressOut={stopRecording}
        className={`w-24 h-24 rounded-full items-center justify-center ${isRecording ? 'bg-destructive' : 'bg-primary'}`}
      >
        <Text className="text-white text-lg">{isRecording ? "🛑" : "🎙️"}</Text>
      </Pressable>

      {recordingUri && (
        <Button className="mt-5 bg-accent" onPress={evaluarPronunciacion}>
          {isEvaluating ? <ActivityIndicator color="#fff" /> : "Evaluar Pronunciación 🎯"}
        </Button>
      )}

      {evaluationScore !== null && (
        <Text className="mt-4 text-lg font-semibold">
          Coincidencia: {evaluationScore.toFixed(1)}% {evaluationScore >= 75 ? "✅ ¡Aprobado!" : "❌ Inténtalo de nuevo"}
        </Text>
      )}
    </View>
  );
}