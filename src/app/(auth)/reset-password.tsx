import { useState, useEffect } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { supabase } from '@/client/supabase';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    // 1. Validar si ya existe sesión activa local inyectada por el Deep Link
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setHasSession(true);
      }
    });

    // 2. Interceptar evento de recuperación del Hash para Web y Móvil
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) {
        setHasSession(true);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleUpdatePassword = async () => {
    const trimmedPass = password.trim();
    const trimmedConfirm = confirmPassword.trim();

    if (!trimmedPass || !trimmedConfirm) {
      setIsError(true);
      setMessage('Por favor, completa ambos campos.');
      return;
    }

    if (trimmedPass.length < 6) {
      setIsError(true);
      setMessage('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (trimmedPass !== trimmedConfirm) {
      setIsError(true);
      setMessage('Las contraseñas no coinciden.');
      return;
    }

    setIsError(false);
    setLoading(true);
    setMessage('');

    try {
      // Al venir del enlace, Supabase ya activó los privilegios temporales de actualización
      const { error: updateError } = await supabase.auth.updateUser({
        password: trimmedPass,
      });

      if (updateError) {
        setIsError(true);
        if (updateError.status === 401 || updateError.message.includes('session')) {
          setMessage('El token de recuperación expiró. Solicita un nuevo enlace.');
        } else {
          setMessage(`Error técnico: ${updateError.message}`);
        }
        console.error('[AUTH] Update password error:', updateError);
      } else {
        setIsError(false);
        setMessage('¡Contraseña actualizada con éxito! Redirigiendo...');

        // Forzamos el guardado de la nueva sesión y luego deslogueamos de forma segura
        await supabase.auth.getSession();
        await supabase.auth.signOut();

        setTimeout(() => {
          router.replace('/(auth)/sign-in');
        }, 2000);
      }
    } catch (err) {
      setIsError(true);
      setMessage('Ocurrió un error inesperado al procesar el cambio.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1, backgroundColor: '#1B5E20' }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 30 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Image source={require('@/../assets/image.png')} style={{ width: '100%', height: 220 }} contentFit="cover" />

        <View style={{ paddingHorizontal: 24, paddingTop: 20 }}>
          <Text style={{ fontSize: 24, fontWeight: '900', color: '#FFFFFF', textAlign: 'center' }}>Nueva Contraseña</Text>
          <Text style={{ fontSize: 13, color: '#F59E0B', textAlign: 'center', marginTop: 4, fontWeight: '600' }}>Establece tu nueva credencial de seguridad</Text>

          {!hasSession ? (
            <View style={{ marginTop: 40, alignItems: 'center', gap: 10 }}>
              <ActivityIndicator size="large" color="#F59E0B" />
              <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '500', textAlign: 'center' }}>Sincronizando sesión de recuperación segura...</Text>
            </View>
          ) : (
            <View style={{ marginTop: 24, gap: 16 }}>
              <View>
                <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 6, fontWeight: '600' }}>Nueva Contraseña</Text>
                <TextInput value={password} onChangeText={setPassword} placeholder="Mínimo 6 caracteres" placeholderTextColor="rgba(255,255,255,0.4)" secureTextEntry={!showPassword} style={{ backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, color: '#FFFFFF', fontSize: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }} />
              </View>

              <View>
                <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 6, fontWeight: '600' }}>Confirmar Contraseña</Text>
                <TextInput value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Repite tu contraseña" placeholderTextColor="rgba(255,255,255,0.4)" secureTextEntry={!showPassword} style={{ backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, color: '#FFFFFF', fontSize: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }} />
              </View>

              <Pressable onPress={() => setShowPassword(!showPassword)} style={{ alignSelf: 'flex-end' }}>
                <Text style={{ color: '#F59E0B', fontSize: 12, fontWeight: '700' }}>{showPassword ? 'OCULTAR CONTRASEÑAS' : 'VER CONTRASEÑAS'}</Text>
              </Pressable>

              {message ? <Text style={{ color: isError ? '#FF6B6B' : '#81C784', fontSize: 13, textAlign: 'center', fontWeight: '600' }}>{message}</Text> : null}

              <Pressable onPress={handleUpdatePassword} disabled={loading}>
                <View style={{ backgroundColor: '#F59E0B', borderRadius: 14, paddingVertical: 16, alignItems: 'center', opacity: loading ? 0.7 : 1, marginTop: 10 }}>
                  {loading ? <ActivityIndicator color="#1B5E20" /> : <Text style={{ color: '#1B5E20', fontSize: 16, fontWeight: '800' }}>Actualizar Contraseña</Text>}
                </View>
              </Pressable>
            </View>
          )}

          <Pressable onPress={() => router.replace('/(auth)/sign-in')}>
            <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, textAlign: 'center', textDecorationLine: 'underline', marginTop: 20 }}>Volver al inicio de sesión</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}