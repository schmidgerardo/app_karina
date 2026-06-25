import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform, // <--- Importado para detectar el entorno
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
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [error, setError] = useState('');
  const [agreed, setAgreed] = useState(false);

  // ── Modal de recuperación de contraseña ────────────────────────────────────
  const [resetModalVisible, setResetModalVisible] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState('');

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

  // ── MÓDULO 6: Login con Google OAuth Híbrido ──────────────────────────────
  const handleGoogleLogin = async () => {
    if (!agreed) {
      setError('Debes aceptar los términos y condiciones para continuar.');
      return;
    }

    setError('');
    setLoadingGoogle(true);

    // Si es Web, usa la URL de Render. Si es móvil, usa el esquema nativo.
    const redirectUrl = Platform.OS === 'web'
      ? 'https://app-karina.onrender.com/'
      : 'appkarina://';

    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
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

  // ── MÓDULO 6: Recuperar contraseña Híbrido ────────────────────────────────
  const handleResetPassword = async () => {
    const trimmedEmail = resetEmail.trim();

    if (!trimmedEmail) {
      setResetMessage('Por favor, ingresa tu correo electrónico.');
      return;
    }

    setResetLoading(true);
    setResetMessage('');

    if (Platform.OS === 'web') {
      try {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(
          trimmedEmail,
          {
            redirectTo: 'https://app-karina.onrender.com/reset-password',
          }
        );

        if (resetError) {
          setResetMessage('No se pudo enviar el enlace. Verifica el correo ingresado.');
          console.error('[AUTH] Reset password error:', resetError);
        } else {
          setResetMessage('Enlace enviado. Revisa tu correo electrónico.');
        }
      } catch (err) {
        setResetMessage('Error inesperado. Inténtalo de nuevo.');
        console.error('[AUTH] Reset password exception:', err);
      } finally {
        setResetLoading(false);
      }
      return;
    }

    // En móvil, enviamos la recuperación de contraseña y verificamos el OTP localmente.
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(trimmedEmail);
      if (resetError) {
        setResetMessage('No se pudo enviar el código OTP. Verifica el correo ingresado.');
        console.error('[AUTH] Reset password error:', resetError);
      } else {
        setOtpSent(true);
        setResetMessage('Código enviado. Ingresa el código y tu nueva contraseña.');
      }
    } catch (err) {
      setResetMessage('Error inesperado. Inténtalo de nuevo.');
      console.error('[AUTH] Reset password exception:', err);
    } finally {
      setResetLoading(false);
    }
  };

  const handleConfirmOtpReset = async () => {
    const trimmedEmail = resetEmail.trim();
    const trimmedOtp = otpCode.trim();
    const trimmedNewPassword = newPassword.trim();
    const trimmedConfirmNewPassword = confirmNewPassword.trim();

    if (!trimmedEmail || !trimmedOtp || !trimmedNewPassword || !trimmedConfirmNewPassword) {
      setResetMessage('Por favor, completa todos los campos del OTP y la nueva contraseña.');
      return;
    }

    if (trimmedNewPassword.length < 6) {
      setResetMessage('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (trimmedNewPassword !== trimmedConfirmNewPassword) {
      setResetMessage('Las contraseñas no coinciden.');
      return;
    }

    setResetLoading(true);
    setResetMessage('');

    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: trimmedEmail,
        token: trimmedOtp,
        type: 'recovery',
      });

      if (verifyError) {
        setResetMessage('OTP inválido o expirado. Solicita uno nuevo.');
        console.error('[AUTH] Verify OTP error:', verifyError);
        setResetLoading(false);
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: trimmedNewPassword,
      });

      if (updateError) {
        setResetMessage('No se pudo actualizar la contraseña. Inténtalo de nuevo.');
        console.error('[AUTH] Update password error:', updateError);
      } else {
        await supabase.auth.getSession();
        setResetMessage('Contraseña actualizada con éxito. Redirigiendo al inicio de sesión...');
        setTimeout(() => {
          setResetModalVisible(false);
          router.replace('/(auth)/sign-in');
        }, 1600);
      }
    } catch (err) {
      setResetMessage('Ocurrió un error inesperado al verificar el OTP.');
      console.error('[AUTH] Confirm OTP exception:', err);
    } finally {
      setResetLoading(false);
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
          source={require('@/../assets/image.png')}
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
                keyboardType="email-address"
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

            {/* MÓDULO 6: Olvidó contraseña → abre modal */}
            <Pressable onPress={() => {
              setResetEmail('');
              setOtpCode('');
              setNewPassword('');
              setConfirmNewPassword('');
              setOtpSent(false);
              setResetMessage('');
              setResetModalVisible(true);
            }}>
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

            {/* MÓDULO 6: Botón Google OAuth habilitado */}
            <Pressable
              onPress={handleGoogleLogin}
              disabled={loadingGoogle}
            >
              <View
                style={{
                  backgroundColor: 'rgba(255,255,255,0.95)',
                  borderRadius: 14,
                  paddingVertical: 14,
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.3)',
                  opacity: loadingGoogle ? 0.7 : 1,
                  flexDirection: 'row',
                  justifyContent: 'center',
                  gap: 10,
                }}
              >
                {loadingGoogle ? (
                  <ActivityIndicator color="#1B5E20" />
                ) : (
                  <>
                    <Text style={{ fontSize: 18 }}>🔵</Text>
                    <Text style={{ color: '#1B5E20', fontSize: 14, fontWeight: '700' }}>
                      Entrar con Google
                    </Text>
                  </>
                )}
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

      {/* MÓDULO 6: Modal de recuperación de contraseña */}
      <Modal
        visible={resetModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setResetModalVisible(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.6)',
            justifyContent: 'flex-end',
          }}
        >
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 28,
              gap: 16,
            }}
          >
            <Text style={{ fontSize: 20, fontWeight: '900', color: '#1B5E20', textAlign: 'center' }}>
              Recuperar Contraseña
            </Text>
            <Text style={{ fontSize: 13, color: '#666', textAlign: 'center', lineHeight: 20 }}>
              Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.
            </Text>

            <TextInput
              value={resetEmail}
              onChangeText={setResetEmail}
              placeholder="Tu correo electrónico"
              placeholderTextColor="#AAA"
              autoCapitalize="none"
              keyboardType="email-address"
              style={{
                backgroundColor: '#F5F5F5',
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: 14,
                color: '#1A2E1A',
                fontSize: 15,
                borderWidth: 1,
                borderColor: '#E0E0E0',
              }}
            />

            {Platform.OS !== 'web' && otpSent && (
              <>
                <TextInput
                  value={otpCode}
                  onChangeText={setOtpCode}
                  placeholder="Código OTP de 6 dígitos"
                  placeholderTextColor="#AAA"
                  keyboardType="number-pad"
                  maxLength={6}
                  style={{
                    backgroundColor: '#F5F5F5',
                    borderRadius: 12,
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    color: '#1A2E1A',
                    fontSize: 15,
                    borderWidth: 1,
                    borderColor: '#E0E0E0',
                  }}
                />
                <TextInput
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="Nueva contraseña"
                  placeholderTextColor="#AAA"
                  secureTextEntry
                  style={{
                    backgroundColor: '#F5F5F5',
                    borderRadius: 12,
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    color: '#1A2E1A',
                    fontSize: 15,
                    borderWidth: 1,
                    borderColor: '#E0E0E0',
                  }}
                />
                <TextInput
                  value={confirmNewPassword}
                  onChangeText={setConfirmNewPassword}
                  placeholder="Repetir nueva contraseña"
                  placeholderTextColor="#AAA"
                  secureTextEntry
                  style={{
                    backgroundColor: '#F5F5F5',
                    borderRadius: 12,
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    color: '#1A2E1A',
                    fontSize: 15,
                    borderWidth: 1,
                    borderColor: '#E0E0E0',
                  }}
                />
              </>
            )}

            {resetMessage ? (
              <Text
                style={{
                  fontSize: 13,
                  textAlign: 'center',
                  color: resetMessage.includes('Enlace enviado') ? '#2E7D32' : '#C62828',
                  fontWeight: '600',
                }}
              >
                {resetMessage}
              </Text>
            ) : null}

            <Pressable
              onPress={Platform.OS !== 'web' && otpSent ? handleConfirmOtpReset : handleResetPassword}
              disabled={resetLoading}
            >
              <View
                style={{
                  backgroundColor: '#1B5E20',
                  borderRadius: 14,
                  paddingVertical: 16,
                  alignItems: 'center',
                  opacity: resetLoading ? 0.7 : 1,
                }}
              >
                {resetLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '800' }}>
                    {Platform.OS !== 'web' && otpSent ? 'Confirmar OTP' : 'Enviar enlace'}
                  </Text>
                )}
              </View>
            </Pressable>

            <Pressable onPress={() => {
              setResetModalVisible(false);
              setOtpSent(false);
              setOtpCode('');
              setNewPassword('');
              setConfirmNewPassword('');
            }}>
              <Text style={{ color: '#888', fontSize: 13, textAlign: 'center', fontWeight: '600' }}>
                Cancelar
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}