import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { View, Text, Pressable, StyleSheet } from 'react-native';

function TabBarButton({ onPress, onLongPress, isFocused, label, iconName }) {
  const color = isFocused ? '#F59E0B' : '#A0A0A0';

  return (
    <Pressable onPress={onPress} onLongPress={onLongPress} style={styles.tabButton}>
      <Ionicons name={iconName} size={26} color={color} />
      <Text style={[styles.label, { color }]}>{label}</Text>
      {isFocused && <View style={styles.activeIndicator} />}
    </Pressable>
  );
}

export default function TabsLayout() {
  const { t } = useTranslation();
  const screens = [
    { name: 'index', icon: 'home', label: t('nav.home') },
    { name: 'modulos', icon: 'book', label: t('nav.modules') },
    { name: 'diccionario', icon: 'library', label: t('nav.dictionary') },
    { name: 'juegos', icon: 'game-controller', label: t('nav.games') },
    { name: 'perfil', icon: 'person', label: t('nav.profile') },
  ];

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          height: 70,
          backgroundColor: '#1B5E20',
          borderTopWidth: 0,
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
        },
        tabBarShowLabel: false,
      }}
    >
      {screens.map((screen) => (
        <Tabs.Screen
          key={screen.name}
          name={screen.name}
          options={{
            title: screen.label,
            tabBarButton: (props) => (
              <TabBarButton
                {...props}
                label={screen.label}
                iconName={screen.icon}
              />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabButton: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 8 },
  label: { fontSize: 11, fontWeight: '700', marginTop: 2 },
  activeIndicator: {
    position: 'absolute',
    bottom: 4,
    width: 20,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#F59E0B',
  },
});