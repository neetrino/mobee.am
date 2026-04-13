# Где в проекте используются фотографии

---

## Простыми словами: откуда на сайте берутся картинки

**В папке проекта фото товаров нигде не лежат.** В коде и в репозитории есть только **ссылки (URL)** на картинки.

Как это устроено:

1. **В базе данных** (таблицы `products` и `product_variants`) записаны не сами картинки, а **адреса** — например:  
   `https://images.pexels.com/...` или `https://твой-r2-bucket.r2.dev/products/123.jpg`.

2. **Страница сайта** при загрузке читает из базы эти адреса и подставляет их в тег `<img src="...">`.

3. **Браузер** по этому адресу идёт в интернет и запрашивает картинку:
   - если адрес ведёт на **чужой сайт** (Pexels, Unsplash, placeholder.com) — картинку отдаёт тот сайт;
   - если адрес ведёт в **твой R2** — картинку отдаёт Cloudflare R2.

То есть **сами фото «есть» там, куда указывает ссылка**: на стороннем сервере или в твоём R2. В проекте (в папках типа `public/`, `src/`) лежат только код и, при желании, свои статичные картинки (логотипы и т.п.), но **не** загруженные фото товаров. Поэтому ты не находишь их в проекте — их там и нет, есть только ссылки в базе.

---

Чтобы удалить лишние изображения из репозитория или понять, что можно безопасно чистить.

---

## 1. Хранение и загрузка

| Место | Назначение |
|-------|------------|
| **Cloudflare R2** | Все загружаемые фото товаров и атрибутов сохраняются в R2 (ключи `products/YYYYMMDD-xxx.jpg`). URL возвращает API после загрузки. |
| **API** | `POST /api/v1/admin/products/upload-images` — принимает base64, заливает в R2, возвращает `urls: string[]`. |
| **Клиент** | Админка: добавление товара → выбор файлов → сжатие в браузере (browser-image-compression) → отправка base64 в API → в форму подставляются уже R2 URL. |

В коде **нет** сохранения файлов в `public/` или на диск сервера. Старые данные в БД могут содержать base64 или внешние URL (Unsplash и т.д.) — это только в полях `media` / `imageUrl`, не в файловой системе проекта.

---

## 2. Где отображаются изображения (по приложению)

### Публичное приложение (магазин)

| Файл | Что показывает |
|------|----------------|
| `src/components/ProductCard/ProductCardImage.tsx` | Карточка товара: главное фото или плейсхолдер. |
| `src/components/ProductCard/ProductCardGrid.tsx` | Сетка карточек. |
| `src/components/ProductCard/ProductCardList.tsx` | Список карточек. |
| `src/components/RelatedProducts/RelatedProductCard.tsx` | Похожие товары. |
| `src/app/products/[slug]/ProductImageGallery.tsx` | Галерея на странице товара (основное фото + миниатюры). |
| `src/app/products/[slug]/layout.tsx` | OG/Twitter image из `product.media[0]`. |
| `src/components/ColorFilter.tsx` | Цвета фильтра: `imageUrl` у значения атрибута. |
| `src/app/products/[slug]/ProductAttributesSelector.tsx` | Варианты (цвет/размер и др.): `imageUrl` у опций. |
| `src/app/cart/cart-components.tsx` | Корзина: изображение товара. |
| `src/app/checkout/CheckoutForm.tsx` | Чекаут: логотипы способов оплаты. |
| `src/app/profile/OrderDetailsModal.tsx` | Детали заказа: фото позиций и опций. |
| `src/app/orders/[number]/components/OrderItem.tsx` | Страница заказа: фото позиций и опций. |
| `src/components/Footer.tsx` | Подвал (иконки и т.д.). |
| `src/components/HeroCarousel.tsx` | Главная: слайдер (внешние URL, не из БД). |
| `src/components/FeaturesSection.tsx` | Блок фич (картинки). |
| `src/components/CategoryNavigation/*` | Иконки категорий. |
| `src/components/TopCategories.tsx` | Топ категории: фото товара. |
| `src/components/CategoryGrid.tsx` | Сетка категорий: фото товара. |
| `src/components/FeaturedProductsTabs.tsx` | Вкладки «Featured»: данные о товарах (фото через карточки). |
| `src/components/UserAvatar.tsx` | Аватар пользователя. |
| `src/components/LanguageSwitcherHeader.tsx` | Флаги (внешняя ссылка). |

### Админка

| Файл | Что показывает |
|------|----------------|
| `src/app/admin/products/add/components/ProductImages.tsx` | Превью загруженных фото товара. |
| `src/app/admin/products/add/components/VariantBuilder.tsx` | Фото вариантов и значений атрибутов. |
| `src/app/admin/products/add/components/ValueSelectionModal.tsx` | Выбор значения: `imageUrl`. |
| `src/app/admin/products/add/components/AttributesSelection.tsx` | Превью выбранного значения с картинкой. |
| `src/app/admin/products/components/ProductsTable.tsx` | Таблица товаров: миниатюра. |
| `src/app/admin/attributes/AttributesPageContent.tsx` | Значения атрибутов: `value.imageUrl`. |
| `src/app/admin/attributes/ValueEditForm.tsx` | Редактирование значения: картинка. |
| `src/app/admin/orders/components/OrderDetailsItems.tsx` | Товары в заказе: фото. |
| `src/app/admin/analytics/components/TopProducts.tsx` | Топ товаров: картинка. |
| `src/app/admin/quick-settings/components/ProductDiscountsCard.tsx` | Скидки: картинка. |
| `src/app/admin/components/TopProductsCard.tsx` | Карточка топ товаров. |

### Утилиты и типы

| Файл | Роль |
|------|------|
| `src/lib/utils/image-utils.ts` | Очистка URL, разделение main/variant, `processImageUrl`, `cleanImageUrls`. |
| `src/lib/utils/extractMediaUrl.ts` | Достаёт один URL из `media` (строка или объект с url/src). |
| `src/lib/services/products-slug/product-transformer.ts` | Преобразование `product.media` и вариантов. |
| `src/lib/services/admin/admin-products-create.service.ts` | Сохранение `media` и вариантов при создании товара. |
| `src/lib/services/admin/admin-products-update/*` | Обновление медиа и вариантов. |

---

## 3. Что можно удалить в самом проекте

- В репозитории **нет** папки с загруженными фото пользователей (всё в R2).
- Статические картинки только в:
  - **`public/`** — если есть (проверь вручную): иконки, логотипы, плейсхолдеры. Их можно заменить на SVG или ссылки на R2/CDN.
  - **Внешние URL** в коде (HeroCarousel, флаги и т.д.) — не файлы проекта.
- Чтобы не показывать «битую» картинку при отсутствии или ошибке загрузки фото товара, везде используется **плейсхолдер** (`ProductImagePlaceholder` или текст «No image»).

Итог: удалять в проекте можно только статику в `public/` и неиспользуемые ассеты; данные о фото хранятся в БД (URL) и в R2 (файлы).

---

## 4. Где в базе лежат фото товаров (чтобы удалить или заменить)

Все картинки товаров на сайте берутся **только из базы** — из двух мест.

### Таблица `products` (главные фото товара)

- **Колонка:** `media` (тип `Json[]`).
- **Что там:** массив URL или объектов вида `{ "url": "https://..." }`. Иногда в старых данных — base64-строка `data:image/...`.
- **Откуда берётся:** раньше подставлялись внешние URL (placeholder.com, unsplash, pexels и т.п.) или base64; сейчас загрузка через админку пишет сюда URL из R2.

### Таблица `product_variants` (фото варианта: цвет/размер)

- **Колонка:** `imageUrl` (тип `String`, может быть `null`).
- **Что там:** один URL или несколько через запятую.
- **Откуда берётся:** то же — либо старые внешние/placeholder URL, либо R2 после загрузки.

Товары вроде "sxa", "xasx", "sass", "xsdac" с одной и той же картинкой (мужчина за ноутбуком) — это один и тот же URL, записанный в `products.media` или в `product_variants.imageUrl` у этих товаров. Сами файлы нигде в проекте не лежат: это либо внешний сервис (placeholder/unsplash), либо R2.

### Как посмотреть, что именно записано

1. **Prisma Studio:**  
   `pnpm run db:studio` → открыть таблицы `products` и `product_variants`, посмотреть поля `media` и `imageUrl`.
2. **SQL (например в Neon):**
   - Главные фото:  
     `SELECT id, media FROM products WHERE media != '[]'::jsonb;`
   - Фото вариантов:  
     `SELECT id, "productId", "imageUrl" FROM product_variants WHERE "imageUrl" IS NOT NULL;`

### Как удалить эти фото (чтобы показывалась иконка-плейсхолдер)

- **У конкретного товара убрать все главные фото:**  
  обновить запись в `products`: выставить `media = []` (пустой массив).
- **У вариантов убрать фото:**  
  обновить в `product_variants`: выставить `imageUrl = null` для нужных вариантов.

Через Prisma Studio можно отредактировать эти поля вручную.

**Готовый скрипт в проекте:** из корня репозитория можно вызвать:

- Один товар по slug (англ.):  
  `node scripts/clear-product-photos.js sxa`  
  — очистит `media` и `imageUrl` у товара с slug `sxa` (и у всех его вариантов).
- Все товары (осторожно):  
  `node scripts/clear-product-photos.js --all`  
  — обнулит главные фото и фото вариантов у всех товаров.

После очистки на сайте для этих товаров будет показываться иконка-плейсхолдер вместо картинки.
