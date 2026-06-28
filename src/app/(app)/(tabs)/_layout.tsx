import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { useEffect } from 'react';

// Componente para cada pestaña animada
function TabBarButton({ onPress, onLongPress, isFocused, label, iconName, routeName }) {
  // Valores compartidos para animación
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  // Efecto cuando cambia el foco
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

  const color = isFocused ? '#F59E0B' : '#E8E5E0'; // Naranja vivo si está activo, blanco suave si no

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={styles.tabButton}
    >
      <Animated.View style={[styles.iconContainer, animatedIconStyle]}>
        <Ionicons name={iconName} size={26} color={color} />
      </Animated.View>
      <Animated.Text style={[styles.label, animatedLabelStyle, { color }]}>
        {label}
      </Animated.Text>
    </Pressable>
  );
}

export default function TabsLayout() {
  const { t } = useTranslation();

  // Configuración de pestañas
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
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
        },
        tabBarBackground: () => (
          <LinearGradient
            colors={['#1B5E20', '#2E7D32']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.gradientBar}
          />
        ),
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
  gradientBar: {
    flex: 1,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
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
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
});