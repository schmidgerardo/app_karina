import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/client/supabase';

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
      // 1. Crear usuario en Auth (sin metadatos)
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) {
        setError(signUpError.message || 'Error al registrarse. Intenta de nuevo.');
        return;
      }

      if (authData.user) {
        // 2. Esperar un segundo para que el Trigger de la DB cree la fila inicial
        await new Promise(resolve => setTimeout(resolve, 1000));

        // 3. Actualizar la fila con los datos reales del formulario
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
          // No mostramos error al usuario para no interrumpir el flujo
        }

        // 4. Redirigir a la pantalla principal
        router.replace('/(app)/(tabs)');
      }
    } catch (err) {
      console.error(err);
      setError('Error al registrarse. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  // El resto del componente (UI) se mantiene exactamente igual
  return (
    <KeyboardAvoidingView
      behavior="padding"
      style={{ flex: 1, backgroundColor: '#1B5E20' }}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, padding: 24, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={{ fontSize: 24, fontWeight: '900', color: '#FFFFFF', marginTop: 20 }}>
          Crear cuenta
        </Text>
        <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 4 }}>
          Únete a la comunidad Kariña
        </Text>

        <View style={{ marginTop: 24, gap: 14 }}>
          <View>
            <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 6, fontWeight: '600' }}>
              Nombre
            </Text>
            <TextInput
              value={nombre}
              onChangeText={setNombre}
              placeholder="Tu nombre"
              placeholderTextColor="rgba(255,255,255,0.4)"
              style={inputStyle}
            />
          </View>

          <View>
            <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 6, fontWeight: '600' }}>
              Apellido
            </Text>
            <TextInput
              value={apellido}
              onChangeText={setApellido}
              placeholder="Tu apellido"
              placeholderTextColor="rgba(255,255,255,0.4)"
              style={inputStyle}
            />
          </View>

          <View>
            <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 6, fontWeight: '600' }}>
              Edad
            </Text>
            <TextInput
              value={edad}
              onChangeText={setEdad}
              placeholder="Tu edad"
              placeholderTextColor="rgba(255,255,255,0.4)"
              keyboardType="number-pad"
              style={inputStyle}
            />
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 }}>
            <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.9)', fontWeight: '600' }}>
              ¿Perteneces a una comunidad indígena?
            </Text>
            <Switch
              value={esIndigena}
              onValueChange={setEsIndigena}
              trackColor={{ false: 'rgba(255,255,255,0.3)', true: '#F59E0B' }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View>
            <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 6, fontWeight: '600' }}>
              Correo electrónico
            </Text>
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

          <View>
            <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 6, fontWeight: '600' }}>
              Contraseña
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Mínimo 6 caracteres"
                placeholderTextColor="rgba(255,255,255,0.4)"
                secureTextEntry={!showPassword}
                style={[inputStyle, { flex: 1 }]}
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

          {error ? (
            <Text style={{ color: '#FF6B6B', fontSize: 12, textAlign: 'center' }}>
              {error}
            </Text>
          ) : null}

          <Pressable onPress={handleRegister} disabled={loading}>
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
                  Continuar
                </Text>
              )}
            </View>
          </Pressable>

          <Pressable onPress={() => router.back()}>
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 4, marginTop: 8 }}>
              <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>
                ¿Ya tienes cuenta?
              </Text>
              <Text style={{ color: '#F59E0B', fontSize: 13, fontWeight: '700' }}>
                Iniciar sesión
              </Text>
            </View>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const inputStyle = {
  backgroundColor: 'rgba(255,255,255,0.1)' as const,
  borderRadius: 12 as const,
  paddingHorizontal: 16 as const,
  paddingVertical: 14 as const,
  color: '#FFFFFF' as const,
  fontSize: 15 as const,
  borderWidth: 1 as const,
  borderColor: 'rgba(255,255,255,0.2)' as const,
};