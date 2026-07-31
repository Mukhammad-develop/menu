# Меню — ресторанное видео-меню

Цифровое меню ресторана для вертикальных сенсорных дисплеев: полноэкранная
вертикально-свайпаемая лента видео блюд в стиле TikTok/Reels, стеклянная
(glassmorphism) панель категорий и админ-панель для управления меню.

## Быстрый старт

```bash
npm install
npm run dev
```

Приложение сразу работает в **демо-режиме** — без базы данных и токенов.
Откройте http://localhost:3000 — лента блюд; http://localhost:3000/admin —
админ-панель (пароль по умолчанию `admin1234`).

> **Важно:** видео в демо-данных — плейсхолдеры из открытого бакета Google
> (`storage.googleapis.com/gtv-videos-bucket/sample/...`). Перед запуском в
> продакшен их необходимо заменить на реальные видео блюд (загрузите свои
> через админ-панель после подключения базы данных).

## Переменные окружения

Скопируйте `.env.example` в `.env` и заполните при необходимости:

| Переменная | Назначение | Если не задана |
|---|---|---|
| `DATABASE_URL` | Строка подключения к PostgreSQL | Демо-режим: встроенные данные, CRUD возвращает `Database not connected` |
| `BLOB_READ_WRITE_TOKEN` | Токен Vercel Blob для загрузки видео | Загрузка возвращает `BLOB_READ_WRITE_TOKEN not set` |
| `ADMIN_PASSWORD` | Пароль входа в `/admin` | Используется `admin1234` |

## Подключение реальной базы данных

1. Создайте PostgreSQL-базу — например, [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres)
   или [Neon](https://neon.tech) — и пропишите строку подключения в `DATABASE_URL`.
2. Примените схему:
   ```bash
   npx prisma migrate dev --name init
   ```
3. Добавьте категории (через `npx prisma studio` или SQL), затем блюда —
   через админ-панель `/admin`.

Категории в демо-режиме встроенные; в боевом режиме они читаются из таблицы
`Category`, поэтому сначала создайте их в базе.

## Загрузка видео

Загрузка работает через [Vercel Blob](https://vercel.com/docs/storage/vercel-blob):
Server Action `uploadVideo` в `app/actions.ts` вызывает `put()` из
`@vercel/blob` с `access: 'public'` и возвращает публичный URL, который
подставляется в поле «URL видео» формы блюда. Без `BLOB_READ_WRITE_TOKEN`
форма загрузки показывает понятную ошибку вместо падения.

## Как устроено

- **Стек:** Next.js 14 (App Router) · TypeScript · Tailwind CSS ·
  framer-motion · Prisma + PostgreSQL · Vercel Blob.
- **Без базы данных:** `lib/data.ts` (`getCategories()`, `getMenuItems()`,
  `getAllMenuItems()`) читает через Prisma, когда задан `DATABASE_URL`,
  иначе отдаёт демо-данные из `lib/demo-data.ts`. Демо-режим — read-only.
- **Лента (`components/VideoFeed.tsx`):** свайп вверх/вниз — `drag="y"` из
  framer-motion с порогом в `onDragEnd`; на десктопе также работают колесо
  мыши и стрелки клавиатуры. Рендерятся только активный слайд и соседи;
  играет только активное видео (`autoplay muted loop playsInline
  preload="metadata"`), соседние на паузе и перемотаны на начало.
- **Дизайн:** тёмная тема, Inter (next/font), неоновый акцент `#C6FF3D`
  (цена, активная категория, иконки). Карусель категорий — «стекло»:
  `backdrop-blur-md bg-white/10 border-white/20 rounded-full`. Внизу по
  центру — подпись «Меню» с маленькой неоновой иконкой.
- **Админка (`/admin`):** пароль через Server Action `login` (HTTP-only
  cookie `menu_admin`, 7 дней), защита маршрутов в `middleware.ts`.
  Server Actions в админских формах ставятся в очередь
  (`hooks/use-action-queue.ts`), чтобы быстрые последовательные правки не
  конфликтовали. После мутаций вызывается `revalidatePath('/')`.

## Структура

```
app/
  (client)/page.tsx          # видео-лента (RSC + Suspense)
  (admin)/admin/page.tsx     # дашборд: CRUD-список, формы, загрузка
  (admin)/admin/login/page.tsx
  actions.ts                 # 'use server': login/logout/CRUD/upload
  layout.tsx, globals.css
components/
  VideoFeed.tsx, CategoryNav.tsx
  MenuItemForm.tsx, UploadForm.tsx, LoginForm.tsx
hooks/use-action-queue.ts
lib/data.ts, lib/demo-data.ts, lib/db.ts
prisma/schema.prisma
middleware.ts
```

## Скрипты

- `npm run dev` — режим разработки
- `npm run build` / `npm start` — продакшен-сборка / запуск
- `npm run lint` — ESLint
