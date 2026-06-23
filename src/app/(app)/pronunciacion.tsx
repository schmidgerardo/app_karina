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
      await recordingInstance.stopAndUnloadAsync();
      const uri = recordingInstance.getURI();
      setRecordingUri(uri); // Guardamos la ruta local temporal
    } catch (err) {
      console.error("Error al detener la grabación", err);
    }
  }

  // 3. LA BIFURCACIÓN ESTRATÉGICA (Con medición de tiempos reales)
  async function evaluarPronunciacion() {
    if (!recordingUri) return;

    if (isConnected) {
      setIsEvaluating(true);
      const tiempoInicio = performance.now(); // ⏱️ Inicia el cronómetro técnico

      try {
        const formData = new FormData();
        formData.append('audio_estudiante', {
          uri: recordingUri,
          name: 'intento.m4a',
          type: 'audio/m4a',
        } as any);

        // 🎯 AJUSTE: Si word_id no viene del router (clic directo), mandamos un fallback estático para testear
        const activeWordId = (word_id as string) || 'palabra_prueba_general';
        formData.append('word_id', activeWordId);

        const res = await fetch('https://api-pronunciacion-karina.onrender.com/comparar', {
          method: 'POST',
          body: formData,
        });
        
        const data = await res.json();
        
        const tiempoFin = performance.now(); // ⏱️ Detiene el cronómetro
        const totalSegundos = ((tiempoFin - tiempoInicio) / 1000).toFixed(2);

        if (data.success) {
          setEvaluationScore(data.score); // Ej: 78.5%
          console.log(`🎯 ¡Evaluación exitosa! Servidor tardó exactamente ${totalSegundos} segundos en responder.`);
        } else {
          console.error("La API de Python devolvió un error controlado:", data.error);
        }
      } catch (e) {
        console.error("Error crítico de red con el servidor de Render", e);
      } finally {
        setIsEvaluating(false);
      }
    } else {
      // 📴 MODO OFFLINE: "Espejo Acústico" analógico
      console.log("Modo Offline: Reproduciendo audios en paralelo para autoevaluación");
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