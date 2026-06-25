import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="sign-up" />
      {/* Añadimos explícitamente la ruta de recuperación */}
      <Stack.Screen name="reset-password" />
    </Stack>
  );
}