# 5. Кольцо прогресса

[src/components/progress-ring.tsx](../../src/components/progress-ring.tsx)

## Где на экране

«Сегодня» — большое кольцо с «60%» в центре; «Статистика» — кольца у каждой привычки. Отметили
привычку — кольцо плавно дорисовывается.

## Пропсы

| Проп | Тип | Зачем |
| --- | --- | --- |
| `progress` | `0…1` | доля |
| `size` | `number` | диаметр, точки |
| `strokeWidth` | `number` | толщина, по умолчанию 6 |
| `color` | `string` | цвет; по умолчанию акцент темы |
| `children` | элементы | что в центре |

```tsx
<ProgressRing progress={0.6} size={76} strokeWidth={8}>
  <AppText variant="bodyBold">60%</AppText>
</ProgressRing>
```

## Как нарисовать часть окружности

Приём **штриховой линии**: у окружности длиной `L` делаем штрих длиной `L` и сдвигаем его.

```
strokeDasharray  = L          — штрих во всю окружность, потом такой же пробел
strokeDashoffset = L × (1 − прогресс)
  прогресс 0   → сдвиг L      → виден пробел: ничего
  прогресс 0.5 → сдвиг L/2    → половина круга
  прогресс 1   → сдвиг 0      → круг замкнут
```

## Код по частям

```tsx
const radius = (size - strokeWidth) / 2
const length = 2 * Math.PI * radius
```

Радиус — до **середины** линии: штрих рисуется поровну внутрь и наружу, и без вычитания толщины
кольцо обрезалось бы краями SVG. Длина окружности — `2πr`.

```tsx
const value = useSharedValue(progress)

useEffect(() => {
  value.value = withTiming(Math.min(1, Math.max(0, progress)), { duration: 450, easing: Easing.out(Easing.cubic) })
}, [progress, value])

const animatedProps = useAnimatedProps(() => ({ strokeDashoffset: length * (1 - value.value) }))
```

- Значение зажато в 0…1: 9 из 8 стаканов не должны рисовать кольцо больше круга.
- `Easing.out(Easing.cubic)` — быстро начать и мягко остановиться.
- **`useAnimatedProps`** — как `useAnimatedStyle`, но для **свойств** компонента (у SVG это не стиль,
  а атрибут `strokeDashoffset`). Меняется в UI-потоке, React при этом не перерисовывается.

```tsx
const AnimatedCircle = Animated.createAnimatedComponent(Circle)
```

Обычный `Circle` из `react-native-svg` не умеет принимать анимированные свойства —
`createAnimatedComponent` делает из него «анимируемый».

```tsx
<View style={{ width: size, height: size }}>
  <Svg width={size} height={size} style={styles.svg}>
    <Circle … stroke={theme.track} />                 {/* серая дорожка */}
    <AnimatedCircle … strokeLinecap="round" strokeDasharray={length} animatedProps={animatedProps} />
  </Svg>
  <View style={styles.center}>{children}</View>
</View>
```

- `rotate(-90deg)` у SVG — окружность начинается справа («3 часа»), а прогресс привычно рисуется
  сверху.
- `strokeLinecap="round"` — скруглённые концы дуги.
- Центр — обычный `View` поверх SVG (`position: absolute` на весь размер), в нём — любой текст.

## Что будет, если…

| Сделать | Что сломается |
| --- | --- |
| `radius = size / 2` | кольцо обрезано по краям |
| `progress` без зажима | при перевыполнении дуга «переезжает» за начало |
| `setState` в `requestAnimationFrame` вместо Reanimated | рендер React 60 раз в секунду, на слабых телефонах — рывки |
| убрать `rotate(-90deg)` | прогресс начинается с «3 часов» |

## Проверьте себя

1. Какой `strokeDashoffset` у кольца диаметром 76 с толщиной 8 при прогрессе 25%?
2. Почему центр кольца не рисуется текстом внутри SVG?

<details>
<summary>Ответы</summary>

1. `r = 34`, `L = 2π × 34 ≈ 213.6`, сдвиг `213.6 × 0.75 ≈ 160.2`.
2. В `View` можно положить любой компонент (`AppText` с темой, эмодзи, значок) и получить шрифт и
   доступность как у остального текста. Текст SVG этого не даёт.
</details>
