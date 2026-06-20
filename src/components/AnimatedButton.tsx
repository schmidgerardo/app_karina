import React from 'react';
import { PressableProps } from 'react-native';
import {
  Gesture,
  GestureDetector,
} from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

interface AnimatedButtonProps extends PressableProps {
  children: React.ReactNode;
  className?: string;
}

export function AnimatedButton({
  children,
  className,
  onPress,
  disabled,
}: AnimatedButtonProps) {
  const scale = useSharedValue(1);

  const tap = Gesture.Tap()
    .enabled(!disabled)
    .onBegin(() => {
      scale.value = withSpring(0.95, {
        damping: 10,
        stiffness: 300,
      });
    })
    .onFinalize(() => {
      scale.value = withSpring(1, {
        damping: 10,
        stiffness: 300,
      });
    })
    .onEnd(() => {
      if (onPress) {
        onPress({} as any);
      }
    });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  return (
    <GestureDetector gesture={tap}>
      <Animated.View style={[animatedStyle]} className={className}>
        {children}
      </Animated.View>
    </GestureDetector>
  );
}
