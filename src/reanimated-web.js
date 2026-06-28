// Configuración específica para Reanimated en web
import { configureReanimated } from 'react-native-reanimated';

// Esto asegura que Reanimated use el motor JS en web
if (typeof window !== 'undefined') {
  configureReanimated({
    // Configuración mínima para web
  });
}