/**
 * Тема: цвета (светлая и тёмная), отступы, скругления.
 *
 * В React Native нет CSS-переменных и каскада. Тема — обычный объект, а
 * компонент берёт нужный набор цветов хуком useTheme() и подставляет в style.
 * Правило проекта: в компонентах нет «сырых» цветов (#fff) и чисел отступов —
 * только значения отсюда. Тогда тёмная тема и смена палитры — одно место.
 */
import { HabitColor } from '@/lib/habits';

export const Colors = {
  light: {
    background: '#F4F5F7',
    card: '#FFFFFF',
    cardPressed: '#F0F1F4',
    text: '#14161B',
    textSecondary: '#6B7280',
    border: '#E4E6EB',
    accent: '#14B87A',
    accentText: '#FFFFFF',
    danger: '#E5484D',
    track: '#E7E9EE', // дорожки прогресса, пустые клетки
    overlay: 'rgba(20, 22, 27, 0.45)',
  },
  dark: {
    background: '#0D0F12',
    card: '#181B20',
    cardPressed: '#20242B',
    text: '#F2F4F7',
    textSecondary: '#9AA3B2',
    border: '#262A32',
    accent: '#2FD18F',
    accentText: '#07120D',
    danger: '#FF6369',
    track: '#262A32',
    overlay: 'rgba(0, 0, 0, 0.6)',
  },
} as const;

export type Scheme = keyof typeof Colors;
/** Набор цветов темы: одинаковые ключи, значения — любые строки (а не литералы светлой темы). */
export type Theme = { [K in keyof typeof Colors.light]: string };

/**
 * Цвета привычек. У каждого — основной тон и «мягкий» фон под эмодзи для
 * светлой и тёмной темы (на тёмном фоне пастель должна быть темнее).
 */
export const HabitPalette: Record<HabitColor, { main: string; soft: { light: string; dark: string } }> = {
  mint: { main: '#14B87A', soft: { light: '#DDF6EA', dark: '#12382B' } },
  blue: { main: '#3B82F6', soft: { light: '#DFEAFE', dark: '#172A4A' } },
  violet: { main: '#8B5CF6', soft: { light: '#EAE2FE', dark: '#2B2150' } },
  pink: { main: '#EC4899', soft: { light: '#FCE1EF', dark: '#4A1A33' } },
  orange: { main: '#F97316', soft: { light: '#FEE7D5', dark: '#4A2610' } },
  yellow: { main: '#EAB308', soft: { light: '#FBF1CC', dark: '#44360A' } },
};

/** Шаг отступов — 4. Spacing[4] = 16. Числа «из головы» в стилях не пишем. */
export const Spacing = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40 } as const;

export const Radius = { sm: 8, md: 12, lg: 16, xl: 24, full: 999 } as const;

/** На широком экране (планшет, браузер) содержимое не растягивается шире этого. */
export const MaxContentWidth = 560;

/** Минимальный размер области нажатия (рекомендации Apple — 44, Google — 48). */
export const HitSize = 44;
