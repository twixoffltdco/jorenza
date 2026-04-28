# ⚡ Jorenza

**Deploy GitHub Projects Instantly** — аналог Vercel/Onreza для шеринга GitHub проектов.

## Суть проекта

Пользователь вставляет ссылку на публичный GitHub репозиторий → Jorenza анализирует его через GitHub API → строит карту файлов с raw-ссылками → генерирует уникальный URL + короткую ссылку.

## Структура проекта

```
jorenza/
├── index.html              # Главная страница / лендинг
├── pages/
│   ├── app.html            # Основное приложение (деплой)
│   ├── docs.html           # Документация
│   ├── faq.html            # Частые вопросы
│   ├── pricing.html        # Цены
│   ├── terms.html          # Условия использования
│   ├── privacy.html        # Политика конфиденциальности
│   └── project.html        # Лендинг деплоя (шаблон)
└── public/
    ├── css/main.css        # Стили
    └── js/main.js          # Логика: GitHub API, генерация URL
```

## Как запустить

### Вариант 1: Статический сервер (локально)

```bash
# Python
python3 -m http.server 8080

# Node.js (npx)
npx serve .

# Открыть в браузере:
# http://localhost:8080
```

### Вариант 2: Vercel Deploy

```bash
npm i -g vercel
vercel --prod
```

### Вариант 3: Netlify

Перетащи папку `jorenza/` на drag-and-drop в netlify.com/drop

### Вариант 4: GitHub Pages

1. Загрузи содержимое в репозиторий GitHub
2. Settings → Pages → Source: Deploy from branch → main / root
3. Сайт будет на `username.github.io/jorenza`

## Как работают URL

- **Деплой URL**: `jorenza.app/p/xK9mN2pQaB` — 10 символов (буквы+цифры)
- **Короткая ссылка**: `jrn.to/xK9mN2` — 6 символов
- **Raw файлы**: `https://raw.githubusercontent.com/{owner}/{repo}/{branch}/{path}`

## ID проекта

`JRZ-001`

## Технологии

- Vanilla HTML/CSS/JS (без фреймворков)
- GitHub REST API v3 (публичный, без авторизации)
- localStorage для хранения истории деплоев
- Google Fonts (Syne + DM Mono)

## Страницы

| Страница | URL |
|----------|-----|
| Главная | `/` |
| Приложение | `/pages/app.html` |
| Документация | `/pages/docs.html` |
| FAQ | `/pages/faq.html` |
| Цены | `/pages/pricing.html` |
| Условия | `/pages/terms.html` |
| Политика | `/pages/privacy.html` |

---

Made with ⚡ by Jorenza Team | ID: JRZ-001
