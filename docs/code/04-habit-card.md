# 4. Карточка привычки

[src/components/habit-card.tsx](../../src/components/habit-card.tsx)

## Где на экране

Строка списка «Сегодня»: эмодзи в цветном квадрате, «Вода», «4 из 8 · стаканов», «🔥 3», полоса
прогресса и кружок-галочка справа. Смахиваете вправо — из-под карточки выезжает цветная подложка
с галочкой.

## Что делает

- Нажатие — отметить (или +1 для счётной привычки).
- Смахивание вправо дальше 84 px — отметить; карточка пружиной возвращается на место.
- Долгое нажатие — открыть редактирование.
- Галочка «подпрыгивает» в момент выполнения, полоса прогресса плавно растёт.
- Не мешает прокручивать список вертикально — ни на телефоне, ни в браузере.
- Понятна скринридеру одной фразой.

## Пропсы

| Проп | Тип | Зачем |
| --- | --- | --- |
| `habit` | `Habit` | что показывать |
| `count` | `number` | сколько сделано в выбранный день |
| `streak` | `number` | серия |
| `onToggle` | `() => void` | отметить |
| `onEdit` | `() => void` | открыть форму |

## Два потока — коротко

React выполняется в **JS-потоке**, экран рисуется в **UI-потоке**. Если вести карточку за пальцем
через `setState`, каждый кадр пойдёт: палец (UI) → JS → рендер → UI. При занятом JS карточка
отстаёт. Поэтому:

- **Gesture Handler** распознаёт жест в UI-потоке;
- **Reanimated** хранит смещение в `useSharedValue` — числе, которое живёт в UI-потоке;
- обработчики жеста — **ворклеты**: они тоже выполняются в UI-потоке.

В JS попадает только итог — «отметить».

## Код по частям

### Анимируемые числа

```tsx
const offset = useSharedValue(0)          // сдвиг карточки за пальцем
const pop = useSharedValue(1)             // масштаб галочки
const fill = useSharedValue(progress)     // ширина полосы прогресса

useEffect(() => {
  fill.value = withTiming(progress, { duration: 300 })
}, [progress, fill])

useEffect(() => {
  if (done) pop.value = withSequence(withTiming(1.3, { duration: 120 }), withSpring(1, { damping: 9 }))
}, [done, pop])
```

- `withTiming(значение)` — «плавно дойди до значения». Присвоение `.value` анимации не вызывает
  рендера React.
- `withSequence` — сначала быстро до 1.3, потом пружиной обратно к 1: «прыжок».

### Жест

```tsx
const swipe = Gesture.Pan()
  .activeOffsetX(14)
  .failOffsetY([-12, 12])
  .onStart(() => { swiped.value = 1 })
  .onUpdate((event) => {
    offset.value = Math.min(SWIPE_MAX, Math.max(0, event.translationX))
  })
  .onEnd(() => {
    if (offset.value >= SWIPE_THRESHOLD) scheduleOnRN(onToggle)
  })
  .onFinalize(() => {
    offset.value = withSpring(0, { damping: 18, stiffness: 220 })
    swiped.value = withDelay(250, withTiming(0, { duration: 0 }))
  })
```

| Строка | Зачем |
| --- | --- |
| `activeOffsetX(14)` | жест включается только после 14 px **вправо** |
| `failOffsetY([-12, 12])` | палец пошёл вверх/вниз больше 12 px — жест сдаётся, работает прокрутка списка |
| `Math.min(SWIPE_MAX, Math.max(0, …))` | влево карточка не едет, вправо — не дальше 120 px |
| `scheduleOnRN(onToggle)` | ворклет не может вызвать обычную JS-функцию напрямую — передаём вызов в JS-поток |
| `onFinalize`, а не `onEnd` | вызывается **всегда**, даже если систему перехватила касание (звонок). Иначе карточка осталась бы сдвинутой |

### Нажатие и смахивание не должны сработать оба

```tsx
const swiped = useSharedValue(0)
const press = () => {
  if (swiped.value > 0) return
  onToggle()
}
```

На телефоне начавшийся жест отменяет нажатие. В браузере — нет: после отпускания мыши приходит
ещё и `click`, и отметка ставилась бы жестом и тут же снималась кликом. Флажок «только что
смахивали» сбрасывается через 250 мс после конца жеста — `click` приходит сразу за отпусканием.

### Стили из чисел

```tsx
const cardStyle = useAnimatedStyle(() => ({ transform: [{ translateX: offset.value }] }))
const underStyle = useAnimatedStyle(() => ({
  opacity: interpolate(offset.value, [0, SWIPE_THRESHOLD], [0, 1], 'clamp'),
}))
```

`useAnimatedStyle` — стиль, вычисляемый в UI-потоке. `interpolate` переводит одну шкалу в другую:
сдвиг 0…84 px → прозрачность подложки 0…1. `'clamp'` — за пределами не выходить (больше 84 —
всё равно 1).

### Разметка

```tsx
<View style={styles.wrap}>
  <Animated.View style={[styles.under, { backgroundColor: palette.main }, underStyle]}>…галочка…</Animated.View>
  <GestureDetector gesture={swipe} touchAction="pan-y">
    <Animated.View style={cardStyle}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${habit.title}. ${subtitle}. Серия ${streak} ${plural(streak, ['день', 'дня', 'дней'])}`}
        accessibilityHint="Нажмите, чтобы отметить. Долгое нажатие — изменить"
        accessibilityState={{ checked: done }}
        onPress={press}
        onLongPress={onEdit}>
        …
      </Pressable>
    </Animated.View>
  </GestureDetector>
</View>
```

- Подложка — **под** карточкой (`position: absolute`), карточка уезжает и открывает её.
- `touchAction="pan-y"` — для браузера. Gesture Handler по умолчанию ставит `touch-action: none`:
  браузер отдаёт **все** касания жесту и сам не прокручивает. Карточки занимают почти весь экран —
  список на телефоне в браузере не листался. С `pan-y` вертикаль прокручивает браузер, горизонталь
  достаётся жесту. На iOS и Android проп ни на что не влияет.
- **Одна фраза для скринридера** вместо пяти отдельных надписей; `checked` — «выполнено».

## Что будет, если…

| Убрать | Что сломается |
| --- | --- |
| `failOffsetY` | вертикальная прокрутка списка начинает смахивать карточки |
| `touchAction="pan-y"` | в мобильном браузере список не прокручивается |
| флажок `swiped` | в браузере смахивание отмечает и тут же снимает отметку |
| `onFinalize` → `onEnd` | прерванный жест оставляет карточку сдвинутой |
| `scheduleOnRN` | приложение падает: обычная функция вызвана в UI-потоке |

## Проверьте себя

1. Почему `offset` — `useSharedValue`, а не `useState`?
2. Палец ушёл вправо на 60 px и отпустили. Что произойдёт?

<details>
<summary>Ответы</summary>

1. Оно меняется каждый кадр. `useState` — рендер React и переход между потоками на каждый кадр,
   карточка отставала бы от пальца.
2. Отметки не будет (порог 84), карточка пружиной вернётся на место (`onFinalize`).
</details>
