-- Home strip categories: proper hy / en / ru titles (replace Armenian text stored under en).
CREATE TEMP TABLE home_strip_category_i18n_targets AS
SELECT DISTINCT
  c.id AS category_id,
  m.hy_title,
  m.hy_slug,
  m.en_title,
  m.en_slug,
  m.ru_title,
  m.ru_slug
FROM categories c
CROSS JOIN (
  VALUES
    ('Հեռուստացույց', 'herustatsuyts', 'TVs', 'tvs', 'Телевизоры', 'televizory'),
    ('Կենցաղային տեխնիկա', 'kencaxayin-texnika', 'Household Appliances', 'household-appliances', 'Бытовая техника', 'bytovaya-tekhnika'),
    ('Համակարգիչ', 'hamakargich', 'Computers', 'computers', 'Компьютеры', 'kompyutery'),
    ('Հեռախոս', 'herakhos', 'Phones', 'phones', 'Телефоны', 'telefony'),
    ('Պլանշետ', 'planshet', 'Tablets', 'tablets', 'Планшеты', 'planshety'),
    ('Ժամացույց', 'zhamatsuyts', 'Watches', 'watches', 'Часы', 'chasy'),
    ('Ականջակալ', 'akanjakal', 'Headphones', 'headphones', 'Наушники', 'naushniki'),
    ('Աքսեսուար', 'aksesuarner', 'Accessories', 'accessories', 'Аксессуары', 'aksessuary')
) AS m(hy_title, hy_slug, en_title, en_slug, ru_title, ru_slug)
WHERE c."homeStripPosition" IS NOT NULL
  AND c."deletedAt" IS NULL
  AND EXISTS (
    SELECT 1
    FROM category_translations ct
    WHERE ct."categoryId" = c.id
      AND ct.title = m.hy_title
  );

INSERT INTO category_translations (id, "categoryId", locale, title, slug, "fullPath")
SELECT
  substr(md5(t.category_id || ':hy'), 1, 25),
  t.category_id,
  'hy',
  t.hy_title,
  t.hy_slug,
  t.hy_slug
FROM home_strip_category_i18n_targets t
WHERE NOT EXISTS (
  SELECT 1
  FROM category_translations ct
  WHERE ct."categoryId" = t.category_id
    AND ct.locale = 'hy'
);

INSERT INTO category_translations (id, "categoryId", locale, title, slug, "fullPath")
SELECT
  substr(md5(t.category_id || ':ru'), 1, 25),
  t.category_id,
  'ru',
  t.ru_title,
  t.ru_slug,
  t.ru_slug
FROM home_strip_category_i18n_targets t
WHERE NOT EXISTS (
  SELECT 1
  FROM category_translations ct
  WHERE ct."categoryId" = t.category_id
    AND ct.locale = 'ru'
);

UPDATE category_translations AS ct
SET
  title = t.en_title,
  slug = t.en_slug,
  "fullPath" = t.en_slug
FROM home_strip_category_i18n_targets t
WHERE ct."categoryId" = t.category_id
  AND ct.locale = 'en';

UPDATE category_translations AS ct
SET
  title = t.ru_title,
  slug = t.ru_slug,
  "fullPath" = t.ru_slug
FROM home_strip_category_i18n_targets t
WHERE ct."categoryId" = t.category_id
  AND ct.locale = 'ru';

UPDATE category_translations AS ct
SET
  title = t.hy_title,
  slug = t.hy_slug,
  "fullPath" = t.hy_slug
FROM home_strip_category_i18n_targets t
WHERE ct."categoryId" = t.category_id
  AND ct.locale = 'hy';

DROP TABLE home_strip_category_i18n_targets;
