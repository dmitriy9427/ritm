# 2. Хранилище

[src/store/store.ts](../../src/store/store.ts)

## Где на экране

Нигде — и везде: привычки, отметки, настройки. Закрыли приложение, открыли через неделю — всё на
месте. Интернет не нужен: данные лежат на телефоне.

## Что делает

- Хранит привычки, отметки и настройки в **Zustand** — маленьком хранилище состояния.
- Сохраняет их на устройство (**AsyncStorage**) после каждого изменения и читает при запуске.
- Сообщает, когда данные прочитаны (`hydrated`), — до этого экраны не показываются.
- При первом запуске кладёт демо-данные, чтобы экран не был пустым.
- Готово к изменению формы данных: `version` + `migrate`.

## Как пользоваться

```tsx
const habits = useStore((s) => s.habits)          // компонент перерисуется, только если изменились habits
const tapHabit = useStore((s) => s.tapHabit)      // действие
tapHabit(habit.id, day)

useStore.getState().settings                       // вне React — без подписки
```

**Селектор** `(s) => s.habits` — главное отличие от `useContext`: компонент подписан только на
нужный кусок. Сменилась настройка вибрации — список привычек не перерисовывается.

## Код по частям

### Состояние и действия в одном месте

```ts
export const useStore = create<State & Actions>()(
  persist(
    (set, get) => ({
      habits: [],
      log: {},
      settings: DEFAULT_SETTINGS,
      seeded: false,
      hydrated: false,

      tapHabit: (id, day) => {
        const { habits, log } = get()
        const habit = habits.find((h) => h.id === id)
        if (!habit) return 0
        const next = nextCount(habit, countOn(log, habit, day))
        set({ log: setCount(log, id, day, next) })
        return next
      },
      …
```

- `set` — записать изменения (объект сливается с текущим состоянием), `get` — прочитать текущее.
- Логика — в чистых функциях `nextCount` и `setCount` (страница 1). Хранилище только связывает
  их с данными.
- `tapHabit` возвращает новое значение — экран по нему решает, какая будет вибрация («успех» или
  просто «тап»).

```ts
removeHabit: (id) =>
  set((s) => {
    const { [id]: _removed, ...log } = s.log
    return { habits: s.habits.filter((h) => h.id !== id), log }
  }),
```

Удаляем и отметки привычки: деструктуризация «выньте ключ `id`, остальное — в `log`». Иначе
отметки удалённых привычек копились бы в хранилище годами.

```ts
const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`
```

Id придумывает само приложение: сервера, который выдал бы номер, нет. Время + случайность —
повторов на одном телефоне не будет.

### Сохранение: `persist`

```ts
{
  name: 'ritm',
  version: 1,
  storage: createJSONStorage(() => AsyncStorage),
  partialize: ({ habits, log, settings, seeded }) => ({ habits, log, settings, seeded }),
  migrate: (persisted, version) => { … return persisted },
  onRehydrateStorage: () => (state, error) => {
    if (error) console.warn('[store] не удалось прочитать сохранённые данные', error)
    if (state && !state.seeded) state.loadDemo()
    useStore.setState({ hydrated: true })
  },
}
```

| Опция | Зачем |
| --- | --- |
| `name` | ключ в AsyncStorage |
| `storage` | куда писать. На вебе AsyncStorage сам использует `localStorage` — код один |
| `partialize` | **что** сохранять: данные — да, функции и `hydrated` — нет |
| `version` + `migrate` | данные старой версии приводятся к новой форме |
| `onRehydrateStorage` | вызывается после чтения с диска |

**Почему `hydrated` не сохраняется.** Иначе после перезапуска он прочитался бы с диска как `true`
ещё до того, как прочитаны данные.

**Почему экраны ждут `hydrated`.** Чтение с диска асинхронное. Первые миллисекунды в хранилище —
начальные пустые значения. Покажи экран сейчас — мигнёт «Нет привычек». А код «первый запуск →
демо» сработал бы **поверх** настоящих данных. Поэтому корневой `_layout.tsx` прячет экраны, пока
`hydrated === false`.

**`seeded`** — «демо уже создавали». Человек нажал «Удалить всё» — демо не должно вернуться при
следующем запуске.

### Миграция на будущее

```ts
migrate: (persisted, version) => {
  // if (version < 2) { …добавить новое поле привычкам… }
  return persisted
},
```

Через месяц у привычки появится поле `note`. У тех, кто уже пользуется, на диске — привычки без
него, с `version: 1`. Ставим `version: 2`, и `migrate` один раз допишет поле старым данным. Без
этого обновление приложения ломает данные у всех текущих пользователей.

### Синхронизация с модулем вибрации

```ts
useStore.subscribe((state, prev) => {
  if (state.settings.haptics !== prev.settings.haptics || state.hydrated !== prev.hydrated) {
    setHapticsEnabled(state.settings.haptics)
  }
})
```

Модуль вибрации живёт вне React и читает простой флажок. Подписка на хранилище обновляет его при
смене настройки — и один раз после чтения с диска (`hydrated`), чтобы сохранённое «выключено»
сработало сразу.

## Что будет, если…

| Убрать | Что сломается |
| --- | --- |
| `partialize` | на диск уйдёт `hydrated: true`, и экран покажется до чтения данных |
| ожидание `hydrated` | мигание «Нет привычек» при каждом запуске |
| `seeded` | после «Удалить всё» демо возвращаются при перезапуске |
| удаление отметок в `removeHabit` | хранилище растёт от удалённых привычек |

## Проверьте себя

1. Почему `useStore((s) => s.habits)`, а не `useStore()` целиком?
2. Где в вебе лежат данные «Ритма» и как их посмотреть?

<details>
<summary>Ответы</summary>

1. С селектором компонент перерисовывается, только когда меняется выбранное. `useStore()` целиком
   перерисовывал бы его на любое изменение — включая каждую отметку другой привычки.
2. В `localStorage` под ключом `ritm`: DevTools → Application → Local Storage.
</details>
