import { addDays } from './dates';
import {
  Habit,
  Log,
  bestStreak,
  completionRate,
  currentStreak,
  dailyRatios,
  daySummary,
  habitsFor,
  heatmap,
  isDone,
  isScheduled,
  nextCount,
  progressOn,
  setCount,
} from './habits';
import { seed } from './seed';

// 2026-10-12 — понедельник.
const MON = '2026-10-12';
const habit = (over: Partial<Habit> = {}): Habit => ({
  id: 'h',
  title: 'Зарядка',
  emoji: '🤸',
  color: 'mint',
  days: [0, 1, 2, 3, 4, 5, 6],
  target: 1,
  unit: '',
  reminder: null,
  createdAt: '2026-09-01',
  ...over,
});
/** Отметить дни: done(habit, ['2026-10-12', …]). */
const done = (h: Habit, days: string[]): Log => ({ [h.id]: Object.fromEntries(days.map((d) => [d, h.target])) });

describe('расписание и отметки', () => {
  it('isScheduled: дни недели и не раньше дня создания', () => {
    const weekdays = habit({ days: [0, 1, 2, 3, 4], createdAt: '2026-10-13' });
    expect(isScheduled(weekdays, '2026-10-13')).toBe(true); // вторник
    expect(isScheduled(weekdays, '2026-10-17')).toBe(false); // суббота
    expect(isScheduled(weekdays, MON)).toBe(false); // привычки ещё не было
  });

  it('счётная привычка: прогресс и выполнение по цели', () => {
    const water = habit({ target: 8 });
    const log = setCount({}, 'h', MON, 4);
    expect(progressOn(log, water, MON)).toBe(0.5);
    expect(isDone(log, water, MON)).toBe(false);
    expect(isDone(setCount(log, 'h', MON, 9), water, MON)).toBe(true);
    expect(progressOn(setCount(log, 'h', MON, 20), water, MON)).toBe(1); // не больше 100%
  });

  it('setCount не меняет старый объект и не хранит нули', () => {
    const before: Log = { h: { [MON]: 1 } };
    const after = setCount(before, 'h', MON, 0);
    expect(before.h[MON]).toBe(1);
    expect(after.h).toEqual({});
    expect(setCount({}, 'new', MON, 2)).toEqual({ new: { [MON]: 2 } });
  });

  it('nextCount: обычная переключается, счётная растёт и после цели сбрасывается', () => {
    expect(nextCount(habit(), 0)).toBe(1);
    expect(nextCount(habit(), 1)).toBe(0);
    const water = habit({ target: 3 });
    expect([0, 1, 2, 3].map((n) => nextCount(water, n))).toEqual([1, 2, 3, 0]);
  });

  it('daySummary считает долю по прогрессу каждой привычки', () => {
    const a = habit({ id: 'a' });
    const water = habit({ id: 'w', target: 8 });
    const weekend = habit({ id: 'x', days: [5, 6] }); // в понедельник не запланирована
    const log = { a: { [MON]: 1 }, w: { [MON]: 4 } };
    expect(habitsFor([a, water, weekend], MON)).toHaveLength(2);
    expect(daySummary([a, water, weekend], log, MON)).toEqual({ planned: 2, done: 1, ratio: 0.75 });
    expect(daySummary([weekend], {}, MON)).toEqual({ planned: 0, done: 0, ratio: 0 });
  });
});

describe('серии', () => {
  it('считает дни подряд до сегодня', () => {
    const h = habit();
    const log = done(h, ['2026-10-10', '2026-10-11', MON]);
    expect(currentStreak(h, log, MON)).toBe(3);
  });

  it('сегодня ещё не выполнено — серия не рвётся', () => {
    const h = habit();
    const log = done(h, ['2026-10-10', '2026-10-11']);
    expect(currentStreak(h, log, MON)).toBe(2);
  });

  it('пропуск вчера обрывает серию', () => {
    const h = habit();
    const log = done(h, ['2026-10-09', '2026-10-10', MON]); // 11-го пропуск
    expect(currentStreak(h, log, MON)).toBe(1);
    expect(currentStreak(h, done(h, ['2026-10-09', '2026-10-10']), MON)).toBe(0);
  });

  it('незапланированные дни серию не рвут (привычка по будням переживает выходные)', () => {
    const h = habit({ days: [0, 1, 2, 3, 4] });
    // Чт, Пт, выходные пропущены по расписанию, Пн.
    const log = done(h, ['2026-10-08', '2026-10-09', MON]);
    expect(currentStreak(h, log, MON)).toBe(3);
  });

  it('не уходит раньше дня создания', () => {
    const h = habit({ createdAt: '2026-10-11' });
    expect(currentStreak(h, done(h, ['2026-10-01', '2026-10-11', MON]), MON)).toBe(2);
  });

  it('счётная привычка: неполный день серию обрывает', () => {
    const water = habit({ target: 8 });
    const log: Log = { h: { '2026-10-10': 8, '2026-10-11': 5, [MON]: 8 } };
    expect(currentStreak(water, log, MON)).toBe(1);
  });

  it('bestStreak находит самую длинную серию в прошлом', () => {
    const h = habit({ createdAt: '2026-10-01' });
    const log = done(h, ['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-06', '2026-10-07']);
    expect(bestStreak(h, log, MON)).toBe(4);
    expect(bestStreak(h, {}, MON)).toBe(0);
    // Лучшая не меньше текущей.
    const live = done(h, ['2026-10-10', '2026-10-11', MON]);
    expect(bestStreak(h, live, MON)).toBeGreaterThanOrEqual(currentStreak(h, live, MON));
  });
});

describe('статистика', () => {
  it('completionRate: доля выполненных запланированных дней', () => {
    const h = habit({ createdAt: '2026-10-09' }); // 9, 10, 11, 12 октября
    const log = done(h, ['2026-10-09', '2026-10-11']);
    // Сегодня (12-е) не выполнено — не учитывается: 2 из 3.
    expect(completionRate(h, log, MON)).toBeCloseTo(2 / 3);
    expect(completionRate(h, done(h, ['2026-10-09', '2026-10-11', MON]), MON)).toBe(0.75);
  });

  it('completionRate: нечего считать — null, а не 0%', () => {
    expect(completionRate(habit({ createdAt: MON }), {}, MON)).toBeNull();
    expect(completionRate(habit({ days: [] }), {}, MON)).toBeNull();
  });

  it('heatmap: недели с понедельника, будущее и незапланированное — уровень -1', () => {
    const water = habit({ target: 4, createdAt: '2026-10-05' });
    const log: Log = { h: { '2026-10-05': 4, '2026-10-06': 2, '2026-10-07': 1 } };
    const grid = heatmap(water, log, '2026-10-14', 2); // среда второй недели
    expect(grid).toHaveLength(2);
    expect(grid[0].map((c) => c.level)).toEqual([3, 2, 1, 0, 0, 0, 0]);
    expect(grid[0][0].day).toBe('2026-10-05');
    expect(grid[1].map((c) => c.level)).toEqual([0, 0, 0, -1, -1, -1, -1]); // Чт–Вс ещё не наступили
  });

  it('dailyRatios — по дню на каждый из последних дней', () => {
    const h = habit();
    const rows = dailyRatios([h], done(h, [MON]), MON, 3);
    expect(rows.map((r) => r.day)).toEqual(['2026-10-10', '2026-10-11', MON]);
    expect(rows.map((r) => r.ratio)).toEqual([0, 0, 1]);
  });
});

describe('демо-данные', () => {
  it('одинаковы при каждом запуске и не трогают сегодняшний день', () => {
    const a = seed(MON);
    const b = seed(MON);
    expect(a).toEqual(b);
    expect(a.habits).toHaveLength(6);
    for (const h of a.habits) expect(a.log[h.id][MON]).toBeUndefined();
  });

  it('у демо есть живые серии и разумный процент', () => {
    const { habits, log } = seed(MON);
    const streaks = habits.map((h) => currentStreak(h, log, MON));
    expect(Math.max(...streaks)).toBeGreaterThanOrEqual(5);
    for (const h of habits) {
      const rate = completionRate(h, log, addDays(MON, -1), 60)!;
      expect(rate).toBeGreaterThan(0.4);
      expect(rate).toBeLessThanOrEqual(1);
    }
  });
});
