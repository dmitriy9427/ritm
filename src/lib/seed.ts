/**
 * Демо-данные для первого запуска: шесть привычек и «история» за 10 недель.
 * Пустой трекер выглядит мёртвым и ничего не показывает — ни серий, ни
 * статистики. Демо можно стереть в настройках.
 *
 * История генерируется детерминированно (одинаково при каждом запуске): генератор
 * случайных чисел с зерном. С Math.random() картинка менялась бы после каждого
 * сброса, а тесты нельзя было бы написать.
 */
import { DayKey, addDays } from './dates';
import { Habit, Log, isScheduled } from './habits';

const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6];
const WEEKDAYS = [0, 1, 2, 3, 4];

/** Шаблоны привычек: id и createdAt проставляются в seed(). */
export const DEMO_HABITS: (Omit<Habit, 'id' | 'createdAt'> & { reliability: number })[] = [
  { title: 'Вода', emoji: '💧', color: 'blue', days: EVERY_DAY, target: 8, unit: 'стакан', reminder: null, reliability: 0.85 },
  { title: 'Зарядка', emoji: '🤸', color: 'orange', days: EVERY_DAY, target: 1, unit: '', reminder: '07:30', reliability: 0.8 },
  { title: 'Английский', emoji: '🇬🇧', color: 'violet', days: WEEKDAYS, target: 1, unit: '', reminder: '19:00', reliability: 0.75 },
  { title: 'Чтение', emoji: '📚', color: 'mint', days: EVERY_DAY, target: 20, unit: 'страница', reminder: '21:30', reliability: 0.7 },
  { title: 'Пробежка', emoji: '🏃', color: 'pink', days: [0, 2, 4], target: 1, unit: '', reminder: null, reliability: 0.65 },
  { title: 'Без сладкого', emoji: '🍬', color: 'yellow', days: EVERY_DAY, target: 1, unit: '', reminder: null, reliability: 0.6 },
];

/** mulberry32: одинаковое зерно → одинаковая последовательность чисел 0…1. */
export function seeded(seed: number) {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Собрать демо-привычки и отметки.
 * @param today Сегодняшний день: история строится назад от него.
 * @param weeks Сколько недель истории.
 */
export function seed(today: DayKey, weeks = 14): { habits: Habit[]; log: Log } {
  const start = addDays(today, -7 * weeks);
  const habits: Habit[] = DEMO_HABITS.map(({ reliability: _, ...habit }, i) => ({
    ...habit,
    id: `demo-${i + 1}`,
    createdAt: start,
  }));
  const log: Log = {};

  habits.forEach((habit, i) => {
    const rnd = seeded(1000 + i * 7919);
    const { reliability } = DEMO_HABITS[i];
    const days: Record<DayKey, number> = {};

    // До вчера включительно: сегодняшний день пользователь отмечает сам.
    for (let day = start; day < today; day = addDays(day, 1)) {
      if (!isScheduled(habit, day)) continue;
      const roll = rnd();
      // Последние две недели — почти без пропусков: у демо есть живая серия.
      const recent = day >= addDays(today, -14);
      if (roll < (recent ? Math.max(reliability, 0.93) : reliability)) days[day] = habit.target;
      else if (habit.target > 1 && roll < reliability + 0.2) days[day] = Math.ceil(habit.target * rnd() * 0.8);
    }
    log[habit.id] = days;
  });

  return { habits, log };
}
