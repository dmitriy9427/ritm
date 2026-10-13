/**
 * Базовые элементы интерфейса: текст, экран, карточка, кнопки.
 *
 * В React Native нет глобальных стилей и тегов h1/p/button. Вся типографика и
 * «кнопочность» — свои компоненты. Собрав их в одном файле, получаем
 * единообразие: размер заголовка или радиус карточки меняется в одном месте.
 */
import { Ionicons } from '@expo/vector-icons';
import { ComponentProps, ReactNode } from 'react';
import { Pressable, StyleProp, StyleSheet, Text, TextProps, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HitSize, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// ─── Текст ───────────────────────────────────────────────────────────────────

const TEXT = StyleSheet.create({
  title: { fontSize: 28, lineHeight: 34, fontWeight: '800', letterSpacing: -0.5 },
  heading: { fontSize: 20, lineHeight: 26, fontWeight: '700' },
  body: { fontSize: 16, lineHeight: 22 },
  bodyBold: { fontSize: 16, lineHeight: 22, fontWeight: '600' },
  small: { fontSize: 13, lineHeight: 18 },
  caption: { fontSize: 11, lineHeight: 14, fontWeight: '600', letterSpacing: 0.4, textTransform: 'uppercase' },
});

type AppTextProps = TextProps & {
  variant?: keyof typeof TEXT;
  /** Вторичный (серый) текст. */
  muted?: boolean;
  color?: string;
};

/**
 * Текст приложения. В RN любой текст обязан лежать в <Text> — строка прямо во
 * <View> — ошибка. Этот компонент добавляет размер из набора и цвет темы.
 */
export function AppText({ variant = 'body', muted, color, style, ...props }: AppTextProps) {
  const theme = useTheme();
  return <Text {...props} style={[TEXT[variant], { color: color ?? (muted ? theme.textSecondary : theme.text) }, style]} />;
}

// ─── Экран ───────────────────────────────────────────────────────────────────

/**
 * Обёртка экрана: фон темы, «безопасная зона» сверху (чёлка, статус-бар) и
 * ограничение ширины — на планшете и в браузере содержимое не расползается.
 * Нижний край не отступаем: под экраном стоит панель вкладок, она сама
 * учитывает полоску жестов.
 */
export function Screen({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const theme = useTheme();
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.screen, { backgroundColor: theme.background }]}>
      <View style={[styles.content, style]}>{children}</View>
    </SafeAreaView>
  );
}

// ─── Карточка ────────────────────────────────────────────────────────────────

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const theme = useTheme();
  return <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }, style]}>{children}</View>;
}

// ─── Кнопки ──────────────────────────────────────────────────────────────────

type ButtonProps = {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  icon?: ComponentProps<typeof Ionicons>['name'];
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * Кнопка. Pressable — основа любого нажимаемого элемента в RN: сообщает, нажат
 * ли он сейчас (pressed), — так делается отклик на касание (на телефоне нет
 * :hover, зато важно мгновенно показать, что нажатие принято).
 * accessibilityRole="button" — скринридер назовёт элемент кнопкой.
 */
export function Button({ title, onPress, variant = 'primary', icon, disabled, style }: ButtonProps) {
  const theme = useTheme();
  const background = variant === 'primary' ? theme.accent : variant === 'danger' ? 'transparent' : theme.card;
  const color = variant === 'primary' ? theme.accentText : variant === 'danger' ? theme.danger : theme.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: background, borderColor: variant === 'primary' ? 'transparent' : theme.border },
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}>
      {icon && <Ionicons name={icon} size={18} color={color} />}
      <AppText variant="bodyBold" color={color}>
        {title}
      </AppText>
    </Pressable>
  );
}

type IconButtonProps = {
  icon: ComponentProps<typeof Ionicons>['name'];
  /** Обязательная подпись для скринридера: у кнопки-иконки нет текста. */
  label: string;
  onPress: () => void;
  color?: string;
  disabled?: boolean;
};

export function IconButton({ icon, label, onPress, color, disabled }: IconButtonProps) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      hitSlop={8} // область нажатия шире видимой иконки
      style={({ pressed }) => [styles.iconButton, pressed && styles.pressed, disabled && styles.disabled]}>
      <Ionicons name={icon} size={22} color={color ?? theme.text} />
    </Pressable>
  );
}

/** Заголовок раздела внутри экрана. */
export function SectionTitle({ children }: { children: string }) {
  return (
    <AppText variant="caption" muted style={styles.sectionTitle}>
      {children}
    </AppText>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { flex: 1, width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  card: { borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: Spacing[4] },
  button: {
    minHeight: HitSize + 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[2],
    paddingHorizontal: Spacing[5],
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  iconButton: { width: HitSize, height: HitSize, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.full },
  pressed: { opacity: 0.6 },
  disabled: { opacity: 0.35 },
  sectionTitle: { marginTop: Spacing[6], marginBottom: Spacing[2], marginLeft: Spacing[1] },
});
