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

export default function SignInScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [error, setError] = useState('');
  const [agreed, setAgreed] = useState(false);

  // ── Modal de recuperación de contraseña ────────────────────────────────────
  const [resetModalVisible, setResetModalVisible] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);

  // ── Login con email y contraseña ───────────────────────────────────────────
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
        if (authError.message.includes('Invalid login credentials')) {
          setError('El usuario o la contraseña no coinciden con nuestros registros.');
        } else {
          setError('Ocurrió un inconveniente al evaluar tus credenciales. Por favor, inténtalo de nuevo.');
        }
      } else {
        await supabase.auth.getSession();
        router.replace('/(app)/(tabs)');
      }
    } catch (err) {
      setError('Error inesperado durante la inspección de la cuenta.');
    } finally {
      setLoading(false);
    }
  };

  // ── Login con Google OAuth Híbrido Corregido ──────────────────────────────
  const handleGoogleLogin = async () => {
    if (!agreed) {
      setError('Debes aceptar los términos y condiciones para continuar.');
      return;
    }

    setError('');
    setLoadingGoogle(true);

    // Generación dinámica y segura del URI de redirección oficial de Expo
    const redirectUrl = AuthSession.makeRedirectUri({
      scheme: 'appkarina',
      preferLocalhost: false,
    });

    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: false,
        },
      });

      if (oauthError) {
        setError('No se pudo iniciar sesión con Google. Inténtalo de nuevo.');
        console.error('[AUTH] Google OAuth error:', oauthError);
      }
    } catch (err) {
      setError('Error inesperado al conectar con Google.');
      console.error('[AUTH] Google OAuth exception:', err);
    } finally {
      setLoadingGoogle(false);
    }
  };

  // ── Recuperar contraseña Híbrido por Enlace Seguro ────────────────────────
  const handleResetPassword = async () => {
    const trimmedEmail = resetEmail.trim();

    if (!trimmedEmail) {
      setResetMessage('Por favor, ingresa tu correo electrónico.');
      return;
    }

    setResetLoading(true);
    setResetMessage('');
    setResetSuccess(false);

    // Creamos la redirección dependiendo de dónde esté corriendo el sistema
    const resetRedirect = Platform.OS === 'web'
      ? 'https://app-karina.onrender.com/reset-password'
      : AuthSession.makeRedirectUri({ scheme: 'appkarina', path: 'reset-password' });

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        trimmedEmail,
        { redirectTo: resetRedirect }
      );

      if (resetError) {
        setResetMessage('No se pudo enviar el enlace. Verifica el correo ingresado.');
        console.error('[AUTH] Reset password error:', resetError);
      } else {
        setResetSuccess(true);
        setResetMessage('¡Enlace enviado con éxito! Revisa tu bandeja de entrada o spam.');
      }
    } catch (err) {
      setResetMessage('Error inesperado. Inténtalo de nuevo.');
      console.error('[AUTH] Reset password exception:', err);
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1, backgroundColor: '#1B5E20' }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 30 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Image source={require('@/../assets/image.png')} style={{ width: '100%', height: 220 }} contentFit="cover" />

        <View style={{ paddingHorizontal: 24, paddingTop: 20 }}>
          <Text style={{ fontSize: 28, fontWeight: '900', color: '#FFFFFF', textAlign: 'center' }}>KARIÑA</Text>
          <Text style={{ fontSize: 14, color: '#F59E0B', textAlign: 'center', marginTop: 4, fontWeight: '600' }}>Idioma Indígena · Estado Bolívar, Venezuela</Text>

          <View style={{ marginTop: 24, gap: 14 }}>
            <View>
              <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 6, fontWeight: '600' }}>Correo</Text>
              <TextInput value={email} onChangeText={setEmail} placeholder="Tu correo electrónico" placeholderTextColor="rgba(255,255,255,0.4)" autoCapitalize="none" keyboardType="email-address" style={{ backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, color: '#FFFFFF', fontSize: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }} />
            </View>

            <View>
              <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 6, fontWeight: '600' }}>Contraseña</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TextInput value={password} onChangeText={setPassword} placeholder="Tu contraseña" placeholderTextColor="rgba(255,255,255,0.4)" secureTextEntry={!showPassword} style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, color: '#FFFFFF', fontSize: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }} />
                <Pressable onPress={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: 14 }}><Text style={{ color: '#F59E0B', fontSize: 12, fontWeight: '700' }}>{showPassword ? 'OCULTAR' : 'VER'}</Text></Pressable>
              </View>
            </View>

            {error ? <Text style={{ color: '#FF6B6B', fontSize: 12, textAlign: 'center' }}>{error}</Text> : null}

            <Pressable onPress={() => setAgreed(!agreed)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ width: 20, height: 20, borderRadius: 4, borderWidth: 2, borderColor: agreed ? '#F59E0B' : 'rgba(255,255,255,0.4)', backgroundColor: agreed ? '#F59E0B' : 'transparent', alignItems: 'center', justifyCenter: 'center' }}>{agreed && <Text style={{ color: '#1B5E20', fontSize: 12, fontWeight: '800' }}>✓</Text>}</View>
              <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', flex: 1 }}>Acepto los Términos de Servicio y la Política de Privacidad</Text>
            </Pressable>

            <Pressable onPress={handleLogin} disabled={loading}>
              <View style={{ backgroundColor: '#F59E0B', borderRadius: 14, paddingVertical: 16, alignItems: 'center', opacity: loading ? 0.7 : 1 }}>{loading ? <ActivityIndicator color="#1B5E20" /> : <Text style={{ color: '#1B5E20', fontSize: 16, fontWeight: '800' }}>Entrar</Text>}</View>
            </Pressable>

            <Pressable onPress={() => { setResetEmail(''); setResetMessage(''); setResetSuccess(false); setResetModalVisible(true); }}>
              <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, textAlign: 'center', textDecorationLine: 'underline' }}>¿Olvidó su contraseña?</Text>
            </Pressable>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 8 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.2)' }} />
              <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>o</Text>
              <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.2)' }} />
            </View>

            <Pressable onPress={handleGoogleLogin} disabled={loadingGoogle}>
              <View style={{ backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 14, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', opacity: loadingGoogle ? 0.7 : 1, flexDirection: 'row', justifyContent: 'center', gap: 10 }}>{loadingGoogle ? <ActivityIndicator color="#1B5E20" /> : <><Text style={{ fontSize: 18 }}>🔵</Text><Text style={{ color: '#1B5E20', fontSize: 14, fontWeight: '700' }}>Entrar con Google</Text></>}</View>
            </Pressable>

            <Pressable onPress={() => router.push('/(auth)/sign-up')}>
              <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 4, marginTop: 8 }}><Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>¿No tienes cuenta?</Text><Text style={{ color: '#F59E0B', fontSize: 13, fontWeight: '700' }}>Regístrate</Text></View>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      {/* Modal Unificado Impecable */}
      <Modal visible={resetModalVisible} transparent animationType="slide" onRequestClose={() => setResetModalVisible(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 28, gap: 16 }}>
            <Text style={{ fontSize: 20, fontWeight: '900', color: '#1B5E20', textAlign: 'center' }}>Recuperar Contraseña</Text>
            <Text style={{ fontSize: 13, color: '#666', textAlign: 'center', lineHeight: 20 }}>Ingresa tu correo institucional o personal. Te enviaremos un enlace de restauración oficial.</Text>

            <TextInput value={resetEmail} onChangeText={setResetEmail} placeholder="Tu correo electrónico" placeholderTextColor="#AAA" autoCapitalize="none" keyboardType="email-address" style={{ backgroundColor: '#F5F5F5', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, color: '#1A2E1A', fontSize: 15, borderWidth: 1, borderColor: '#E0E0E0' }} />

            {resetMessage ? <Text style={{ fontSize: 13, textAlign: 'center', color: resetSuccess ? '#2E7D32' : '#C62828', fontWeight: '600' }}>{resetMessage}</Text> : null}

            <Pressable onPress={handleResetPassword} disabled={resetLoading}>
              <View style={{ backgroundColor: '#1B5E20', borderRadius: 14, paddingVertical: 16, alignItems: 'center', opacity: resetLoading ? 0.7 : 1 }}>{resetLoading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '800' }}>Enviar Enlace</Text>}</View>
            </Pressable>

            <Pressable onPress={() => setResetModalVisible(false)}><Text style={{ color: '#888', fontSize: 13, textAlign: 'center', fontWeight: '600' }}>Cancelar</Text></Pressable>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}