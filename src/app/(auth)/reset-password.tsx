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
    // 1. Verificación Inicial Rápida: ¿Ya capturó la sesión de forma directa?
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setHasSession(true);
      }
    });

    // 2. Verificación por URL (Clave para Web/Render): 
    // Si la URL contiene tokens de acceso o tipo de recuperación, forzamos el acceso legítimo.
    if (typeof window !== 'undefined' && window.location?.hash) {
      const hash = window.location.hash;
      if (hash.includes('access_token') || hash.includes('type=recovery')) {
        setHasSession(true);
      }
    }

    // 3. Escuchador de Eventos de Supabase convencional
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN' || session) {
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
      // Intentamos actualizar directamente en la base de datos
      const { error: updateError } = await supabase.auth.updateUser({
        password: trimmedPass,
      });

      if (updateError) {
        setIsError(true);
        if (updateError.message.includes('session') || updateError.status === 401) {
          setMessage('Error de sesión: Por seguridad, solicita un nuevo enlace desde el Login.');
        } else {
          setMessage(`No se pudo actualizar: ${updateError.message}`);
        }
        console.error('[AUTH] Update password error:', updateError);
      } else {
        setIsError(false);
        setMessage('¡Contraseña actualizada con éxito! Redirigiendo...');
        
        // Limpiamos la sesión por seguridad tras cambiar clave para forzar un re-login limpio
        await supabase.auth.signOut();

        setTimeout(() => {
          router.replace('/(auth)/sign-in');
        }, 2500);
      }
    } catch (err) {
      setIsError(true);
      setMessage('Ocurrió un error inesperado.');
      console.error('[AUTH] Update password exception:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior="padding"
      style={{ flex: 1, backgroundColor: '#1B5E20' }}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 30 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Image
          source={require('@/../assets/image.png')}
          style={{ width: '100%', height: 220 }}
          contentFit="cover"
        />

        <View style={{ paddingHorizontal: 24, paddingTop: 20 }}>
          <Text style={{ fontSize: 24, fontWeight: '900', color: '#FFFFFF', textAlign: 'center' }}>
            Nueva Contraseña
          </Text>
          <Text style={{ fontSize: 13, color: '#F59E0B', textAlign: 'center', marginTop: 4, fontWeight: '600' }}>
            Ingresa tu nueva clave de acceso para asegurar tu cuenta
          </Text>

          <View style={{ marginTop: 24, gap: 16 }}>
            {/* Campo Nueva Contraseña */}
            <View>
              <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 6, fontWeight: '600' }}>
                Nueva Contraseña
              </Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Mínimo 6 caracteres"
                placeholderTextColor="rgba(255,255,255,0.4)"
                secureTextEntry={!showPassword}
                style={{
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  color: '#FFFFFF',
                  fontSize: 15,
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.2)',
                }}
              />
            </View>

            {/* Campo Confirmar Contraseña */}
            <View>
              <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 6, fontWeight: '600' }}>
                Confirmar Contraseña
              </Text>
              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Repite tu contraseña"
                placeholderTextColor="rgba(255,255,255,0.4)"
                secureTextEntry={!showPassword}
                style={{
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  color: '#FFFFFF',
                  fontSize: 15,
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.2)',
                }}
              />
            </View>

            <Pressable 
              onPress={() => setShowPassword(!showPassword)}
              style={{ alignSelf: 'flex-end' }}
            >
              <Text style={{ color: '#F59E0B', fontSize: 12, fontWeight: '700' }}>
                {showPassword ? 'OCULTAR CONTRASEÑAS' : 'VER CONTRASEÑAS'}
              </Text>
            </Pressable>

            {message ? (
              <Text style={{ color: isError ? '#FF6B6B' : '#81C784', fontSize: 13, textAlign: 'center', fontWeight: '600' }}>
                {message}
              </Text>
            ) : null}

            <Pressable onPress={handleUpdatePassword} disabled={loading}>
              <View
                style={{
                  backgroundColor: '#F59E0B',
                  borderRadius: 14,
                  paddingVertical: 16,
                  alignItems: 'center',
                  opacity: loading ? 0.7 : 1,
                  marginTop: 10,
                }}
              >
                {loading ? (
                  <ActivityIndicator color="#1B5E20" />
                ) : (
                  <Text style={{ color: '#1B5E20', fontSize: 16, fontWeight: '800' }}>
                    Actualizar Contraseña
                  </Text>
                )}
              </View>
            </Pressable>

            <Pressable onPress={() => router.replace('/(auth)/sign-in')}>
              <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, textAlign: 'center', textDecorationLine: 'underline', marginTop: 10 }}>
                Volver al inicio de sesión
              </Text>
            </Pressable>

          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}