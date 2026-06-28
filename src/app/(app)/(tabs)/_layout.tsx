import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { View, Text, Pressable, StyleSheet, Animated } from 'react-native';
import { useEffect, useRef } from 'react';

function TabBarButton({ onPress, onLongPress, isFocused, label, iconName }) {
  // Usamos Animated nativo en lugar de Reanimated
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: isFocused ? 1.1 : 1,
        friction: 6,
        tension: 80,
        useNativeDriver: false, // ← Importante: false para web
      }),
      Animated.spring(opacityAnim, {
        toValue: isFocused ? 1 : 0.6,
        friction: 6,
        tension: 80,
        useNativeDriver: false,
      }),
    ]).start();
  }, [isFocused]);

  const color = isFocused ? '#F59E0B' : '#A0A0A0';

  return (
    <Pressable onPress={onPress} onLongPress={onLongPress} style={styles.tabButton}>
      <Animated.View style={[
        styles.iconContainer,
        { transform: [{ scale: scaleAnim }], opacity: opacityAnim }
      ]}>
        <Ionicons name={iconName} size={26} color={color} />
        {isFocused && <View style={styles.activeIndicator} />}
      </Animated.View>
      <Animated.Text style={[styles.label, { color, opacity: opacityAnim }]}>
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
          backgroundColor: '#1B5E20',
          borderTopWidth: 0,
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.1,
          shadowRadius: 12,
          elevation: 10,
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