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
      // Creamos el redirect dinámico
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
        // En móvil abrimos el navegador y esperamos el resultado
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
    
    // URL de retorno: si es web usa la URL real, si es móvil usa el scheme
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
            <TextInput value={email} onChangeText={setEmail} placeholder="Correo" placeholderTextColor="#AAA" style={{ backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 16, color: '#FFF' }} autoCapitalize="none" />
            <TextInput value={password} onChangeText={setPassword} placeholder="Contraseña" placeholderTextColor="#AAA" secureTextEntry={!showPassword} style={{ backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 16, color: '#FFF' }} />
            
            <Pressable onPress={() => setAgreed(!agreed)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ width: 20, height: 20, borderWidth: 1, borderColor: '#FFF', backgroundColor: agreed ? '#F59E0B' : 'transparent' }} />
              <Text style={{ color: '#FFF', fontSize: 12 }}>Acepto términos y condiciones</Text>
            </Pressable>

            {error ? <Text style={{ color: '#FF6B6B', textAlign: 'center' }}>{error}</Text> : null}

            <Pressable onPress={handleLogin} disabled={loading} style={{ backgroundColor: '#F59E0B', padding: 16, borderRadius: 12, alignItems: 'center' }}>
              {loading ? <ActivityIndicator color="#1B5E20" /> : <Text style={{ fontWeight: '800' }}>Entrar</Text>}
            </Pressable>

            <Pressable onPress={handleGoogleLogin} disabled={loadingGoogle} style={{ backgroundColor: '#FFF', padding: 16, borderRadius: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 10 }}>
              {loadingGoogle ? <ActivityIndicator color="#1B5E20" /> : <Text style={{ color: '#1B5E20', fontWeight: '700' }}>Entrar con Google</Text>}
            </Pressable>

            <Pressable onPress={() => setResetModalVisible(true)}>
              <Text style={{ color: '#FFF', textAlign: 'center', textDecorationLine: 'underline', marginTop: 10 }}>¿Olvidó su contraseña?</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      <Modal visible={resetModalVisible} transparent animationType="slide">
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View style={{ backgroundColor: '#FFF', padding: 30, borderTopLeftRadius: 20, borderTopRightRadius: 20 }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 10 }}>Recuperar Contraseña</Text>
            <TextInput value={resetEmail} onChangeText={setResetEmail} placeholder="Tu correo" style={{ borderBottomWidth: 1, padding: 10, marginBottom: 20 }} />
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