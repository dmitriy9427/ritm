/**
 * Напоминания о привычках — локальные уведомления (expo-notifications).
 *
 * «Локальные» значит: их планирует само приложение на устройстве, сервер и
 * интернет не нужны. Системе говорится «показывай каждый вторник в 19:00», и
 * она показывает, даже если приложение закрыто.
 *
 * ─── Как устроено ───────────────────────────────────────────────────────────
 * На каждую пару «привычка + день недели» — своё еженедельное уведомление.
 * Привычка по будням с напоминанием в 19:00 = пять уведомлений. Идентификатор
 * `habit:<id>:<день>` позволяет потом найти и отменить именно их.
 *
 * При любом изменении привычек проще всего пересобрать расписание целиком:
 * отменить все «наши» уведомления и создать заново (syncReminders). Данных
 * мало, а код без состояния не может «рассинхронизироваться».
 *
 * ─── Ограничения ────────────────────────────────────────────────────────────
 *   - в браузере локальных уведомлений нет — функции ничего не делают;
 *   - нужно разрешение пользователя; без него расписание не создаётся;
 *   - iOS хранит не больше 64 запланированных уведомлений на приложение.
 */
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { parseTime } from '@/lib/dates';
import { Habit } from '@/lib/habits';

const supported = Platform.OS !== 'web';
const PREFIX = 'habit:';
const CHANNEL = 'reminders';

/** Показывать уведомление, даже если приложение открыто. Вызывается один раз при старте. */
export function setupNotifications() {
  if (!supported) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
  // Android 8+: уведомления живут в «каналах» — пользователь настраивает их в системе.
  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync(CHANNEL, {
      name: 'Напоминания о привычках',
      importance: Notifications.AndroidImportance.DEFAULT,
    }).catch(() => {});
  }
}

/** Спросить разрешение (система покажет диалог один раз). true — можно планировать. */
export async function requestPermission(): Promise<boolean> {
  if (!supported) return false;
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    if (!current.canAskAgain) return false; // пользователь запретил — только через настройки системы
    return (await Notifications.requestPermissionsAsync()).granted;
  } catch {
    return false;
  }
}

/**
 * День недели приложения (0 — понедельник) → день недели уведомлений
 * (1 — воскресенье … 7 — суббота, как в календаре iOS).
 */
export const toNotificationWeekday = (day: number) => ((day + 1) % 7) + 1;

/** Что должно быть запланировано для привычек — чистая функция, её проверяют тесты. */
export function buildSchedule(habits: Habit[]) {
  return habits.flatMap((habit) => {
    const time = habit.reminder ? parseTime(habit.reminder) : null;
    if (!time) return [];
    return habit.days.map((day) => ({
      identifier: `${PREFIX}${habit.id}:${day}`,
      title: `${habit.emoji} ${habit.title}`,
      body: habit.target > 1 ? `Цель на сегодня: ${habit.target}` : 'Пора отметить привычку',
      weekday: toNotificationWeekday(day),
      ...time,
    }));
  });
}

/** Привести системное расписание в соответствие с привычками. */
export async function syncReminders(habits: Habit[], enabled: boolean): Promise<void> {
  if (!supported) return;
  try {
    const existing = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(
      existing
        .filter((n) => n.identifier.startsWith(PREFIX))
        .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
    );
    if (!enabled) return;
    for (const item of buildSchedule(habits)) {
      await Notifications.scheduleNotificationAsync({
        identifier: item.identifier,
        content: { title: item.title, body: item.body },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday: item.weekday,
          hour: item.hour,
          minute: item.minute,
          channelId: CHANNEL,
        },
      });
    }
  } catch (error) {
    // Напоминания — дополнение: их сбой не должен мешать пользоваться трекером.
    console.warn('[notifications] не удалось обновить напоминания', error);
  }
}
