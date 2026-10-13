import { buildSchedule, toNotificationWeekday } from './notifications';

import { Habit } from '@/lib/habits';

// Тестируем чистые функции: нативный модуль уведомлений в Node не нужен.
jest.mock('expo-notifications', () => ({}));

const habit = (over: Partial<Habit>): Habit => ({
  id: 'h1',
  title: 'Английский',
  emoji: '🇬🇧',
  color: 'violet',
  days: [0, 1, 2, 3, 4],
  target: 1,
  unit: '',
  reminder: '19:00',
  createdAt: '2026-10-01',
  ...over,
});

describe('напоминания: расписание', () => {
  it('день недели: у нас 0 — понедельник, у уведомлений 1 — воскресенье', () => {
    expect(toNotificationWeekday(0)).toBe(2); // понедельник
    expect(toNotificationWeekday(5)).toBe(7); // суббота
    expect(toNotificationWeekday(6)).toBe(1); // воскресенье
  });

  it('по уведомлению на каждый день привычки, с понятным id', () => {
    const schedule = buildSchedule([habit({})]);
    expect(schedule).toHaveLength(5);
    expect(schedule[0]).toEqual({
      identifier: 'habit:h1:0',
      title: '🇬🇧 Английский',
      body: 'Пора отметить привычку',
      weekday: 2,
      hour: 19,
      minute: 0,
    });
  });

  it('без времени или с кривым временем — ничего не планируем', () => {
    expect(buildSchedule([habit({ reminder: null })])).toEqual([]);
    expect(buildSchedule([habit({ reminder: '25:99' })])).toEqual([]);
  });

  it('счётная привычка: в тексте — цель', () => {
    expect(buildSchedule([habit({ target: 8, days: [6] })])[0].body).toBe('Цель на сегодня: 8');
  });
});
