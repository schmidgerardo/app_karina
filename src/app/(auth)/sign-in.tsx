import { useState, useRef, useEffect } from 'react';
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
  Animated,
  Easing,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { supabase } from '@/client/supabase';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

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

  // Animación de entrada
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

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
      <ScrollView 
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 30 }} 
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          {/* Header con gradiente */}
          <LinearGradient
            colors={['#1B5E20', '#2E7D32']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ 
              paddingVertical: 40, 
              borderBottomLeftRadius: 40,
              borderBottomRightRadius: 40,
              alignItems: 'center',
            }}
          >
            <View style={{ 
              width: 80, 
              height: 80, 
              borderRadius: 40, 
              backgroundColor: 'rgba(245, 158, 11, 0.15)',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 12,
            }}>
              <Text style={{ fontSize: 40 }}>🏛️</Text>
            </View>
            <Text style={{ fontSize: 36, fontWeight: '900', color: '#FFFFFF' }}>KARIÑA</Text>
            <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, marginTop: 4 }}>
              {Platform.OS === 'web' ? 'Idioma Indígena' : 'Idioma Indígena'}
            </Text>
          </LinearGradient>
        
          <View style={{ paddingHorizontal: 24, paddingTop: 32 }}>
            <Text style={{ fontSize: 22, fontWeight: '700', color: '#FFFFFF', textAlign: 'center' }}>
              ¡Bienvenido de vuelta! 👋
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, textAlign: 'center', marginTop: 4 }}>
              Inicia sesión para continuar aprendiendo
            </Text>
            
            <View style={{ marginTop: 28, gap: 16 }}>
              {/* Email input */}
              <View>
                <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '600', marginBottom: 6 }}>
                  Correo electrónico
                </Text>
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: 'rgba(255,255,255,0.08)',
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.12)',
                  paddingHorizontal: 16,
                }}>
                  <Ionicons name="mail-outline" size={20} color="rgba(255,255,255,0.5)" />
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder="ejemplo@correo.com"
                    placeholderTextColor="rgba(255,255,255,0.4)"
                    style={{
                      flex: 1,
                      padding: 16,
                      color: '#FFFFFF',
                      fontSize: 15,
                    }}
                    autoCapitalize="none"
                  />
                </View>
              </View>

              {/* Password input */}
              <View>
                <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '600', marginBottom: 6 }}>
                  Contraseña
                </Text>
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: 'rgba(255,255,255,0.08)',
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.12)',
                  paddingHorizontal: 16,
                }}>
                  <Ionicons name="lock-closed-outline" size={20} color="rgba(255,255,255,0.5)" />
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Tu contraseña"
                    placeholderTextColor="rgba(255,255,255,0.4)"
                    secureTextEntry={!showPassword}
                    style={{
                      flex: 1,
                      padding: 16,
                      color: '#FFFFFF',
                      fontSize: 15,
                    }}
                  />
                  <Pressable onPress={() => setShowPassword(!showPassword)}>
                    <Text style={{ color: '#F59E0B', fontSize: 12, fontWeight: '700' }}>
                      {showPassword ? 'OCULTAR' : 'VER'}
                    </Text>
                  </Pressable>
                </View>
              </View>
              
              {/* Términos y condiciones */}
              <Pressable 
                onPress={() => setAgreed(!agreed)} 
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 }}
              >
                <View style={{
                  width: 22,
                  height: 22,
                  borderRadius: 6,
                  borderWidth: 2,
                  borderColor: agreed ? '#F59E0B' : 'rgba(255,255,255,0.3)',
                  backgroundColor: agreed ? '#F59E0B' : 'transparent',
                  justifyContent: 'center',
                  alignItems: 'center'
                }}>
                  {agreed && <Ionicons name="checkmark" size={14} color="#1B5E20" />}
                </View>
                <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, flex: 1 }}>
                  Acepto los términos y condiciones
                </Text>
              </Pressable>

              {error ? (
                <View style={{ 
                  backgroundColor: 'rgba(255,107,107,0.15)', 
                  borderRadius: 12, 
                  padding: 12,
                  borderWidth: 1,
                  borderColor: 'rgba(255,107,107,0.3)',
                }}>
                  <Text style={{ color: '#FF6B6B', textAlign: 'center', fontSize: 13 }}>{error}</Text>
                </View>
              ) : null}

              {/* Botón de inicio de sesión */}
              <Pressable
                onPress={handleLogin}
                disabled={loading}
                style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
              >
                <LinearGradient
                  colors={['#F59E0B', '#F97316']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{
                    padding: 18,
                    borderRadius: 14,
                    alignItems: 'center',
                    marginTop: 4,
                    shadowColor: '#F59E0B',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 8,
                    elevation: 6,
                  }}
                >
                  {loading ? (
                    <ActivityIndicator color="#1B5E20" />
                  ) : (
                    <Text style={{ color: '#1B5E20', fontWeight: '900', fontSize: 16 }}>
                      Iniciar Sesión
                    </Text>
                  )}
                </LinearGradient>
              </Pressable>

              {/* Separador */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 8 }}>
                <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.15)' }} />
                <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '600' }}>O CONTINUAR CON</Text>
                <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.15)' }} />
              </View>

              {/* Botón de Google */}
              <Pressable
                onPress={handleGoogleLogin}
                disabled={loadingGoogle}
                style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
              >
                <View style={{
                  backgroundColor: '#FFFFFF',
                  padding: 16,
                  borderRadius: 14,
                  alignItems: 'center',
                  flexDirection: 'row',
                  justifyContent: 'center',
                  gap: 12,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 4,
                  elevation: 3,
                }}>
                  {loadingGoogle ? (
                    <ActivityIndicator color="#1B5E20" />
                  ) : (
                    <>
                      <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#4285F4' }}>G</Text> 
                      <Text style={{ color: '#1B5E20', fontWeight: '700', fontSize: 15 }}>
                        Continuar con Google
                      </Text>
                    </>
                  )}
                </View>
              </Pressable>

              {/* Enlaces inferiores */}
              <View style={{ marginTop: 16, gap: 14 }}>
                <Pressable onPress={() => setResetModalVisible(true)}>
                  <Text style={{ color: '#F59E0B', textAlign: 'center', fontSize: 13, fontWeight: '600' }}>
                    ¿Olvidaste tu contraseña?
                  </Text>
                </Pressable>

                <Pressable onPress={() => router.push('/(auth)/sign-up')}>
                  <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 4 }}>
                    <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>¿No tienes cuenta?</Text>
                    <Text style={{ color: '#F59E0B', fontWeight: '700', fontSize: 13 }}>Regístrate</Text>
                  </View>
                </Pressable>
              </View>
            </View>
          </View>
        </Animated.View>
      </ScrollView>

      {/* Modal de recuperación de contraseña mejorado */}
      <Modal visible={resetModalVisible} transparent animationType="fade">
        <View style={{ 
          flex: 1, 
          justifyContent: 'center', 
          alignItems: 'center',
          backgroundColor: 'rgba(0,0,0,0.6)',
          padding: 24,
        }}>
          <View style={{ 
            backgroundColor: '#FFFFFF', 
            padding: 28, 
            borderRadius: 24, 
            width: '100%',
            maxWidth: 380,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.2,
            shadowRadius: 24,
            elevation: 10,
          }}>
            <View style={{ alignItems: 'center' }}>
              <View style={{ 
                width: 56, 
                height: 56, 
                borderRadius: 28, 
                backgroundColor: '#FFF3E0', 
                alignItems: 'center', 
                justifyContent: 'center',
                marginBottom: 12,
              }}>
                <Ionicons name="key-outline" size={28} color="#F59E0B" />
              </View>
            </View>
            <Text style={{ fontSize: 20, fontWeight: '900', color: '#1B5E20', textAlign: 'center' }}>
              Recuperar Contraseña
            </Text>
            <Text style={{ textAlign: 'center', color: '#666', fontSize: 13, marginTop: 4, marginBottom: 16 }}>
              Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.
            </Text>
            
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#F5F5F5',
              borderRadius: 12,
              paddingHorizontal: 14,
              borderWidth: 1,
              borderColor: '#E8E5E0',
            }}>
              <Ionicons name="mail-outline" size={20} color="#888" />
              <TextInput
                value={resetEmail}
                onChangeText={setResetEmail}
                placeholder="Tu correo electrónico"
                placeholderTextColor="#999"
                style={{
                  flex: 1,
                  padding: 14,
                  fontSize: 15,
                  color: '#1A2E1A',
                }}
                autoCapitalize="none"
              />
            </View>

            {resetMessage ? (
              <Text style={{ 
                color: resetSuccess ? '#2E7D32' : '#C62828', 
                textAlign: 'center', 
                fontSize: 13,
                marginTop: 8,
              }}>
                {resetMessage}
              </Text>
            ) : null}

            <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
              <Pressable
                onPress={() => {
                  setResetModalVisible(false);
                  setResetMessage('');
                  setResetEmail('');
                  setResetSuccess(false);
                }}
                style={{ 
                  flex: 1, 
                  padding: 14, 
                  alignItems: 'center',
                  backgroundColor: '#F5F5F5',
                  borderRadius: 12,
                }}
              >
                <Text style={{ color: '#666', fontWeight: '600' }}>Cancelar</Text>
              </Pressable>
              <Pressable
                onPress={handleResetPassword}
                disabled={resetLoading}
                style={{ flex: 1 }}
              >
                <LinearGradient
                  colors={['#F59E0B', '#F97316']}
                  style={{
                    padding: 14,
                    borderRadius: 12,
                    alignItems: 'center',
                    opacity: resetLoading ? 0.7 : 1,
                  }}
                >
                  {resetLoading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 14 }}>
                      Enviar Enlace
                    </Text>
                  )}
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}