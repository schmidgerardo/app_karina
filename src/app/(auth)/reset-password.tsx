import { useState, useEffect } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/client/supabase';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [hasSession, setHasSession] = useState(false);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      // En web, esperamos un momento a que Supabase procese el hash de la URL
      if (Platform.OS === 'web' && window.location.hash) {
        await supabase.auth.getSession();
      }
      
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setHasSession(true);
      } else {
        // Si pasan 5 segundos y no hay sesión, avisar al usuario
        setTimeout(() => {
          if (!hasSession) {
            setIsError(true);
            setMessage('No se detectó una sesión de recuperación válida.');
          }
        }, 5000);
      }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // El evento 'PASSWORD_RECOVERY' es disparado específicamente por el link del correo
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN' || session) {
        setHasSession(true);
        // Si se recupera la sesión, limpiamos el mensaje de error
        setIsError(false);
        setMessage('');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleUpdate = async () => {
    if (password.length < 6) {
      setMessage('Mínimo 6 caracteres.');
      setIsError(true);
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setMessage('Error: El enlace expiró.');
      setIsError(true);
    } else {
      setMessage('¡Éxito! Redirigiendo...');
      setIsError(false);
      await supabase.auth.signOut();
      setTimeout(() => router.replace('/(auth)/sign-in'), 2000);
    }
    setLoading(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#1B5E20', justifyContent: 'center', padding: 20 }}>
      <Text style={{ color: '#FFF', fontSize: 24, fontWeight: 'bold', textAlign: 'center' }}>Nueva Contraseña</Text>
      {!hasSession ? (
        <ActivityIndicator color="#F59E0B" style={{ marginTop: 20 }} />
      ) : (
        <View style={{ marginTop: 20, gap: 15 }}>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Nueva contraseña"
            placeholderTextColor="#AAA"
            secureTextEntry
            style={{ backgroundColor: 'rgba(255,255,255,0.1)', padding: 15, borderRadius: 10, color: '#FFF' }}
          />
          {message ? (
            <Text style={{ color: isError ? '#FF6B6B' : '#F59E0B', textAlign: 'center' }}>
              {message}
            </Text>
          ) : null}
          <Pressable
            onPress={handleUpdate}
            style={({ pressed }) => ({
              backgroundColor: pressed ? '#D48A0B' : '#F59E0B',
              padding: 15,
              borderRadius: 10,
              alignItems: 'center',
            })}
          >
            <Text style={{ fontWeight: '800' }}>Actualizar</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}