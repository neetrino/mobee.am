Все данные собраны. Вот полный аудит-отчёт.

---

# ТЕХНИЧЕСКИЙ АУДИТ: whiteshop.am (E-commerce)

**Стек проекта:**
- Frontend: Next.js 16 (App Router), React 18, Tailwind CSS 3.4
- Backend: Next.js API Routes (53 эндпоинта)
- Database: PostgreSQL (Neon), Prisma ORM 5.9
- Auth: Custom JWT (bcryptjs + jsonwebtoken)
- Infra: Vercel (standalone), pnpm monorepo
- Storage: Cloudflare R2 (configured), Meilisearch (search), Upstash Redis (cache)

---

## 1) АРХИТЕКТУРА И СТРУКТУРА

### P1-ARCH-01 — In-memory фильтрация и пагинация вместо DB-level

- **Severity:** P1
- **Область:** backend / db
- **Что не так:** `products-find.service.ts` загружает `limit * 10` продуктов из БД, фильтрует в памяти (по цене, цвету, размеру, бренду), затем `slice(0, limit)`. Реальная пагинация не работает — `page` параметр игнорируется.

```27:29:src/lib/services/products-find.service.ts
    const total = filteredProducts.length;
    const paginatedProducts = filteredProducts.slice(0, limit);
```

- **Почему плохо:** При 10 000+ товаров: (а) загружается 240 продуктов вместо 24, (б) страница 2+ не работает, (в) O(N) на каждый запрос, (г) RAM spike при конкурентных запросах.
- **Как исправить:** Перенести фильтрацию в WHERE/HAVING на уровне Prisma. Использовать `skip/take` для пагинации. Для сложных фильтров — materialized views или Meilisearch.

### P1-ARCH-02 — 150+ файлов с 'use client' — серверные компоненты не используются

- **Severity:** P1
- **Область:** frontend / architecture
- **Что не так:** Более 150 компонентов помечены `'use client'`, включая страницы `about`, `delivery`, `contact`, `cookies`, которые полностью статические.
- **Почему плохо:** Весь React-код уходит в JS-бандл клиенту. Нет выигрыша от Server Components — главного преимущества App Router. Увеличивает TTI, LCP, bundle size.
- **Как исправить:** Провести аудит каждого `'use client'`. Статические страницы — server components. Интерактивные части — выносить в отдельные client-обёртки.

### P2-ARCH-03 — Отсутствие `error.tsx` и `loading.tsx` в route-ах

- **Severity:** P2
- **Область:** frontend
- **Что не так:** Ни в одном маршруте нет `error.tsx` или `loading.tsx`. Нет ErrorBoundary компонента.
- **Почему плохо:** При ошибке API или рендера — пользователь видит белый экран или неуправляемый crash. Нет graceful degradation.
- **Как исправить:** Добавить `error.tsx` минимум в корень `/app`, `/app/products`, `/app/checkout`, `/app/admin`. Добавить `loading.tsx` для тяжёлых страниц.

### P2-ARCH-04 — Документация проекта практически отсутствует

- **Severity:** P2
- **Область:** process
- **Что не так:** Из 9 требуемых файлов в `docs/` существует только `BRIEF.md` (пустой шаблон). Нет `ARCHITECTURE.md`, `TECH_CARD.md`, `DECISIONS.md`, `PROGRESS.md`.
- **Почему плохо:** Невозможно онбордить нового разработчика. Архитектурные решения не зафиксированы.
- **Как исправить:** Заполнить документацию по существующим шаблонам в `reference/templates/`.

---

## 2) БЕЗОПАСНОСТЬ

### P0-SEC-01 — Нет глобального Next.js Middleware — маршруты не защищены

- **Severity:** P0
- **Область:** security / auth
- **Что не так:** Нет файла `middleware.ts` в корне проекта. Аутентификация вызывается вручную в каждом API route через `import { authenticateToken }`. Если разработчик забудет вызвать `authenticateToken` в новом route — он будет полностью открыт.
- **Почему плохо:** Одна забытая строка = открытый API endpoint. Нет centralised enforcement. Admin panel может быть доступна без проверки.
- **Как исправить:** Создать `middleware.ts` с matcher-ом для `/api/v1/admin/*`, `/api/v1/orders/*`, `/api/v1/cart/*`, `/api/v1/users/*`. Проверять JWT централизованно.

### P0-SEC-02 — XSS через `dangerouslySetInnerHTML` без санитизации

- **Severity:** P0
- **Область:** security / frontend
- **Что не так:** Минимум 3 места используют `dangerouslySetInnerHTML` с данными из БД без санитизации:

```62:62:src/app/products/[slug]/ProductInfo.tsx
     dangerouslySetInnerHTML={{ __html: getProductText(language, product.id, 'longDescription') || product.description || '' }} />
```

- **Почему плохо:** Если admin добавит `<script>` в описание продукта (или через SQL injection, или compromised admin) — XSS для всех посетителей. Могут украсть JWT из localStorage, сессии, данные карт.
- **Как исправить:** Установить `dompurify` (или `isomorphic-dompurify` для SSR). Санитизировать HTML перед рендером: `dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }}`.

### P0-SEC-03 — Нет rate limiting на auth endpoints

- **Severity:** P0
- **Область:** security / backend
- **Что не так:** Эндпоинты `/api/v1/auth/login` и `/api/v1/auth/register` не имеют rate limiting. Нет ни одной реализации rate limiting во всём проекте.
- **Почему плохо:** Brute-force атака на пароли. Credential stuffing. Массовая регистрация ботов. Один IP может делать 1000 login-ов/сек.
- **Как исправить:** Использовать `@upstash/ratelimit` (Redis уже подключён) с лимитом 5-10 попыток/мин на IP для auth, 30-60 req/min для остальных API.

### P0-SEC-04 — Shipping amount принимается от клиента без серверной валидации

- **Severity:** P0
- **Область:** security / business logic
- **Что не так:** В `orders.service.ts:322`:

```322:322:src/lib/services/orders.service.ts
      const shippingAmount = providedShippingAmount !== undefined ? Number(providedShippingAmount) : 0;
```

Стоимость доставки приходит из frontend request body и используется напрямую для создания заказа.

- **Почему плохо:** Злоумышленник может отправить `shippingAmount: 0` или `shippingAmount: -50000` и получить товар бесплатно/со скидкой. Прямая финансовая потеря.
- **Как исправить:** Рассчитывать `shippingAmount` на сервере по `shippingMethod` и адресу. Клиент может отправлять только `shippingMethod` и адрес, сумму определяет backend.

### P0-SEC-05 — Race condition при списании стока — возможен отрицательный stock

- **Severity:** P0
- **Область:** security / db / business logic
- **Что не так:** В `orders.service.ts` проверка стока и его декремент — два отдельных запроса внутри транзакции, но **без `SELECT ... FOR UPDATE`** или `@db.Check` constraint:

```383:427:src/lib/services/orders.service.ts
// Сначала SELECT
const variantBefore = await tx.productVariant.findUnique({...});
// Потом UPDATE
await tx.productVariant.update({ data: { stock: { decrement: item.quantity } } });
```

Нет DB-level CHECK constraint `stock >= 0`.

- **Почему плохо:** При двух одновременных checkout-ах на один товар с stock=1 — оба пройдут. Stock станет -1. Продано 2 единицы вместо 1. Потеря денег, разочарование клиента.
- **Как исправить:** (1) Добавить raw SQL: `ALTER TABLE product_variants ADD CONSTRAINT stock_non_negative CHECK (stock >= 0)`. (2) Использовать `UPDATE ... SET stock = stock - $1 WHERE stock >= $1 RETURNING stock` для атомарного декремента. (3) Prisma: `$executeRaw` с conditional update.

### P1-SEC-06 — JWT токен живёт 7 дней без refresh механизма

- **Severity:** P1
- **Область:** security / auth
- **Что не так:** JWT expiration = `7d` (default), единственный токен, нет refresh token:

```144:144:src/lib/services/auth.service.ts
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" } as jwt.SignOptions
```

- **Почему плохо:** При компрометации токена (XSS, man-in-the-middle) — 7 дней полного доступа. Нет способа revoke конкретный токен. Blocked user продолжает работать до истечения JWT.
- **Как исправить:** Access token: 15min. Refresh token: 7d (в httpOnly cookie). При блокировке — revoke refresh token. Добавить `jti` claim для отзыва.

### P1-SEC-07 — Нет security headers (CSP, X-Frame-Options, HSTS и т.д.)

- **Severity:** P1
- **Область:** security / infra
- **Что не так:** Ни в `next.config.js`, ни в middleware не настроены security headers.
- **Почему плохо:** Clickjacking (X-Frame-Options), MIME-sniffing (X-Content-Type-Options), нет CSP для XSS-защиты, нет HSTS.
- **Как исправить:** Добавить `headers()` в `next.config.js` с CSP, HSTS, X-Frame-Options: DENY, X-Content-Type-Options: nosniff.

### P1-SEC-08 — Пароль хешируется bcrypt вместо argon2id

- **Severity:** P1
- **Область:** security
- **Что не так:** `bcrypt.hash(data.password, 10)` — bcryptjs, 10 rounds.
- **Почему плохо:** OWASP рекомендует argon2id. bcrypt ограничен 72 байтами. Cost factor 10 — слишком низкий для 2026 года.
- **Как исправить:** Заменить на `argon2.hash(password, { type: argon2.argon2id })`. При логине — проверять оба алгоритма, rehash при следующем входе.

### P1-SEC-09 — Нет CORS configuration

- **Severity:** P1
- **Область:** security
- **Что не так:** API routes не имеют настроенных CORS headers.
- **Почему плохо:** Любой сайт может делать запросы к API от имени залогиненного пользователя (если cookies используются).
- **Как исправить:** Добавить CORS middleware с whitelist доменов.

### P1-SEC-10 — Нет CSRF protection на state-changing API routes

- **Severity:** P1
- **Область:** security
- **Что не так:** POST/PUT/DELETE endpoints не проверяют CSRF token.
- **Почему плохо:** Cross-site request forgery на checkout, изменение профиля, admin операции.
- **Как исправить:** Добавить CSRF token validation для state-changing operations.

---

## 3) ПРОИЗВОДИТЕЛЬНОСТЬ

### P0-PERF-01 — N+1 query в cart service

- **Severity:** P0
- **Область:** backend / db
- **Что не так:** `cart.service.ts:87-176` — для каждого item в корзине делается отдельный `db.product.findUnique`:

```87:102:src/lib/services/cart.service.ts
    const itemsWithDetails = await Promise.all(
      cart.items.map(async (item: {...}) => {
        const product = await db.product.findUnique({
          where: { id: item.productId },
          include: {
            translations: true,
            variants: {
              where: { id: item.variantId },
            },
          },
        });
```

При этом корзина уже загружается с `include: { items: { include: { variant, product } } }` — данные уже есть, но не используются!

- **Почему плохо:** 10 товаров в корзине = 10 лишних SQL запросов на каждый просмотр корзины. При 1000 concurrent users = 10000 лишних запросов.
- **Как исправить:** Использовать уже загруженные данные из initial query, или batch fetch через `findMany({ where: { id: { in: productIds } } })`.

### P1-PERF-02 — N+1 query в guest checkout

- **Severity:** P1
- **Область:** backend / db
- **Что не так:** `orders.service.ts:225-299` — для каждого guest cart item отдельный `findUnique`.
- **Как исправить:** `findMany` с `where: { id: { in: variantIds } }`.

### P1-PERF-03 — Нет connection pool configuration для Neon serverless

- **Severity:** P1
- **Область:** db / infra
- **Что не так:** PrismaClient создаётся без `connection_limit` или `pool_timeout`:

```19:24:shared/db/client.ts
export const db =
  globalForPrisma.prisma ??
  new PrismaClient({ 
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
    errorFormat: "pretty",
  });
```

Нет `directUrl` в schema.prisma (нужен для Neon).

- **Почему плохо:** Serverless = каждый invocation может создать новое соединение. Neon имеет лимиты. Без pool config — connection exhaustion при нагрузке.
- **Как исправить:** Добавить в schema.prisma: `directUrl = env("DIRECT_URL")`. В DATABASE_URL добавить `?pgbouncer=true&connection_limit=5&pool_timeout=10`.

### P2-PERF-04 — console.log в production (50+ мест)

- **Severity:** P2
- **Область:** backend / performance
- **Что не так:** `auth.service.ts` содержит 15+ console.log с emoji. Аналогично в `cart.service.ts`, `Header.tsx`, `AuthContext.tsx` и десятках других файлов. Существует `logger.ts`, но используется не везде.
- **Почему плохо:** console.log синхронный. На Vercel — лишний traffic в лог-стрим. Утечка чувствительных данных (userId, email в логах).
- **Как исправить:** Заменить все `console.*` на `logger` из `src/lib/utils/logger.ts`. Добавить ESLint rule `no-console: error`.

---

## 4) НАДЁЖНОСТЬ И МАСШТАБИРУЕМОСТЬ

### P0-REL-01 — Order number generation через Math.random() — коллизии

- **Severity:** P0
- **Область:** backend / business logic
- **Что не так:**

```55:62:src/lib/services/orders.service.ts
function generateOrderNumber(): string {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const random = String(Math.floor(Math.random() * 10000)).padStart(5, "0");
  return `${year}${month}${day}-${random}`;
}
```

10,000 возможных номеров в день. `Math.random()` не криптографически стойкий.

- **Почему плохо:** При 100 заказах/день — вероятность коллизии ~40% (birthday paradox). При коллизии — P2002 ошибка, заказ теряется. При 1000 заказах/день — коллизия практически гарантирована.
- **Как исправить:** Использовать DB sequence или UUID. Или `crypto.randomUUID()` + DB UNIQUE constraint с retry. Или nanoid с 21 символом.

### P1-REL-02 — Нет transaction timeout configuration

- **Severity:** P1
- **Область:** db
- **Что не так:** Транзакция в checkout не имеет timeout. Если один из запросов зависнет — соединение заблокировано бесконечно.
- **Как исправить:** `db.$transaction(fn, { timeout: 10000, maxWait: 5000 })`.

### P1-REL-03 — Нет health check endpoint

- **Severity:** P1
- **Область:** infra / reliability
- **Что не так:** Нет `/api/health` или `/api/v1/health` endpoint для мониторинга.
- **Почему плохо:** Невозможно отличить app crash от сетевой проблемы. Load balancer не может определить здоровье инстанса.
- **Как исправить:** Добавить `/api/health` с проверкой DB connectivity, Redis connectivity.

---

## 5) КАЧЕСТВО КОДА

### P1-CODE-01 — `as any` в production коде

- **Severity:** P1
- **Область:** code quality
- **Что не так:** `shared/db/client.ts:3`: `const globalForPrisma = globalThis as any;`. В `cart.service.ts:114-117`: `(firstMedia as any)?.url`.
- **Как исправить:** Типизировать: `const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }`. Для media — создать union type.

### P1-CODE-02 — Error objects thrown как plain objects, не Error instances

- **Severity:** P1
- **Область:** code quality / error handling
- **Что не так:** Повсеместно:
```typescript
throw {
  status: 400,
  type: "https://api.shop.am/problems/validation-error",
  title: "Validation failed",
  detail: "...",
};
```
- **Почему плохо:** Нет stack trace. `instanceof Error` не работает. Нельзя использовать с Error monitoring (Sentry). Type-unsafe catch.
- **Как исправить:** Создать `AppError extends Error` с полями `status`, `type`, `title`, `detail`. Использовать `throw new AppError(...)`.

### P2-CODE-03 — Дублирование кода media extraction

- **Severity:** P2
- **Область:** code quality
- **Что не так:** Логика извлечения imageUrl из media JSON дублируется в `cart.service.ts`, `orders.service.ts` (2 раза), и других сервисах. Один и тот же if/else блок 5+ раз.
- **Как исправить:** Создать `extractMediaUrl(media: Json[])` utility.

### P2-CODE-04 — TODO в бизнес-критичном коде

- **Severity:** P2
- **Область:** code quality
- **Что не так:** В `orders.service.ts`: `// TODO: Implement discount/coupon logic`, `// TODO: Calculate tax if needed`, `// TODO: Generate payment URL for Idram/ArCa`.
- **Почему плохо:** Заказ создаётся без расчёта налога и без реального payment URL. Скидки не работают.
- **Как исправить:** Создать issues в GitHub для каждого TODO. Блокирующие (payment) — исправить до launch.

---

## 6) ИНФРАСТРУКТУРА И КОНФИГУРАЦИЯ

### P1-INFRA-01 — Нет `directUrl` в Prisma schema для Neon

- **Severity:** P1
- **Область:** infra / db
- **Что не так:** В `schema.prisma` нет `directUrl = env("DIRECT_URL")`. В `.env.example` `DIRECT_URL` указан, но schema его не использует.
- **Почему плохо:** Миграции через pgbouncer (pooled URL) могут сломаться. Neon требует direct connection для DDL.
- **Как исправить:** Добавить `directUrl = env("DIRECT_URL")` в `datasource db {}`.

### P1-INFRA-02 — Нет Sentry / Error Monitoring

- **Severity:** P1
- **Область:** infra / observability
- **Что не так:** `SENTRY_DSN` в `.env.example` закомментирован. Нет интеграции с каким-либо error monitoring.
- **Почему плохо:** Ошибки в production невидимы. Нет alerting. Проблемы обнаруживаются только по жалобам пользователей.
- **Как исправить:** Установить `@sentry/nextjs`, настроить DSN, добавить в `instrumentation.ts`.

### P2-INFRA-03 — Нет Docker файлов для локальной разработки

- **Severity:** P2
- **Область:** infra / DX
- **Что не так:** Нет `docker-compose.yml` для локальных сервисов (Meilisearch, Redis).
- **Как исправить:** Создать `docker-compose.yml` с Meilisearch и Redis.

---

## 7) РАБОТА С БАЗОЙ ДАННЫХ

### P1-DB-01 — Отсутствуют индексы на 9 foreign key колонках

- **Severity:** P1
- **Область:** db / performance
- **Что не так:** FK без индексов:
  - `addresses.userId`
  - `cart_items.cartId`
  - `cart_items.variantId`
  - `cart_items.productId`
  - `order_items.orderId`
  - `order_items.variantId`
  - `payments.orderId`
  - `order_events.orderId`
  - `product_labels.productId`
- **Почему плохо:** JOIN и WHERE по FK без индекса = full table scan. Загрузка заказа с items, загрузка корзины, платежей — всё будет деградировать с ростом данных.
- **Как исправить:** Добавить `@@index([fieldName])` для каждого FK.

### P1-DB-02 — Float для денежных сумм вместо Decimal

- **Severity:** P1
- **Область:** db / business logic
- **Что не так:** Все money-поля в schema — `Float`:

```256:258:shared/db/prisma/schema.prisma
  price          Float
  compareAtPrice Float?
  cost           Float?
```

Аналогично `Order.subtotal`, `Order.total`, `Payment.amount` и т.д.

- **Почему плохо:** Floating point arithmetic: `0.1 + 0.2 = 0.30000000000000004`. При тысячах заказов — накопительная ошибка округления. Может привести к расхождениям в бухгалтерии.
- **Как исправить:** Заменить на `Decimal` (`@db.Decimal(10, 2)`) или хранить в минимальных единицах (копейках/драмах) как `Int`.

### P2-DB-03 — Нет soft-delete для заказов и продуктов

- **Severity:** P2
- **Область:** db
- **Что не так:** У `User` есть `deletedAt`, но у `Order` и `Product` (хотя у Product есть `deletedAt`, у Order — нет). Удаление заказа — необратимо.
- **Как исправить:** Добавить `deletedAt` к Order, никогда не удалять заказы physical delete.

---

## 8) API И БИЗНЕС-ЛОГИКА

### P0-API-01 — Checkout не валидирует цены на сервере

- **Severity:** P0
- **Область:** business logic / security
- **Что не так:** В `orders.service.ts:200-204` для user cart используется `item.priceSnapshot` (цена, сохранённая при добавлении в корзину):

```200:204:src/lib/services/orders.service.ts
            const cartItem = {
              ...
              price: Number(item.priceSnapshot),
```

Для guest checkout — `variant.price` берётся из БД. Но `priceSnapshot` может устареть если цена товара изменилась.

- **Почему плохо:** Пользователь добавил товар за 1000 AMD, admin повысил цену до 5000 AMD, пользователь checkout-ит по старой цене. Финансовые потери.
- **Как исправить:** Всегда сверять `priceSnapshot` с текущей `variant.price` при checkout. Если цена изменилась — уведомлять пользователя.

### P1-API-02 — Inconsistent input validation

- **Severity:** P1
- **Область:** backend / api
- **Что не так:** Часть routes используют Zod (`checkout/utils/validation-schema.ts`), часть — ручную валидацию, часть — без валидации (`/api/v1/auth/login` передаёт `req.json()` напрямую в сервис).
- **Как исправить:** Стандартизировать: все API routes валидируют входные данные через Zod schema перед вызовом сервиса.

### P1-API-03 — Нет пагинации в admin order list

- **Severity:** P1
- **Область:** backend
- **Что не так:** `orders.service.ts:546-553` — `findMany` без `take/skip`:
```546:553:src/lib/services/orders.service.ts
    const orders = await db.order.findMany({
      where: { userId },
      include: {
        items: true,
        payments: true,
      },
      orderBy: { createdAt: "desc" },
    });
```
- **Почему плохо:** Загружает ВСЕ заказы со ВСЕМИ items и payments. При 10000 заказах — OOM или timeout.
- **Как исправить:** Добавить `take: 20, skip: (page - 1) * 20`.

---

## 9) FRONTEND UX / PERFORMANCE

### P1-FE-01 — Нет `generateMetadata` для product pages

- **Severity:** P1
- **Область:** frontend / SEO
- **Что не так:** Динамические страницы (`/products/[slug]`) не имеют `generateMetadata`. Все страницы показывают одинаковый title: "Shop - Professional E-commerce".
- **Почему плохо:** Катастрофа для SEO. Google видит одинаковый title для всех продуктов. Нет OG-тегов для social sharing.
- **Как исправить:** Добавить `generateMetadata` в `products/[slug]/page.tsx` с title, description, OG image из данных продукта.

### P1-FE-02 — Raw `<img>` без `next/image` и с пустым `alt`

- **Severity:** P1
- **Область:** frontend / performance / accessibility
- **Что не так:** `ProductImageGallery.tsx` использует `<img>` вместо `<Image>`, с `alt=""`.
- **Почему плохо:** Нет lazy loading, нет оптимизации размера, нет WebP/AVIF. Accessibility violation (WCAG 2.1).
- **Как исправить:** Заменить на `next/image` с descriptive alt.

### P2-FE-03 — Metadata шаблонная, не кастомизирована

- **Severity:** P2
- **Область:** frontend / SEO
- **Что не так:** Root layout metadata:
```13:16:src/app/layout.tsx
export const metadata: Metadata = {
  title: 'Shop - Professional E-commerce',
  description: 'Modern e-commerce platform',
};
```
- **Как исправить:** Указать реальное название магазина, описание бизнеса, OG image, favicon.

---

## 10) DEVOPS И ОКРУЖЕНИЯ

### P1-DEVOPS-01 — Build зависит от доступности БД (миграции при build)

- **Severity:** P1
- **Область:** devops / CI
- **Что не так:** В `package.json`: `"build": "pnpm run prebuild:migrate && next build"` — запускает `prisma migrate deploy` при каждом build.
- **Почему плохо:** Если DB недоступна — build падает. Миграция при build = side effect в CI. Нарушает принцип идемпотентности build.
- **Как исправить:** Разделить: миграции — отдельный step в CI (до build). Build — только `prisma generate && next build`.

### P1-DEVOPS-02 — Нет CI/CD pipeline

- **Severity:** P1
- **Область:** devops
- **Что не так:** Есть `dependabot.yml` и `PULL_REQUEST_TEMPLATE.md`, но нет GitHub Actions workflow для lint, test, build.
- **Почему плохо:** Нет автоматических проверок при PR. Ломающий код может попасть в main/dev.
- **Как исправить:** Создать `.github/workflows/ci.yml` с шагами: install, lint, typecheck, test, build.

### P2-DEVOPS-03 — Нет pre-commit hooks

- **Severity:** P2
- **Область:** devops / DX
- **Что не так:** `commitlint` настроен, но нет `husky` или `lint-staged` для pre-commit проверок.
- **Как исправить:** Добавить `husky` + `lint-staged` для lint и typecheck перед commit.

---

## ИТОГОВАЯ ОЦЕНКА

### Общая оценка: 4.5 / 10

Проект имеет работающую базовую функциональность e-commerce, но содержит критические проблемы безопасности и архитектуры, которые делают его непригодным для production с 100K пользователей в текущем виде.

### Главные риски:

1. **Финансовый риск** — shipping amount от клиента, race condition в стоке, устаревшие цены при checkout, Float вместо Decimal для денег
2. **Риск взлома** — нет rate limiting, XSS через dangerouslySetInnerHTML, нет CSP, JWT 7d без revocation
3. **Риск отказа** — in-memory пагинация, N+1 queries, нет connection pooling, order number коллизии
4. **Риск потери данных** — нет error monitoring, нет health checks, console.log вместо structured logging
5. **SEO риск** — нет generateMetadata, шаблонные meta-теги

### Топ-5 вещей для немедленного исправления:

| # | Проблема | Severity | Estimated effort |
|---|----------|----------|-----------------|
| 1 | **Серверная валидация shipping amount и цен при checkout** | P0 | 4h |
| 2 | **Global middleware.ts + rate limiting на auth** | P0 | 4h |
| 3 | **DB CHECK constraint на stock >= 0 + atomic decrement** | P0 | 2h |
| 4 | **DOMPurify для dangerouslySetInnerHTML** | P0 | 1h |
| 5 | **Заменить order number generation на UUID/nanoid** | P0 | 1h |