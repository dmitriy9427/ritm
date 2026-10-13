/**
 * Экран «Статистика»: общая картина за неделю и карточка на каждую привычку
 * (серии, процент за 30 дней, календарь-«тепловая карта» за 14 недель).
 */
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { BarChart, Heatmap } from '@/components/charts';
import { AppText, Card, Screen, SectionTitle } from '@/components/ui';
import { HabitPalette, Radius, Spacing } from '@/constants/theme';
import { useScheme, useTheme } from '@/hooks/use-theme';
import { useToday } from '@/hooks/use-today';
import { plural } from '@/lib/dates';
import { bestStreak, completionRate, currentStreak, dailyRatios, heatmap } from '@/lib/habits';
import { useStore } from '@/store/store';

const DAY_FORMS: [string, string, string] = ['день', 'дня', 'дней'];

export default function StatsScreen() {
  const theme = useTheme();
  const scheme = useScheme();
  const router = useRouter();
  const today = useToday();
  const habits = useStore((s) => s.habits);
  const log = useStore((s) => s.log);

  const week = dailyRatios(habits, log, today, 7);
  // Среднее по дням, где что-то было запланировано (пустые дни не занижают процент).
  const active = week.filter((d) => d.planned > 0);
  const weekAverage = active.length ? active.reduce((sum, d) => sum + d.ratio, 0) / active.length : 0;
  const streaks = habits.map((h) => currentStreak(h, log, today));
  const longest = Math.max(0, ...streaks);
  const total = Object.values(log).reduce((sum, days) => sum + Object.keys(days).length, 0);

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <AppText variant="title">Статистика</AppText>

        {habits.length === 0 ? (
          <View style={styles.empty}>
            <AppText style={styles.emptyEmoji}>📊</AppText>
            <AppText muted style={styles.center}>
              Здесь появятся серии и календарь, когда вы добавите привычки.
            </AppText>
          </View>
        ) : (
          <>
            <View style={styles.tiles}>
              <Tile value={`${Math.round(weekAverage * 100)}%`} label="за неделю" />
              <Tile value={`🔥 ${longest}`} label={`лучшая серия, ${plural(longest, DAY_FORMS)}`} />
              <Tile value={String(total)} label={plural(total, ['отметка', 'отметки', 'отметок'])} />
            </View>

            <SectionTitle>Последние 7 дней</SectionTitle>
            <Card>
              <BarChart data={week} today={today} />
            </Card>

            <SectionTitle>Привычки</SectionTitle>
            <View style={styles.list}>
              {habits.map((habit) => {
                const palette = HabitPalette[habit.color];
                const rate = completionRate(habit, log, today, 30);
                const streak = currentStreak(habit, log, today);
                const best = bestStreak(habit, log, today);
                return (
                  <Pressable
                    key={habit.id}
                    accessibilityRole="button"
                    accessibilityLabel={`${habit.title}: серия ${streak}, изменить`}
                    onPress={() => router.push(`/habit/${habit.id}`)}
                    style={({ pressed }) => pressed && styles.pressed}>
                    <Card style={styles.habit}>
                      <View style={styles.habitHead}>
                        <View style={[styles.emoji, { backgroundColor: palette.soft[scheme] }]}>
                          <AppText style={styles.emojiText}>{habit.emoji}</AppText>
                        </View>
                        <AppText variant="bodyBold" numberOfLines={1} style={styles.habitTitle}>
                          {habit.title}
                        </AppText>
                        <AppText variant="bodyBold" color={palette.main}>
                          {rate === null ? '—' : `${Math.round(rate * 100)}%`}
                        </AppText>
                      </View>

                      <Heatmap weeks={heatmap(habit, log, today, 14)} color={palette.main} />

                      <View style={[styles.numbers, { borderTopColor: theme.border }]}>
                        <Number value={streak} label={`серия, ${plural(streak, DAY_FORMS)}`} />
                        <Number value={best} label={`рекорд, ${plural(best, DAY_FORMS)}`} />
                        <Number value={Object.keys(log[habit.id] ?? {}).length} label="всего отметок" />
                      </View>
                    </Card>
                  </Pressable>
                );
              })}
            </View>
            <AppText variant="small" muted style={styles.center}>
              Процент — доля выполненных дней за 30 дней. Календарь — последние 14 недель.
            </AppText>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

function Tile({ value, label }: { value: string; label: string }) {
  return (
    <Card style={styles.tile}>
      <AppText variant="heading" numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </AppText>
      <AppText variant="small" muted>
        {label}
      </AppText>
    </Card>
  );
}

function Number({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.number}>
      <AppText variant="bodyBold">{value}</AppText>
      <AppText variant="small" muted>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: Spacing[4], paddingBottom: Spacing[10] },
  tiles: { flexDirection: 'row', gap: Spacing[2], marginTop: Spacing[4] },
  tile: { flex: 1, gap: 2, padding: Spacing[3] },
  list: { gap: Spacing[3], marginBottom: Spacing[4] },
  habit: { gap: Spacing[3] },
  habitHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing[3] },
  habitTitle: { flex: 1 },
  emoji: { width: 36, height: 36, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
  emojiText: { fontSize: 18, lineHeight: 24 },
  numbers: { flexDirection: 'row', paddingTop: Spacing[3], borderTopWidth: StyleSheet.hairlineWidth },
  number: { flex: 1, gap: 2 },
  empty: { alignItems: 'center', gap: Spacing[3], paddingVertical: Spacing[10] },
  emptyEmoji: { fontSize: 48, lineHeight: 60 },
  center: { textAlign: 'center' },
  pressed: { opacity: 0.7 },
});
