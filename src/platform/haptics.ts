/**
 * Вибрация (тактильный отклик). Обёртка над expo-haptics:
 *   - в браузере и на устройствах без моторчика ничего не делает;
 *   - ошибки модуля не должны ронять приложение из-за «украшения»;
 *   - выключается одной настройкой (Настройки → Вибрация).
 *
 * Три вида отклика (гайдлайны Apple): selection — сменился выбор, impact —
 * нажатие, notification — результат действия (успех / предупреждение).
 */
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

let enabled = true;

/** Включить/выключить вибрацию (вызывает хранилище при смене настройки). */
export const setHapticsEnabled = (value: boolean) => {
  enabled = value;
};

const run = (fn: () => Promise<void>) => {
  if (!enabled || Platform.OS === 'web') return;
  fn().catch(() => {}); // нет моторчика / режим энергосбережения — молча пропускаем
};

export const haptic = {
  /** Смена выбора: день в календаре, цвет, день недели. */
  select: () => run(() => Haptics.selectionAsync()),
  /** Нажатие на привычку (+1 к счётчику). */
  tap: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  /** Привычка выполнена. */
  success: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  /** Опасное действие: удаление, сброс. */
  warning: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
};
