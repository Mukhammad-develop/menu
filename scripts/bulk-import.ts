/**
 * Bulk Import Script
 * ==================
 * Reads video/photo files from ~/menu/bulk-import/ folder,
 * parses filenames, and creates categories + dishes automatically.
 *
 * File naming convention:
 *   "Food Name.Price.Category Name.Order.mp4"
 *   Example: "Mala Tofu.150000.Chong Cai.9.mp4"
 *
 * Usage:
 *   1. Create folder:  mkdir -p ~/menu/bulk-import
 *   2. Upload all 28 video files into that folder
 *   3. Run:  npx tsx scripts/bulk-import.ts
 *
 * The script will:
 *   - Auto-detect the first restaurant (or you can set RESTAURANT_ID below)
 *   - Create categories that don't exist yet
 *   - Copy video files to public/uploads/videos/
 *   - Create menu items with correct names, prices, categories, and order
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

// ---- CONFIGURATION ----
// Leave empty to auto-detect the first restaurant
const RESTAURANT_ID = '';
// The folder where you upload the video files
const IMPORT_DIR = path.join(process.env.HOME || '/home/bmbrenov', 'menu', 'bulk-import');
// The language code for dish names and category names
const LANG_CODE = 'ru';
// ---- END CONFIGURATION ----

// Transliteration for slug generation
const TRANSLIT: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'zh',
  з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o',
  п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts',
  ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
};

function slugify(name: string): string {
  const slug = name
    .toLowerCase()
    .split('')
    .map((c) => TRANSLIT[c] ?? c)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || `item-${Date.now().toString(36)}`;
}

const MEDIA_EXTENSIONS = ['.mp4', '.webm', '.mov', '.m4v', '.jpg', '.jpeg', '.png', '.webp', '.gif'];

interface ParsedFile {
  originalPath: string;
  foodName: string;
  price: number;
  categoryName: string;
  order: number;
  extension: string;
}

function parseFilename(filePath: string): ParsedFile | null {
  const basename = path.basename(filePath);
  const ext = path.extname(basename).toLowerCase();

  if (!MEDIA_EXTENSIONS.includes(ext)) {
    return null;
  }

  // Remove extension, then split by dots
  const nameWithoutExt = basename.slice(0, -ext.length);
  const parts = nameWithoutExt.split('.');

  if (parts.length < 4) {
    console.warn(`  ⚠️  Skipping "${basename}" - expected format: "Name.Price.Category.Order${ext}"`);
    return null;
  }

  // Last part = order, second to last = category, first part before second to last = price
  // But dots might be in the food name, so we parse from the end
  const orderStr = parts[parts.length - 1].trim();
  const categoryName = parts[parts.length - 2].trim();
  const priceStr = parts[parts.length - 3].trim();
  const foodName = parts.slice(0, parts.length - 3).join('.').trim();

  const price = Number(priceStr);
  const order = Number(orderStr);

  if (!foodName || isNaN(price) || !categoryName || isNaN(order)) {
    console.warn(`  ⚠️  Skipping "${basename}" - could not parse. Got: name="${foodName}", price=${priceStr}, category="${categoryName}", order=${orderStr}`);
    return null;
  }

  return {
    originalPath: filePath,
    foodName,
    price,
    categoryName,
    order,
    extension: ext,
  };
}

async function main() {
  console.log('🍽️  Bulk Import Script');
  console.log('='.repeat(50));

  // 1. Check import directory
  if (!fs.existsSync(IMPORT_DIR)) {
    console.error(`\n❌ Import directory not found: ${IMPORT_DIR}`);
    console.error(`\n   Please create it and put your video files there:`);
    console.error(`   mkdir -p ${IMPORT_DIR}`);
    process.exit(1);
  }

  // 2. Read and parse files
  const allFiles = fs.readdirSync(IMPORT_DIR).map(f => path.join(IMPORT_DIR, f));
  const parsed = allFiles.map(parseFilename).filter((p): p is ParsedFile => p !== null);

  if (parsed.length === 0) {
    console.error('\n❌ No valid files found in import directory.');
    console.error('   File format: "Food Name.Price.Category Name.Order.mp4"');
    console.error(`   Directory: ${IMPORT_DIR}`);
    process.exit(1);
  }

  console.log(`\n📁 Found ${parsed.length} files to import:\n`);
  for (const p of parsed) {
    console.log(`   ${p.foodName} | ${p.price.toLocaleString()} UZS | Category: ${p.categoryName} | Order: ${p.order} | ${path.basename(p.originalPath)}`);
  }

  // 3. Find restaurant
  let restaurantId = RESTAURANT_ID;
  if (!restaurantId) {
    const restaurant = await prisma.restaurant.findFirst();
    if (!restaurant) {
      console.error('\n❌ No restaurant found in database. Create one first via admin panel.');
      process.exit(1);
    }
    restaurantId = restaurant.id;
    console.log(`\n🏪 Using restaurant: "${restaurant.name}" (${restaurantId})`);
  }

  // Get restaurant's languages
  const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } });
  if (!restaurant) {
    console.error(`\n❌ Restaurant ${restaurantId} not found.`);
    process.exit(1);
  }

  let languages: string[];
  try {
    languages = JSON.parse(restaurant.languages);
  } catch {
    languages = ['ru'];
  }
  const langCode = languages[0] || LANG_CODE;
  console.log(`🌍 Using language: ${langCode}`);

  // 4. Create/find categories
  const uniqueCategories = [...new Set(parsed.map(p => p.categoryName))];
  console.log(`\n📂 Categories needed: ${uniqueCategories.join(', ')}`);

  const categoryMap = new Map<string, string>(); // categoryName -> categoryId

  for (const catName of uniqueCategories) {
    const slug = slugify(catName);

    // Check if category already exists for this restaurant
    const existing = await prisma.category.findFirst({
      where: {
        restaurantId,
        translations: { some: { name: catName } },
      },
    });

    if (existing) {
      categoryMap.set(catName, existing.id);
      console.log(`   ✅ Category "${catName}" already exists (${existing.id})`);
    } else {
      const created = await prisma.category.create({
        data: {
          slug: slug + '-' + Date.now().toString(36),
          restaurantId,
          translations: {
            create: languages.map(lang => ({
              langCode: lang,
              name: catName,
            })),
          },
        },
      });
      categoryMap.set(catName, created.id);
      console.log(`   ✨ Created category "${catName}" (${created.id})`);
    }
  }

  // 5. Copy files and create menu items
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'videos');
  fs.mkdirSync(uploadsDir, { recursive: true });

  console.log(`\n🍳 Importing dishes...\n`);

  let successCount = 0;
  let errorCount = 0;

  for (const item of parsed) {
    try {
      // Copy file to uploads directory
      const newFilename = `${Date.now()}-${randomUUID()}${item.extension}`;
      const destPath = path.join(uploadsDir, newFilename);
      fs.copyFileSync(item.originalPath, destPath);
      const videoUrl = `/uploads/videos/${newFilename}`;

      // Create menu item
      const categoryId = categoryMap.get(item.categoryName)!;
      await prisma.menuItem.create({
        data: {
          price: item.price,
          videoUrl,
          order: item.order,
          active: true,
          categoryId,
          translations: {
            create: languages.map(lang => ({
              langCode: lang,
              title: item.foodName,
              description: '',
            })),
          },
        },
      });

      successCount++;
      console.log(`   ✅ ${item.foodName} (${item.price.toLocaleString()} UZS) → ${item.categoryName}`);
    } catch (e) {
      errorCount++;
      console.error(`   ❌ Failed: ${item.foodName} - ${e instanceof Error ? e.message : e}`);
    }
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log(`✅ Imported: ${successCount}/${parsed.length} dishes`);
  if (errorCount > 0) {
    console.log(`❌ Errors: ${errorCount}`);
  }
  console.log(`\n🎉 Done! Restart the app to see changes.`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
