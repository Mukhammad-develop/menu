/**
 * One-time migration script: moves existing single-restaurant data into the
 * new multi-restaurant + multi-language schema.
 *
 * Run with:  npx tsx prisma/migrate-data.ts
 *
 * What it does:
 * 1. Creates a default restaurant (if none exist)
 * 2. Links all orphaned categories to it
 * 3. Creates Russian translations for categories that have none
 * 4. Creates Russian translations for menu items that have none
 *
 * Safe to run multiple times — it skips records that already have translations.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting data migration...');

  // 1. Create default restaurant if none exist
  let restaurant = await prisma.restaurant.findFirst();
  if (!restaurant) {
    restaurant = await prisma.restaurant.create({
      data: {
        name: 'test',
        slug: 'test',
        languages: JSON.stringify(['ru']),
      },
    });
    console.log(`Created default restaurant: ${restaurant.name} (${restaurant.id})`);
  } else {
    console.log(`Using existing restaurant: ${restaurant.name} (${restaurant.id})`);
  }

  // 2. Link categories without a restaurantId to the default restaurant
  // (In MySQL, the column may already have a value if schema was pushed with a default,
  //  but in case there are orphaned records we handle it)
  const orphanedCategories = await prisma.$queryRawUnsafe<Array<{ id: string; name?: string }>>(
    `SELECT id FROM Category WHERE restaurantId IS NULL OR restaurantId = ''`,
  ).catch(() => [] as Array<{ id: string }>);

  if (orphanedCategories.length > 0) {
    await prisma.$executeRawUnsafe(
      `UPDATE Category SET restaurantId = ? WHERE restaurantId IS NULL OR restaurantId = ''`,
      restaurant.id,
    );
    console.log(`Linked ${orphanedCategories.length} orphaned categories to restaurant`);
  }

  // 3. Create CategoryTranslation for categories that have a `name` column but no translations
  // First check if the `name` column still exists on Category
  try {
    const catsWithName = await prisma.$queryRawUnsafe<
      Array<{ id: string; name: string }>
    >(`SELECT id, name FROM Category WHERE name IS NOT NULL AND name != ''`);

    for (const cat of catsWithName) {
      const existing = await prisma.categoryTranslation.findFirst({
        where: { categoryId: cat.id },
      });
      if (!existing) {
        await prisma.categoryTranslation.create({
          data: {
            categoryId: cat.id,
            langCode: 'ru',
            name: cat.name,
          },
        });
        console.log(`Created translation for category: ${cat.name}`);
      }
    }
  } catch (e) {
    console.log('Category.name column not found or already removed — skipping category name migration');
  }

  // 4. Create MenuItemTranslation for menu items that have `title`/`description` columns
  try {
    const itemsWithTitle = await prisma.$queryRawUnsafe<
      Array<{ id: string; title: string; description: string }>
    >(
      `SELECT id, title, description FROM MenuItem WHERE title IS NOT NULL AND title != ''`,
    );

    for (const item of itemsWithTitle) {
      const existing = await prisma.menuItemTranslation.findFirst({
        where: { menuItemId: item.id },
      });
      if (!existing) {
        await prisma.menuItemTranslation.create({
          data: {
            menuItemId: item.id,
            langCode: 'ru',
            title: item.title,
            description: item.description || '',
          },
        });
        console.log(`Created translation for menu item: ${item.title}`);
      }
    }
  } catch (e) {
    console.log('MenuItem.title column not found or already removed — skipping item translation migration');
  }

  console.log('Migration complete!');
}

main()
  .catch((e) => {
    console.error('Migration failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
