/**
 * Полоска недели: семь дней с мини-кольцами прогресса и переходом по неделям.
 * Нажатие на день показывает его привычки — можно отметить вчерашнее.
 */
import { Pressable, StyleSheet, View } from 'react-native';

import { ProgressRing } from './progress-ring';
import { AppText, IconButton } from './ui';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { DayKey, WEEKDAYS_SHORT, addDays, formatDay, fromKey, startOfWeek, weekDays } from '@/lib/dates';

type Props = {
  selected: DayKey;
  today: DayKey;
  /** Доля выполнения дня 0…1 (для мини-кольца). */
  ratioOf: (day: DayKey) => number;
  onSelect: (day: DayKey) => void;
};

export function WeekStrip({ selected, today, ratioOf, onSelect }: Props) {
  const theme = useTheme();
  const days = weekDays(selected);
  const isCurrentWeek = startOfWeek(selected) === startOfWeek(today);

  return (
    <View style={styles.row}>
      <IconButton icon="chevron-back" label="Предыдущая неделя" onPress={() => onSelect(addDays(selected, -7))} />
      <View style={styles.days}>
        {days.map((day, i) => {
          const active = day === selected;
          const future = day > today;
          return (
            <Pressable
              key={day}
              accessibilityRole="button"
              accessibilityLabel={`${formatDay(day)}${day === today ? ', сегодня' : ''}`}
              accessibilityState={{ selected: active, disabled: future }}
              disabled={future} // будущее отмечать нельзя
              onPress={() => onSelect(day)}
              style={[styles.day, active && { backgroundColor: theme.card, borderColor: theme.border }, future && styles.future]}>
              <AppText variant="caption" muted={!active} color={day === today ? theme.accent : undefined}>
                {WEEKDAYS_SHORT[i]}
              </AppText>
              <ProgressRing progress={future ? 0 : ratioOf(day)} size={30} strokeWidth={3}>
                <AppText variant="small" style={styles.number}>
                  {fromKey(day).getDate()}
                </AppText>
              </ProgressRing>
            </Pressable>
          );
        })}
      </View>
      {/* Вперёд — не дальше текущей недели. */}
      <IconButton
        icon="chevron-forward"
        label="Следующая неделя"
        disabled={isCurrentWeek}
        onPress={() => {
          const next = addDays(selected, 7);
          onSelect(next > today ? today : next);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  days: { flex: 1, flexDirection: 'row', justifyContent: 'space-between' },
  day: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing[1],
    paddingVertical: Spacing[2],
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'transparent',
  },
  future: { opacity: 0.35 },
  number: { fontSize: 11, lineHeight: 14, fontWeight: '600' },
});
