// Built-in demo data, used when DATABASE_URL is not set.
// NOTE: The video URLs are Google sample-bucket placeholders and MUST be
// replaced with real dish videos (see README) before going to production.

export interface DemoCategory {
  id: string;
  name: string;
  slug: string;
  order: number;
}

export interface DemoMenuItem {
  id: string;
  title: string;
  description: string;
  price: number;
  videoUrl: string;
  posterUrl: string | null;
  order: number;
  active: boolean;
  categoryId: string;
}

const V = 'https://storage.googleapis.com/gtv-videos-bucket/sample';

export const demoCategories: DemoCategory[] = [
  { id: 'cat-soups', name: 'Супы', slug: 'soups', order: 0 },
  { id: 'cat-pasta', name: 'Паста', slug: 'pasta', order: 1 },
  { id: 'cat-breakfast', name: 'Завтраки', slug: 'breakfast', order: 2 },
  { id: 'cat-desserts', name: 'Десерты', slug: 'desserts', order: 3 },
];

export const demoMenuItems: DemoMenuItem[] = [
  {
    id: 'item-tom-yam',
    title: 'Том Ям с креветками',
    description:
      'Острый тайский суп на кокосовом молоке с тигровыми креветками, грибами шиитаке и лемонграссом.',
    price: 690,
    videoUrl: `${V}/ForBiggerBlazes.mp4`,
    posterUrl: null,
    order: 0,
    active: true,
    categoryId: 'cat-soups',
  },
  {
    id: 'item-borscht',
    title: 'Борщ со сметаной',
    description:
      'Классический борщ на говяжьем бульоне со свёклой, капустой и сметаной. Подаётся с пампушкой.',
    price: 450,
    videoUrl: `${V}/ForBiggerEscapes.mp4`,
    posterUrl: null,
    order: 1,
    active: true,
    categoryId: 'cat-soups',
  },
  {
    id: 'item-carbonara',
    title: 'Паста Карбонара',
    description:
      'Спагетти с гуанчиале, желтком и пекорино романо. Без сливок — как принято в Риме.',
    price: 750,
    videoUrl: `${V}/ForBiggerFun.mp4`,
    posterUrl: null,
    order: 0,
    active: true,
    categoryId: 'cat-pasta',
  },
  {
    id: 'item-truffle-tagliatelle',
    title: 'Тальятелле с трюфелем',
    description:
      'Домашняя паста с чёрным трюфелем, пармезаном и сливочным маслом. Ароматная и насыщенная.',
    price: 1290,
    videoUrl: `${V}/ForBiggerJoyrides.mp4`,
    posterUrl: null,
    order: 1,
    active: true,
    categoryId: 'cat-pasta',
  },
  {
    id: 'item-shakshuka',
    title: 'Шакшука',
    description:
      'Яйца, томлёные в томатном соусе с перцем и специями. Подаётся в сковороде с хрустящим хлебом.',
    price: 520,
    videoUrl: `${V}/ForBiggerBlazes.mp4`,
    posterUrl: null,
    order: 0,
    active: true,
    categoryId: 'cat-breakfast',
  },
  {
    id: 'item-syrniki',
    title: 'Сырники с малиной',
    description:
      'Воздушные сырники из фермерского творога со свежей малиной и ванильным соусом.',
    price: 480,
    videoUrl: `${V}/ForBiggerEscapes.mp4`,
    posterUrl: null,
    order: 1,
    active: true,
    categoryId: 'cat-breakfast',
  },
  {
    id: 'item-pancakes',
    title: 'Панкейки с мёдом',
    description:
      'Стопка пышных панкейков с гречишным мёдом, сливочным маслом и карамелизированным бананом.',
    price: 430,
    videoUrl: `${V}/ForBiggerFun.mp4`,
    posterUrl: null,
    order: 2,
    active: true,
    categoryId: 'cat-breakfast',
  },
  {
    id: 'item-honey-cake',
    title: 'Медовик',
    description:
      'Слоёный медовый торт со сметанным кремом. Тающий во рту десерт по домашнему рецепту.',
    price: 380,
    videoUrl: `${V}/ForBiggerJoyrides.mp4`,
    posterUrl: null,
    order: 0,
    active: true,
    categoryId: 'cat-desserts',
  },
];
