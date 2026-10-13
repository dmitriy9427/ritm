/**
 * Форма привычки: создание (/habit/new) и редактирование (/habit/<id>).
 *
 * [id] в имени файла — динамический сегмент адреса: один файл обслуживает и
 * /habit/new, и /habit/abc123. Значение читается хуком useLocalSearchParams.
 *
 * Экран открывается как модальное окно поверх вкладок (см. app/_layout.tsx).
 */
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';

import { AppText, Button, Card, IconButton, SectionTitle } from '@/components/ui';
import { HabitPalette, HitSize, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useScheme, useTheme } from '@/hooks/use-theme';
import { WEEKDAYS_SHORT, parseTime } from '@/lib/dates';
import { HABIT_COLORS, HabitColor } from '@/lib/habits';
import { confirm } from '@/platform/confirm';
import { haptic } from '@/platform/haptics';
import { HabitDraft, useStore } from '@/store/store';

const EMOJIS = ['💧', '🤸', '🏃', '📚', '🧘', '🥗', '😴', '🇬🇧', '🎸', '✍️', '🧹', '💊', '🚭', '🍬', '🌿', '💻', '🚶', '🙏'];
const PRESETS: { label: string; days: number[] }[] = [
  { label: 'Каждый день', days: [0, 1, 2, 3, 4, 5, 6] },
  { label: 'Будни', days: [0, 1, 2, 3, 4] },
  { label: 'Выходные', days: [5, 6] },
];
const TIMES = ['07:00', '09:00', '13:00', '19:00', '21:30'];

const EMPTY: HabitDraft = {
  title: '',
  emoji: '🌿',
  color: 'mint',
  days: [0, 1, 2, 3, 4, 5, 6],
  target: 1,
  unit: '',
  reminder: null,
};

const sameDays = (a: number[], b: number[]) => a.length === b.length && a.every((d) => b.includes(d));

export default function HabitScreen() {
  const theme = useTheme();
  const scheme = useScheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const existing = useStore((s) => s.habits.find((h) => h.id === id));
  const addHabit = useStore((s) => s.addHabit);
  const updateHabit = useStore((s) => s.updateHabit);
  const removeHabit = useStore((s) => s.removeHabit);
  const isNew = !existing;

  // Черновик — локальное состояние формы. В хранилище он попадает только по «Сохранить»:
  // закрыли окно без сохранения — ничего не изменилось.
  const [draft, setDraft] = useState<HabitDraft>(() => {
    if (!existing) return EMPTY;
    const { id: _id, createdAt: _createdAt, ...rest } = existing;
    return rest;
  });
  const [timeText, setTimeText] = useState(existing?.reminder ?? '');
  const [submitted, setSubmitted] = useState(false);

  const patch = (part: Partial<HabitDraft>) => setDraft((d) => ({ ...d, ...part }));

  // Проверка формы. Ошибки показываем после первой попытки сохранить — не «кричим»
  // на пользователя, пока он ещё заполняет.
  const titleError = draft.title.trim() ? '' : 'Введите название';
  const daysError = draft.days.length ? '' : 'Выберите хотя бы один день';
  const reminderOn = draft.reminder !== null;
  const timeError = reminderOn && !parseTime(timeText) ? 'Время в формате ЧЧ:ММ, например 19:30' : '';
  const valid = !titleError && !daysError && !timeError;

  const save = () => {
    setSubmitted(true);
    if (!valid) {
      haptic.warning();
      return;
    }
    const time = reminderOn ? parseTime(timeText) : null;
    const clean: HabitDraft = {
      ...draft,
      title: draft.title.trim(),
      unit: draft.target > 1 ? draft.unit.trim() : '',
      days: [...draft.days].sort(),
      // Приводим к виду 'HH:MM' («9:05» → «09:05») — один формат в хранилище.
      reminder: time ? `${String(time.hour).padStart(2, '0')}:${String(time.minute).padStart(2, '0')}` : null,
    };
    if (existing) updateHabit(existing.id, clean);
    else addHabit(clean);
    haptic.success();
    router.back();
  };

  const remove = async () => {
    if (!existing) return;
    if (!(await confirm(`Удалить «${existing.title}»?`, 'Привычка и вся история её отметок будут удалены.'))) return;
    removeHabit(existing.id);
    haptic.warning();
    router.back();
  };

  const toggleDay = (day: number) => {
    haptic.select();
    patch({ days: draft.days.includes(day) ? draft.days.filter((d) => d !== day) : [...draft.days, day] });
  };

  const input = [styles.input, { color: theme.text, backgroundColor: theme.card, borderColor: theme.border }];

  return (
    // Клавиатура на iOS закрывает нижнюю часть экрана: KeyboardAvoidingView сдвигает содержимое.
    <KeyboardAvoidingView style={[styles.flex, { backgroundColor: theme.background }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen
        options={{
          title: isNew ? 'Новая привычка' : 'Привычка',
          headerRight: () => <IconButton icon="checkmark" label="Сохранить" color={theme.accent} onPress={save} />,
          headerLeft: () => <IconButton icon="close" label="Закрыть" onPress={() => router.back()} />,
        }}
      />
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled" // нажатие на кнопку срабатывает сразу, а не «сначала закрой клавиатуру»
        showsVerticalScrollIndicator={false}>
        <View style={styles.preview}>
          <View style={[styles.previewEmoji, { backgroundColor: HabitPalette[draft.color].soft[scheme] }]}>
            <AppText style={styles.previewEmojiText}>{draft.emoji}</AppText>
          </View>
        </View>

        <SectionTitle>Название</SectionTitle>
        <TextInput
          value={draft.title}
          onChangeText={(title) => patch({ title })}
          placeholder="Например, зарядка"
          placeholderTextColor={theme.textSecondary}
          maxLength={40}
          autoFocus={isNew}
          returnKeyType="done"
          accessibilityLabel="Название привычки"
          style={[input, submitted && titleError ? { borderColor: theme.danger } : null]}
        />
        {submitted && !!titleError && <ErrorText>{titleError}</ErrorText>}

        <SectionTitle>Значок</SectionTitle>
        <View style={styles.wrapRow}>
          {EMOJIS.map((emoji) => (
            <Pressable
              key={emoji}
              accessibilityRole="button"
              accessibilityLabel={`Значок ${emoji}`}
              accessibilityState={{ selected: draft.emoji === emoji }}
              onPress={() => {
                haptic.select();
                patch({ emoji });
              }}
              style={[styles.emoji, { backgroundColor: theme.card, borderColor: draft.emoji === emoji ? theme.accent : theme.border }]}>
              <AppText style={styles.emojiText}>{emoji}</AppText>
            </Pressable>
          ))}
        </View>

        <SectionTitle>Цвет</SectionTitle>
        <View style={styles.colors}>
          {HABIT_COLORS.map((color: HabitColor) => (
            <Pressable
              key={color}
              accessibilityRole="button"
              accessibilityLabel={`Цвет ${color}`}
              accessibilityState={{ selected: draft.color === color }}
              onPress={() => {
                haptic.select();
                patch({ color });
              }}
              style={[styles.color, { borderColor: draft.color === color ? theme.text : 'transparent' }]}>
              <View style={[styles.colorDot, { backgroundColor: HabitPalette[color].main }]} />
            </Pressable>
          ))}
        </View>

        <SectionTitle>Дни</SectionTitle>
        <View style={styles.chips}>
          {PRESETS.map((preset) => (
            <Chip key={preset.label} label={preset.label} active={sameDays(draft.days, preset.days)} onPress={() => patch({ days: preset.days })} />
          ))}
        </View>
        <View style={styles.days}>
          {WEEKDAYS_SHORT.map((label, day) => {
            const active = draft.days.includes(day);
            return (
              <Pressable
                key={label}
                accessibilityRole="checkbox"
                accessibilityLabel={label}
                accessibilityState={{ checked: active }}
                onPress={() => toggleDay(day)}
                style={[
                  styles.day,
                  { backgroundColor: active ? theme.accent : theme.card, borderColor: active ? theme.accent : theme.border },
                ]}>
                <AppText variant="small" color={active ? theme.accentText : theme.text} style={styles.dayText}>
                  {label}
                </AppText>
              </Pressable>
            );
          })}
        </View>
        {submitted && !!daysError && <ErrorText>{daysError}</ErrorText>}

        <SectionTitle>Цель на день</SectionTitle>
        <Card style={styles.target}>
          <IconButton icon="remove" label="Меньше" disabled={draft.target <= 1} onPress={() => patch({ target: Math.max(1, draft.target - 1) })} />
          <View style={styles.targetValue}>
            <AppText variant="title">{draft.target}</AppText>
            <AppText variant="small" muted>
              {draft.target === 1 ? 'просто отметить' : 'раз в день'}
            </AppText>
          </View>
          <IconButton icon="add" label="Больше" disabled={draft.target >= 99} onPress={() => patch({ target: Math.min(99, draft.target + 1) })} />
        </Card>
        {draft.target > 1 && (
          <TextInput
            value={draft.unit}
            onChangeText={(unit) => patch({ unit })}
            placeholder="Что считаем: стакан, страница, минута…"
            placeholderTextColor={theme.textSecondary}
            maxLength={16}
            autoCapitalize="none"
            accessibilityLabel="Единица измерения"
            style={[input, styles.unit]}
          />
        )}

        <SectionTitle>Напоминание</SectionTitle>
        <Card style={styles.reminder}>
          <View style={styles.reminderHead}>
            <View style={styles.flex}>
              <AppText variant="bodyBold">Напоминать</AppText>
              <AppText variant="small" muted>
                {Platform.OS === 'web' ? 'Уведомления работают только на телефоне' : 'В выбранные дни, в указанное время'}
              </AppText>
            </View>
            <Switch
              value={reminderOn}
              onValueChange={(on) => {
                patch({ reminder: on ? timeText || '09:00' : null });
                if (on && !timeText) setTimeText('09:00');
              }}
              trackColor={{ true: theme.accent }}
            />
          </View>
          {reminderOn && (
            <>
              <View style={styles.chips}>
                {TIMES.map((time) => (
                  <Chip key={time} label={time} active={timeText === time} onPress={() => setTimeText(time)} />
                ))}
              </View>
              <TextInput
                value={timeText}
                onChangeText={setTimeText}
                placeholder="ЧЧ:ММ"
                placeholderTextColor={theme.textSecondary}
                keyboardType="numbers-and-punctuation"
                maxLength={5}
                accessibilityLabel="Время напоминания"
                style={[input, submitted && timeError ? { borderColor: theme.danger } : null]}
              />
              {submitted && !!timeError && <ErrorText>{timeError}</ErrorText>}
            </>
          )}
        </Card>

        <View style={styles.actions}>
          <Button title={isNew ? 'Добавить привычку' : 'Сохранить'} onPress={save} />
          {!isNew && <Button title="Удалить привычку" variant="danger" icon="trash-outline" onPress={remove} />}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={() => {
        haptic.select();
        onPress();
      }}
      style={[styles.chip, { backgroundColor: active ? theme.accent : theme.card, borderColor: active ? theme.accent : theme.border }]}>
      <AppText variant="small" color={active ? theme.accentText : theme.text} style={styles.chipText}>
        {label}
      </AppText>
    </Pressable>
  );
}

function ErrorText({ children }: { children: string }) {
  const theme = useTheme();
  return (
    // accessibilityLiveRegion: скринридер зачитает ошибку, когда она появится.
    <AppText variant="small" color={theme.danger} style={styles.error} accessibilityLiveRegion="polite">
      {children}
    </AppText>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: Spacing[4], paddingBottom: Spacing[10], width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  preview: { alignItems: 'center', paddingTop: Spacing[2] },
  previewEmoji: { width: 88, height: 88, borderRadius: Radius.xl, alignItems: 'center', justifyContent: 'center' },
  previewEmojiText: { fontSize: 44, lineHeight: 54 },
  input: {
    minHeight: HitSize + 6,
    paddingHorizontal: Spacing[4],
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    fontSize: 16,
  },
  unit: { marginTop: Spacing[2] },
  error: { marginTop: Spacing[1], marginLeft: Spacing[1] },
  wrapRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing[2] },
  emoji: { width: HitSize + 4, height: HitSize + 4, borderRadius: Radius.md, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  emojiText: { fontSize: 22, lineHeight: 28 },
  colors: { flexDirection: 'row', gap: Spacing[2] },
  color: { width: HitSize, height: HitSize, borderRadius: Radius.full, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  colorDot: { width: 30, height: 30, borderRadius: Radius.full },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing[2] },
  chip: { minHeight: 36, paddingHorizontal: Spacing[3], borderRadius: Radius.full, borderWidth: StyleSheet.hairlineWidth, justifyContent: 'center' },
  chipText: { fontWeight: '600' },
  days: { flexDirection: 'row', gap: Spacing[1], marginTop: Spacing[3] },
  day: { flex: 1, minHeight: HitSize, borderRadius: Radius.md, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
  dayText: { fontWeight: '700' },
  target: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  targetValue: { alignItems: 'center' },
  reminder: { gap: Spacing[3] },
  reminderHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing[3] },
  actions: { gap: Spacing[2], marginTop: Spacing[8] },
});
