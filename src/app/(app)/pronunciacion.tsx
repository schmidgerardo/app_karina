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

  // 2. Funciones para controlar el micrófono (expo-av)
  async function startRecording() {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY // Genera un archivo limpio para análisis
      );
      setRecordingInstance(recording);
      setIsRecording(true);
    } catch (err) {
      console.error("Fallo al iniciar grabación", err);
    }
  }

  async function stopRecording() {
    if (!recordingInstance) return;
    setIsRecording(false);
    await recordingInstance.stopAndUnloadAsync();
    const uri = recordingInstance.getURI();
    setRecordingUri(uri); // Aquí guardamos la ruta local temporal del audio grabado
  }

  // 3. LA BIFURCACIÓN ESTRATÉGICA (El núcleo de tu tesis)
  async function evaluarPronunciacion() {
    if (!recordingUri) return;

    if (isConnected) {
      // 🌐 MODO ONLINE: Mandar el binario a tu microservicio de Python (Flask)
      setIsEvaluating(true);
      try {
        const formData = new FormData();
        formData.append('audio_estudiante', {
          uri: recordingUri,
          name: 'intento.m4a',
          type: 'audio/m4a',
        } as any);
        formData.append('word_id', word_id as string);

        const res = await fetch('https://api-pronunciacion-karina.onrender.com/comparar', {
          method: 'POST',
          body: formData,
        });
        const data = await res.json();
        setEvaluationScore(data.score); // Ej: 84.2%
      } catch (e) {
        console.error("Error en API de Render", e);
      } finally {
        setIsEvaluating(false);
      }
    } else {
      // 📴 MODO OFFLINE: "Espejo Acústico" analógico
      // Disparamos en simultáneo el audio nativo de referencia y el del alumno
      console.log("Modo Offline: Reproduciendo audios en paralelo para autoevaluación");
      // Aquí metes la lógica para reproducir tu audio local + el del nativo al mismo tiempo
    }
  }

  return (
    <View className="flex-1 bg-background p-5 items-center justify-center">
      {/* Tu UI limpia con las clases de NativeWind (Tailwind) */}
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