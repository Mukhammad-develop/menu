# Меню — ресторанное видео-меню

Цифровое меню ресторана для вертикальных сенсорных дисплеев: полноэкранная
вертикально-свайпаемая лента видео блюд в стиле TikTok/Reels, стеклянная
(glassmorphism) панель категорий и админ-панель для управления меню.

MVP рассчитан на деплой на **cPanel shared hosting** (CloudLinux + Passenger
Node.js + MySQL): видео хранятся на файловой системе, никаких внешних
сервисов не требуется.

## Быстрый старт (локально)

```bash
npm install
npm run dev
```

Приложение сразу работает в **демо-режиме** — без базы данных.
Откройте http://localhost:3000 — лента блюд; http://localhost:3000/admin —
админ-панель (пароль по умолчанию `admin1234`).

> **Важно:** видео в демо-данных — плейсхолдеры из открытого бакета Google
> (`storage.googleapis.com/gtv-videos-bucket/sample/...`). Перед запуском в
> продакшен их необходимо заменить на реальные видео блюд (загрузите свои
> через админ-панель после подключения базы данных).

## Переменные окружения

Скопируйте `.env.example` в `.env` и заполните:

| Переменная | Назначение | Если не задана |
|---|---|---|
| `DATABASE_URL` | Строка подключения к MySQL, например `mysql://USER:PASSWORD@localhost:3306/DBNAME` | Демо-режим: встроенные данные, CRUD возвращает `Database not connected` |
| `ADMIN_PASSWORD` | Пароль входа в `/admin` | Используется `admin1234` |

## Загрузка видео

Загрузка работает без внешних сервисов: Server Action `uploadVideo` в
`app/actions.ts` проверяет, что файл — `video/*`, и сохраняет его в
`public/uploads/videos/<timestamp>-<uuid>.<ext>` (расширение берётся из
MIME-типа). URL `/uploads/videos/<file>` подставляется в поле «URL видео»
формы блюда. Загрузка работает и в демо-режиме — база данных для неё не нужна.

Файлы отдаёт route handler `app/uploads/videos/[file]/route.ts` напрямую с
диска: `next start` обслуживает только те файлы из `public/`, что существовали
при старте сервера, поэтому без этого обработчика свежезагруженные видео
отдавали бы 404 до перезапуска приложения.

Лимит тела Server Action поднят до 100 МБ
(`experimental.serverActions.bodySizeLimit` в `next.config.js`).

## Деплой на cPanel (MVP)

### 1. База данных MySQL

1. cPanel → **MySQL Databases**: создайте базу, создайте пользователя,
   добавьте пользователя в базу с **ALL PRIVILEGES**.
2. Пропишите credentials в `.env`:
   `DATABASE_URL="mysql://USER:PASSWORD@localhost:3306/DBNAME"`
   (имена базы и пользователя в cPanel обычно с префиксом аккаунта,
   например `account_menu`).
3. Примените схему: `npx prisma migrate dev --name init`
   (или `npx prisma db push`). **Важно:** cPanel MySQL обычно принимает
   подключения только с localhost — поэтому миграцию запускайте **с самого
   сервера** через Terminal в cPanel. Удалённый запуск с локальной машины
   возможен, только если в cPanel включён Remote MySQL для вашего IP.
4. Категории (`Category`) создайте через `npx prisma studio` на сервере или
   SQL-запросом; блюда добавляются через админ-панель `/admin`.

### 2. Сборка — только вне сервера

> **ВАЖНО для этого хоста:** cPanel-сервер **не может собирать Next.js** —
> лимиты CloudLinux LVE (потоки/память) убивают `next build`. Собирайте
> вне сервера (GitHub Actions или локально) и деплойте каталог `.next`
> через git, как в вашем другом проекте.

Типовой поток:

1. Локально/в CI: `npm ci && npm run build`.
2. Закоммитьте/загрузите на сервер код вместе с `.next` (например, ветка
   `build`, как в соседнем проекте).
3. На сервере (Terminal в cPanel, в каталоге приложения):
   ```bash
   npm ci --omit=dev
   npx prisma generate   # обязательно: deploy использует --ignore-scripts,
                         # поэтому postinstall не срабатывает
   ```
   В `schema.prisma` уже прописан `binaryTargets = ["native",
   "rhel-openssl-3.0.x"]`, так что клиент, сгенерированный на macOS/Linux,
   работает и на RHEL-based CloudLinux.
4. cPanel → **Setup Node.js App**: укажите каталог приложения, startup file
   — `node_modules/next/dist/bin/next start` (или `server.js`-обёртку по
   вашему текущему деплою), добавьте переменные окружения из `.env`.
5. Перезапустите приложение в Passenger.

### 3. Загрузки больших видео

Passenger/веб-сервер хоста может ограничивать размер тела запроса
(`LimitRequestBody`, лимиты LVE и т.п.). Если загрузка больших видео
обрывается — это ограничение хоста, а не приложения; уменьшите размер
файлов (сжимайте до ~20–50 МБ — для вертикального дисплея этого достаточно)
или попросите хостера поднять лимит.

Загруженные файлы лежат в `public/uploads/videos/` — они **не попадают в
git** (см. `.gitignore`), поэтому при деплое через git не затираются.

## Как устроено

- **Стек:** Next.js 14 (App Router) · TypeScript · Tailwind CSS ·
  framer-motion · Prisma + MySQL · файловое хранилище для видео.
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
  uploads/videos/[file]/route.ts  # отдача загруженных видео с диска
  actions.ts                 # 'use server': login/logout/CRUD/upload (fs)
  layout.tsx, globals.css
components/
  VideoFeed.tsx, CategoryNav.tsx
  MenuItemForm.tsx, UploadForm.tsx, LoginForm.tsx
hooks/use-action-queue.ts
lib/data.ts, lib/demo-data.ts, lib/db.ts
prisma/schema.prisma         # MySQL, binaryTargets для CloudLinux
public/uploads/videos/       # сюда пишутся загруженные видео
middleware.ts
```

## Скрипты

- `npm run dev` — режим разработки
- `npm run build` / `npm start` — продакшен-сборка / запуск
- `npm run lint` — ESLint
