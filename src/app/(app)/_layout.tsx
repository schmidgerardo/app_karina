import { Stack } from 'expo-router';

export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }} initialRouteName="(tabs)">
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="pronunciacion" />
      <Stack.Screen name="modulo/[id]" />
      <Stack.Screen name="practica/[id]" />
      <Stack.Screen name="juego/unir" />
      <Stack.Screen name="juego/opciones" />
      <Stack.Screen name="juego/dictado" />
      <Stack.Screen name="audios/index" />
    </Stack>
  );
}
