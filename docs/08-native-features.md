# 08. Возможности телефона

То, ради чего делают приложение, а не сайт: вибрация, уведомления, системные диалоги.
В Expo каждая возможность — отдельный пакет `expo-*`.

## Правило: платформенный код — в `src/platform/`

Экраны не импортируют `expo-haptics` и `expo-notifications` напрямую. Они вызывают
`haptic.success()` и `syncReminders()`, а обёртка решает три вопроса в одном месте:

1. **Есть ли возможность здесь?** В браузере вибрации и локальных уведомлений нет.
2. **Что, если она сломалась?** «Украшение» не должно ронять приложение.
3. **Включена ли она пользователем?**

```
src/platform/
├── haptics.ts          вибрация
├── notifications.ts    напоминания
└── confirm.ts          диалог подтверждения
```

## Вибрация (`haptics.ts`)

```ts
const run = (fn: () => Promise<void>) => {
  if (!enabled || Platform.OS === 'web') return;
  fn().catch(() => {});       // нет моторчика / энергосбережение — молча пропускаем
};

export const haptic = {
  select:  () => run(() => Haptics.selectionAsync()),
  tap:     () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  success: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warning: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
};
```

Три вида отклика (из гайдлайнов Apple) — у каждого свой смысл:

| Вид | Когда | В проекте |
| --- | --- | --- |
| selection | сменился выбор | день в календаре, цвет, день недели |
| impact | нажатие, «столкновение» | +1 к счётчику |
| notification | результат действия | привычка выполнена; удаление |

Вибрация на каждое касание раздражает и перестаёт что-либо значить. И её можно выключить:
Настройки → Вибрация. Настройка хранится в сторе, а модуль вибрации живёт вне React —
их связывает `useStore.subscribe` в конце `store.ts`.

## Платформенные различия в коде

```ts
import { Platform } from 'react-native';

if (Platform.OS === 'web') …                                  // 'ios' | 'android' | 'web'
const behavior = Platform.OS === 'ios' ? 'padding' : undefined;
const font = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });
```

Когда различий много — отдельные файлы: `button.ios.tsx`, `button.android.tsx`,
`button.web.tsx`. Импорт `./button` сам выберет нужный.

Пример из проекта — `confirm.ts`. `Alert.alert` из React Native в браузере **ничего не
показывает**, поэтому там `window.confirm`. Вызывающему коду всё равно:

```ts
if (!(await confirm('Удалить всё?', 'Все привычки и история будут удалены.'))) return;
```

## Уведомления (`notifications.ts`)

**Локальные** уведомления планирует само приложение: системе говорится «показывай каждый
вторник в 19:00», и она показывает, даже если приложение закрыто. Сервер и интернет не
нужны. (Push-уведомления — другое: их присылает сервер через Apple/Google; нужен бэкенд и
своя сборка приложения.)

### Разрешение

```ts
const current = await Notifications.getPermissionsAsync();
if (current.granted) return true;
if (!current.canAskAgain) return false;       // запретил — теперь только через настройки системы
return (await Notifications.requestPermissionsAsync()).granted;
```

Системный диалог на iOS показывается **один раз**. Поэтому разрешение запрашивается не при
запуске, а когда человек сам включает «Напоминания» — он понимает, зачем. Отказал —
переключатель возвращается в «выключено», приложение работает дальше.

### Расписание

На каждую пару «привычка + день недели» — своё еженедельное уведомление с идентификатором
`habit:<id>:<день>`:

```ts
await Notifications.scheduleNotificationAsync({
  identifier: 'habit:abc:1',
  content: { title: '🏃 Зарядка', body: 'Пора отметить привычку' },
  trigger: { type: SchedulableTriggerInputTypes.WEEKLY, weekday: 3, hour: 19, minute: 0, channelId: 'reminders' },
});
```

Ловушка: `weekday` у уведомлений — **1 — воскресенье … 7 — суббота**, а в приложении
0 — понедельник. Перевод — `toNotificationWeekday`, и на него есть тест: ошибка на единицу
здесь означает напоминание не в тот день, и заметить её можно только через неделю.

### Синхронизация «снести и создать заново»

`syncReminders(habits, enabled)` отменяет все уведомления с префиксом `habit:` и создаёт
расписание заново. Вызывается из корневого `_layout.tsx` при любом изменении привычек или
настройки. Это проще и надёжнее, чем отслеживать, что именно поменялось: код без состояния
не может «рассинхронизироваться».

Что должно быть запланировано, решает **чистая функция** `buildSchedule(habits)` — её
проверяют тесты без телефона. Вызовы системы — тонкая оболочка вокруг неё.

### Ограничения

- iOS хранит не больше **64** запланированных уведомлений на приложение;
- Android 8+: уведомления живут в «каналах» — канал создаётся в `setupNotifications()`;
- в Expo Go локальные уведомления работают; push на Android — только в своей сборке;
- в браузере функции ничего не делают, а переключатель в настройках неактивен с подписью «только на телефоне».

## Что ещё бывает

| Задача | Пакет |
| --- | --- |
| Камера, выбор фото | `expo-camera`, `expo-image-picker` |
| Геолокация | `expo-location` |
| Face ID / отпечаток | `expo-local-authentication` |
| Безопасное хранение токенов | `expo-secure-store` |
| Файлы, «Поделиться» | `expo-file-system`, `expo-sharing` |
| Буфер обмена | `expo-clipboard` |
| Датчики (шагомер, акселерометр) | `expo-sensors` |

Схема всегда та же: `npx expo install <пакет>` → разрешение (если нужно) → обёртка в
`src/platform/` с ответом на вопрос «а что в браузере и при отказе».

`npx expo install`, а не `npm install`: он ставит версию пакета, совместимую с вашим SDK.
