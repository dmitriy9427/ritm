# 1. Логика привычек и даты

[src/lib/habits.ts](../../src/lib/habits.ts), [src/lib/dates.ts](../../src/lib/dates.ts)

## Где на экране

Везде, где есть числа: «3 из 5», «🔥 7», процент дня в кольце, тепловая карта на «Статистике».
Сами файлы ничего не рисуют — это **чистые функции**: данные на входе, ответ на выходе. Ни React,
ни телефона, ни текущего времени внутри.

## Что делают

| Функция | Ответ на вопрос |
| --- | --- |
| `isScheduled(habit, day)` | нужно ли делать привычку в этот день |
| `countOn(log, habit, day)` | сколько раз сделано |
| `isDone` / `progressOn` | выполнено ли / на какую долю |
| `daySummary(habits, log, day)` | сколько запланировано, сколько выполнено, доля дня |
| `currentStreak` / `bestStreak` | текущая и лучшая серия |
| `completionRate` | процент выполнения за 30 дней |
| `heatmap` | клетки «тепловой карты» как на GitHub |
| `nextCount` + `setCount` | что станет с отметкой после нажатия |

## Данные

```ts
type Habit = {
  id: string
  title: string          // «Вода»
  emoji: string          // «💧»
  color: HabitColor      // 'blue' — ключ палитры, а не сам цвет
  days: number[]         // [0, 1, 2, 3, 4] — будни (0 — понедельник)
  target: number         // 8 — «восемь стаканов»; 1 — просто «сделал»
  unit: string           // «стакан»
  reminder: string | null // '19:00'
  createdAt: DayKey      // с какого дня существует
}

type Log = Record<string, Record<DayKey, number>>
// { 'h1': { '2026-10-13': 3, '2026-10-14': 8 } }
```

Отметки — не массив событий, а словарь «привычка → день → сколько». Ответ на «сколько сделано
во вторник» — одно обращение: `log[id]?.[day] ?? 0`.

## Ключ дня — строка, а не `Date`

```ts
export function toKey(date: Date): DayKey {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function fromKey(key: DayKey): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}
```

День привычки — **календарный день человека**, а не момент времени. `Date` хранит момент в UTC:
«вторник 23:30 в Москве» в UTC — вторник 20:30, а в Нью-Йорке — уже другой день.

- `toKey` берёт **локальные** год, месяц, день (`getFullYear`, а не `getUTCFullYear`).
- `fromKey` создаёт **локальную** полночь. Не `new Date('2026-10-13')`: строка такого вида
  разбирается как UTC-полночь, и западнее Гринвича получится 12 октября.
- Строки сравниваются как числа (`'2026-10-09' < '2026-10-13'`), сортируются и сохраняются в
  JSON без сюрпризов.

```ts
export function diffDays(a: DayKey, b: DayKey): number {
  const noon = (key: DayKey) => {
    const date = fromKey(key)
    date.setHours(12)
    return date.getTime()
  }
  return Math.round((noon(b) - noon(a)) / 86_400_000)
}
```

Почему полдень? В день перехода на летнее время сутки — 23 или 25 часов, и разница полуночей не
делится на 24 часа ровно. Полдни отстоят на «почти сутки», а `Math.round` убирает остаток.

```ts
export function weekday(key: DayKey): number {
  return (fromKey(key).getDay() + 6) % 7
}
```

У `Date` неделя начинается с воскресенья (0), в русском календаре — с понедельника. `+6 % 7`
сдвигает: воскресенье 0 → 6, понедельник 1 → 0.

## Серия

```ts
export function currentStreak(habit: Habit, log: Log, today: DayKey): number {
  let streak = 0
  for (let day = today; day >= habit.createdAt; day = addDays(day, -1)) {
    if (!isScheduled(habit, day)) continue
    if (isDone(log, habit, day)) streak++
    else if (day !== today) break
  }
  return streak
}
```

Идём от сегодня назад. Три правила, от которых зависит мотивация человека:

| Ситуация | Что делаем | Почему |
| --- | --- | --- |
| день не запланирован (выходной у привычки по будням) | пропускаем | привычка по будням не должна обнуляться каждые выходные |
| сегодня ещё не отмечено | не обрываем | день ещё идёт — с утра серия не должна показывать 0 |
| запланированный день в прошлом пропущен | обрываем | это и есть «сорвался» |

`today` — **параметр**, а не `new Date()` внутри. Поэтому тест может сказать «пусть сегодня
13 октября» и не зависит от дня запуска.

## Доля дня

```ts
export function daySummary(habits, log, day) {
  const planned = habitsFor(habits, day)
  const done = planned.filter((h) => isDone(log, h, day)).length
  const ratio = planned.length ? planned.reduce((sum, h) => sum + progressOn(log, h, day), 0) / planned.length : 0
  return { planned: planned.length, done, ratio }
}
```

Доля считается по **прогрессу** каждой привычки: 4 стакана из 8 — половина привычки. Иначе
кольцо дня стояло бы на месте, пока не выпит восьмой стакан.

## Нажатие на привычку

```ts
export function nextCount(habit: Habit, current: number): number {
  if (habit.target <= 1) return current >= 1 ? 0 : 1
  return current >= habit.target ? 0 : current + 1
}

export function setCount(log: Log, habitId: string, day: DayKey, count: number): Log {
  const days = { ...log[habitId] }
  if (count > 0) days[day] = count
  else delete days[day]
  return { ...log, [habitId]: days }
}
```

- Обычная привычка переключается: сделано ↔ нет. Счётная прибавляет, а после цели сбрасывается —
  случайную лишнюю отметку убирают тем же нажатием.
- `setCount` **не меняет** старый объект, а возвращает новый. Zustand и React сравнивают по
  ссылке: изменённый «на месте» объект они бы не заметили.
- Нули не храним: отсутствие ключа и так значит 0.

## Что будет, если…

| Сделать | Что сломается |
| --- | --- |
| `new Date(key)` вместо `fromKey` | в Америке все отметки «съезжают» на день раньше |
| `new Date()` внутри `currentStreak` | тесты падают в зависимости от дня запуска |
| `else break` без `day !== today` | утром серия 0 у всех привычек |
| мутировать `log[id][day] = n` | экран не перерисуется после нажатия |

## Проверьте себя

1. Привычка «каждый день», отмечены 10, 11, 13 октября, сегодня 14-е, не отмечено. Серия?
2. Почему день недели хранится числом от понедельника, если `Date` считает от воскресенья?

<details>
<summary>Ответы</summary>

1. 1: 14-е идёт (не рвёт), 13-е выполнено, 12-е пропущено — обрыв.
2. Так отображается неделя в интерфейсе (Пн…Вс) и так её видит человек; перевод в формат `Date`
   и уведомлений — только на границах (`weekday`, `toNotificationWeekday`).
</details>
