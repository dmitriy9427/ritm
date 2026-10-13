/**
 * Корневой каркас приложения.
 *
 * Expo Router строит навигацию из файлов в src/app:
 *   _layout.tsx        — этот файл: «стопка» экранов (Stack) поверх всего;
 *   (tabs)/            — группа с нижними вкладками (скобки = папка не попадает в адрес);
 *   habit/[id].tsx     — форма привычки, открывается ПОВЕРХ вкладок как модальное окно.
 *
 * Stack — навигация «стопкой карт»: новый экран кладётся сверху, «назад»
 * снимает его. На iOS это даёт жест смахивания от левого края, на Android —
 * системную кнопку «Назад»: всё работает без нашего кода.
 */
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useScheme, useTheme } from '@/hooks/use-theme';
import { setupNotifications, syncReminders } from '@/platform/notifications';
import { useStore } from '@/store/store';

setupNotifications();

export default function RootLayout() {
  const scheme = useScheme();
  const theme = useTheme();
  const hydrated = useStore((s) => s.hydrated);
  const habits = useStore((s) => s.habits);
  const reminders = useStore((s) => s.settings.reminders);

  // Привычки или настройка изменились — пересобираем расписание напоминаний.
  useEffect(() => {
    if (hydrated) void syncReminders(habits, reminders);
  }, [hydrated, habits, reminders]);

  // Тема для навигации: фон экранов и шапок при переходах (иначе белая вспышка в тёмной теме).
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const navigationTheme = {
    ...base,
    colors: { ...base.colors, background: theme.background, card: theme.card, text: theme.text, border: theme.border, primary: theme.accent },
  };

  return (
    // Обязательная обёртка для жестов (react-native-gesture-handler) — на самом верху.
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: theme.background }}>
      <ThemeProvider value={navigationTheme}>
        {/* Цвет значков статус-бара (часы, батарея): светлые на тёмном и наоборот. */}
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
        {hydrated ? (
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
              name="habit/[id]"
              options={{
                presentation: 'modal', // iOS: «карточка» снизу, закрывается смахиванием вниз
                headerShown: true,
                headerShadowVisible: false,
                headerTitleStyle: { color: theme.text },
                headerStyle: { backgroundColor: theme.background },
                headerTintColor: theme.accent,
              }}
            />
          </Stack>
        ) : (
          // Данные ещё читаются с диска (доли секунды): пустой фон вместо мигания «нет привычек».
          <View style={{ flex: 1 }} />
        )}
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
