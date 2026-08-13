require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  try {
    const res = await prisma.menuItem.create({
      data: {
        price: 1000,
        videoUrl: '/test.mp4',
        posterUrl: null,
        order: 0,
        active: true,
        categoryId: 'cm0r6p7710003b5m1eun5aqlb', // assuming a category exists, I will query first
        translations: {
          create: [{ langCode: 'en', title: 'Test', description: '' }]
        }
      }
    });
    console.log(res);
  } catch (e) {
    console.error(e);
  } finally {
    prisma.$disconnect();
  }
}
test();
