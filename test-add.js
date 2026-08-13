const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  try {
    const restaurant = await prisma.restaurant.findFirst();
    console.log("Restaurant:", restaurant);
    const cat = await prisma.category.create({
      data: {
        slug: "test-cat-" + Date.now(),
        restaurantId: restaurant.id,
        translations: {
          create: [{ langCode: "ru", name: "Test Cat" }]
        }
      }
    });
    console.log("Created:", cat);
  } catch (e) {
    console.error("Error:", e);
  } finally {
    await prisma.$disconnect();
  }
}
main();
