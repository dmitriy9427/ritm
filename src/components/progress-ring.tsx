/**
 * Кольцо прогресса на SVG с плавной анимацией.
 *
 * ─── Как рисуется ───────────────────────────────────────────────────────────
 * Две окружности: серая «дорожка» и цветная поверх. У цветной штрих такой же
 * длины, как сама окружность (strokeDasharray = длина), а strokeDashoffset
 * «сдвигает» его: сдвиг на всю длину — ничего не видно, ноль — круг замкнут.
 * Прогресс 0…1 превращается в сдвиг длина × (1 − прогресс).
 *
 * ─── Как анимируется (Reanimated) ───────────────────────────────────────────
 * Обычный setState перерисовывал бы компонент на каждый кадр — в React Native
 * это медленно (JS-поток → «мост» → нативный слой). Reanimated хранит число в
 * shared value и меняет свойство SVG прямо в UI-потоке, минуя React:
 *   useSharedValue      — число, живущее вне рендера;
 *   withTiming          — «плавно дойди до значения»;
 *   useAnimatedProps    — свойства компонента, вычисляемые из shared value.
 */
import { ReactNode, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { useTheme } from '@/hooks/use-theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type Props = {
  /** Прогресс 0…1. */
  progress: number;
  size: number;
  strokeWidth?: number;
  color?: string;
  /** Что показать в центре кольца (число, эмодзи). */
  children?: ReactNode;
};

export function ProgressRing({ progress, size, strokeWidth = 6, color, children }: Props) {
  const theme = useTheme();
  const radius = (size - strokeWidth) / 2;
  const length = 2 * Math.PI * radius;
  const value = useSharedValue(progress);

  useEffect(() => {
    value.value = withTiming(Math.min(1, Math.max(0, progress)), { duration: 450, easing: Easing.out(Easing.cubic) });
  }, [progress, value]);

  const animatedProps = useAnimatedProps(() => ({ strokeDashoffset: length * (1 - value.value) }));

  return (
    <View style={{ width: size, height: size }}>
      {/* rotate(-90): окружность SVG начинается справа («3 часа»), а нам нужно сверху. */}
      <Svg width={size} height={size} style={styles.svg}>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={theme.track} strokeWidth={strokeWidth} fill="none" />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color ?? theme.accent}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={length}
          animatedProps={animatedProps}
          fill="none"
        />
      </Svg>
      <View style={styles.center}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  svg: { transform: [{ rotate: '-90deg' }] },
  center: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center' },
});
