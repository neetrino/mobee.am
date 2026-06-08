-- Copy admin-managed Armenian titles from en into stale hy rows on the home strip.
UPDATE "category_translations" AS hy
SET
  "title" = en."title",
  "slug" = en."slug",
  "fullPath" = en."fullPath"
FROM "category_translations" AS en
INNER JOIN "categories" AS c ON c."id" = en."categoryId"
WHERE hy."categoryId" = en."categoryId"
  AND hy."locale" = 'hy'
  AND en."locale" = 'en'
  AND c."homeStripPosition" IS NOT NULL
  AND en."title" ~ '[Ա-Ֆա-ֆ]'
  AND hy."title" IS DISTINCT FROM en."title";
