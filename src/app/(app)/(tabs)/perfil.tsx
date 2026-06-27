import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View, TextInput, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { supabase } from '@/client/supabase';
import { useSession } from '@/ctx';

interface Profile {
  username: string;
  full_name: string;
  edad: number | null;
  pertenece_comunidad: boolean;
  avatar_url: string | null;
}

export default function PerfilScreen() {
  const router = useRouter();
  const { session } = useSession();
  
  const [profile, setProfile] = useState<Profile | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  // Estados para la edición
  const [editName, setEditName] = useState('');
  const [editEdad, setEditEdad] = useState('');
  const [stats, setStats] = useState({ totalXp: 0, completed: 0, totalGames: 0 });

  // 👇 Nuevos estados para cambio de contraseña
  const [showPassModal, setShowPassModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [passLoading, setPassLoading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [])
  );

  async function loadProfile() {
    if (!session?.user?.id) return;
    setLoading(true);
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle();

      if (error) {
        console.error("Error cargando perfil:", error);
      }

      if (data) {
        if (!data.full_name && session?.user?.user_metadata?.full_name) {
          await supabase
            .from('profiles')
            .update({ 
              full_name: session.user.user_metadata.full_name,
              avatar_url: session.user.user_metadata.avatar_url 
            })
            .eq('id', session.user.id);
          
          data.full_name = session.user.user_metadata.full_name;
          data.avatar_url = session.user.user_metadata.avatar_url;
        }

        setProfile(data);
        setAvatarUrl(data.avatar_url);
        setEditName(data.full_name || '');
        setEditEdad(data.edad ? String(data.edad) : '');
      } else {
        console.log("Perfil no encontrado, creando uno nuevo...");
        const { data: newUser, error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: session.user.id,
            full_name: session.user.user_metadata?.full_name || 'Usuario Google',
            username: 'user_' + session.user.id.slice(0, 5),
            idioma: 'es'
          })
          .select()
          .single();
        
        if (newUser) {
          setProfile(newUser);
          setAvatarUrl(newUser.avatar_url);
          setEditName(newUser.full_name || '');
          setEditEdad(newUser.edad ? String(newUser.edad) : '');
        }
        if (insertError) console.error("Error al crear perfil manual:", insertError);
      }
    } catch (e) {
      console.error("Error crítico:", e);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!session?.user?.id) return;
    setLoading(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: editName,
        edad: editEdad ? parseInt(editEdad) : null,
      })
      .eq('id', session.user.id);

    if (error) {
      Alert.alert('Error', 'No se pudo actualizar el perfil');
    } else {
      setIsEditing(false);
      loadProfile();
    }
    setLoading(false);
  }

  async function pickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled && result.assets[0]) {
      uploadAvatar(result.assets[0].uri);
    }
  }

  async function uploadAvatar(uri: string) {
    if (!session?.user?.id) return;
    setUploading(true);
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const fileName = `${session.user.id}/avatar.jpg`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, blob, { upsert: true, contentType: 'image/jpeg' });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
      await supabase.from('profiles').update({ avatar_url: data.publicUrl }).eq('id', session.user.id);
      setAvatarUrl(data.publicUrl);
    } catch (e) {
      Alert.alert('Error', 'No se pudo subir la imagen');
    } finally {
      setUploading(false);
    }
  }

  // 👇 Nueva función para cambiar contraseña
  async function handleChangePassword() {
    if (newPassword.length < 6) {
      Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres');
      return;
    }
    setPassLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('Éxito', 'Contraseña actualizada correctamente');
      setShowPassModal(false);
      setNewPassword('');
    }
    setPassLoading(false);
  }

  if (loading && !isEditing) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#1B5E20" />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F9F6F0' }}>
      <ScrollView>
        {/* Header con Foto */}
        <View style={{ backgroundColor: '#1B5E20', alignItems: 'center', paddingVertical: 30 }}>
          <Pressable onPress={pickImage}>
            <Image 
              source={avatarUrl ? { uri: avatarUrl } : require('@/../assets/image.png')} 
              style={{ width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: '#F59E0B' }} 
            />
            <View style={{ position: 'absolute', bottom: 0, right: 0, backgroundColor: '#F59E0B', borderRadius: 15, padding: 5 }}>
              <Text>📷</Text>
            </View>
          </Pressable>
          <Text style={{ color: '#FFF', fontSize: 22, fontWeight: 'bold', marginTop: 10 }}>{profile?.full_name}</Text>
          <Text style={{ color: '#F59E0B' }}>@{profile?.username}</Text>
        </View>

        {/* Formulario / Info */}
        <View style={{ padding: 20, gap: 15 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 18, fontWeight: '800' }}>Información</Text>
            <Pressable onPress={() => isEditing ? handleSave() : setIsEditing(true)}>
              <Text style={{ color: '#1B5E20', fontWeight: '700' }}>{isEditing ? 'GUARDAR' : 'EDITAR'}</Text>
            </Pressable>
          </View>

          {isEditing ? (
            <View style={{ gap: 10 }}>
              <Text style={{ color: '#666' }}>Nombre Completo</Text>
              <TextInput value={editName} onChangeText={setEditName} style={inputStyle} />
              <Text style={{ color: '#666' }}>Edad</Text>
              <TextInput value={editEdad} onChangeText={setEditEdad} keyboardType="numeric" style={inputStyle} />
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              <InfoRow label="Nombre" value={profile?.full_name} />
              <InfoRow label="Edad" value={profile?.edad ? `${profile.edad} años` : 'No definida'} />
              <InfoRow label="Comunidad" value={profile?.pertenece_comunidad ? 'Kariña' : 'No pertenece'} />
            </View>
          )}

          {/* 👇 Botón para cambiar contraseña */}
          <Pressable 
            onPress={() => setShowPassModal(true)} 
            style={{ backgroundColor: '#FFF', padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#F59E0B', marginTop: 10 }}
          >
            <Text style={{ color: '#1B5E20', fontWeight: 'bold', textAlign: 'center' }}>🔐 Cambiar contraseña</Text>
          </Pressable>

          {/* Estadísticas */}
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
             <StatCard label="XP" value={stats.totalXp} color="#F59E0B" />
             <StatCard label="Módulos" value={stats.completed} color="#1B5E20" />
          </View>

          <Pressable onPress={() => supabase.auth.signOut()} style={{ marginTop: 20, padding: 15, backgroundColor: '#FFEBEE', borderRadius: 10, alignItems: 'center' }}>
            <Text style={{ color: '#C62828', fontWeight: 'bold' }}>Cerrar Sesión</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* 👇 Modal para cambiar contraseña */}
      <Modal visible={showPassModal} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 }}>
          <View style={{ backgroundColor: '#FFF', padding: 25, borderRadius: 20, gap: 15 }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1B5E20' }}>Nueva Contraseña</Text>
            <TextInput
              placeholder="Escribe tu nueva contraseña"
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
              style={{ backgroundColor: '#F5F5F5', padding: 15, borderRadius: 10 }}
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable onPress={() => setShowPassModal(false)} style={{ flex: 1, padding: 15, alignItems: 'center' }}>
                <Text style={{ color: '#666' }}>Cancelar</Text>
              </Pressable>
              <Pressable 
                onPress={handleChangePassword} 
                disabled={passLoading}
                style={{ flex: 1, backgroundColor: '#1B5E20', padding: 15, borderRadius: 10, alignItems: 'center' }}
              >
                {passLoading ? <ActivityIndicator color="#FFF" /> : <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Actualizar</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// Componentes reutilizables
const inputStyle = { backgroundColor: '#FFF', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#DDD' };

function InfoRow({ label, value }: { label: string, value: any }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 15, backgroundColor: '#FFF', borderRadius: 10 }}>
      <Text style={{ color: '#666' }}>{label}</Text>
      <Text style={{ fontWeight: '700' }}>{value}</Text>
    </View>
  );
}

function StatCard({ label, value, color }: { label: string, value: any, color: string }) {
  return (
    <View style={{ flex: 1, padding: 15, backgroundColor: '#FFF', borderRadius: 10, alignItems: 'center', borderTopWidth: 4, borderTopColor: color }}>
      <Text style={{ fontSize: 20, fontWeight: 'bold', color }}>{value}</Text>
      <Text style={{ fontSize: 12, color: '#666' }}>{label}</Text>
    </View>
  );
}