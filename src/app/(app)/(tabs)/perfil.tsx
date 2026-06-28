import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
  TextInput,
  Alert,
  Modal,
  Animated,
  Easing,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { supabase } from '@/client/supabase';
import { useSession } from '@/ctx';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '@/context/LanguageContext';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

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
  const { t } = useTranslation();
  const { language } = useLanguage();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [editName, setEditName] = useState('');
  const [editEdad, setEditEdad] = useState('');
  const [editComunidad, setEditComunidad] = useState(false); // 👈 Nuevo estado
  const [stats, setStats] = useState({ totalXp: 0, completed: 0, totalGames: 0 });

  const [showPassModal, setShowPassModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [passLoading, setPassLoading] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    if (!loading) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 600,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [loading]);

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
        console.error('Error cargando perfil:', error);
      }

      if (data) {
        if (!data.full_name && session?.user?.user_metadata?.full_name) {
          await supabase
            .from('profiles')
            .update({
              full_name: session.user.user_metadata.full_name,
              avatar_url: session.user.user_metadata.avatar_url,
            })
            .eq('id', session.user.id);

          data.full_name = session.user.user_metadata.full_name;
          data.avatar_url = session.user.user_metadata.avatar_url;
        }

        setProfile(data);
        setAvatarUrl(data.avatar_url);
        setEditName(data.full_name || '');
        setEditEdad(data.edad ? String(data.edad) : '');
        setEditComunidad(data.pertenece_comunidad || false); // 👈 Cargar comunidad
      } else {
        console.log('Perfil no encontrado, creando uno nuevo...');
        const { data: newUser, error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: session.user.id,
            full_name: session.user.user_metadata?.full_name || 'Usuario Google',
            username: 'user_' + session.user.id.slice(0, 5),
            idioma: 'es',
          })
          .select()
          .single();

        if (newUser) {
          setProfile(newUser);
          setAvatarUrl(newUser.avatar_url);
          setEditName(newUser.full_name || '');
          setEditEdad(newUser.edad ? String(newUser.edad) : '');
          setEditComunidad(newUser.pertenece_comunidad || false);
        }
        if (insertError) console.error('Error al crear perfil manual:', insertError);
      }
    } catch (e) {
      console.error('Error crítico:', e);
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
        pertenece_comunidad: editComunidad, // 👈 Guardar comunidad
      })
      .eq('id', session.user.id);

    if (error) {
      Alert.alert(t('common.error'), t('profile.update_error'));
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
      await supabase
        .from('profiles')
        .update({ avatar_url: data.publicUrl })
        .eq('id', session.user.id);
      setAvatarUrl(data.publicUrl);
    } catch (e) {
      Alert.alert(t('common.error'), t('profile.avatar_upload_error'));
    } finally {
      setUploading(false);
    }
  }

  async function handleChangePassword() {
    if (newPassword.length < 6) {
      Alert.alert(t('common.error'), t('auth.password_min_length'));
      return;
    }
    setPassLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      Alert.alert(t('common.error'), error.message);
    } else {
      Alert.alert(t('common.success'), t('auth.password_updated'));
      setShowPassModal(false);
      setNewPassword('');
    }
    setPassLoading(false);
  }

  if (loading && !isEditing) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9F6F0' }}>
        <ActivityIndicator size="large" color="#1B5E20" />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F9F6F0' }} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          {/* Header con gradiente y foto */}
          <LinearGradient
            colors={['#1B5E20', '#2E7D32']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              alignItems: 'center',
              paddingVertical: 30,
              borderBottomLeftRadius: 32,
              borderBottomRightRadius: 32,
            }}
          >
            <Pressable onPress={pickImage} style={{ position: 'relative' }}>
              <Image
                source={
                  avatarUrl
                    ? { uri: avatarUrl }
                    : require('@/../assets/image.png')
                }
                style={{
                  width: 120,
                  height: 120,
                  borderRadius: 60,
                  borderWidth: 4,
                  borderColor: '#F59E0B',
                }}
              />
              <View
                style={{
                  position: 'absolute',
                  bottom: 0,
                  right: 0,
                  backgroundColor: '#F59E0B',
                  borderRadius: 18,
                  padding: 6,
                  borderWidth: 2,
                  borderColor: '#FFFFFF',
                }}
              >
                <Ionicons name="camera" size={18} color="#FFFFFF" />
              </View>
            </Pressable>
            <Text style={{ color: '#FFFFFF', fontSize: 24, fontWeight: 'bold', marginTop: 12 }}>
              {profile?.full_name}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="at" size={14} color="#F59E0B" />
              <Text style={{ color: '#F59E0B', fontSize: 14 }}>{profile?.username}</Text>
            </View>
          </LinearGradient>

          {/* Contenido */}
          <View style={{ padding: 20, gap: 16 }}>
            {/* Información */}
            <View style={{ gap: 12 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="person-outline" size={20} color="#1B5E20" />
                  <Text style={{ fontSize: 18, fontWeight: '800', color: '#1A2E1A' }}>{t('profile.info')}</Text>
                </View>
                <Pressable 
                  onPress={() => (isEditing ? handleSave() : setIsEditing(true))}
                  style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
                >
                  <LinearGradient
                    colors={isEditing ? ['#E8F5E9', '#C8E6C9'] : ['#F59E0B', '#F97316']}
                    style={{
                      borderRadius: 12,
                      paddingHorizontal: 16,
                      paddingVertical: 6,
                    }}
                  >
                    <Text style={{ 
                      color: isEditing ? '#2E7D32' : '#FFFFFF', 
                      fontWeight: '700', 
                      fontSize: 12 
                    }}>
                      {isEditing ? t('common.save').toUpperCase() : t('profile.edit').toUpperCase()}
                    </Text>
                  </LinearGradient>
                </Pressable>
              </View>

              {isEditing ? (
                <View style={{ gap: 12 }}>
                  <View>
                    <Text style={{ color: '#666', fontSize: 12, fontWeight: '600', marginBottom: 4 }}>
                      {t('profile.full_name')}
                    </Text>
                    <TextInput 
                      value={editName} 
                      onChangeText={setEditName} 
                      style={[inputStyle, { backgroundColor: '#FFFFFF' }]} 
                    />
                  </View>
                  <View>
                    <Text style={{ color: '#666', fontSize: 12, fontWeight: '600', marginBottom: 4 }}>
                      {t('profile.age')}
                    </Text>
                    <TextInput
                      value={editEdad}
                      onChangeText={setEditEdad}
                      keyboardType="numeric"
                      style={[inputStyle, { backgroundColor: '#FFFFFF' }]}
                    />
                  </View>
                  {/* 👈 Switch para comunidad en modo edición */}
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingVertical: 8,
                    paddingHorizontal: 4,
                    backgroundColor: '#FFFFFF',
                    borderRadius: 12,
                    padding: 12,
                    borderWidth: 1,
                    borderColor: '#E8E5E0',
                  }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#1A2E1A', fontSize: 13, fontWeight: '600' }}>
                        {t('profile.community_question')}
                      </Text>
                    </View>
                    <Switch
                      value={editComunidad}
                      onValueChange={setEditComunidad}
                      trackColor={{ false: '#E8E5E0', true: '#F59E0B' }}
                      thumbColor="#FFFFFF"
                      ios_backgroundColor="#E8E5E0"
                    />
                  </View>
                </View>
              ) : (
                <View style={{ gap: 8 }}>
                  <InfoRow label={t('profile.full_name')} value={profile?.full_name} icon="person-outline" />
                  <InfoRow
                    label={t('profile.age')}
                    value={profile?.edad ? `${profile.edad} ${t('profile.years')}` : t('profile.not_defined')}
                    icon="calendar-outline"
                  />
                  <InfoRow
                    label={t('profile.community')}
                    value={profile?.pertenece_comunidad ? '✅ ' + t('profile.karina') : '❌ ' + t('profile.not_belong')}
                    icon="people-outline"
                  />
                </View>
              )}
            </View>

            {/* Botón cambiar contraseña (solo si no es usuario de Google) */}
            {!session?.user?.app_metadata?.provider?.includes('google') && (
              <Pressable
                onPress={() => setShowPassModal(true)}
                style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
              >
                <LinearGradient
                  colors={['#FFFFFF', '#F9F6F0']}
                  style={{
                    padding: 16,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: '#F59E0B',
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.04,
                    shadowRadius: 4,
                    elevation: 2,
                  }}
                >
                  <View style={{ backgroundColor: '#FFF3E0', padding: 8, borderRadius: 50 }}>
                    <Ionicons name="lock-closed-outline" size={22} color="#F59E0B" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#1B5E20', fontWeight: '700', fontSize: 14 }}>
                      {t('auth.change_password')}
                    </Text>
                    <Text style={{ color: '#888', fontSize: 11 }}>
                      {language === 'es' ? 'Actualiza tu contraseña' : 'Update your password'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#F59E0B" />
                </LinearGradient>
              </Pressable>
            )}

            {/* Estadísticas mejoradas */}
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
              <StatCard 
                label={t('profile.xp')} 
                value={stats.totalXp} 
                color="#F59E0B" 
                icon="star"
              />
              <StatCard 
                label={t('profile.modules')} 
                value={stats.completed} 
                color="#1B5E20" 
                icon="checkmark-circle"
              />
            </View>

            {/* Botón cerrar sesión */}
            <Pressable
              onPress={() => supabase.auth.signOut()}
              style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
            >
              <LinearGradient
                colors={['#FFEBEE', '#FFCDD2']}
                style={{
                  marginTop: 8,
                  padding: 16,
                  borderRadius: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                }}
              >
                <Ionicons name="log-out-outline" size={20} color="#C62828" />
                <Text style={{ color: '#C62828', fontWeight: '700', fontSize: 15 }}>
                  {t('profile.logout')}
                </Text>
              </LinearGradient>
            </Pressable>
          </View>
        </Animated.View>
      </ScrollView>

      {/* Modal para cambiar contraseña mejorado */}
      <Modal visible={showPassModal} transparent animationType="fade">
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.6)',
            justifyContent: 'center',
            padding: 24,
          }}
        >
          <View style={{ 
            backgroundColor: '#FFFFFF', 
            padding: 28, 
            borderRadius: 24, 
            gap: 16,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.2,
            shadowRadius: 24,
            elevation: 10,
          }}>
            <View style={{ alignItems: 'center' }}>
              <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: '#FFF3E0', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="lock-closed" size={28} color="#F59E0B" />
              </View>
            </View>
            <Text style={{ fontSize: 20, fontWeight: '900', color: '#1B5E20', textAlign: 'center' }}>
              {t('auth.new_password')}
            </Text>
            <Text style={{ textAlign: 'center', color: '#666', fontSize: 14 }}>
              {language === 'es' ? 'Ingresa tu nueva contraseña' : 'Enter your new password'}
            </Text>
            <TextInput
              placeholder={t('auth.enter_new_password')}
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
              style={{ 
                backgroundColor: '#F5F5F5', 
                padding: 16, 
                borderRadius: 14, 
                fontSize: 16,
                borderWidth: 1,
                borderColor: '#E8E5E0',
              }}
            />
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Pressable
                onPress={() => setShowPassModal(false)}
                style={{ 
                  flex: 1, 
                  padding: 16, 
                  alignItems: 'center',
                  backgroundColor: '#F5F5F5',
                  borderRadius: 14,
                }}
              >
                <Text style={{ color: '#666', fontWeight: '600' }}>{t('common.cancel')}</Text>
              </Pressable>
              <Pressable
                onPress={handleChangePassword}
                disabled={passLoading}
                style={{ flex: 1 }}
              >
                <LinearGradient
                  colors={['#F59E0B', '#F97316']}
                  style={{
                    padding: 16,
                    borderRadius: 14,
                    alignItems: 'center',
                    opacity: passLoading ? 0.7 : 1,
                  }}
                >
                  {passLoading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 15 }}>
                      {t('common.update')}
                    </Text>
                  )}
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// Componentes reutilizables mejorados
const inputStyle = {
  padding: 14,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: '#E8E5E0',
  fontSize: 15,
  color: '#1A2E1A',
};

function InfoRow({ label, value, icon }: { label: string; value: any; icon?: string }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 14,
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#F0EDE8',
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        {icon && <Ionicons name={icon as any} size={18} color="#888" />}
        <Text style={{ color: '#666', fontSize: 13 }}>{label}</Text>
      </View>
      <Text style={{ fontWeight: '700', color: '#1A2E1A', fontSize: 14 }}>{value}</Text>
    </View>
  );
}

function StatCard({ label, value, color, icon }: { label: string; value: any; color: string; icon?: string }) {
  return (
    <LinearGradient
      colors={['#FFFFFF', '#F9F6F0']}
      style={{
        flex: 1,
        padding: 16,
        borderRadius: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#F0EDE8',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 2,
      }}
    >
      <View style={{ 
        flexDirection: 'row', 
        alignItems: 'center', 
        gap: 6,
        marginBottom: 4,
      }}>
        {icon && <Ionicons name={icon as any} size={16} color={color} />}
        <Text style={{ fontSize: 24, fontWeight: 'bold', color }}>{value}</Text>
      </View>
      <Text style={{ fontSize: 12, color: '#888', fontWeight: '500' }}>{label}</Text>
    </LinearGradient>
  );
}