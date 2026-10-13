/**
 * Даты приложения — строки вида 'YYYY-MM-DD' (ключ дня).
 *
 * Почему строки, а не объекты Date:
 *   - день привычки — это календарный день пользователя, а не момент времени.
 *     Date хранит момент в UTC, и «сегодня 23:30 в Москве» при неаккуратном
 *     обращении превращается во «вчера» или «завтра»;
 *   - строки одинаково сравниваются (`a < b`), сортируются и сериализуются в
 *     хранилище без сюрпризов;
 *   - ключ дня — готовый ключ словаря отметок: log[habitId]['2026-10-13'].
 *
 * Date появляется только на границах: «какое сегодня число» и форматирование.
 * Все функции чистые — время в них передаётся параметром, а не берётся
 * внутри. Поэтому тесты не зависят от того, когда их запустили.
 */

/** Ключ дня: 'YYYY-MM-DD'. */
export type DayKey = string;

const pad = (n: number) => String(n).padStart(2, '0');

/** Ключ дня по ЛОКАЛЬНОМУ календарю устройства. */
export function toKey(date: Date): DayKey {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * Дата из ключа — локальная полночь.
 * Не `new Date('2026-10-13')`: такая строка разбирается как UTC, и в поясах
 * западнее Гринвича получился бы предыдущий день.
 */
export function fromKey(key: DayKey): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Сдвинуть день на n дней (n может быть отрицательным). */
export function addDays(key: DayKey, n: number): DayKey {
  const date = fromKey(key);
  date.setDate(date.getDate() + n); // setDate сам переносит через месяц и год
  return toKey(date);
}

/** Сколько дней от a до b (b позже — положительное число). */
export function diffDays(a: DayKey, b: DayKey): number {
  // Полдень, а не полночь: при переходе на летнее время сутки бывают 23 или
  // 25 часов, и разница полуночей не делится на 24 ровно.
  const noon = (key: DayKey) => {
    const date = fromKey(key);
    date.setHours(12);
    return date.getTime();
  };
  return Math.round((noon(b) - noon(a)) / 86_400_000);
}

/** День недели: 0 — понедельник … 6 — воскресенье (как в русском календаре). */
export function weekday(key: DayKey): number {
  return (fromKey(key).getDay() + 6) % 7; // у Date 0 — воскресенье
}

/** Понедельник недели, в которую попадает день. */
export const startOfWeek = (key: DayKey): DayKey => addDays(key, -weekday(key));

/** Семь дней недели, начиная с понедельника. */
export const weekDays = (key: DayKey): DayKey[] =>
  Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(key), i));

/** n дней подряд, заканчивая `end` (включительно), от старых к новым. */
export const lastDays = (end: DayKey, n: number): DayKey[] =>
  Array.from({ length: n }, (_, i) => addDays(end, i - n + 1));

export const WEEKDAYS_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'] as const;

const MONTHS = [
  'января',
  'февраля',
  'марта',
  'апреля',
  'мая',
  'июня',
  'июля',
  'августа',
  'сентября',
  'октября',
  'ноября',
  'декабря',
];
const WEEKDAYS_FULL = [
  'понедельник',
  'вторник',
  'среда',
  'четверг',
  'пятница',
  'суббота',
  'воскресенье',
];

/** «13 октября». */
export const formatDay = (key: DayKey) => `${fromKey(key).getDate()} ${MONTHS[fromKey(key).getMonth()]}`;

/** «вторник, 13 октября». */
export const formatFull = (key: DayKey) => `${WEEKDAYS_FULL[weekday(key)]}, ${formatDay(key)}`;

/** «Сегодня» / «Вчера» / «Завтра» / «13 октября». */
export function relativeDay(key: DayKey, today: DayKey): string {
  const delta = diffDays(today, key);
  if (delta === 0) return 'Сегодня';
  if (delta === -1) return 'Вчера';
  if (delta === 1) return 'Завтра';
  return formatDay(key);
}

/**
 * Склонение: plural(5, ['день', 'дня', 'дней']) → 'дней'.
 * Правило русского языка: 1 день, 2–4 дня, 5–20 дней, 21 день, 22 дня…
 */
export function plural(n: number, forms: [string, string, string]): string {
  const abs = Math.abs(n) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return forms[2];
  if (last === 1) return forms[0];
  if (last >= 2 && last <= 4) return forms[1];
  return forms[2];
}

/** Время 'HH:MM' → { hour, minute }; null, если строка не время. */
export function parseTime(value: string): { hour: number; minute: number } | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  return hour < 24 && minute < 60 ? { hour, minute } : null;
}
