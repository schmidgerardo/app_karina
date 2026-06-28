import { useState, useRef, useEffect } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
  Animated,
  Easing,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/client/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

export default function SignUpScreen() {
  const router = useRouter();
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [edad, setEdad] = useState('');
  const [esIndigena, setEsIndigena] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

  const handleRegister = async () => {
    if (loading) return;
    if (!nombre.trim() || !apellido.trim() || !edad.trim() || !email.trim() || !password.trim()) {
      setError('Completa todos los campos');
      return;
    }

    const ageNum = parseInt(edad, 10);
    if (isNaN(ageNum) || ageNum < 1 || ageNum > 120) {
      setError('Ingresa una edad válida');
      return;
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) {
        setError(signUpError.message || 'Error al registrarse. Intenta de nuevo.');
        return;
      }

      if (authData.user) {
        await new Promise(resolve => setTimeout(resolve, 1000));

        const fullName = `${nombre.trim()} ${apellido.trim()}`;
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            full_name: fullName,
            edad: ageNum,
            pertenece_comunidad: esIndigena,
            idioma: 'es',
            updated_at: new Date(),
          })
          .eq('id', authData.user.id);

        if (profileError) {
          console.error('Error al actualizar el perfil:', profileError);
        }

        router.replace('/(app)/(tabs)');
      }
    } catch (err) {
      console.error(err);
      setError('Error al registrarse. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1, backgroundColor: '#1B5E20' }}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          {/* Header con gradiente */}
          <LinearGradient
            colors={['#1B5E20', '#2E7D32']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              paddingVertical: 32,
              paddingHorizontal: 24,
              borderBottomLeftRadius: 40,
              borderBottomRightRadius: 40,
              alignItems: 'center',
            }}
          >
            <View style={{
              width: 72,
              height: 72,
              borderRadius: 36,
              backgroundColor: 'rgba(245, 158, 11, 0.15)',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 10,
            }}>
              <Text style={{ fontSize: 36 }}>🌱</Text>
            </View>
            <Text style={{ fontSize: 28, fontWeight: '900', color: '#FFFFFF' }}>Crear cuenta</Text>
            <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, marginTop: 4 }}>
              Únete a la comunidad Kariña
            </Text>
          </LinearGradient>

          <View style={{ paddingHorizontal: 24, paddingTop: 28 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#FFFFFF', textAlign: 'center' }}>
              ¡Comienza tu viaje de aprendizaje! 🚀
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, textAlign: 'center', marginTop: 4 }}>
              Completa tus datos para empezar
            </Text>

            <View style={{ marginTop: 24, gap: 16 }}>
              {/* Nombre */}
              <View>
                <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '600', marginBottom: 6 }}>
                  Nombre
                </Text>
                <View style={inputContainerStyle}>
                  <Ionicons name="person-outline" size={20} color="rgba(255,255,255,0.5)" />
                  <TextInput
                    value={nombre}
                    onChangeText={setNombre}
                    placeholder="Tu nombre"
                    placeholderTextColor="rgba(255,255,255,0.4)"
                    style={inputStyle}
                  />
                </View>
              </View>

              {/* Apellido */}
              <View>
                <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '600', marginBottom: 6 }}>
                  Apellido
                </Text>
                <View style={inputContainerStyle}>
                  <Ionicons name="people-outline" size={20} color="rgba(255,255,255,0.5)" />
                  <TextInput
                    value={apellido}
                    onChangeText={setApellido}
                    placeholder="Tu apellido"
                    placeholderTextColor="rgba(255,255,255,0.4)"
                    style={inputStyle}
                  />
                </View>
              </View>

              {/* Edad */}
              <View>
                <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '600', marginBottom: 6 }}>
                  Edad
                </Text>
                <View style={inputContainerStyle}>
                  <Ionicons name="calendar-outline" size={20} color="rgba(255,255,255,0.5)" />
                  <TextInput
                    value={edad}
                    onChangeText={setEdad}
                    placeholder="Tu edad"
                    placeholderTextColor="rgba(255,255,255,0.4)"
                    keyboardType="number-pad"
                    style={inputStyle}
                  />
                </View>
              </View>

              {/* Switch comunidad indígena */}
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingVertical: 10,
                paddingHorizontal: 4,
              }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 13, fontWeight: '600' }}>
                    ¿Perteneces a una comunidad indígena?
                  </Text>
                </View>
                <Switch
                  value={esIndigena}
                  onValueChange={setEsIndigena}
                  trackColor={{ false: 'rgba(255,255,255,0.2)', true: '#F59E0B' }}
                  thumbColor="#FFFFFF"
                  ios_backgroundColor="rgba(255,255,255,0.2)"
                />
              </View>

              {/* Email */}
              <View>
                <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '600', marginBottom: 6 }}>
                  Correo electrónico
                </Text>
                <View style={inputContainerStyle}>
                  <Ionicons name="mail-outline" size={20} color="rgba(255,255,255,0.5)" />
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder="example@mail.com"
                    placeholderTextColor="rgba(255,255,255,0.4)"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    style={inputStyle}
                  />
                </View>
              </View>

              {/* Contraseña */}
              <View>
                <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '600', marginBottom: 6 }}>
                  Contraseña
                </Text>
                <View style={inputContainerStyle}>
                  <Ionicons name="lock-closed-outline" size={20} color="rgba(255,255,255,0.5)" />
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Mínimo 6 caracteres"
                    placeholderTextColor="rgba(255,255,255,0.4)"
                    secureTextEntry={!showPassword}
                    style={[inputStyle, { flex: 1 }]}
                  />
                  <Pressable onPress={() => setShowPassword(!showPassword)}>
                    <Text style={{ color: '#F59E0B', fontSize: 12, fontWeight: '700' }}>
                      {showPassword ? 'OCULTAR' : 'VER'}
                    </Text>
                  </Pressable>
                </View>
              </View>

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

              {/* Botón de registro */}
              <Pressable
                onPress={handleRegister}
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
                    <Text style={{ color: '#1B5E20', fontSize: 16, fontWeight: '800' }}>
                      Crear cuenta
                    </Text>
                  )}
                </LinearGradient>
              </Pressable>

              {/* Enlace a inicio de sesión */}
              <Pressable onPress={() => router.back()} style={{ marginTop: 8 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 4 }}>
                  <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>
                    ¿Ya tienes cuenta?
                  </Text>
                  <Text style={{ color: '#F59E0B', fontSize: 13, fontWeight: '700' }}>
                    Iniciar sesión
                  </Text>
                </View>
              </Pressable>
            </View>
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// Estilos consistentes con SignInScreen
const inputContainerStyle = {
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  backgroundColor: 'rgba(255,255,255,0.08)',
  borderRadius: 14,
  borderWidth: 1,
  borderColor: 'rgba(255,255,255,0.12)',
  paddingHorizontal: 16,
};

const inputStyle = {
  flex: 1,
  padding: 16,
  color: '#FFFFFF' as const,
  fontSize: 15,
};