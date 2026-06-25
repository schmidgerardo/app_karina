import { useState, useEffect } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/client/supabase';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    // Verificar si el link inyectó la sesión correctamente
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setHasSession(true);
    });
  }, []);

  const handleUpdate = async () => {
    if (password.length < 6) {
      setMessage('Mínimo 6 caracteres.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setMessage('Error: El enlace expiró.');
    } else {
      setMessage('¡Éxito! Redirigiendo...');
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
          <TextInput value={password} onChangeText={setPassword} placeholder="Nueva contraseña" placeholderTextColor="#AAA" secureTextEntry style={{ backgroundColor: 'rgba(255,255,255,0.1)', padding: 15, borderRadius: 10, color: '#FFF' }} />
          {message ? <Text style={{ color: '#F59E0B', textAlign: 'center' }}>{message}</Text> : null}
          <Pressable onPress={handleUpdate} style={{ backgroundColor: '#F59E0B', padding: 15, borderRadius: 10, alignItems: 'center' }}>
            <Text style={{ fontWeight: '800' }}>Actualizar</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}