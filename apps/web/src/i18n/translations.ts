import type { Locale } from '@/i18n/config';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const translations: Record<string, Record<string, string | ((arg: any) => string)>> = {
  pl: {
    // Site
    'site.name': 'Kolorowanki',
    'site.tagline': 'Darmowe kolorowanki do druku dla dzieci',

    // Navigation
    'nav.home': 'Strona główna',
    'nav.pack': 'Moja paczka',
    'nav.categories': 'Kategorie',

    // Home page
    'home.title': 'Kolorowanki dla dzieci',
    'home.description': 'Darmowe kolorowanki do druku. Wybierz kategorię i pobierz ulubione obrazki.',
    'home.categories.heading': 'Kategorie',
    'home.featured.heading': 'Polecane kolorowanki',

    // Coloring detail
    'coloring.addToPack': 'Dodaj do paczki',
    'coloring.removeFromPack': 'Usuń z paczki',
    'coloring.download': 'Pobierz',
    'coloring.category': 'Kategoria',
    'coloring.tags': 'Tagi',
    'coloring.backToHome': '← Wróć do strony głównej',
    'coloring.inPack': 'W paczce',

    // Pack page
    'pack.title': 'Moja paczka',
    'pack.description': 'Twoje wybrane kolorowanki do pobrania.',
    'pack.empty': 'Twoja paczka jest pusta.',
    'pack.empty.cta': 'Przeglądaj kolorowanki',
    'pack.download': 'Pobierz paczkę',
    'pack.clear': 'Wyczyść paczkę',
    'pack.items': 'kolorowanki',
    'pack.item': 'kolorowanka',
    'pack.remove': 'Usuń',
    'pack.count': (n: number) => `${n} ${n === 1 ? 'kolorowanka' : n < 5 ? 'kolorowanki' : 'kolorowanek'}`,

    // Pack sidebar
    'sidebar.title': 'Paczka',
    'sidebar.viewPack': 'Zobacz paczkę',
    'sidebar.empty': 'Paczka jest pusta',

    // Categories
    'category.animals': 'Zwierzęta',
    'category.vehicles': 'Pojazdy',
    'category.nature': 'Przyroda',
    'category.fantasy': 'Fantazja',

    // Tag page
    'tag.heading': (name: string) => `Kolorowanki z tagiem: ${name}`,
    'tag.empty': 'Brak kolorowanek z tym tagiem.',
    'tag.backToHome': '← Wróć do strony głównej',

    // Related pages
    'coloring.related.similar': 'Podobne kolorowanki',
    'coloring.related.category': 'Więcej z tej kategorii',

    // Coloring fallback notice
    'coloring.fallbackNotice': 'Ta strona nie jest jeszcze dostępna w Twoim języku.',

    // Tag hub
    'tag.relatedTags': 'Powiązane tagi',
    'tag.seoDescription': (name: string | number) => `Przeglądaj darmowe kolorowanki z tagiem „${name}". Pobierz i wydrukuj ulubione obrazki.`,

    // Category hub
    'category.popularTags': 'Popularne w tej kategorii',
    'category.seoDescription': (name: string | number) => `Darmowe kolorowanki z kategorii „${name}". Pobierz i wydrukuj ulubione obrazki dla dzieci.`,

    // Pagination
    'pagination.prev': '← Poprzednia',
    'pagination.next': 'Następna →',
    'pagination.page': (n: string | number) => `Strona ${n}`,

    // Errors
    'error.notFound': 'Nie znaleziono strony',
    'error.backHome': 'Wróć do strony głównej',
  },
  es: {
    // Site
    'site.name': 'Páginas para Colorear',
    'site.tagline': 'Páginas para colorear gratis para niños',

    // Navigation
    'nav.home': 'Inicio',
    'nav.pack': 'Mi paquete',
    'nav.categories': 'Categorías',

    // Home page
    'home.title': 'Páginas para colorear para niños',
    'home.description': 'Páginas para colorear gratis para imprimir. Elige una categoría y descarga tus imágenes favoritas.',
    'home.categories.heading': 'Categorías',
    'home.featured.heading': 'Páginas destacadas',

    // Coloring detail
    'coloring.addToPack': 'Añadir al paquete',
    'coloring.removeFromPack': 'Quitar del paquete',
    'coloring.download': 'Descargar',
    'coloring.category': 'Categoría',
    'coloring.tags': 'Etiquetas',
    'coloring.backToHome': '← Volver al inicio',
    'coloring.inPack': 'En el paquete',

    // Pack page
    'pack.title': 'Mi paquete',
    'pack.description': 'Tus páginas para colorear seleccionadas para descargar.',
    'pack.empty': 'Tu paquete está vacío.',
    'pack.empty.cta': 'Explorar páginas para colorear',
    'pack.download': 'Descargar paquete',
    'pack.clear': 'Vaciar paquete',
    'pack.items': 'páginas para colorear',
    'pack.item': 'página para colorear',
    'pack.remove': 'Quitar',
    'pack.count': (n: number) => `${n} ${n === 1 ? 'página para colorear' : 'páginas para colorear'}`,

    // Pack sidebar
    'sidebar.title': 'Paquete',
    'sidebar.viewPack': 'Ver paquete',
    'sidebar.empty': 'El paquete está vacío',

    // Categories
    'category.animals': 'Animales',
    'category.vehicles': 'Vehículos',
    'category.nature': 'Naturaleza',
    'category.fantasy': 'Fantasía',

    // Tag page
    'tag.heading': (name: string) => `Páginas con etiqueta: ${name}`,
    'tag.empty': 'No hay páginas con esta etiqueta.',
    'tag.backToHome': '← Volver al inicio',

    // Related pages
    'coloring.related.similar': 'Páginas similares',
    'coloring.related.category': 'Más de esta categoría',

    // Coloring fallback notice
    'coloring.fallbackNotice': 'Esta página aún no está disponible en tu idioma.',

    // Tag hub
    'tag.relatedTags': 'Etiquetas relacionadas',
    'tag.seoDescription': (name: string | number) => `Explora páginas para colorear con la etiqueta "${name}". Descarga e imprime tus favoritas.`,

    // Category hub
    'category.popularTags': 'Popular en esta categoría',
    'category.seoDescription': (name: string | number) => `Páginas para colorear gratis de la categoría "${name}". Descarga e imprime para niños.`,

    // Pagination
    'pagination.prev': '← Anterior',
    'pagination.next': 'Siguiente →',
    'pagination.page': (n: string | number) => `Página ${n}`,

    // Errors
    'error.notFound': 'Página no encontrada',
    'error.backHome': 'Volver al inicio',
  },
  en: {
    // Site
    'site.name': 'Coloring Pages',
    'site.tagline': 'Free printable coloring pages for kids',

    // Navigation
    'nav.home': 'Home',
    'nav.pack': 'My Pack',
    'nav.categories': 'Categories',

    // Home page
    'home.title': 'Coloring Pages for Kids',
    'home.description': 'Free printable coloring pages. Choose a category and download your favorite pictures.',
    'home.categories.heading': 'Categories',
    'home.featured.heading': 'Featured Coloring Pages',

    // Coloring detail
    'coloring.addToPack': 'Add to Pack',
    'coloring.removeFromPack': 'Remove from Pack',
    'coloring.download': 'Download',
    'coloring.category': 'Category',
    'coloring.tags': 'Tags',
    'coloring.backToHome': '← Back to Home',
    'coloring.inPack': 'In Pack',

    // Pack page
    'pack.title': 'My Pack',
    'pack.description': 'Your selected coloring pages for download.',
    'pack.empty': 'Your pack is empty.',
    'pack.empty.cta': 'Browse coloring pages',
    'pack.download': 'Download Pack',
    'pack.clear': 'Clear Pack',
    'pack.items': 'coloring pages',
    'pack.item': 'coloring page',
    'pack.remove': 'Remove',
    'pack.count': (n: number) => `${n} ${n === 1 ? 'coloring page' : 'coloring pages'}`,

    // Pack sidebar
    'sidebar.title': 'Pack',
    'sidebar.viewPack': 'View Pack',
    'sidebar.empty': 'Pack is empty',

    // Categories
    'category.animals': 'Animals',
    'category.vehicles': 'Vehicles',
    'category.nature': 'Nature',
    'category.fantasy': 'Fantasy',

    // Tag page
    'tag.heading': (name: string) => `Coloring pages tagged: ${name}`,
    'tag.empty': 'No coloring pages found for this tag.',
    'tag.backToHome': '← Back to Home',

    // Related pages
    'coloring.related.similar': 'Similar coloring pages',
    'coloring.related.category': 'More from this category',

    // Coloring fallback notice
    'coloring.fallbackNotice': 'This page is not yet available in your language.',

    // Tag hub
    'tag.relatedTags': 'Related tags',
    'tag.seoDescription': (name: string | number) => `Browse free coloring pages tagged "${name}". Download and print your favorites.`,

    // Category hub
    'category.popularTags': 'Popular in this category',
    'category.seoDescription': (name: string | number) => `Free printable coloring pages in the "${name}" category. Download and print for kids.`,

    // Pagination
    'pagination.prev': '← Previous',
    'pagination.next': 'Next →',
    'pagination.page': (n: string | number) => `Page ${n}`,

    // Errors
    'error.notFound': 'Page not found',
    'error.backHome': 'Back to Home',
  },
};

type TranslationKey = string;

export function getTranslations(locale: Locale) {
  const dict = translations[locale] ?? translations['en'] ?? {};
  return function t(key: TranslationKey): string {
    const value = dict[key];
    if (typeof value === 'function') return '';
    return (value as string) ?? key;
  };
}

export function getTranslator(locale: Locale) {
  return translations[locale] ?? translations['en'] ?? {};
}

export type { TranslationKey };
export default translations;
