# 04. Навигация (Expo Router)

На сайте навигация — это адреса и ссылки. В приложении — **экраны, которые наслаиваются
друг на друга**: открыл карточку — она выехала справа, «назад» — уехала. Expo Router
соединяет оба мира: экраны описываются файлами (как в Next.js), а ведут себя как нативные.

## Файлы = экраны

```
src/app/
├── _layout.tsx          корневая «стопка» (Stack)
├── (tabs)/              группа: скобки значат «в адрес не попадает»
│   ├── _layout.tsx      нижние вкладки (Tabs)
│   ├── index.tsx        /            «Сегодня»
│   ├── stats.tsx        /stats       «Статистика»
│   └── settings.tsx     /settings    «Настройки»
└── habit/
    └── [id].tsx         /habit/new, /habit/abc123   форма привычки
```

| Имя | Значение |
| --- | --- |
| `index.tsx` | главный экран папки |
| `_layout.tsx` | каркас для экранов этой папки: какой навигатор и общие настройки |
| `(группа)/` | папка для организации; в адресе её нет |
| `[id].tsx` | динамический сегмент — значение читается из параметров |

## Три вида навигаторов в «Ритме»

### Stack — стопка карт (`src/app/_layout.tsx`)

```tsx
import { Stack } from 'expo-router/stack';

<Stack screenOptions={{ headerShown: false }}>
  <Stack.Screen name="(tabs)" />
  <Stack.Screen name="habit/[id]" options={{ presentation: 'modal', headerShown: true }} />
</Stack>
```

Новый экран кладётся поверх, «назад» снимает его. Бесплатно получаем системное поведение:
жест от левого края на iOS, кнопку «Назад» на Android, анимацию перехода.

### Tabs — нижние вкладки (`src/app/(tabs)/_layout.tsx`)

```tsx
import { Tabs } from 'expo-router/js-tabs';

<Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: theme.accent }}>
  <Tabs.Screen name="index" options={{ title: 'Сегодня', tabBarIcon: … }} />
  <Tabs.Screen name="stats" options={{ title: 'Статистика', tabBarIcon: … }} />
</Tabs>
```

Вкладки **сохраняют состояние**: ушли на «Статистику» и вернулись — «Сегодня» на том же
месте прокрутки, с тем же выбранным днём. Экран вкладки создаётся при первом открытии и
потом живёт.

> **JS-вкладки или нативные?** Здесь `expo-router/js-tabs` — панель нарисована на JS,
> одинакова на iOS, Android и в браузере, полностью настраивается. Есть
> `expo-router/unstable-native-tabs` — настоящая системная панель (на новых iOS — «стеклянная»),
> но API ещё помечен unstable, а для веба нужна отдельная реализация. Для учебного
> кроссплатформенного проекта JS-вкладки надёжнее.

### Modal — окно поверх (`presentation: 'modal'`)

Форма привычки открывается поверх вкладок: на iOS это «карточка», которую можно смахнуть
вниз; на Android и в вебе — обычный экран со стрелкой. Модальное окно — для задачи, которую
нужно завершить или отменить (создать, отредактировать), а не «перейти куда-то».

## Переходы из кода

```tsx
import { useRouter } from 'expo-router';

const router = useRouter();
router.push('/habit/new');            // открыть экран поверх
router.push(`/habit/${habit.id}`);
router.back();                        // закрыть текущий
router.replace('/');                  // заменить текущий (назад не вернёт)
```

В `app.json` включено `typedRoutes`: TypeScript знает все адреса приложения и подчеркнёт
опечатку в `router.push('/habbit/new')`.

## Параметры

```tsx
// src/app/habit/[id].tsx
import { useLocalSearchParams } from 'expo-router';

const { id } = useLocalSearchParams<{ id: string }>();   // 'new' или id привычки
const existing = useStore((s) => s.habits.find((h) => h.id === id));
const isNew = !existing;
```

Параметр в адресе — это **идентификатор**, а не данные. Сам объект привычки берётся из
хранилища по id. Так экран остаётся правильным, даже если данные изменились, и работает
прямая ссылка (deep link) `ritm://habit/abc123`.

## Настройка шапки изнутри экрана

Экран может менять свою шапку — заголовок и кнопки зависят от его состояния:

```tsx
<Stack.Screen
  options={{
    title: isNew ? 'Новая привычка' : 'Привычка',
    headerRight: () => <IconButton icon="checkmark" label="Сохранить" onPress={save} />,
    headerLeft: () => <IconButton icon="close" label="Закрыть" onPress={() => router.back()} />,
  }}
/>
```

## Тема навигации

Навигатор сам рисует фон экранов и шапки. Чтобы при переходе в тёмной теме не было белой
вспышки, ему передаётся тема (`ThemeProvider` в корневом `_layout.tsx`): цвета фона,
карточек, текста и акцента — из нашей палитры.

## Веб и прямые ссылки

В браузере у каждого экрана настоящий адрес: `/stats`, `/habit/new`. Сборка — одностраничное
приложение (`"output": "single"` в `app.json`), поэтому на GitHub Pages прямой заход на
`/ritm/stats` обслуживает `404.html` — копия `index.html` (так же, как в «Летучке»).

На телефоне те же адреса работают как deep links со схемой из `app.json` (`"scheme": "ritm"`).
