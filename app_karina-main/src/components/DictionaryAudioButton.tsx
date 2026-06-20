import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { LucideVolume2, LucideVolumeX, LucidePause } from 'lucide-react-native';
import { AnimatedButton } from './AnimatedButton';

interface DictionaryAudioButtonProps {
  onPress: () => void;
  isPlaying: boolean;
  isLoading?: boolean;
  hasAudio: boolean;
  color?: string;
}

export function DictionaryAudioButton({
  onPress,
  isPlaying,
  isLoading,
  hasAudio,
  color = '#1B5E20',
}: DictionaryAudioButtonProps) {
  if (!hasAudio) {
    return (
      <View style={{ opacity: 0.3, padding: 8 }}>
        <LucideVolumeX size={20} color="#888" />
      </View>
    );
  }

  return (
    <AnimatedButton
      onPress={onPress}
      className={`p-2 rounded-full items-center justify-center ${
        isPlaying ? 'bg-primary/10' : 'bg-transparent'
      }`}
    >
      {isLoading ? (
        <ActivityIndicator size="small" color={color} />
      ) : isPlaying ? (
        <LucidePause size={20} color={color} fill={color} />
      ) : (
        <LucideVolume2 size={20} color={color} />
      )}
    </AnimatedButton>
  );
}
