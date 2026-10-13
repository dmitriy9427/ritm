/**
 * Хранилище приложения (Zustand) с сохранением на устройстве.
 *
 * ─── Где лежат данные ───────────────────────────────────────────────────────
 * AsyncStorage — простое хранилище «ключ → строка» на устройстве (как
 * localStorage в браузере, но асинхронное). Данные переживают закрытие
 * приложения и работают без интернета. Удаление приложения стирает и их.
 * На вебе AsyncStorage сам использует localStorage — код один.
 *
 * ─── Почему нужен флаг hydrated ─────────────────────────────────────────────
 * Чтение с диска асинхронное: первые миллисекунды после запуска в сторе ещё
 * начальные (пустые) значения. Если в этот момент показать экран, пользователь
 * увидит «пусто» и мигание, а код «первый запуск → создать демо» сработает
 * поверх настоящих данных. Поэтому всё, что зависит от данных, ждёт hydrated.
 *
 * ─── version и migrate ──────────────────────────────────────────────────────
 * Форма данных со временем меняется (появилось поле у привычки). У сохранённого
 * состояния есть номер версии; при несовпадении вызывается migrate и приводит
 * старые данные к новой форме. Без этого обновление приложения ломает данные
 * у всех, кто им уже пользуется.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { DayKey, toKey } from '@/lib/dates';
import { Habit, Log, countOn, nextCount, setCount } from '@/lib/habits';
import { seed } from '@/lib/seed';
import { setHapticsEnabled } from '@/platform/haptics';

export type ThemeMode = 'system' | 'light' | 'dark';

export type Settings = {
  theme: ThemeMode;
  haptics: boolean;
  reminders: boolean;
};

/** Данные формы привычки: всё, кроме того, что проставляет хранилище. */
export type HabitDraft = Omit<Habit, 'id' | 'createdAt'>;

type State = {
  habits: Habit[];
  log: Log;
  settings: Settings;
  /** Демо-данные уже создавались (чтобы не вернуть их после «Удалить всё»). */
  seeded: boolean;
  /** Данные прочитаны с диска — можно показывать экраны. В хранилище не пишется. */
  hydrated: boolean;
};

type Actions = {
  addHabit: (draft: HabitDraft) => string;
  updateHabit: (id: string, draft: HabitDraft) => void;
  removeHabit: (id: string) => void;
  /** Нажатие на привычку в выбранный день; возвращает новое значение счётчика. */
  tapHabit: (id: string, day: DayKey) => number;
  setHabitCount: (id: string, day: DayKey, count: number) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  /** Заменить всё демо-данными. */
  loadDemo: () => void;
  /** Удалить все привычки и отметки. */
  clearAll: () => void;
};

const DEFAULT_SETTINGS: Settings = { theme: 'system', haptics: true, reminders: false };

/** Короткий уникальный id. На устройстве нет сервера, который выдал бы номер. */
const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

export const useStore = create<State & Actions>()(
  persist(
    (set, get) => ({
      habits: [],
      log: {},
      settings: DEFAULT_SETTINGS,
      seeded: false,
      hydrated: false,

      addHabit: (draft) => {
        const habit: Habit = { ...draft, id: newId(), createdAt: toKey(new Date()) };
        set((s) => ({ habits: [...s.habits, habit] }));
        return habit.id;
      },

      updateHabit: (id, draft) =>
        set((s) => ({ habits: s.habits.map((h) => (h.id === id ? { ...h, ...draft } : h)) })),

      removeHabit: (id) =>
        set((s) => {
          // Отметки удалённой привычки тоже убираем — иначе они копились бы в хранилище.
          const { [id]: _removed, ...log } = s.log;
          return { habits: s.habits.filter((h) => h.id !== id), log };
        }),

      tapHabit: (id, day) => {
        const { habits, log } = get();
        const habit = habits.find((h) => h.id === id);
        if (!habit) return 0;
        const next = nextCount(habit, countOn(log, habit, day));
        set({ log: setCount(log, id, day, next) });
        return next;
      },

      setHabitCount: (id, day, count) => set((s) => ({ log: setCount(s.log, id, day, count) })),

      updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),

      loadDemo: () => set({ ...seed(toKey(new Date())), seeded: true }),

      clearAll: () => set({ habits: [], log: {}, seeded: true }),
    }),
    {
      name: 'ritm', // ключ в AsyncStorage
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      // Сохраняем только данные: функции и служебный флаг hydrated — нет.
      partialize: ({ habits, log, settings, seeded }) => ({ habits, log, settings, seeded }),
      migrate: (persisted, version) => {
        // Пример на будущее: if (version < 2) { …добавить новое поле привычкам… }
        void version;
        return persisted as State & Actions;
      },
      onRehydrateStorage: () => (state, error) => {
        if (error) console.warn('[store] не удалось прочитать сохранённые данные', error);
        // Первый запуск (или данные не прочитались): показываем демо, а не пустой экран.
        if (state && !state.seeded) state.loadDemo();
        useStore.setState({ hydrated: true });
      },
    },
  ),
);

// Настройка вибрации живёт в сторе, а модуль вибрации — вне React: синхронизируем.
useStore.subscribe((state, prev) => {
  if (state.settings.haptics !== prev.settings.haptics || state.hydrated !== prev.hydrated) {
    setHapticsEnabled(state.settings.haptics);
  }
});
