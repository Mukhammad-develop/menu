/**
 * Bulk Import Script (plain JS — no extra dependencies needed)
 * ============================================================
 * Reads video/photo files from ~/menu/bulk-import/ folder,
 * parses filenames, and creates categories + dishes automatically.
 *
 * File naming convention:
 *   "Food Name.Price.Category Name.Order.mp4"
 *   Example: "Mala Tofu.150000.Chong Cai.9.mp4"
 *
 * Usage:
 *   1. Create folder:  mkdir -p ~/menu/bulk-import
 *   2. Upload all video files into that folder
 *   3. Run:  node scripts/bulk-import.js
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');

const prisma = new PrismaClient();

// ---- CONFIGURATION ----
const IMPORT_DIR = path.join(process.env.HOME || '/home/bmbrenov', 'menu', 'bulk-import');
// ---- END CONFIGURATION ----

const TRANSLIT = {
  'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo', 'ж': 'zh',
  'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o',
  'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'h', 'ц': 'ts',
  'ч': 'ch', 'ш': 'sh', 'щ': 'sch', 'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
};

function slugify(name) {
  const slug = name
    .toLowerCase()
    .split('')
    .map(c => TRANSLIT[c] || c)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'item-' + Date.now().toString(36);
}

const MEDIA_EXTENSIONS = ['.mp4', '.webm', '.mov', '.m4v', '.jpg', '.jpeg', '.png', '.webp', '.gif'];

function parseFilename(filePath) {
  const basename = path.basename(filePath);
  const ext = path.extname(basename).toLowerCase();

  if (!MEDIA_EXTENSIONS.includes(ext)) return null;

  const nameWithoutExt = basename.slice(0, -ext.length);
  const parts = nameWithoutExt.split('.');

  if (parts.length < 4) {
    console.warn('  ⚠️  Skipping "' + basename + '" - expected format: "Name.Price.Category.Order' + ext + '"');
    return null;
  }

  const orderStr = parts[parts.length - 1].trim();
  const categoryName = parts[parts.length - 2].trim();
  const priceStr = parts[parts.length - 3].trim();
  const foodName = parts.slice(0, parts.length - 3).join('.').trim();

  const price = Number(priceStr);
  const order = Number(orderStr);

  if (!foodName || isNaN(price) || !categoryName || isNaN(order)) {
    console.warn('  ⚠️  Skipping "' + basename + '" - could not parse.');
    return null;
  }

  return { originalPath: filePath, foodName, price, categoryName, order, extension: ext };
}

async function main() {
  console.log('🍽️  Bulk Import Script');
  console.log('='.repeat(50));

  if (!fs.existsSync(IMPORT_DIR)) {
    console.error('\n❌ Import directory not found: ' + IMPORT_DIR);
    console.error('   Run: mkdir -p ' + IMPORT_DIR);
    process.exit(1);
  }

  const allFiles = fs.readdirSync(IMPORT_DIR).map(f => path.join(IMPORT_DIR, f));
  const parsed = allFiles.map(parseFilename).filter(p => p !== null);

  if (parsed.length === 0) {
    console.error('\n❌ No valid files found in ' + IMPORT_DIR);
    console.error('   File format: "Food Name.Price.Category Name.Order.mp4"');
    process.exit(1);
  }

  console.log('\n📁 Found ' + parsed.length + ' files to import:\n');
  for (const p of parsed) {
    console.log('   ' + p.foodName + ' | ' + p.price + ' UZS | Cat: ' + p.categoryName + ' | Order: ' + p.order);
  }

  // Find restaurant
  const restaurant = await prisma.restaurant.findFirst();
  if (!restaurant) {
    console.error('\n❌ No restaurant found. Create one via admin panel first.');
    process.exit(1);
  }
  console.log('\n🏪 Restaurant: "' + restaurant.name + '" (' + restaurant.id + ')');

  let languages;
  try { languages = JSON.parse(restaurant.languages); } catch { languages = ['ru']; }
  console.log('🌍 Languages: ' + languages.join(', '));

  // Create/find categories (same name = same category!)
  const uniqueCategories = [...new Set(parsed.map(p => p.categoryName))];
  console.log('\n📂 Categories: ' + uniqueCategories.join(', '));

  const categoryMap = new Map();

  for (const catName of uniqueCategories) {
    const existing = await prisma.category.findFirst({
      where: {
        restaurantId: restaurant.id,
        translations: { some: { name: catName } },
      },
    });

    if (existing) {
      categoryMap.set(catName, existing.id);
      console.log('   ✅ "' + catName + '" exists (' + existing.id + ')');
    } else {
      const created = await prisma.category.create({
        data: {
          slug: slugify(catName) + '-' + Date.now().toString(36),
          restaurantId: restaurant.id,
          translations: {
            create: languages.map(lang => ({ langCode: lang, name: catName })),
          },
        },
      });
      categoryMap.set(catName, created.id);
      console.log('   ✨ Created "' + catName + '" (' + created.id + ')');
    }
  }

  // Copy files and create menu items
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'videos');
  fs.mkdirSync(uploadsDir, { recursive: true });

  console.log('\n🍳 Importing dishes...\n');

  let ok = 0;
  let fail = 0;

  for (const item of parsed) {
    try {
      const newFilename = Date.now() + '-' + randomUUID() + item.extension;
      const destPath = path.join(uploadsDir, newFilename);
      fs.copyFileSync(item.originalPath, destPath);
      const videoUrl = '/uploads/videos/' + newFilename;

      await prisma.menuItem.create({
        data: {
          price: item.price,
          videoUrl,
          order: item.order,
          active: true,
          categoryId: categoryMap.get(item.categoryName),
          translations: {
            create: languages.map(lang => ({
              langCode: lang,
              title: item.foodName,
              description: '',
            })),
          },
        },
      });

      ok++;
      console.log('   ✅ ' + item.foodName + ' (' + item.price + ' UZS) → ' + item.categoryName);
    } catch (e) {
      fail++;
      console.error('   ❌ ' + item.foodName + ' - ' + (e.message || e));
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('✅ Imported: ' + ok + '/' + parsed.length);
  if (fail > 0) console.log('❌ Errors: ' + fail);
  console.log('\n🎉 Done! Run: touch ~/menu/tmp/restart.txt');

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); prisma.$disconnect(); process.exit(1); });
