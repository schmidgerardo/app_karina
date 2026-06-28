module.exports = {
  presets: [['miaoda-expo-devkit/babel-preset', { excludePaths: ['src/components/ui'] }]],
  plugins: [
    'react-native-reanimated/plugin',
    // A veces ayuda agregar esto:
    ['@babel/plugin-transform-react-jsx', { runtime: 'automatic' }],
  ],
};