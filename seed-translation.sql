-- Insert a test Polish translation for piramida-na-pustyni-zssf
INSERT INTO "ColoringPageTranslation" (id, "pageId", locale, slug, title, description, "seoTitle", "seoDescription", "altText")
SELECT
  'test-tr-pl-001',
  p.id,
  'pl',
  'piramida-na-pustyni-zssf',
  'Piramida na pustyni',
  'Piękna kolorowanka przedstawiająca majestatyczną piramidę na rozległej pustyni. Idealna dla dzieci, które uwielbiają historię i przygody. Wydrukuj i pokoloruj tę wyjątkową scenę pełną tajemnic starożytnego Egiptu.',
  'Piramida na pustyni – kolorowanka',
  'Darmowa kolorowanka z piramidą na pustyni dla dzieci. Wydrukuj i pokoloruj!',
  'Kolorowanka piramida na pustyni'
FROM "ColoringPage" p WHERE p.slug = 'piramida-na-pustyni-zssf'
ON CONFLICT (id) DO NOTHING;

-- Insert an English translation too
INSERT INTO "ColoringPageTranslation" (id, "pageId", locale, slug, title, description, "seoTitle", "seoDescription", "altText")
SELECT
  'test-tr-en-001',
  p.id,
  'en',
  'piramida-na-pustyni-zssf',
  'Pyramid in the Desert',
  'A beautiful coloring page featuring a majestic pyramid in the vast desert. Perfect for children who love history and adventure. Print and color this unique scene full of ancient Egyptian mysteries.',
  'Pyramid in the Desert – Coloring Page',
  'Free pyramid in the desert coloring page for kids. Print and color!',
  'Coloring page pyramid in the desert'
FROM "ColoringPage" p WHERE p.slug = 'piramida-na-pustyni-zssf'
ON CONFLICT (id) DO NOTHING;

SELECT locale, slug, "seoTitle" FROM "ColoringPageTranslation";
