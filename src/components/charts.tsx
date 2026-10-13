/**
 * Графики статистики — из обычных View, без библиотек.
 *
 * Столбики и клетки — это прямоугольники. Для них не нужен ни SVG, ни canvas:
 * хватает flex-раскладки. Чем меньше зависимостей с нативным кодом, тем проще
 * обновлять проект и тем быстрее он собирается.
 */
import { StyleSheet, View } from 'react-native';

import { AppText } from './ui';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { DayKey, WEEKDAYS_SHORT, weekday } from '@/lib/dates';
import { HeatCell } from '@/lib/habits';

// ─── Столбики: доля выполнения по дням ───────────────────────────────────────

type BarChartProps = {
  data: { day: DayKey; ratio: number; planned: number }[];
  today: DayKey;
  color?: string;
};

export function BarChart({ data, today, color }: BarChartProps) {
  const theme = useTheme();
  return (
    <View style={styles.bars} accessibilityRole="image" accessibilityLabel={describeBars(data)}>
      {data.map(({ day, ratio, planned }) => (
        <View key={day} style={styles.barColumn}>
          <View style={[styles.barTrack, { backgroundColor: theme.track }]}>
            {/* Высота столбика — в процентах от дорожки; минимум 4%, чтобы «ноль» был виден как точка. */}
            <View
              style={[
                styles.barFill,
                { height: `${Math.max(planned ? 4 : 0, ratio * 100)}%`, backgroundColor: color ?? theme.accent },
                day === today && styles.barToday,
              ]}
            />
          </View>
          <AppText variant="caption" muted={day !== today} color={day === today ? theme.accent : undefined}>
            {WEEKDAYS_SHORT[weekday(day)]}
          </AppText>
        </View>
      ))}
    </View>
  );
}

/** Текст для скринридера: график без подписи — «картинка без alt». */
const describeBars = (data: BarChartProps['data']) =>
  `Выполнение по дням: ${data.map((d) => `${WEEKDAYS_SHORT[weekday(d.day)]} ${Math.round(d.ratio * 100)}%`).join(', ')}`;

// ─── Тепловая карта: недели × дни ────────────────────────────────────────────

type HeatmapProps = {
  weeks: HeatCell[][];
  color: string;
};

/** Прозрачность заливки по уровню: пропуск — серая клетка, дальше — гуще. */
const LEVEL_OPACITY = { 1: 0.35, 2: 0.65, 3: 1 } as const;

export function Heatmap({ weeks, color }: HeatmapProps) {
  const theme = useTheme();
  const done = weeks.flat().filter((c) => c.level === 3).length;
  return (
    <View
      style={styles.heat}
      accessibilityRole="image"
      accessibilityLabel={`Календарь выполнения: ${done} выполненных дней за ${weeks.length} недель`}>
      {weeks.map((week) => (
        <View key={week[0].day} style={styles.heatColumn}>
          {week.map((cell) => (
            <View
              key={cell.day}
              style={[
                styles.heatCell,
                cell.level === -1
                  ? styles.heatEmpty // не запланировано / будущее — пустое место
                  : cell.level === 0
                    ? { backgroundColor: theme.track }
                    : { backgroundColor: color, opacity: LEVEL_OPACITY[cell.level] },
              ]}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing[2], height: 132 },
  barColumn: { flex: 1, alignItems: 'center', gap: Spacing[1], height: '100%' },
  barTrack: { flex: 1, width: '100%', maxWidth: 28, borderRadius: Radius.sm, justifyContent: 'flex-end', overflow: 'hidden' },
  barFill: { width: '100%', borderRadius: Radius.sm, opacity: 0.55 },
  barToday: { opacity: 1 },
  heat: { flexDirection: 'row', gap: 3 },
  heatColumn: { flex: 1, gap: 3 },
  // aspectRatio: 1 — клетка квадратная при любой ширине экрана.
  heatCell: { aspectRatio: 1, borderRadius: 3 },
  heatEmpty: { backgroundColor: 'transparent' },
});
