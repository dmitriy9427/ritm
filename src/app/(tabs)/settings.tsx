/**
 * Экран «Настройки»: тема, вибрация, напоминания, данные.
 */
import Constants from 'expo-constants';
import { Platform, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';

import { AppText, Button, Card, Screen, SectionTitle } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { plural } from '@/lib/dates';
import { confirm } from '@/platform/confirm';
import { haptic } from '@/platform/haptics';
import { requestPermission } from '@/platform/notifications';
import { ThemeMode, useStore } from '@/store/store';

const THEMES: { value: ThemeMode; label: string }[] = [
  { value: 'system', label: 'Как в системе' },
  { value: 'light', label: 'Светлая' },
  { value: 'dark', label: 'Тёмная' },
];

export default function SettingsScreen() {
  const theme = useTheme();
  const settings = useStore((s) => s.settings);
  const habits = useStore((s) => s.habits);
  const updateSettings = useStore((s) => s.updateSettings);
  const loadDemo = useStore((s) => s.loadDemo);
  const clearAll = useStore((s) => s.clearAll);
  const withReminder = habits.filter((h) => h.reminder).length;

  const toggleReminders = async (value: boolean) => {
    // Включить можно, только если система разрешила уведомления.
    if (value && !(await requestPermission())) {
      updateSettings({ reminders: false });
      return;
    }
    updateSettings({ reminders: value });
  };

  const onLoadDemo = async () => {
    if (habits.length && !(await confirm('Загрузить демо?', 'Текущие привычки и отметки будут заменены.', 'Заменить'))) return;
    loadDemo();
    haptic.success();
  };

  const onClear = async () => {
    if (!(await confirm('Удалить всё?', 'Все привычки и вся история отметок будут удалены без восстановления.'))) return;
    clearAll();
    haptic.warning();
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <AppText variant="title">Настройки</AppText>

        <SectionTitle>Оформление</SectionTitle>
        {/* «Сегментированный» переключатель: три взаимоисключающих варианта. */}
        <View style={[styles.segments, { backgroundColor: theme.track }]} accessibilityRole="radiogroup">
          {THEMES.map(({ value, label }) => {
            const active = settings.theme === value;
            return (
              <Pressable
                key={value}
                accessibilityRole="radio"
                accessibilityState={{ checked: active }}
                onPress={() => {
                  haptic.select();
                  updateSettings({ theme: value });
                }}
                style={[styles.segment, active && { backgroundColor: theme.card }]}>
                <AppText variant="small" muted={!active} style={active && styles.segmentActive}>
                  {label}
                </AppText>
              </Pressable>
            );
          })}
        </View>

        <SectionTitle>Отклик</SectionTitle>
        <Card style={styles.rows}>
          <Row
            title="Вибрация"
            hint={Platform.OS === 'web' ? 'В браузере недоступна — только на телефоне' : 'Лёгкий отклик при отметке привычки'}>
            <Switch
              value={settings.haptics}
              disabled={Platform.OS === 'web'}
              onValueChange={(haptics) => updateSettings({ haptics })}
              trackColor={{ true: theme.accent }}
            />
          </Row>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <Row
            title="Напоминания"
            hint={
              Platform.OS === 'web'
                ? 'В браузере недоступны — только на телефоне'
                : withReminder
                  ? `Время задано у ${withReminder} ${plural(withReminder, ['привычки', 'привычек', 'привычек'])}`
                  : 'Задайте время в настройках привычки'
            }>
            <Switch
              value={settings.reminders}
              disabled={Platform.OS === 'web'}
              onValueChange={toggleReminders}
              trackColor={{ true: theme.accent }}
            />
          </Row>
        </Card>

        <SectionTitle>Данные</SectionTitle>
        <View style={styles.buttons}>
          <Button title="Загрузить демо-данные" variant="secondary" icon="sparkles-outline" onPress={onLoadDemo} />
          <Button title="Удалить всё" variant="danger" icon="trash-outline" onPress={onClear} disabled={!habits.length} />
        </View>
        <AppText variant="small" muted style={styles.note}>
          Все данные хранятся только на этом устройстве и работают без интернета. Удаление приложения удалит и их.
        </AppText>

        <AppText variant="small" muted style={styles.version}>
          Ритм · версия {Constants.expoConfig?.version ?? '1.0.0'}
        </AppText>
      </ScrollView>
    </Screen>
  );
}

function Row({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowText}>
        <AppText variant="bodyBold">{title}</AppText>
        <AppText variant="small" muted>
          {hint}
        </AppText>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: Spacing[4], paddingBottom: Spacing[10] },
  segments: { flexDirection: 'row', padding: 3, borderRadius: Radius.md, gap: 3 },
  segment: { flex: 1, minHeight: 38, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.sm },
  segmentActive: { fontWeight: '700' },
  rows: { paddingVertical: Spacing[1] },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing[3], paddingVertical: Spacing[3] },
  rowText: { flex: 1, gap: 2 },
  divider: { height: StyleSheet.hairlineWidth },
  buttons: { gap: Spacing[2] },
  note: { marginTop: Spacing[3] },
  version: { marginTop: Spacing[8], textAlign: 'center' },
});
