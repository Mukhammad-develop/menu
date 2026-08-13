require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const categories = await prisma.category.findMany({
    include: { translations: true }
  });
  console.log(categories);
}

main().catch(console.error).finally(() => prisma.$disconnect());
