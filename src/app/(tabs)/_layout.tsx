/**
 * Нижние вкладки: Сегодня · Статистика · Настройки.
 *
 * Каждый файл рядом — экран вкладки. Вкладки сохраняют состояние: ушли на
 * «Статистику» и вернулись — «Сегодня» на том же месте прокрутки.
 *
 * Здесь JS-вкладки (expo-router/js-tabs): одинаково выглядят и работают на
 * iOS, Android и в браузере. Есть и «нативные» вкладки
 * (expo-router/unstable-native-tabs) с системным видом на каждой платформе —
 * см. docs/03-navigation.md.
 */
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router/js-tabs';
import { ComponentProps } from 'react';
import { ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/use-theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

/** Иконка вкладки: закрашенная у активной, контурная у остальных. */
const icon = (active: IconName, idle: IconName) =>
  function TabIcon({ color, focused, size }: { color: ColorValue; focused: boolean; size: number }) {
    return <Ionicons name={focused ? active : idle} size={size} color={color} />;
  };

export default function TabsLayout() {
  const theme = useTheme();
  // Нижняя «безопасная зона»: на iPhone без кнопки там полоска жестов (~34px),
  // на Android и в браузере — 0. Панель вкладок должна её учитывать, иначе
  // подписи либо залезут под полоску, либо обрежутся.
  const { bottom } = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.accent,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarStyle: {
          backgroundColor: theme.card,
          borderTopColor: theme.border,
          height: 66 + bottom,
          paddingTop: 6,
          paddingBottom: bottom + 6,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Сегодня', tabBarIcon: icon('today', 'today-outline') }} />
      <Tabs.Screen name="stats" options={{ title: 'Статистика', tabBarIcon: icon('stats-chart', 'stats-chart-outline') }} />
      <Tabs.Screen name="settings" options={{ title: 'Настройки', tabBarIcon: icon('settings', 'settings-outline') }} />
    </Tabs>
  );
}
