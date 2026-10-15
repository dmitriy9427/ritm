# 6. Напоминания и вибрация

[src/platform/notifications.ts](../../src/platform/notifications.ts), [src/platform/haptics.ts](../../src/platform/haptics.ts)

## Где на экране

Форма привычки: «Напоминание — 19:00». Настройки: «Напоминания», «Вибрация». Во вторник в 19:00 на
экране блокировки: «💧 Вода — Цель на сегодня: 8». Приложение при этом может быть закрыто.

## Правило: всё, что зависит от телефона, — в `src/platform/`

Вибрации и уведомлений нет в браузере, моторчика нет на части устройств, разрешение могут не
дать. Если звать модули устройства прямо из компонентов, каждый экран обрастёт проверками. Здесь
компоненты зовут `haptic.success()` и `syncReminders(...)`, а «можно ли» решает обёртка.

## Вибрация

```ts
let enabled = true
export const setHapticsEnabled = (value: boolean) => { enabled = value }

const run = (fn: () => Promise<void>) => {
  if (!enabled || Platform.OS === 'web') return
  fn().catch(() => {})
}

export const haptic = {
  select: () => run(() => Haptics.selectionAsync()),
  tap: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  success: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warning: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
}
```

- Выключено в настройках или веб — молча ничего.
- `.catch(() => {})` — нет моторчика, режим энергосбережения: «украшение» не должно ронять
  приложение.
- Четыре **смысла**, а не четыре силы: «сменился выбор», «нажатие», «успех», «осторожно» — так
  советуют гайдлайны Apple. Компонент говорит, **что** случилось, а не «вибрируй 10 мс».

## Напоминания

### Расписание — чистая функция

```ts
export function buildSchedule(habits: Habit[]) {
  return habits.flatMap((habit) => {
    const time = habit.reminder ? parseTime(habit.reminder) : null
    if (!time) return []
    return habit.days.map((day) => ({
      identifier: `${PREFIX}${habit.id}:${day}`,
      title: `${habit.emoji} ${habit.title}`,
      body: habit.target > 1 ? `Цель на сегодня: ${habit.target}` : 'Пора отметить привычку',
      weekday: toNotificationWeekday(day),
      ...time,
    }))
  })
}
```

На каждую пару «привычка + день недели» — своё **еженедельное** уведомление. По будням в 19:00 —
пять штук. Функция ничего не планирует — только отвечает «что должно быть», поэтому её проверяют
тесты без телефона.

```ts
export const toNotificationWeekday = (day: number) => ((day + 1) % 7) + 1
```

У приложения 0 — понедельник, у календаря iOS 1 — воскресенье, 2 — понедельник.

### Синхронизация — «снести и построить заново»

```ts
export async function syncReminders(habits: Habit[], enabled: boolean): Promise<void> {
  if (!supported) return
  try {
    const existing = await Notifications.getAllScheduledNotificationsAsync()
    await Promise.all(existing.filter((n) => n.identifier.startsWith(PREFIX))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)))
    if (!enabled) return
    for (const item of buildSchedule(habits)) {
      await Notifications.scheduleNotificationAsync({
        identifier: item.identifier,
        content: { title: item.title, body: item.body },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday: item.weekday, hour: item.hour, minute: item.minute, channelId: CHANNEL },
      })
    }
  } catch (error) {
    console.warn('[notifications] не удалось обновить напоминания', error)
  }
}
```

Точечные правки («время сменилось с 19 на 20 — найди и поправь пять уведомлений») легко
рассинхронизировать. Проще при **любом** изменении отменить все свои (`habit:` в начале
идентификатора — чужие не трогаем) и создать заново. Данных мало, а код без состояния не может
разойтись с реальностью.

Вызывается из корневого `_layout.tsx` эффектом на `[hydrated, habits, reminders]` — после чтения
данных и при каждом изменении привычек.

### Разрешение

```ts
export async function requestPermission(): Promise<boolean> {
  if (!supported) return false
  const current = await Notifications.getPermissionsAsync()
  if (current.granted) return true
  if (!current.canAskAgain) return false
  return (await Notifications.requestPermissionsAsync()).granted
}
```

- Спрашиваем, **когда человек включает напоминания**, а не при запуске: тогда он понимает зачем.
- `canAskAgain === false` — однажды запретил, системный диалог больше не появится. Остаётся
  объяснить, где включить в настройках телефона.

### Показ при открытом приложении и каналы Android

```ts
Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
})
if (Platform.OS === 'android') Notifications.setNotificationChannelAsync(CHANNEL, { name: 'Напоминания о привычках', … })
```

По умолчанию при **открытом** приложении уведомление не показывается — хендлер разрешает баннер.
На Android 8+ уведомления живут в «каналах», которые человек настраивает в системе по
отдельности.

## Что будет, если…

| Сделать | Что сломается |
| --- | --- |
| звать `Haptics.*` прямо в компонентах | в браузере — ошибки на каждое нажатие |
| спрашивать разрешение при запуске | многие откажут не глядя, и больше спросить нельзя |
| отменять **все** уведомления, а не с префиксом | сотрутся уведомления других частей приложения |
| у iOS больше 64 запланированных | лишние молча не придут |

## Проверьте себя

1. Сколько уведомлений запланирует привычка «каждый день в 7:00» и «по выходным в 10:00»?
2. Почему `syncReminders` не падает, если разрешения нет?

<details>
<summary>Ответы</summary>

1. 7 + 2 = 9.
2. Ошибка планирования поймана `try/catch`: напоминания — дополнение, трекер работает и без них.
</details>
