# HealthAssist 🏥

Веб-приложение для автоматизации работы клиники, объединяющее пациентов и врачей на единой платформе.

## О проекте

HealthAssist позволяет пациентам записываться к врачам, отслеживать показатели здоровья и получать первичную AI-оценку симптомов. Врачи получают личный кабинет с расписанием, карточками пациентов и возможностью сканировать QR-код пациента для мгновенного доступа к его медицинской истории.

## Возможности

### Для пациентов
- 🔐 Авторизация через Google
- 🗺️ AI-триаж симптомов по карте тела (Claude / Gemini / Groq)
- 📊 Мониторинг показателей здоровья (давление, пульс, температура, SpO2)
- 🎫 Электронная очередь с талонами
- 📱 Персональный QR-код для быстрой идентификации у врача
- 📅 Запись к врачу онлайн

### Для врачей
- 👨‍⚕️ Личный кабинет с расписанием
- 📋 Список пациентов на сегодня
- 📷 Сканирование QR-кода пациента
- 🗂️ Карточка пациента: симптомы, измерения, история визитов
- 📝 Добавление заключений после приёма

## Стек технологий

**Фронтенд**
- React + TypeScript + Vite
- Tailwind CSS

**Бэкенд**
- Node.js + Express
- better-sqlite3
- JWT + Google OAuth 2.0
- Anthropic Claude API

**Деплой**
- Vercel (фронтенд + бэкенд serverless)

## Быстрый старт

### Требования
- Node.js 18+
- npm

### Установка

```bash
# Клонируйте репозиторий
git clone https://github.com/damirzhumangali/healthcare-backend.git
cd healthcare-backend

# Установите зависимости
npm install

# Создайте .env файл
cp .env.example .env
```

### Переменные окружения

```env
FRONTEND_URL=http://localhost:5173
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
JWT_SECRET=your_jwt_secret
ANTHROPIC_API_KEY=your_anthropic_api_key
CORS_ORIGINS=http://localhost:5173
```

### Запуск

```bash
# Бэкенд
node api/index.js

# Фронтенд (в папке фронтенда)
npm run dev
```

## Структура проекта

```
api/
├── index.js                    # Точка входа
├── middleware/
│   ├── auth.js                 # JWT авторизация
│   └── roles.js                # Проверка ролей
├── controllers/
│   └── ticketsController.js    # Логика талонов
├── routes/
│   └── tickets.js              # Роуты очереди
├── services/
│   └── ticketService.js        # Сервис очереди
└── db/
    ├── sqlite.js               # Подключение к БД
    └── migrations/
        └── 001_queue.sql       # Миграции
```

## API

| Метод | Роут | Описание |
|-------|------|----------|
| GET | `/auth/google/url` | URL для Google OAuth |
| POST | `/auth/google/exchange` | Обмен кода на токен |
| GET | `/api/measurements/my` | Мои измерения |
| POST | `/api/measurements` | Добавить измерение |
| POST | `/api/triage` | AI-триаж симптомов |
| POST | `/api/tickets/my` | Взять талон |
| GET | `/api/tickets/queue` | Текущая очередь |

## Деплой

```bash
# Связать с проектом Vercel
vercel link

# Задеплоить в продакшн
vercel --prod
```

## Лицензия

MIT
