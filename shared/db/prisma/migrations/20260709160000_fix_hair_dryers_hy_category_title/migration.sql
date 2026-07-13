-- Fix Armenian hair-dryers category title: was Cyrillic "Фены" with Armenian Ֆ prefix.
UPDATE category_translations
SET title = 'Ֆեներ'
WHERE locale = 'hy'
  AND slug = 'hair-dryers'
  AND title IS DISTINCT FROM 'Ֆեներ';
