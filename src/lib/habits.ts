/**
 * Привычки: расписание, отметки, серии, статистика. Чистая логика без React
 * и без хранилища — её легко читать и проверять тестами (habits.test.ts).
 */
import { DayKey, addDays, lastDays, startOfWeek, weekday } from './dates';

/** Цвета привычек — ключи палитры (сами цвета — в constants/theme.ts). */
export const HABIT_COLORS = ['mint', 'blue', 'violet', 'pink', 'orange', 'yellow'] as const;
export type HabitColor = (typeof HABIT_COLORS)[number];

export type Habit = {
  id: string;
  title: string;
  emoji: string;
  color: HabitColor;
  /** По каким дням недели: 0 — понедельник … 6 — воскресенье. */
  days: number[];
  /** Сколько раз в день: 1 — просто «сделал», 8 — «восемь стаканов воды». */
  target: number;
  /** Что считаем: 'стакан', 'минута'… Пусто, если target = 1. */
  unit: string;
  /** Напоминание 'HH:MM' или null. */
  reminder: string | null;
  /** С какого дня привычка существует — раньше она не считается пропущенной. */
  createdAt: DayKey;
};

/** Отметки: привычка → день → сколько раз сделано. */
export type Log = Record<string, Record<DayKey, number>>;

/** Запланирована ли привычка на этот день. */
export const isScheduled = (habit: Habit, day: DayKey) =>
  day >= habit.createdAt && habit.days.includes(weekday(day));

/** Сколько раз сделано в этот день. */
export const countOn = (log: Log, habit: Habit, day: DayKey) => log[habit.id]?.[day] ?? 0;

/** Выполнена ли привычка в этот день (счётчик дошёл до цели). */
export const isDone = (log: Log, habit: Habit, day: DayKey) => countOn(log, habit, day) >= habit.target;

/** Доля выполнения за день, 0…1. */
export const progressOn = (log: Log, habit: Habit, day: DayKey) =>
  Math.min(1, countOn(log, habit, day) / habit.target);

/** Привычки, запланированные на день. */
export const habitsFor = (habits: Habit[], day: DayKey) => habits.filter((h) => isScheduled(h, day));

/**
 * Итог дня: сколько запланировано, сколько выполнено и доля 0…1.
 * Доля считается по прогрессу каждой привычки: 4 стакана из 8 — это половина
 * привычки, а не ноль.
 */
export function daySummary(habits: Habit[], log: Log, day: DayKey) {
  const planned = habitsFor(habits, day);
  const done = planned.filter((h) => isDone(log, h, day)).length;
  const ratio = planned.length ? planned.reduce((sum, h) => sum + progressOn(log, h, day), 0) / planned.length : 0;
  return { planned: planned.length, done, ratio };
}

/**
 * Текущая серия — сколько запланированных дней подряд привычка выполнена.
 *
 * Правила (их стоит проговорить, от них зависит мотивация пользователя):
 *   - дни, на которые привычка НЕ запланирована, серию не рвут и не считаются
 *     (привычка по будням переживает выходные);
 *   - сегодняшний день, пока он не выполнен, серию не рвёт: день ещё идёт;
 *   - первый же пропущенный запланированный день в прошлом серию обрывает.
 */
export function currentStreak(habit: Habit, log: Log, today: DayKey): number {
  let streak = 0;
  for (let day = today; day >= habit.createdAt; day = addDays(day, -1)) {
    if (!isScheduled(habit, day)) continue;
    if (isDone(log, habit, day)) streak++;
    else if (day !== today) break;
  }
  return streak;
}

/** Лучшая серия за всё время существования привычки. */
export function bestStreak(habit: Habit, log: Log, today: DayKey): number {
  let best = 0;
  let run = 0;
  for (let day = habit.createdAt; day <= today; day = addDays(day, 1)) {
    if (!isScheduled(habit, day)) continue;
    if (isDone(log, habit, day)) {
      run++;
      best = Math.max(best, run);
    } else if (day !== today) {
      run = 0;
    }
  }
  return best;
}

/**
 * Доля выполненных запланированных дней за последние `days` дней, 0…1.
 * null — за период привычка ни разу не была запланирована (нечего считать).
 * Сегодня учитывается, только если уже выполнено: незаконченный день не
 * должен портить процент с утра.
 */
export function completionRate(habit: Habit, log: Log, today: DayKey, days = 30): number | null {
  let planned = 0;
  let done = 0;
  for (const day of lastDays(today, days)) {
    if (!isScheduled(habit, day)) continue;
    const ok = isDone(log, habit, day);
    if (day === today && !ok) continue;
    planned++;
    if (ok) done++;
  }
  return planned ? done / planned : null;
}

/** Клетка тепловой карты: день и уровень заливки. */
export type HeatCell = {
  day: DayKey;
  /** -1 — не запланировано или в будущем; 0 — пропуск; 1…3 — насколько выполнено. */
  level: -1 | 0 | 1 | 2 | 3;
};

/**
 * Тепловая карта как на GitHub: `weeks` столбцов-недель, в каждом 7 дней с
 * понедельника. Последний столбец — текущая неделя.
 */
export function heatmap(habit: Habit, log: Log, today: DayKey, weeks = 14): HeatCell[][] {
  const first = addDays(startOfWeek(today), -7 * (weeks - 1));
  return Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, d): HeatCell => {
      const day = addDays(first, w * 7 + d);
      if (day > today || !isScheduled(habit, day)) return { day, level: -1 };
      const p = progressOn(log, habit, day);
      return { day, level: p >= 1 ? 3 : p >= 0.5 ? 2 : p > 0 ? 1 : 0 };
    }),
  );
}

/** Доля выполнения по всем привычкам за каждый из последних `days` дней — для графика. */
export const dailyRatios = (habits: Habit[], log: Log, today: DayKey, days = 7) =>
  lastDays(today, days).map((day) => ({ day, ...daySummary(habits, log, day) }));

/** Новая отметка: вернуть обновлённый Log, не меняя старый. */
export function setCount(log: Log, habitId: string, day: DayKey, count: number): Log {
  const days = { ...log[habitId] };
  if (count > 0) days[day] = count;
  else delete days[day]; // нули не храним — хранилище не растёт от «снятых» отметок
  return { ...log, [habitId]: days };
}

/**
 * Нажатие на привычку. Обычная (target = 1) переключается: сделано ↔ нет.
 * Счётная (target > 1) прибавляет единицу, а после цели — сбрасывается в ноль
 * (чтобы случайную лишнюю отметку можно было убрать тем же нажатием).
 */
export function nextCount(habit: Habit, current: number): number {
  if (habit.target <= 1) return current >= 1 ? 0 : 1;
  return current >= habit.target ? 0 : current + 1;
}
