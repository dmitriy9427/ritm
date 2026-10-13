import { addDays, diffDays, formatFull, fromKey, lastDays, parseTime, plural, relativeDay, startOfWeek, toKey, weekDays, weekday } from './dates';

describe('dates', () => {
  it('toKey / fromKey — локальный календарь, туда и обратно', () => {
    expect(toKey(new Date(2026, 9, 3, 23, 59))).toBe('2026-10-03'); // поздний вечер — всё ещё 3-е
    expect(toKey(fromKey('2026-01-09'))).toBe('2026-01-09');
    expect(fromKey('2026-10-13').getHours()).toBe(0);
  });

  it('addDays переходит через месяц, год и 29 февраля', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29'); // високосный
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01');
  });

  it('diffDays — целые дни, знак по направлению', () => {
    expect(diffDays('2026-10-13', '2026-10-13')).toBe(0);
    expect(diffDays('2026-10-13', '2026-10-20')).toBe(7);
    expect(diffDays('2026-10-13', '2026-10-12')).toBe(-1);
    expect(diffDays('2026-03-01', '2026-11-01')).toBe(245); // через переводы часов
  });

  it('неделя начинается с понедельника', () => {
    expect(weekday('2026-10-12')).toBe(0); // понедельник
    expect(weekday('2026-10-18')).toBe(6); // воскресенье
    expect(startOfWeek('2026-10-15')).toBe('2026-10-12');
    expect(startOfWeek('2026-10-18')).toBe('2026-10-12');
    expect(weekDays('2026-10-15')).toEqual([
      '2026-10-12',
      '2026-10-13',
      '2026-10-14',
      '2026-10-15',
      '2026-10-16',
      '2026-10-17',
      '2026-10-18',
    ]);
  });

  it('lastDays — от старых к новым, заканчивая указанным днём', () => {
    expect(lastDays('2026-10-02', 3)).toEqual(['2026-09-30', '2026-10-01', '2026-10-02']);
  });

  it('подписи по-русски', () => {
    expect(formatFull('2026-10-13')).toBe('вторник, 13 октября');
    expect(relativeDay('2026-10-13', '2026-10-13')).toBe('Сегодня');
    expect(relativeDay('2026-10-12', '2026-10-13')).toBe('Вчера');
    expect(relativeDay('2026-10-14', '2026-10-13')).toBe('Завтра');
    expect(relativeDay('2026-10-01', '2026-10-13')).toBe('1 октября');
  });

  it('plural: 1 день, 2 дня, 5 дней, 11 дней, 21 день', () => {
    const forms: [string, string, string] = ['день', 'дня', 'дней'];
    expect([1, 2, 5, 11, 14, 21, 22, 25, 111, 0].map((n) => plural(n, forms))).toEqual([
      'день',
      'дня',
      'дней',
      'дней',
      'дней',
      'день',
      'дня',
      'дней',
      'дней',
      'дней',
    ]);
  });

  it('parseTime принимает только настоящее время', () => {
    expect(parseTime('07:30')).toEqual({ hour: 7, minute: 30 });
    expect(parseTime(' 9:05 ')).toEqual({ hour: 9, minute: 5 });
    expect(parseTime('24:00')).toBeNull();
    expect(parseTime('12:60')).toBeNull();
    expect(parseTime('утром')).toBeNull();
  });
});
