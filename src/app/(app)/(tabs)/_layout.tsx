import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { useEffect } from 'react';

// Componente para cada pestaña animada
function TabBarButton({ onPress, onLongPress, isFocused, label, iconName }) {
  // Valores compartidos para animación
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (isFocused) {
      scale.value = withSpring(1.1, { damping: 12, stiffness: 100 });
      opacity.value = withSpring(1);
    } else {
      scale.value = withSpring(1, { damping: 12, stiffness: 100 });
      opacity.value = withSpring(0.6);
    }
  }, [isFocused]);

  const animatedIconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const animatedLabelStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      {
        translateY: interpolate(scale.value, [1, 1.1], [0, -2], Extrapolate.CLAMP),
      },
    ],
  }));

  // Colores: naranja vivo si está activo, gris claro si no
  const color = isFocused ? '#F59E0B' : '#A0A0A0';

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={styles.tabButton}
    >
      <Animated.View style={[styles.iconContainer, animatedIconStyle]}>
        <Ionicons name={iconName} size={26} color={color} />
        {/* Indicador de pestaña activa */}
        {isFocused && <View style={styles.activeIndicator} />}
      </Animated.View>
      <Animated.Text style={[styles.label, animatedLabelStyle, { color }]}>
        {label}
      </Animated.Text>
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
          backgroundColor: '#1B5E20', // Fondo sólido verde oscuro
          borderTopWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
          // Bordes redondeados solo en la parte superior
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          // Sombra suave
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.1,
          shadowRadius: 12,
        },
        tabBarShowLabel: false, // Ocultamos las etiquetas por defecto, las mostramos manualmente en el botón
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
    position: 'relative', // Para posicionar el indicador
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