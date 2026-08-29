/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Семантические цвета расширения
        fbe: {
          bg: 'var(--fbe-bg)',
          surface: 'var(--fbe-surface)',
          text: 'var(--fbe-text)',
          muted: 'var(--fbe-muted)',
          border: 'var(--fbe-border)',
          accent: 'var(--fbe-accent)',       // Основной цвет (Оранжевый)
          accentHover: 'var(--fbe-accent-hover)',
        },
        // Оригинальная палитра категорий Ficbook (для справки или использования)
        fb: {
          het: '#71aa27',       // Зеленый (Гет)
          slash: '#5876a3',     // Синий (Слэш)
          femslash: '#a6729e',  // Фиолетовый (Фемслэш)
          gen: '#9e7e59',       // Коричневый (Джен)
          mixed: '#dcb62a',     // Желтый (Смешанная)
          article: '#888888',   // Серый (Статья)
          premium: '#ff8c00',   // Оранжевый (Премиум)
        }
      },
      fontFamily: {
        // Точный стек шрифтов с сайта
        sans: ['"YS Text"', 'Helvetica', 'Arial', 'sans-serif'],
      },
      boxShadow: {
        'fbe': '0 10px 30px rgba(0, 0, 0, 0.2)', // Глубокая тень для "парения"
      }
    },
  },
  plugins: [],
}