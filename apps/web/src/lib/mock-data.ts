import type { Category, ColoringPage } from '@/types';

export const mockCategories: Category[] = [
  {
    id: 'cat-1',
    slug: 'animals',
    name: { pl: 'Zwierzęta', en: 'Animals' },
    description: {
      pl: 'Kolorowanki ze zwierzętami – psy, koty, dzikie zwierzęta i wiele więcej.',
      en: 'Animal coloring pages – dogs, cats, wild animals and much more.',
    },
    imageUrl: '/images/categories/animals.svg',
  },
  {
    id: 'cat-2',
    slug: 'vehicles',
    name: { pl: 'Pojazdy', en: 'Vehicles' },
    description: {
      pl: 'Kolorowanki z pojazdami – samochody, pociągi, samoloty i statki.',
      en: 'Vehicle coloring pages – cars, trains, planes and ships.',
    },
    imageUrl: '/images/categories/vehicles.svg',
  },
  {
    id: 'cat-3',
    slug: 'nature',
    name: { pl: 'Przyroda', en: 'Nature' },
    description: {
      pl: 'Kolorowanki z przyrodą – kwiaty, drzewa, krajobrazy.',
      en: 'Nature coloring pages – flowers, trees, landscapes.',
    },
    imageUrl: '/images/categories/nature.svg',
  },
];

export const mockColoringPages: ColoringPage[] = [
  {
    id: 'col-1',
    slug: 'cute-dog',
    title: { pl: 'Słodki pies', en: 'Cute Dog' },
    description: {
      pl: 'Kolorowanka z uroczym psem siedzącym na trawie. Idealna dla najmłodszych.',
      en: 'A coloring page with an adorable dog sitting on the grass. Perfect for young children.',
    },
    categoryId: 'cat-1',
    categorySlug: 'animals',
    imageUrl: '/images/colorings/cute-dog.svg',
    thumbnailUrl: '/images/colorings/cute-dog-thumb.svg',
    tags: ['pies', 'dog', 'zwierzęta', 'animals', 'łatwe', 'easy'],
    createdAt: '2024-01-15T10:00:00Z',
  },
  {
    id: 'col-2',
    slug: 'jungle-cat',
    title: { pl: 'Kot dżungli', en: 'Jungle Cat' },
    description: {
      pl: 'Majestatyczny tygrys w dżungli. Kolorowanka dla starszych dzieci.',
      en: 'A majestic tiger in the jungle. Coloring page for older children.',
    },
    categoryId: 'cat-1',
    categorySlug: 'animals',
    imageUrl: '/images/colorings/jungle-cat.svg',
    thumbnailUrl: '/images/colorings/jungle-cat-thumb.svg',
    tags: ['tygrys', 'tiger', 'dżungla', 'jungle', 'dzikie', 'wild'],
    createdAt: '2024-01-20T10:00:00Z',
  },
  {
    id: 'col-3',
    slug: 'happy-elephant',
    title: { pl: 'Wesoły słoń', en: 'Happy Elephant' },
    description: {
      pl: 'Uśmiechnięty słoń z dużymi uszami. Świetna kolorowanka dla dzieci.',
      en: 'A smiling elephant with big ears. A great coloring page for kids.',
    },
    categoryId: 'cat-1',
    categorySlug: 'animals',
    imageUrl: '/images/colorings/happy-elephant.svg',
    thumbnailUrl: '/images/colorings/happy-elephant-thumb.svg',
    tags: ['słoń', 'elephant', 'afryka', 'africa', 'łatwe', 'easy'],
    createdAt: '2024-02-01T10:00:00Z',
  },
  {
    id: 'col-4',
    slug: 'racing-car',
    title: { pl: 'Samochód wyścigowy', en: 'Racing Car' },
    description: {
      pl: 'Szybki samochód wyścigowy na torze. Kolorowanka dla miłośników motoryzacji.',
      en: 'A fast racing car on the track. Coloring page for car enthusiasts.',
    },
    categoryId: 'cat-2',
    categorySlug: 'vehicles',
    imageUrl: '/images/colorings/racing-car.svg',
    thumbnailUrl: '/images/colorings/racing-car-thumb.svg',
    tags: ['samochód', 'car', 'wyścig', 'race', 'pojazdy', 'vehicles'],
    createdAt: '2024-02-10T10:00:00Z',
  },
  {
    id: 'col-5',
    slug: 'steam-train',
    title: { pl: 'Parowy pociąg', en: 'Steam Train' },
    description: {
      pl: 'Klasyczny pociąg parowy jadący przez góry. Kolorowanka z detalami.',
      en: 'A classic steam train traveling through the mountains. Detailed coloring page.',
    },
    categoryId: 'cat-2',
    categorySlug: 'vehicles',
    imageUrl: '/images/colorings/steam-train.svg',
    thumbnailUrl: '/images/colorings/steam-train-thumb.svg',
    tags: ['pociąg', 'train', 'para', 'steam', 'pojazdy', 'vehicles'],
    createdAt: '2024-02-15T10:00:00Z',
  },
  {
    id: 'col-6',
    slug: 'sunflower-field',
    title: { pl: 'Pole słoneczników', en: 'Sunflower Field' },
    description: {
      pl: 'Piękne pole pełne słoneczników w słoneczny dzień.',
      en: 'A beautiful field full of sunflowers on a sunny day.',
    },
    categoryId: 'cat-3',
    categorySlug: 'nature',
    imageUrl: '/images/colorings/sunflower-field.svg',
    thumbnailUrl: '/images/colorings/sunflower-field-thumb.svg',
    tags: ['słonecznik', 'sunflower', 'kwiaty', 'flowers', 'przyroda', 'nature'],
    createdAt: '2024-03-01T10:00:00Z',
  },
];
