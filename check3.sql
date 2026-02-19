SELECT p.slug, string_agg(t.locale, ', ' ORDER BY t.locale) as locales
FROM "ColoringPage" p
JOIN "ColoringPageTranslation" t ON t."pageId"=p.id
GROUP BY p.slug
ORDER BY count(t.locale) DESC
LIMIT 5;
