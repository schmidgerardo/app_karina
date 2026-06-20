import { useState } from 'react';
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

export default function SignInScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [agreed, setAgreed] = useState(false);

  const handleLogin = async () => {
    const trimmedEmail = email.trim();
    const trimmedPass = password.trim();

    if (!trimmedEmail || !trimmedPass) {
      setError('Por favor, ingresa tu email y contraseña.');
      return;
    }
    if (!agreed) {
      setError('Debes aceptar los términos y condiciones para continuar.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password: trimmedPass,
      });

      if (authError) {
        // Auditoría de errores comunes de autenticación
        if (authError.message.includes('Invalid login credentials')) {
          setError('El usuario o la contraseña no coinciden con nuestros registros.');
        } else {
          setError('Ocurrió un inconveniente al evaluar tus credenciales. Por favor, inténtalo de nuevo.');
        }
      } else {
        router.replace('/(app)/(tabs)');
      }
    } catch (err) {
      setError('Error inesperado durante la inspección de la cuenta.');
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
        {/* Imagen de indígenas */}
        <Image
          source={{ uri: 'https://miaoda-conversation-file.s3cdn.medo.dev/user-c6js8p49d4ao/app-c6jsx92bbkld/20260607/1000861193.jpg' }}
          style={{ width: '100%', height: 220 }}
          contentFit="cover"
        />

        <View style={{ paddingHorizontal: 24, paddingTop: 20 }}>
          {/* Título */}
          <Text style={{ fontSize: 28, fontWeight: '900', color: '#FFFFFF', textAlign: 'center' }}>
            KARIÑA
          </Text>
          <Text style={{ fontSize: 14, color: '#F59E0B', textAlign: 'center', marginTop: 4, fontWeight: '600' }}>
            Idioma Indígena · Estado Bolívar, Venezuela
          </Text>

          {/* Formulario */}
          <View style={{ marginTop: 24, gap: 14 }}>
            {/* Usuario */}
            <View>
              <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 6, fontWeight: '600' }}>
                Correo
              </Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="Tu correo electrónico"
                placeholderTextColor="rgba(255,255,255,0.4)"
                autoCapitalize="none"
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

            {/* Contraseña */}
            <View>
              <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 6, fontWeight: '600' }}>
                Contraseña
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Tu contraseña"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  secureTextEntry={!showPassword}
                  style={{
                    flex: 1,
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
                <Pressable
                  onPress={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: 14 }}
                >
                  <Text style={{ color: '#F59E0B', fontSize: 12, fontWeight: '700' }}>
                    {showPassword ? 'OCULTAR' : 'VER'}
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* Error */}
            {error ? (
              <Text style={{ color: '#FF6B6B', fontSize: 12, textAlign: 'center' }}>
                {error}
              </Text>
            ) : null}

            {/* User agreement */}
            <Pressable onPress={() => setAgreed(!agreed)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 4,
                  borderWidth: 2,
                  borderColor: agreed ? '#F59E0B' : 'rgba(255,255,255,0.4)',
                  backgroundColor: agreed ? '#F59E0B' : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {agreed && <Text style={{ color: '#1B5E20', fontSize: 12, fontWeight: '800' }}>✓</Text>}
              </View>
              <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', flex: 1 }}>
                Acepto los Términos de Servicio y la Política de Privacidad
              </Text>
            </Pressable>

            {/* Botón Entrar */}
            <Pressable onPress={handleLogin} disabled={loading}>
              <View
                style={{
                  backgroundColor: '#F59E0B',
                  borderRadius: 14,
                  paddingVertical: 16,
                  alignItems: 'center',
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? (
                  <ActivityIndicator color="#1B5E20" />
                ) : (
                  <Text style={{ color: '#1B5E20', fontSize: 16, fontWeight: '800' }}>
                    Entrar
                  </Text>
                )}
              </View>
            </Pressable>

            {/* Olvidó contraseña */}
            <Pressable onPress={() => { /* TODO */ }}>
              <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, textAlign: 'center', textDecorationLine: 'underline' }}>
                ¿Olvidó su contraseña?
              </Text>
            </Pressable>

            {/* Separador */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 8 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.2)' }} />
              <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>o</Text>
              <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.2)' }} />
            </View>

            {/* Botón Google (deshabilitado - Phase 1) */}
            <Pressable onPress={() => {}} disabled>
              <View
                style={{
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  borderRadius: 14,
                  paddingVertical: 14,
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.2)',
                  opacity: 0.5,
                }}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '600' }}>
                  🔒 Entrar con Google
                </Text>
              </View>
            </Pressable>

            {/* Registrarse */}
            <Pressable onPress={() => router.push('/(auth)/sign-up')}>
              <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 4, marginTop: 8 }}>
                <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>
                  ¿No tienes cuenta?
                </Text>
                <Text style={{ color: '#F59E0B', fontSize: 13, fontWeight: '700' }}>
                  Regístrate
                </Text>
              </View>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
