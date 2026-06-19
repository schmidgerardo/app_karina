import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';
import { supabase } from '@/client/supabase';

interface Word {
  id: string;
  palabra_karina: string;
  traduccion_espanol: string;
  audio_url?: string;
}

export default function PracticarPronunciacionScreen() {
  const router = useRouter();
  const [words, setWords] = useState<Word[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [permissionResponse, requestPermission] = Audio.usePermissions();
  
  const soundRef = useRef<Audio.Sound | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadWords();
    return () => {
      cleanup();
    };
  }, []);

  async function loadWords() {
    setLoading(true);
    const { data } = await supabase
      .from('words')
      .select('id, palabra_karina, traduccion_espanol');
    
    if (data) {
      setWords(data as Word[]);
      // Mezclar palabras
      setWords(shuffleArray(data as Word[]));
    }
    setLoading(false);
  }

  async function cleanup() {
    if (soundRef.current) {
      await soundRef.current.unloadAsync();
    }
    if (recordingRef.current) {
      await recordingRef.current.stopAndUnloadAsync();
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
    }
  }

  async function playAudio() {
    try {
      // Por ahora, usamos Text-to-Speech ya que no tenemos URLs de audio
      // En producción, usarías: await soundRef.current.loadAsync({ uri: word.audio_url });
      
      const currentWord = words[currentIndex];
      if (!currentWord) return;
      
      // Usar síntesis de voz del sistema (requiere expo-speech)
      // Instalar: npx expo install expo-speech
      const Speech = require('expo-speech');
      
      setIsPlaying(true);
      await Speech.speak(currentWord.palabra_karina, {
        language: 'es',
        pitch: 1,
        rate: 0.9,
        onDone: () => setIsPlaying(false),
        onError: () => setIsPlaying(false),
      });
    } catch (error) {
      console.error('Error reproduciendo audio:', error);
      setIsPlaying(false);
      Alert.alert('Error', 'No se pudo reproducir el audio');
    }
  }

  async function startRecording() {
    try {
      // Solicitar permisos en Android
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: 'Permiso de micrófono',
            message: 'La app necesita acceso al micrófono para grabar tu pronunciación',
            buttonNeutral: 'Preguntar después',
            buttonNegative: 'Cancelar',
            buttonPositive: 'OK',
          }
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert('Permiso denegado', 'No se puede grabar sin permiso de micrófono');
          return;
        }
      }

      // Configurar audio para grabación
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // Iniciar grabación
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = recording;
      setIsRecording(true);
      setRecordingDuration(0);

      // Timer para contar duración
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('Error al grabar:', error);
      Alert.alert('Error', 'No se pudo iniciar la grabación');
    }
  }

  async function stopRecording() {
    try {
      if (!recordingRef.current) return;

      // Detener timer
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }

      setIsRecording(false);
      await recordingRef.current.stopAndUnloadAsync();
      
      const uri = recordingRef.current.getURI();
      
      // Aquí puedes procesar el audio grabado
      // Por ejemplo: enviar a un servicio de reconocimiento de voz
      await processRecording(uri);
      
      recordingRef.current = null;

      // Restaurar modo de audio
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });

    } catch (error) {
      console.error('Error al detener grabación:', error);
      Alert.alert('Error', 'Error al procesar la grabación');
    }
  }

  async function processRecording(uri: string | null) {
    // Aquí implementarías la lógica de evaluación de pronunciación
    // Por ahora, solo mostramos un mensaje
    Alert.alert(
      '¡Grabación completada!',
      `Has grabado ${recordingDuration} segundos.\nComparando con la pronunciación correcta...`,
      [
        {
          text: 'Continuar',
          onPress: () => {
            // Avanzar a siguiente palabra
            if (currentIndex < words.length - 1) {
              setCurrentIndex(currentIndex + 1);
            } else {
              Alert.alert('¡Felicidades!', 'Completaste todas las palabras');
            }
          }
        }
      ]
    );
  }

  function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#2E7D32" />
      </SafeAreaView>
    );
  }

  const currentWord = words[currentIndex];
  const progress = ((currentIndex + 1) / words.length) * 100;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← Volver</Text>
        </Pressable>
        <Text style={styles.title}>🎤 Practicar Pronunciación</Text>
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.progressText}>
            {currentIndex + 1} de {words.length}
          </Text>
        </View>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        {/* Palabra actual */}
        <View style={styles.wordCard}>
          <Text style={styles.wordLabel}>Palabra Kariña</Text>
          <Text style={styles.wordText}>{currentWord?.palabra_karina}</Text>
          <Text style={styles.translationText}>
            {currentWord?.traduccion_espanol}
          </Text>
        </View>

        {/* Instrucciones */}
        <View style={styles.instructions}>
          <Text style={styles.instructionsText}>
            1. Escucha la pronunciación correcta
          </Text>
          <Text style={styles.instructionsText}>
            2. Graba tu pronunciación
          </Text>
          <Text style={styles.instructionsText}>
            3. Compara y mejora
          </Text>
        </View>

        {/* Botones de acción */}
        <View style={styles.actions}>
          {/* Botón Reproducir */}
          <Pressable 
            onPress={playAudio}
            disabled={isPlaying}
            style={[styles.actionButton, styles.playButton]}
          >
            <Text style={styles.buttonEmoji}>🔊</Text>
            <Text style={styles.buttonText}>
              {isPlaying ? 'Reproduciendo...' : 'Escuchar'}
            </Text>
          </Pressable>

          {/* Botón Grabar */}
          {!isRecording ? (
            <Pressable 
              onPress={startRecording}
              style={[styles.actionButton, styles.recordButton]}
            >
              <Text style={styles.buttonEmoji}>🎙️</Text>
              <Text style={styles.buttonText}>Grabar</Text>
            </Pressable>
          ) : (
            <Pressable 
              onPress={stopRecording}
              style={[styles.actionButton, styles.stopButton]}
            >
              <Text style={styles.buttonEmoji}>⏹️</Text>
              <Text style={styles.buttonText}>
                Detener ({formatTime(recordingDuration)})
              </Text>
            </Pressable>
          )}
        </View>

        {/* Consejos */}
        <View style={styles.tips}>
          <Text style={styles.tipsTitle}>💡 Consejos:</Text>
          <Text style={styles.tipsText}>
            • Habla claramente y a un volumen adecuado
          </Text>
          <Text style={styles.tipsText}>
            • Escucha la pronunciación varias veces si es necesario
          </Text>
          <Text style={styles.tipsText}>
            • Practica hasta sentirte seguro
          </Text>
        </View>

        {/* Navegación */}
        <View style={styles.navigation}>
          <Pressable 
            onPress={() => {
              if (currentIndex > 0) {
                setCurrentIndex(currentIndex - 1);
              }
            }}
            style={[styles.navButton, currentIndex === 0 && styles.navButtonDisabled]}
            disabled={currentIndex === 0}
          >
            <Text style={styles.navButtonText}>← Anterior</Text>
          </Pressable>
          
          <Pressable 
            onPress={() => {
              if (currentIndex < words.length - 1) {
                setCurrentIndex(currentIndex + 1);
              } else {
                Alert.alert('¡Completado!', 'Has practicado todas las palabras');
              }
            }}
            style={styles.navButton}
          >
            <Text style={styles.navButtonText}>Siguiente →</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#2E7D32',
    padding: 20,
    paddingTop: 10,
  },
  backButton: {
    marginBottom: 10,
  },
  backText: {
    color: '#FFF',
    fontSize: 16,
  },
  title: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  progressContainer: {
    marginTop: 5,
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFD700',
    borderRadius: 4,
  },
  progressText: {
    color: '#FFF',
    fontSize: 12,
    marginTop: 5,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  wordCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 20,
  },
  wordLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  wordText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 10,
  },
  translationText: {
    fontSize: 18,
    color: '#1565C0',
  },
  instructions: {
    backgroundColor: '#E8EAF6',
    borderRadius: 15,
    padding: 15,
    marginBottom: 20,
  },
  instructionsText: {
    fontSize: 14,
    color: '#333',
    marginVertical: 5,
  },
  actions: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 20,
  },
  actionButton: {
    flex: 1,
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  playButton: {
    backgroundColor: '#2196F3',
  },
  recordButton: {
    backgroundColor: '#F44336',
  },
  stopButton: {
    backgroundColor: '#FF9800',
  },
  buttonEmoji: {
    fontSize: 24,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  tips: {
    backgroundColor: '#FFF9C4',
    borderRadius: 15,
    padding: 15,
    marginBottom: 20,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F57F17',
    marginBottom: 10,
  },
  tipsText: {
    fontSize: 13,
    color: '#666',
    marginVertical: 3,
  },
  navigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 15,
  },
  navButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  navButtonDisabled: {
    backgroundColor: '#CCC',
  },
  navButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

function shuffleArray<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}