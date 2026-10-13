/**
 * Тема приложения: «как в системе», светлая или тёмная.
 *
 * useColorScheme() из React Native сообщает тему СИСТЕМЫ и обновляется, когда
 * пользователь её переключает (или она меняется по расписанию вечером).
 * Настройка приложения может её переопределить.
 */
import { useColorScheme } from 'react-native';

import { Colors, Scheme, Theme } from '@/constants/theme';
import { useStore } from '@/store/store';

/** 'light' или 'dark' с учётом настройки приложения. */
export function useScheme(): Scheme {
  const system = useColorScheme();
  const mode = useStore((s) => s.settings.theme);
  if (mode !== 'system') return mode;
  return system === 'dark' ? 'dark' : 'light';
}

/** Цвета текущей темы: const theme = useTheme(); style={{ color: theme.text }} */
export function useTheme(): Theme {
  return Colors[useScheme()];
}
