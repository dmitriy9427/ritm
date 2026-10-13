/**
 * «Сегодня» как ключ дня, который сам обновляется.
 *
 * Мобильное приложение живёт днями: его сворачивают вечером и открывают
 * утром — БЕЗ перезапуска. Если вычислить «сегодня» один раз при старте, наутро
 * приложение продолжит показывать вчерашний день. Поэтому обновляем:
 *   - когда приложение возвращается на экран (AppState → 'active');
 *   - раз в минуту, пока оно открыто (поймать полночь).
 */
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { DayKey, toKey } from '@/lib/dates';

export function useToday(): DayKey {
  const [today, setToday] = useState(() => toKey(new Date()));

  useEffect(() => {
    // Строка с тем же значением не вызывает перерисовку — проверять «изменилось ли» не нужно.
    const refresh = () => setToday(toKey(new Date()));
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    const timer = setInterval(refresh, 60_000);
    return () => {
      subscription.remove();
      clearInterval(timer);
    };
  }, []);

  return today;
}
