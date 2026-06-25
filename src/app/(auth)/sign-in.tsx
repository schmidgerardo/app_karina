import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { supabase } from '@/client/supabase';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';

// Requerido para OAuth en móvil
WebBrowser.maybeCompleteAuthSession();

export default function SignInScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [error, setError] = useState('');
  const [agreed, setAgreed] = useState(false);

  const [resetModalVisible, setResetModalVisible] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Por favor, ingresa tu email y contraseña.');
      return;
    }
    if (!agreed) {
      setError('Debes aceptar los términos y condiciones.');
      return;
    }
    setError('');
    setLoading(true);
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: password.trim(),
    });
    if (authError) {
      setError('Credenciales incorrectas o error de conexión.');
      setLoading(false);
    } else {
      router.replace('/(app)/(tabs)');
    }
  };

  const handleGoogleLogin = async () => {
    if (!agreed) {
      setError('Debes aceptar los términos.');
      return;
    }
    setError('');
    setLoadingGoogle(true);

    try {
      const redirectUrl = Linking.createURL('/(auth)/sign-in');

      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: Platform.OS !== 'web',
        },
      });

      if (oauthError) throw oauthError;

      if (Platform.OS !== 'web' && data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
        if (result.type === 'success') {
          // El listener en ctx.tsx procesará la sesión
        }
      }
    } catch (err) {
      setError('Error al conectar con Google.');
    } finally {
      setLoadingGoogle(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetEmail.trim()) {
      setResetMessage('Ingresa tu correo.');
      return;
    }
    setResetLoading(true);
    
    const resetRedirect = Platform.OS === 'web' 
      ? 'https://app-karina.onrender.com/reset-password'
      : Linking.createURL('/reset-password');

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      resetEmail.trim(),
      { redirectTo: resetRedirect }
    );

    if (resetError) {
      setResetMessage('No se pudo enviar el enlace.');
    } else {
      setResetSuccess(true);
      setResetMessage('¡Enlace enviado! Revisa tu correo.');
    }
    setResetLoading(false);
  };

  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1, backgroundColor: '#1B5E20' }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 30 }} keyboardShouldPersistTaps="handled">
        <Image source={require('@/../assets/image.png')} style={{ width: '100%', height: 220 }} contentFit="cover" />
        
        <View style={{ paddingHorizontal: 24, paddingTop: 20 }}>
          <Text style={{ fontSize: 28, fontWeight: '900', color: '#FFFFFF', textAlign: 'center' }}>KARIÑA</Text>
          
          <View style={{ marginTop: 24, gap: 14 }}>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Correo"
              placeholderTextColor="#AAA"
              style={{
                backgroundColor: 'rgba(255,255,255,0.1)',
                borderRadius: 12,
                padding: 16,
                color: '#FFF',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.2)'
              }}
              autoCapitalize="none"
            />
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Contraseña"
              placeholderTextColor="#AAA"
              secureTextEntry={!showPassword}
              style={{
                backgroundColor: 'rgba(255,255,255,0.1)',
                borderRadius: 12,
                padding: 16,
                color: '#FFF',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.2)'
              }}
            />
            
            <Pressable onPress={() => setAgreed(!agreed)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 5 }}>
              <View style={{
                width: 22,
                height: 22,
                borderRadius: 6,
                borderWidth: 2,
                borderColor: agreed ? '#F59E0B' : '#FFF',
                backgroundColor: agreed ? '#F59E0B' : 'transparent',
                justifyContent: 'center',
                alignItems: 'center'
              }}>
                {agreed && <Text style={{ color: '#1B5E20', fontWeight: 'bold' }}>✓</Text>}
              </View>
              <Text style={{ color: '#FFF', fontSize: 13, flex: 1 }}>Acepto términos y condiciones</Text>
            </Pressable>

            {error ? <Text style={{ color: '#FF6B6B', textAlign: 'center', fontSize: 13 }}>{error}</Text> : null}

            <Pressable
              onPress={handleLogin}
              disabled={loading}
              style={{
                backgroundColor: '#F59E0B',
                padding: 18,
                borderRadius: 14,
                alignItems: 'center',
                marginTop: 10
              }}
            >
              {loading ? <ActivityIndicator color="#1B5E20" /> : <Text style={{ color: '#1B5E20', fontWeight: '900', fontSize: 16 }}>Entrar</Text>}
            </Pressable>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 10 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.2)' }} />
              <Text style={{ color: 'rgba(255,255,255,0.5)' }}>o</Text>
              <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.2)' }} />
            </View>

            <Pressable
              onPress={handleGoogleLogin}
              disabled={loadingGoogle}
              style={{
                backgroundColor: '#FFF',
                padding: 16,
                borderRadius: 14,
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'center',
                gap: 12
              }}
            >
              {loadingGoogle ? <ActivityIndicator color="#1B5E20" /> : (
                <>
                  <Text style={{ fontSize: 18 }}>G</Text> 
                  <Text style={{ color: '#1B5E20', fontWeight: '700' }}>Continuar con Google</Text>
                </>
              )}
            </Pressable>

            <View style={{ marginTop: 20, gap: 15 }}>
              <Pressable onPress={() => setResetModalVisible(true)}>
                <Text style={{ color: '#F59E0B', textAlign: 'center', fontSize: 13, fontWeight: '600' }}>
                  ¿Olvidaste tu contraseña?
                </Text>
              </Pressable>

              <Pressable onPress={() => router.push('/(auth)/sign-up')}>
                <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 5 }}>
                  <Text style={{ color: '#FFF', opacity: 0.8 }}>¿No tienes cuenta?</Text>
                  <Text style={{ color: '#F59E0B', fontWeight: 'bold' }}>Regístrate</Text>
                </View>
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Modal de recuperación de contraseña (sin cambios) */}
      <Modal visible={resetModalVisible} transparent animationType="slide">
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View style={{ backgroundColor: '#FFF', padding: 30, borderTopLeftRadius: 20, borderTopRightRadius: 20 }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 10 }}>Recuperar Contraseña</Text>
            <TextInput
              value={resetEmail}
              onChangeText={setResetEmail}
              placeholder="Tu correo"
              style={{ borderBottomWidth: 1, padding: 10, marginBottom: 20 }}
            />
            {resetMessage ? <Text style={{ color: resetSuccess ? 'green' : 'red', marginBottom: 10 }}>{resetMessage}</Text> : null}
            <Pressable onPress={handleResetPassword} style={{ backgroundColor: '#1B5E20', padding: 15, borderRadius: 10, alignItems: 'center' }}>
              <Text style={{ color: '#FFF' }}>Enviar Enlace</Text>
            </Pressable>
            <Pressable onPress={() => setResetModalVisible(false)} style={{ marginTop: 15 }}>
              <Text style={{ textAlign: 'center', color: '#666' }}>Cerrar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}