/**
 * Настройки приложения — дополнение к app.json.
 *
 * app.json — статические настройки (имя, иконки, плагины). Этот файл нужен
 * ради одного значения, которое зависит от окружения: baseUrl веб-версии.
 * GitHub Pages отдаёт сайт из подпапки (https://user.github.io/ritm/), и пути
 * к скриптам должны начинаться с /ritm. Локально и на своём домене — с корня.
 *
 *   EXPO_BASE_URL=/ritm npx expo export -p web
 */
module.exports = ({ config }) => ({
  ...config,
  experiments: {
    ...config.experiments,
    baseUrl: process.env.EXPO_BASE_URL ?? '',
  },
});
