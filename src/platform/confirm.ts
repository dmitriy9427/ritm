/**
 * Подтверждение опасного действия («Удалить привычку?»).
 *
 * На телефоне — системный диалог Alert.alert. В браузере Alert из React Native
 * не работает (ничего не показывает и не вызывает кнопки), поэтому там —
 * обычный window.confirm. Функция возвращает Promise<boolean>, вызывающему
 * коду платформа не важна:  if (await confirm('Удалить?')) …
 */
import { Alert, Platform } from 'react-native';

export function confirm(title: string, message: string, actionLabel = 'Удалить'): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  }
  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: 'Отмена', style: 'cancel', onPress: () => resolve(false) },
        { text: actionLabel, style: 'destructive', onPress: () => resolve(true) },
      ],
      // Android: тап мимо диалога или «Назад» — это тоже «нет».
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}
