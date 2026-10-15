# 03. Словарь «веб → React Native»

Главная глава для веб-разработчика: что на что заменяется.

## Элементы

| Веб | React Native | Замечания |
| --- | --- | --- |
| `<div>` | `<View>` | контейнер; **не может содержать текст напрямую** |
| `<span>`, `<p>`, `<h1>` | `<Text>` | любой текст обязан быть внутри `<Text>` |
| `<button>`, `<a onClick>` | `<Pressable>` | всё нажимаемое; `onPress`, `onLongPress` |
| `<input>`, `<textarea>` | `<TextInput>` | `onChangeText={(text) => …}` — сразу строка |
| `<input type="checkbox">` | `<Switch>` | системный переключатель |
| `<img>` | `<Image>` (или `expo-image`) | у картинки по сети нужно явно задать размер |
| `<div style="overflow:auto">` | `<ScrollView>` | обычный `View` **не прокручивается** |
| `ul > li` на 1000 строк | `<FlatList>` | рисует только видимые строки |
| `<svg>` | `react-native-svg` | `Svg`, `Circle`, `Path` — компоненты с большой буквы |
| `alert()`, `confirm()` | `Alert.alert()` | в браузере не работает — см. `platform/confirm.ts` |
| `<a href>` | `<Link>` / `router.push()` | Expo Router, глава 04 |

```tsx
// ✗ Ошибка: «Text strings must be rendered within a <Text> component»
<View>Привет</View>

// ✓
<View><Text>Привет</Text></View>
```

## Стили

CSS-файлов и классов нет. Стиль — объект, имена свойств в camelCase:

```tsx
import { StyleSheet, View } from 'react-native';

<View style={[styles.card, pressed && styles.pressed, { backgroundColor: theme.card }]} />

const styles = StyleSheet.create({
  card: { padding: 16, borderRadius: 16, flexDirection: 'row', gap: 12 },
  pressed: { opacity: 0.6 },
});
```

- `style` принимает **массив**: стили сливаются слева направо, `false`/`null` пропускаются —
  так пишутся условные стили (вместо `classnames`).
- `StyleSheet.create` — просто объект с проверкой опечаток; постоянные стили выносят в него,
  а зависящие от темы или состояния дописывают объектом рядом.

| CSS | React Native |
| --- | --- |
| `16px`, `1rem`, `%` | число `16` — «независимые от плотности точки» (dp); `'50%'` строкой |
| `display: flex` | **включён всегда** |
| `flex-direction: row` по умолчанию | по умолчанию **`column`** — элементы идут сверху вниз |
| `display: block / inline / grid` | нет. Только flex (и `'none'`) |
| каскад, наследование | **нет.** Цвет и шрифт наследуются только от `Text` к вложенному `Text` |
| `:hover`, `:active` | `Pressable` → `style={({ pressed }) => …}` |
| `@media (max-width)` | `useWindowDimensions()` и условие в коде |
| `margin: 0 auto` | `alignSelf: 'center'` + `maxWidth` |
| `box-shadow` | `boxShadow` (новые версии RN) + `elevation` на Android |
| `position: fixed` | `position: 'absolute'` у элемента вне `ScrollView` |
| `z-index` войны | порядок в разметке: что ниже в коде — то сверху |
| `1px` линия | `StyleSheet.hairlineWidth` — самая тонкая линия экрана |
| `transition` | Reanimated (глава 07) |
| CSS-переменные, тема | объект темы + хук `useTheme()` |
| `rem`, масштаб шрифта | система сама масштабирует `Text` по настройке «размер шрифта» |

## Вёрстка: думайте столбцами

```tsx
// Карточка привычки: [эмодзи] [название и подпись — растягивается] [галочка]
<View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
  <View style={{ width: 48, height: 48 }} />
  <View style={{ flex: 1 }}>…</View>      {/* flex: 1 — занять всё свободное место */}
  <View style={{ width: 32, height: 32 }} />
</View>
```

`flex: 1` у экрана и у `ScrollView` — частая необходимость: без него контейнер получает
высоту по содержимому, и «прижать вниз» или «растянуть на экран» не получится.

## События

| Веб | React Native |
| --- | --- |
| `onClick` | `onPress` |
| `onChange={(e) => e.target.value}` | `onChangeText={(text) => …}` |
| `onMouseEnter` | нет (на вебе — `onHoverIn` у `Pressable`) |
| `onScroll` | `onScroll` + `scrollEventThrottle` |
| `e.preventDefault()` формы | форм нет; кнопка сама вызывает вашу функцию |
| drag, swipe | `react-native-gesture-handler` (глава 07) |
| `localStorage` | `AsyncStorage` — асинхронный (глава 06) |
| `window.matchMedia('(prefers-color-scheme)')` | `useColorScheme()` |
| `fetch` | `fetch` — такой же |
| `setTimeout`, `Promise`, `Intl` | такие же |

## Чего в React Native нет

- `window`, `document`, `querySelector` — доступ к элементам только через `ref`.
- HTML-семантики (`<nav>`, `<h1>`) — вместо неё `accessibilityRole` (глава 05).
- npm-пакетов, которые трогают DOM (большинство слайдеров, редакторов, графиков для веба).
  У пакета должна быть поддержка React Native. Каталог: https://reactnative.directory

## Что остаётся как было

React: компоненты, пропсы, `useState`, `useEffect`, `useMemo`, контекст, `key` в списках.
TypeScript. Zustand, TanStack Query, React Hook Form, date-fns, lodash — всё, что не
касается DOM. `fetch`, `async/await`, модули. Тесты на Jest.

## Ошибки

> **Текст прямо в `View`** (`<View>Привет</View>`) — красный экран «Text strings must be rendered
> within a <Text> component». Любая строка — внутри `<Text>`.
>
> **`flexDirection` забыли.** В React Native flexbox по умолчанию **столбцом**. Ряд — явно
> `flexDirection: 'row'`.
>
> **Единицы в стилях** (`padding: '16px'`). Числа без единиц — это «точки» экрана: `padding: 16`.
>
> **`onClick`** вместо `onPress` — нажатие не сработает.
>
> **Каскад стилей.** Его нет: цвет текста не наследуется от `View`. Только `Text` внутри `Text`.

## Попробуйте сами

1. Переведите на React Native: `<div class="row"><img src="a.png"><span>Вода</span></div>`.
2. Почему у `Pressable` стиль бывает функцией `({ pressed }) => …`?
3. Где в «Ритме» задан общий шрифт и цвет текста, если каскада нет?

<details>
<summary>Ответы</summary>

1. ```tsx
   <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
     <Image source={require('./a.png')} style={{ width: 24, height: 24 }} />
     <Text>Вода</Text>
   </View>
   ```
   У `Image` размер обязателен.
2. Так рисуют состояние «нажато» (аналог `:active`) — в React Native нет псевдоклассов.
3. В своём компоненте `AppText` (`src/components/ui.tsx`): он берёт цвет из темы и варианты
   размера. Везде используется он, а не голый `Text`.
</details>
