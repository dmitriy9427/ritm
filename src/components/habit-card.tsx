/**
 * Карточка привычки на экране «Сегодня».
 *
 * Отметить можно двумя способами:
 *   - нажать на карточку;
 *   - смахнуть её вправо — из-под карточки выезжает зелёная подложка с галочкой.
 * Долгое нажатие открывает редактирование.
 *
 * ─── Жест смахивания (Gesture Handler + Reanimated) ─────────────────────────
 * Жест обрабатывается в НАТИВНОМ потоке, а не в JavaScript: карточка следует
 * за пальцем без задержек, даже если JS занят. Функции-обработчики жеста —
 * «ворклеты»: они выполняются в UI-потоке. Вызвать из них обычный JS-код
 * (изменить хранилище) можно только через scheduleOnRN — он передаёт вызов в
 * JS-поток.
 *
 * activeOffsetX / failOffsetY — главная настройка для жеста внутри списка:
 * жест «включается» только при движении ВПРАВО больше 14px и сдаётся, если
 * палец пошёл по вертикали. Без этого карточки мешали бы прокручивать список.
 *
 * В браузере этого мало: Gesture Handler по умолчанию ставит карточке CSS
 * `touch-action: none` — браузер отдаёт ВСЕ касания жесту и сам страницу не
 * прокручивает. Карточки занимают почти весь экран, и список на телефоне не
 * листался. touchAction="pan-y": вертикальную прокрутку делает браузер, а
 * горизонтальное смахивание остаётся жесту. На iOS и Android проп не влияет.
 */
import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { AppText } from './ui';

import { HabitPalette, Radius, Spacing } from '@/constants/theme';
import { useScheme, useTheme } from '@/hooks/use-theme';
import { plural } from '@/lib/dates';
import { Habit } from '@/lib/habits';

/** На сколько нужно смахнуть, чтобы отметка засчиталась, px. */
const SWIPE_THRESHOLD = 84;
/** Дальше этого карточка не едет. */
const SWIPE_MAX = 120;

type Props = {
  habit: Habit;
  /** Сколько раз сделано в выбранный день. */
  count: number;
  /** Текущая серия, дней. */
  streak: number;
  onToggle: () => void;
  onEdit: () => void;
};

export function HabitCard({ habit, count, streak, onToggle, onEdit }: Props) {
  const theme = useTheme();
  const scheme = useScheme();
  const palette = HabitPalette[habit.color];
  const done = count >= habit.target;
  const progress = Math.min(1, count / habit.target);
  const counted = habit.target > 1;

  // Сдвиг карточки за пальцем.
  const offset = useSharedValue(0);
  // «Прыжок» галочки в момент выполнения.
  const pop = useSharedValue(1);
  // Ширина полосы прогресса счётной привычки.
  const fill = useSharedValue(progress);

  useEffect(() => {
    fill.value = withTiming(progress, { duration: 300 });
  }, [progress, fill]);

  useEffect(() => {
    if (done) pop.value = withSequence(withTiming(1.3, { duration: 120 }), withSpring(1, { damping: 9 }));
  }, [done, pop]);

  // На телефоне начавшийся жест отменяет нажатие на карточку. В браузере — нет:
  // после отпускания мыши приходит ещё и обычный click, и отметка ставилась бы
  // жестом и тут же снималась кликом. Флажок «только что смахивали» — тоже
  // shared value: его меняет жест в UI-потоке, а читает обработчик нажатия.
  const swiped = useSharedValue(0);
  const press = () => {
    if (swiped.value > 0) return;
    onToggle();
  };

  const swipe = Gesture.Pan()
    .activeOffsetX(14)
    .failOffsetY([-12, 12])
    .onStart(() => {
      swiped.value = 1;
    })
    .onUpdate((event) => {
      offset.value = Math.min(SWIPE_MAX, Math.max(0, event.translationX));
    })
    .onEnd(() => {
      if (offset.value >= SWIPE_THRESHOLD) scheduleOnRN(onToggle);
    })
    // onFinalize вызывается всегда — и когда жест завершён, и когда отменён
    // (система перехватила касание). Возврат карточки на место — здесь.
    .onFinalize(() => {
      offset.value = withSpring(0, { damping: 18, stiffness: 220 });
      // Сбрасываем флажок чуть ПОСЛЕ конца жеста: click приходит сразу за отпусканием.
      swiped.value = withDelay(250, withTiming(0, { duration: 0 }));
    });

  const cardStyle = useAnimatedStyle(() => ({ transform: [{ translateX: offset.value }] }));
  // Подложка проявляется по мере смахивания; галочка растёт к порогу.
  const underStyle = useAnimatedStyle(() => ({ opacity: interpolate(offset.value, [0, SWIPE_THRESHOLD], [0, 1], 'clamp') }));
  const underIconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(offset.value, [0, SWIPE_THRESHOLD], [0.5, 1.1], 'clamp') }],
  }));
  const checkStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));
  const fillStyle = useAnimatedStyle(() => ({ width: `${fill.value * 100}%` }));

  const subtitle = counted
    ? `${count} из ${habit.target}${habit.unit ? ' · ' + plural(habit.target, unitForms(habit.unit)) : ''}`
    : done
      ? 'Выполнено'
      : 'Не отмечено';

  return (
    <View style={styles.wrap}>
      {/* Подложка, которую открывает смахивание. */}
      <Animated.View style={[styles.under, { backgroundColor: palette.main }, underStyle]}>
        <Animated.View style={underIconStyle}>
          <Ionicons name={done ? 'arrow-undo' : 'checkmark'} size={26} color="#fff" />
        </Animated.View>
      </Animated.View>

      <GestureDetector gesture={swipe} touchAction="pan-y">
        <Animated.View style={cardStyle}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${habit.title}. ${subtitle}. Серия ${streak} ${plural(streak, ['день', 'дня', 'дней'])}`}
            accessibilityHint="Нажмите, чтобы отметить. Долгое нажатие — изменить"
            accessibilityState={{ checked: done }}
            onPress={press}
            onLongPress={onEdit}
            style={({ pressed }) => [
              styles.card,
              { backgroundColor: pressed ? theme.cardPressed : theme.card, borderColor: theme.border },
            ]}>
            <View style={[styles.emoji, { backgroundColor: palette.soft[scheme] }]}>
              <AppText style={styles.emojiText}>{habit.emoji}</AppText>
            </View>

            <View style={styles.body}>
              <AppText variant="bodyBold" numberOfLines={1} style={done && styles.doneTitle}>
                {habit.title}
              </AppText>
              <View style={styles.meta}>
                <AppText variant="small" muted>
                  {subtitle}
                </AppText>
                {streak > 1 && (
                  <AppText variant="small" color={palette.main} style={styles.streak}>
                    🔥 {streak}
                  </AppText>
                )}
              </View>
              {counted && (
                <View style={[styles.track, { backgroundColor: theme.track }]}>
                  <Animated.View style={[styles.fill, { backgroundColor: palette.main }, fillStyle]} />
                </View>
              )}
            </View>

            <Animated.View
              style={[
                styles.check,
                { borderColor: done ? palette.main : theme.border, backgroundColor: done ? palette.main : 'transparent' },
                checkStyle,
              ]}>
              {done ? (
                <Ionicons name="checkmark" size={18} color="#fff" />
              ) : counted && count > 0 ? (
                <AppText variant="small" color={palette.main} style={styles.countText}>
                  {count}
                </AppText>
              ) : null}
            </Animated.View>
          </Pressable>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

/** Формы единицы для склонения: «стакан» → стакан / стакана / стаканов. */
function unitForms(unit: string): [string, string, string] {
  const known: Record<string, [string, string, string]> = {
    стакан: ['стакан', 'стакана', 'стаканов'],
    страница: ['страница', 'страницы', 'страниц'],
    минута: ['минута', 'минуты', 'минут'],
    раз: ['раз', 'раза', 'раз'],
    шаг: ['шаг', 'шага', 'шагов'],
  };
  return known[unit.toLowerCase()] ?? [unit, unit, unit];
}

const styles = StyleSheet.create({
  wrap: { borderRadius: Radius.lg, overflow: 'hidden' },
  under: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: Radius.lg,
    justifyContent: 'center',
    paddingLeft: Spacing[6],
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
    padding: Spacing[3],
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  emoji: { width: 48, height: 48, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  emojiText: { fontSize: 24, lineHeight: 30 },
  body: { flex: 1, gap: 2 },
  doneTitle: { opacity: 0.55, textDecorationLine: 'line-through' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: Spacing[2] },
  streak: { fontWeight: '700' },
  track: { height: 4, borderRadius: 2, marginTop: Spacing[1], overflow: 'hidden' },
  fill: { height: 4, borderRadius: 2 },
  check: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: { fontWeight: '700' },
});
