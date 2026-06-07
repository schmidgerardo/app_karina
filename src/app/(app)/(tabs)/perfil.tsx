import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { supabase } from '@/client/supabase';
import { useSession } from '@/ctx';

interface Profile {
  username: string;
  nombre: string;
  apellido: string;
  edad: number;
  es_indigena: boolean;
  role: string;
}

export default function PerfilScreen() {
  const router = useRouter();
  const { session } = useSession();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [])
  );

  const [stats, setStats] = useState({ totalXp: 0, completed: 0, totalGames: 0 });

  async function loadProfile() {
    setLoading(true);
    if (session?.user?.id) {
      const { data } = await supabase
        .from('profiles')
        .select('username, nombre, apellido, edad, es_indigena, role')
        .eq('id', session.user.id)
        .single();
      if (data) setProfile(data as Profile);

      const { data: progData } = await supabase
        .from('module_progress')
        .select('xp, completed')
        .eq('user_id', session.user.id);

      if (progData) {
        const totalXp = progData.reduce((sum, p) => sum + (p.xp || 0), 0);
        const completed = progData.filter((p) => p.completed).length;
        setStats({ totalXp, completed, totalGames: progData.length * 3 });
      }
    }
    setLoading(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace('/(auth)/sign-in');
  }

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F9F6F0', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#1B5E20" />
      </SafeAreaView>
    );
  }

  const displayName = profile?.nombre && profile?.apellido
    ? `${profile.nombre} ${profile.apellido}`
    : profile?.username || 'Usuario';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F9F6F0' }} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={{ backgroundColor: '#1B5E20', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 30, alignItems: 'center' }}>
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: '#F59E0B',
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 3,
              borderColor: 'rgba(255,255,255,0.3)',
            }}
          >
            <Text style={{ fontSize: 36 }}>👤</Text>
          </View>
          <Text style={{ color: '#FFFFFF', fontSize: 20, fontWeight: '900', marginTop: 12 }}>
            {displayName}
          </Text>
          <Text style={{ color: '#F59E0B', fontSize: 12, fontWeight: '600', marginTop: 2 }}>
            @{profile?.username || 'usuario'}
          </Text>
          {profile?.es_indigena && (
            <View style={{ backgroundColor: 'rgba(245,158,11,0.25)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4, marginTop: 8 }}>
              <Text style={{ color: '#F59E0B', fontSize: 11, fontWeight: '700' }}>🪶 Comunidad Indígena</Text>
            </View>
          )}
        </View>

        {/* Información */}
        <View style={{ padding: 20, gap: 12 }}>
          <Text style={{ fontSize: 14, fontWeight: '800', color: '#1A2E1A', marginBottom: 4 }}>Información personal</Text>

          <InfoCard label="Nombre" value={profile?.nombre || '-'} />
          <InfoCard label="Apellido" value={profile?.apellido || '-'} />
          <InfoCard label="Edad" value={profile?.edad ? `${profile.edad} años` : '-'} />
          <InfoCard label="Comunidad indígena" value={profile?.es_indigena ? 'Sí' : 'No'} />
          <InfoCard label="Rol" value={profile?.role === 'admin' ? 'Administrador' : 'Usuario'} />

          {/* Estadísticas */}
          <Text style={{ fontSize: 14, fontWeight: '800', color: '#1A2E1A', marginTop: 8, marginBottom: 4 }}>Estadísticas de aprendizaje</Text>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <StatCard value={String(stats.completed)} label="Módulos completados" color="#2E7D32" />
            <StatCard value={String(stats.totalXp)} label="XP total" color="#1565C0" />
            <StatCard value={String(stats.totalGames)} label="Ejercicios hechos" color="#E65100" />
          </View>

          {/* Cerrar sesión */}
          <Pressable onPress={handleLogout} style={{ marginTop: 16 }}>
            <View
              style={{
                backgroundColor: '#FFEBEE',
                borderRadius: 14,
                paddingVertical: 16,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: '#FFCDD2',
              }}
            >
              <Text style={{ color: '#C62828', fontSize: 16, fontWeight: '800' }}>Cerrar sesión</Text>
            </View>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <View
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#F0EDE8',
      }}
    >
      <Text style={{ fontSize: 13, color: '#888' }}>{label}</Text>
      <Text style={{ fontSize: 14, fontWeight: '700', color: '#1A2E1A' }}>{value}</Text>
    </View>
  );
}

function StatCard({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        padding: 14,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#F0EDE8',
      }}
    >
      <Text style={{ fontSize: 24, fontWeight: '900', color }}>{value}</Text>
      <Text style={{ fontSize: 10, color: '#888', textAlign: 'center', marginTop: 4 }}>{label}</Text>
    </View>
  );
}
