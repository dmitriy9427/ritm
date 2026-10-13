/**
 * Экран «Сегодня»: прогресс дня, неделя, список привычек.
 *
 * Данные экран берёт из хранилища, а всё производное (кто запланирован, какая
 * серия, какой процент) считает чистыми функциями из lib/habits. В состоянии
 * компонента — только выбранный день.
 */
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { HabitCard } from '@/components/habit-card';
import { ProgressRing } from '@/components/progress-ring';
import { AppText, Button, Card, Screen } from '@/components/ui';
import { WeekStrip } from '@/components/week-strip';
import { HitSize, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useToday } from '@/hooks/use-today';
import { DayKey, formatFull, plural, relativeDay } from '@/lib/dates';
import { countOn, currentStreak, daySummary, habitsFor } from '@/lib/habits';
import { haptic } from '@/platform/haptics';
import { useStore } from '@/store/store';

/** «вторник, 13 октября» → «Вторник, 13 октября» (textTransform: 'capitalize' поднял бы каждое слово). */
const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

export default function TodayScreen() {
  const theme = useTheme();
  const router = useRouter();
  const today = useToday();
  const habits = useStore((s) => s.habits);
  const log = useStore((s) => s.log);
  const tapHabit = useStore((s) => s.tapHabit);

  // null — «следим за сегодняшним днём» (наступила полночь — экран сам переключится).
  const [picked, setPicked] = useState<DayKey | null>(null);
  const day = picked ?? today;

  const planned = habitsFor(habits, day);
  const summary = daySummary(habits, log, day);
  const allDone = summary.planned > 0 && summary.done === summary.planned;

  const toggle = (id: string, target: number) => {
    const next = tapHabit(id, day);
    // Разный отклик: «выполнено» ощущается иначе, чем промежуточное «+1».
    if (next >= target) haptic.success();
    else haptic.tap();
  };

  const selectDay = (next: DayKey) => {
    haptic.select();
    setPicked(next === today ? null : next);
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <AppText variant="title">{relativeDay(day, today)}</AppText>
            <AppText muted>{capitalize(formatFull(day))}</AppText>
          </View>
          {picked && <Button title="Сегодня" variant="secondary" onPress={() => selectDay(today)} style={styles.todayButton} />}
        </View>

        <WeekStrip selected={day} today={today} ratioOf={(d) => daySummary(habits, log, d).ratio} onSelect={selectDay} />

        {summary.planned > 0 && (
          <Card style={styles.summary}>
            <ProgressRing progress={summary.ratio} size={76} strokeWidth={8}>
              <AppText variant="bodyBold">{Math.round(summary.ratio * 100)}%</AppText>
            </ProgressRing>
            <View style={styles.summaryText}>
              <AppText variant="heading">{allDone ? 'День закрыт 🎉' : `${summary.done} из ${summary.planned}`}</AppText>
              <AppText variant="small" muted>
                {allDone
                  ? 'Все привычки выполнены'
                  : `Осталось ${summary.planned - summary.done} ${plural(summary.planned - summary.done, ['привычка', 'привычки', 'привычек'])}`}
              </AppText>
            </View>
          </Card>
        )}

        <View style={styles.list}>
          {planned.map((habit) => (
            <HabitCard
              key={habit.id}
              habit={habit}
              count={countOn(log, habit, day)}
              streak={currentStreak(habit, log, today)}
              onToggle={() => toggle(habit.id, habit.target)}
              onEdit={() => router.push(`/habit/${habit.id}`)}
            />
          ))}
        </View>

        {planned.length === 0 && (
          <View style={styles.empty}>
            <AppText style={styles.emptyEmoji}>{habits.length ? '🌿' : '✨'}</AppText>
            <AppText variant="heading" style={styles.center}>
              {habits.length ? 'На этот день ничего не запланировано' : 'Пока нет привычек'}
            </AppText>
            <AppText muted style={styles.center}>
              {habits.length ? 'Отдых — тоже часть ритма.' : 'Добавьте первую — и начните серию.'}
            </AppText>
          </View>
        )}

        {planned.length > 0 && (
          <AppText variant="small" muted style={styles.hint}>
            Нажмите или смахните вправо, чтобы отметить. Долгое нажатие — изменить.
          </AppText>
        )}
      </ScrollView>

      {/* Плавающая кнопка «+» — главное действие экрана, всегда под большим пальцем. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Добавить привычку"
        onPress={() => router.push('/habit/new')}
        style={({ pressed }) => [styles.fab, { backgroundColor: theme.accent }, pressed && styles.fabPressed]}>
        <Ionicons name="add" size={30} color={theme.accentText} />
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  // Нижний отступ — чтобы плавающая кнопка не закрывала последнюю карточку.
  scroll: { padding: Spacing[4], paddingBottom: 110, gap: Spacing[4] },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing[3] },
  headerText: { flex: 1 },
  todayButton: { minHeight: 36, paddingHorizontal: Spacing[3] },
  summary: { flexDirection: 'row', alignItems: 'center', gap: Spacing[4] },
  summaryText: { flex: 1, gap: 2 },
  list: { gap: Spacing[2] },
  empty: { alignItems: 'center', gap: Spacing[2], paddingVertical: Spacing[10] },
  emptyEmoji: { fontSize: 48, lineHeight: 60 },
  center: { textAlign: 'center' },
  hint: { textAlign: 'center' },
  fab: {
    position: 'absolute',
    right: Spacing[5],
    bottom: Spacing[5],
    width: HitSize + 16,
    height: HitSize + 16,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    // Тень: на iOS — shadow*, на Android — elevation, в браузере — boxShadow.
    boxShadow: '0 6px 16px rgba(0, 0, 0, 0.25)',
    elevation: 6,
  },
  fabPressed: { transform: [{ scale: 0.94 }] },
});
