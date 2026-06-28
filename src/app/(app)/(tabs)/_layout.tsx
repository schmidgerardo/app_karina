import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { View, Text, Pressable, StyleSheet } from 'react-native';

function TabBarButton({ onPress, onLongPress, isFocused, label, iconName }) {
  // Colores: naranja si está activo, gris claro si no
  const color = isFocused ? '#F59E0B' : '#E8E5E0';

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={styles.tabButton}
    >
      <View style={styles.iconContainer}>
        <Ionicons name={iconName} size={26} color={color} />
        {isFocused && <View style={styles.activeIndicator} />}
      </View>
      <Text style={[styles.label, { color }]}>
        {label}
      </Text>
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
    <>
      {/* Fondo que cubre completamente la parte inferior */}
      <View style={styles.bottomBackground} />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: styles.tabBar,
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
    </>
  );
}

const styles = StyleSheet.create({
  // Fondo que se extiende debajo de la barra para evitar bordes extraños
  bottomBackground: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 70,
    backgroundColor: '#1B5E20',
  },
  tabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 70,
    backgroundColor: '#1B5E20',
    borderTopWidth: 0,
    // Bordes redondeados solo en la parte superior
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    // Sombra suave
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
    // Importante: esto evita que se vea el fondo debajo
    overflow: 'hidden',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 30,
    height: 30,
    position: 'relative',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: -6,
    width: 16,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#F59E0B',
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
});