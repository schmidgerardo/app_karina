import { registerRootComponent } from 'expo';
import App from './App';

// Esto es necesario para Reanimated en web
if (typeof window !== 'undefined') {
  // Forzar Reanimated a usar el motor JS en web
  const { configureReanimated } = require('react-native-reanimated');
  configureReanimated({
    // Configuración para web
  });
}

registerRootComponent(App);